using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Npgsql;
using ZedanMotorsApi.Security;
using ZedanMotorsApi.Services;

namespace ZedanMotorsApi.Controllers;

[ApiController, Authorize(Roles = RolesApp.AdminOJefe), Route("api/inventario/ia")]
public class InventarioIAController(NpgsqlDataSource origen, AnalisisInventario ia) : ControllerBase
{
    public record Foto(string Imagen, string? TipoMedia);
    public record Nuevo([MaxLength(100)] string Nombre, [MaxLength(50)] string? Marca, decimal Precio);
    public record Item(int? IdRepuesto, [property: System.Text.Json.Serialization.JsonRequired][Range(0, 100000)] int Cantidad, Nuevo? Nuevo);
    public record Conteo(string? IdOperacion, string Modo, List<Item> Items, string? Nota);

    [HttpPost("analizar"), EnableRateLimiting("analisis"), RequestSizeLimit(6 * 1024 * 1024)]
    public async Task<IActionResult> Analizar(Foto foto, CancellationToken ct)
    {
        var mime = foto.TipoMedia ?? "image/jpeg";
        if (mime is not ("image/jpeg" or "image/png" or "image/webp")) return BadRequest(new { error = "Formato de imagen no soportado" });
        var base64 = Regex.Replace(foto.Imagen, "^data:[^;]+;base64,", "").Trim();
        if (base64.Length > 3500000) return StatusCode(413, new { error = "La imagen es demasiado grande" });
        if (base64.Length == 0 || !Regex.IsMatch(base64, @"\A[A-Za-z0-9+/=\r\n]+\z"))
            return BadRequest(new { error = "La imagen no tiene un formato válido" });
        List<Dictionary<string, object?>> catalogo;
        await using (var db = await origen.OpenConnectionAsync(ct))
            catalogo = await db.Filas("SELECT id_repuesto,nombre,marca,stock FROM inventario ORDER BY nombre LIMIT 600");
        return Ok(await ia.Analizar(base64, mime, catalogo, ct));
    }

    private record Movimiento(int id_repuesto, string nombre, int stock_anterior, int stock_nuevo, bool creado);

    [HttpPost("aplicar")]
    public async Task<IActionResult> Aplicar(Conteo conteo)
    {
        if (!Guid.TryParseExact(conteo.IdOperacion, "D", out var operacion))
            return BadRequest(new { error = "Se requiere un id_operacion UUID" });
        if (conteo.Modo is not ("sumar" or "establecer") || conteo.Items.Count is < 1 or > 100)
            return BadRequest(new { error = "Modo inválido o cantidad de filas fuera del rango de 1 a 100" });
        var existentes = new SortedDictionary<int, int>();
        var nuevos = new List<Item>();
        foreach (var item in conteo.Items)
        {
            if (item?.Nuevo != null)
            {
                if (item.Nuevo.Precio is <= 0 or > 99999999.99m || string.IsNullOrWhiteSpace(item.Nuevo.Nombre))
                    return BadRequest(new { error = "Nombre y precio positivo requeridos" });
                nuevos.Add(item);
            }
            else if (item?.IdRepuesto is int id && id > 0)
            {
                if (conteo.Modo == "establecer" || item.Cantidad > 0)
                    existentes[id] = existentes.GetValueOrDefault(id) + item.Cantidad;
            }
            else return BadRequest(new { error = "Repuesto inválido" });
        }
        if (existentes.Count + nuevos.Count == 0) return BadRequest(new { error = "No hay cambios para aplicar" });
        var nota = conteo.Nota?.Trim();
        if (string.IsNullOrEmpty(nota)) nota = null;
        else nota = nota[..Math.Min(200, nota.Length)];
        if (!int.TryParse(User.FindFirst("id")?.Value, out var usuario)) return Unauthorized();
        var solicitud = new
        {
            modo = conteo.Modo, nota,
            existentes = existentes.Select(par => new[] { par.Key, par.Value }),
            nuevos = nuevos.Select(item => new {
                nombre = item.Nuevo!.Nombre.Trim(),
                marca = string.IsNullOrWhiteSpace(item.Nuevo.Marca) ? null : item.Nuevo.Marca.Trim(),
                precio = item.Nuevo.Precio, cantidad = item.Cantidad
            })
        };

        await using var db = await origen.OpenConnectionAsync();
        await using var tx = await db.BeginTransactionAsync();
        var clave = operacion.ToString("D");
        await db.Filas("SELECT 1 FROM pg_advisory_xact_lock($1::int, hashtext($2))", usuario, clave);
        var previa = (await db.Filas("""
            SELECT (contexto->'respuesta')::text AS respuesta, contexto->'solicitud' = $3::jsonb AS coincide
            FROM bitacora_evento WHERE id_usuario=$1 AND id_registro=$2 AND accion='confirmar_ia' AND entidad='inventario'
            """, usuario, clave, JsonSerializer.Serialize(solicitud))).SingleOrDefault();
        if (previa != null)
        {
            if (previa["coincide"] is not true)
                return Conflict(new { error = "Este conteo ya se aplicó con otros datos. Inicia otro análisis." });
            return Content((string)previa["respuesta"]!, "application/json");
        }
        var resultados = new List<Movimiento>();
        async Task Registrar(int id, string nombre, int anterior, int nuevo, bool creado)
        {
            var tipo = creado || conteo.Modo == "sumar" ? "ingreso" : "conteo";
            await db.Filas("""
                INSERT INTO movimiento_inventario(id_repuesto,tipo,origen,stock_anterior,stock_nuevo,nota,id_usuario)
                VALUES($1,$2,'ia',$3,$4,$5,$6)
                """, id, tipo, anterior, nuevo, nota, usuario);
            resultados.Add(new Movimiento(id, nombre, anterior, nuevo, creado));
        }
        foreach (var (id, cantidad) in existentes)
        {
            var filas = await db.Filas("SELECT nombre,stock FROM inventario WHERE id_repuesto=$1 FOR UPDATE", id);
            if (filas.Count == 0) return NotFound(new { error = $"El repuesto #{id} ya no existe en el inventario" });
            var anterior = (int)filas[0]["stock"]!;
            long nuevo = conteo.Modo == "sumar" ? (long)anterior + cantidad : cantidad;
            if (nuevo > 2000000000) return BadRequest(new { error = "El stock resultante es demasiado grande" });
            await db.Filas("UPDATE inventario SET stock=$1 WHERE id_repuesto=$2", (int)nuevo, id);
            await Registrar(id, (string)filas[0]["nombre"]!, anterior, (int)nuevo, false);
        }
        foreach (var item in nuevos)
        {
            var n = item.Nuevo!;
            var filas = await db.Filas("INSERT INTO inventario(nombre,marca,precio,stock) VALUES($1,$2,$3,$4) RETURNING id_repuesto",
                n.Nombre.Trim(), string.IsNullOrWhiteSpace(n.Marca) ? null : n.Marca.Trim(), n.Precio, item.Cantidad);
            await Registrar((int)filas.Single()["id_repuesto"]!, n.Nombre.Trim(), 0, item.Cantidad, true);
        }
        var respuesta = new { mensaje = "Inventario actualizado.", total = resultados.Count, resultados };
        var sesion = User.FindFirst("id_sesion")?.Value;
        if (string.IsNullOrEmpty(sesion))
        {
            var token = Request.Headers.Authorization.ToString()["Bearer ".Length..];
            sesion = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)))[..32];
        }
        await db.Filas("INSERT INTO sesion_bitacora(id_sesion,id_usuario) VALUES($1,$2) ON CONFLICT (id_sesion) DO NOTHING",
            Guid.Parse(sesion), usuario);
        var antes = new { items = resultados.Select(r => new { id = r.id_repuesto, r.nombre, stock = r.stock_anterior }) };
        var despues = new { items = resultados.Select(r => new { id = r.id_repuesto, r.nombre, stock = r.stock_nuevo }) };
        var contexto = new { solicitud, respuesta, modo = conteo.Modo, nota, total_modificados = resultados.Count,
            creados = nuevos.Count, actualizados = existentes.Count };
        await db.Filas("""
            INSERT INTO bitacora_evento(id_sesion,id_usuario,modulo,accion,entidad,id_registro,descripcion,
                datos_antes,datos_despues,campos_modificados,contexto)
            VALUES($1,$2,'ia','confirmar_ia','inventario',$3,$4,$5::jsonb,$6::jsonb,ARRAY['items'],$7::jsonb)
            """, Guid.Parse(sesion), usuario, clave, $"Confirmación IA ({conteo.Modo}): {resultados.Count} repuesto(s).",
            JsonSerializer.Serialize(antes), JsonSerializer.Serialize(despues), JsonSerializer.Serialize(contexto));
        await tx.CommitAsync();
        return Ok(respuesta);
    }
}

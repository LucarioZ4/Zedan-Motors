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
    public record Conteo(string Modo, List<Item> Items, string? Nota);

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

    [HttpPost("aplicar")]
    public async Task<IActionResult> Aplicar(Conteo conteo)
    {
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
        int? usuario = int.TryParse(User.FindFirst("id")?.Value, out var uid) ? uid : null;

        await using var db = await origen.OpenConnectionAsync();
        await using var tx = await db.BeginTransactionAsync();
        var resultados = new List<object>();
        async Task Registrar(int id, string nombre, int anterior, int nuevo, bool creado)
        {
            var tipo = creado || conteo.Modo == "sumar" ? "ingreso" : "conteo";
            await db.Filas("""
                INSERT INTO movimiento_inventario(id_repuesto,tipo,origen,stock_anterior,stock_nuevo,nota,id_usuario)
                VALUES($1,$2,'ia',$3,$4,$5,$6)
                """, id, tipo, anterior, nuevo, nota, usuario);
            resultados.Add(new { id_repuesto = id, nombre, stock_anterior = anterior, stock_nuevo = nuevo, creado });
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
        await tx.CommitAsync();
        return Ok(new { mensaje = "Inventario actualizado.", total = resultados.Count, resultados });
    }
}

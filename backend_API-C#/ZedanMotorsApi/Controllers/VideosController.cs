using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using System.Security.Cryptography;
using System.Text.RegularExpressions;
using ZedanMotorsApi.Security;
using ZedanMotorsApi.Services;

namespace ZedanMotorsApi.Controllers;

[ApiController, Route("api/ordenes/{id}/videos")]
public class VideosController(NpgsqlDataSource origen, AlmacenamientoSupabase storage) : ControllerBase
{
    private const int Limite = 5;
    public record Solicitud(string Tipo, string? NombreArchivo, string? Mime, long? Tamano, string? Ruta);
    private static async Task VerificarOrden(NpgsqlConnection db, int id)
    {
        if ((await db.Filas("SELECT 1 FROM orden_trabajo WHERE id_orden=$1", id)).Count == 0)
            throw new ErrorOperacion(404, "Orden no encontrada");
    }

    private static async Task VerificarCupo(NpgsqlConnection db, int id, string tipo)
    {
        var fila = (await db.Filas("SELECT COUNT(*)::int AS total FROM orden_video WHERE id_orden=$1 AND tipo=$2", id, tipo)).Single();
        if ((int)fila["total"]! >= Limite)
            throw new ErrorOperacion(409, $"Esta orden ya tiene {Limite} videos de {tipo}.");
    }

    [HttpGet]
    public async Task<IActionResult> Listar(int id)
    {
        await using var db = await origen.OpenConnectionAsync();
        await VerificarOrden(db, id);
        var videos = await db.Filas("""
            SELECT v.id_video,v.tipo,v.ruta,v.nombre_archivo,v.mime,v.tamano,v.fecha,u.nombre_usuario AS subido_por
            FROM orden_video v LEFT JOIN usuario u USING(id_usuario) WHERE id_orden=$1 ORDER BY v.fecha
            """, id);
        var enlaces = storage.Configurado ? await storage.Enlaces(videos.Select(v => (string)v["ruta"]!)) : new();
        foreach (var video in videos)
        {
            video.Remove("ruta", out var ruta);
            video["url"] = enlaces.GetValueOrDefault((string)ruta!);
        }
        return Ok(new { max_mb = storage.MaxMb, max_por_tipo = Limite, bucket = storage.Bucket, almacenamiento = storage.Configurado, videos });
    }

    [Authorize(Roles = RolesApp.AdminOJefe + ",Mecánico"), HttpPost("firma")]
    public async Task<IActionResult> Firmar(int id, Solicitud s)
    {
        if (s.Tipo is not ("recepcion" or "entrega") || s.Mime?.StartsWith("video/", StringComparison.Ordinal) != true || s.Tamano is null or <= 0)
            return BadRequest(new { error = "Tipo, MIME o tamaño de video inválido" });
        if (s.Tamano > storage.MaxMb * 1048576L) return StatusCode(413, new { error = "Video demasiado grande" });
        await using var db = await origen.OpenConnectionAsync();
        await VerificarOrden(db, id);
        await VerificarCupo(db, id, s.Tipo);
        var ext = s.Mime switch
        {
            "video/quicktime" => "mov",
            "video/webm" => "webm",
            "video/x-matroska" => "mkv",
            "video/3gpp" => "3gp",
            "video/x-m4v" => "m4v",
            _ => "mp4"
        };
        var ruta = $"ordenes/{id}/{s.Tipo}-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{Convert.ToHexString(RandomNumberGenerator.GetBytes(4)).ToLowerInvariant()}.{ext}";
        return Ok(await storage.Firmar(storage.Bucket, ruta));
    }

    [Authorize(Roles = RolesApp.AdminOJefe + ",Mecánico"), HttpPost]
    public async Task<IActionResult> Registrar(int id, Solicitud s)
    {
        if (s.Tipo is not ("recepcion" or "entrega") || s.Ruta == null ||
            !Regex.IsMatch(s.Ruta, $@"\Aordenes/{id}/{s.Tipo}-[0-9]{{10,}}-[0-9a-f]{{8}}\.[a-z0-9]{{2,5}}\z"))
            return BadRequest(new { error = "Ruta de video inválida" });
        await using var db = await origen.OpenConnectionAsync();
        await VerificarOrden(db, id);
        var info = await storage.Metadata(s.Ruta);
        if (info == null) return BadRequest(new { error = "No se encontró el archivo en el almacenamiento" });
        var mime = (string?)info["mimetype"] ?? "video/mp4";
        var bytes = (long?)info["size"] ?? 0;
        if (!mime.StartsWith("video/") || bytes <= 0 || bytes > storage.MaxMb * 1048576L)
        {
            await storage.Eliminar(storage.Bucket, [s.Ruta]);
            return BadRequest(new { error = "El archivo subido no es un video válido o excede el tamaño permitido" });
        }
        var nombre = string.IsNullOrWhiteSpace(s.NombreArchivo) ? Path.GetFileName(s.Ruta) : s.NombreArchivo.Trim();
        int? usuario = int.TryParse(User.FindFirst("id")?.Value, out var uid) ? uid : null;
        await using var tx = await db.BeginTransactionAsync();
        if ((await db.Filas("SELECT id_orden FROM orden_trabajo WHERE id_orden=$1 FOR UPDATE", id)).Count == 0)
            return NotFound(new { error = "Orden no encontrada" });
        await VerificarCupo(db, id, s.Tipo);
        try
        {
            var filas = await db.Filas("""
                INSERT INTO orden_video(id_orden,tipo,ruta,nombre_archivo,mime,tamano,id_usuario)
                VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id_video,tipo,nombre_archivo,mime,tamano,fecha
                """, id, s.Tipo, s.Ruta, nombre[..Math.Min(nombre.Length, 200)], mime, bytes, usuario);
            await tx.CommitAsync();
            return StatusCode(201, filas.Single());
        }
        catch (PostgresException ex) when (ex.SqlState == "23505") { return Conflict(new { error = "Este video ya estaba registrado" }); }
    }

    [Authorize(Roles = RolesApp.AdminOJefe), HttpDelete("{vid}")]
    public async Task<IActionResult> Eliminar(int id, int vid)
    {
        await using var db = await origen.OpenConnectionAsync();
        var filas = await db.Filas("SELECT ruta FROM orden_video WHERE id_video=$1 AND id_orden=$2", vid, id);
        if (filas.Count == 0) return NotFound(new { error = "Video no encontrado" });
        await storage.Eliminar(storage.Bucket, [(string)filas[0]["ruta"]!]);
        await db.Filas("DELETE FROM orden_video WHERE id_video=$1 AND id_orden=$2", vid, id);
        return Ok(new { mensaje = "Video eliminado" });
    }
}

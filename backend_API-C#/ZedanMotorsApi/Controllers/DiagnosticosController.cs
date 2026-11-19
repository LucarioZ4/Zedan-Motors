using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using ZedanMotorsApi.Services;

namespace ZedanMotorsApi.Controllers;

[ApiController, Route("api/diagnosticos")]
public class DiagnosticosController(NpgsqlDataSource origen, AlmacenamientoSupabase storage, IConfiguration config,
    ILogger<DiagnosticosController> logger) : ControllerBase
{
    public record Accesorio([Required, MaxLength(50)] string Nombre,
        [RegularExpression("Bueno|Regular|Malo|No tiene")] string Estado, string? Observacion);
    public record Datos(int? IdVehiculo, int? IdCita, DateTime? FechaIngreso, [Range(0, int.MaxValue)] int? Kilometraje,
        [MaxLength(20)] string? NivelGasolina, string? Observaciones, [MaxLength(20)] string? Estado, List<Accesorio>? Accesorios);
    public record Archivo(string Tipo, [MaxLength(255)] string NombreOriginal, string Mime, long Tamano, [MaxLength(200)] string? Descripcion);

    [HttpGet]
    public async Task<IActionResult> Listar(string? vehiculo, string? cliente, DateTime? fechaDesde, DateTime? fechaHasta, string? estado)
    {
        await using var db = await origen.OpenConnectionAsync();
        return Ok(await db.Filas("""
            SELECT d.*, v.placa, v.marca, v.modelo, v.color, v.anio,
                   COALESCE(cl.nombre || ' ' || cl.apellido, 'Sin cliente') AS cliente,
                   cl.telefono AS cliente_telefono,
                   (SELECT COUNT(*) FROM diagnostico_accesorio WHERE id_diagnostico=d.id_diagnostico)::int AS total_accesorios,
                   (SELECT COUNT(*) FROM diagnostico_archivo WHERE id_diagnostico=d.id_diagnostico)::int AS total_archivos
            FROM diagnostico d JOIN vehiculo v ON d.id_vehiculo=v.id_vehiculo
            LEFT JOIN cliente cl ON v.id_cliente=cl.id_cliente
            WHERE ($1::text IS NULL OR v.placa ILIKE '%' || $1 || '%' OR v.marca ILIKE '%' || $1 || '%' OR v.modelo ILIKE '%' || $1 || '%')
              AND ($2::text IS NULL OR cl.nombre ILIKE '%' || $2 || '%' OR cl.apellido ILIKE '%' || $2 || '%')
              AND ($3::timestamp IS NULL OR d.fecha_ingreso >= $3)
              AND ($4::timestamp IS NULL OR d.fecha_ingreso <= $4)
              AND ($5::text IS NULL OR d.estado=$5) ORDER BY d.fecha_ingreso DESC
            """, string.IsNullOrEmpty(vehiculo) ? null : vehiculo, string.IsNullOrEmpty(cliente) ? null : cliente,
            fechaDesde, fechaHasta, string.IsNullOrEmpty(estado) ? null : estado));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Detalle(int id)
    {
        await using var db = await origen.OpenConnectionAsync();
        var fila = (await db.Filas("""
            SELECT d.*, v.placa, v.marca, v.modelo, v.anio, v.color,
                   cl.id_cliente, cl.nombre AS cliente_nombre, cl.apellido AS cliente_apellido,
                   COALESCE(cl.nombre || ' ' || cl.apellido, 'Sin cliente') AS cliente,
                   cl.telefono AS cliente_telefono, cl.correo AS cliente_correo,
                   c.fecha AS cita_fecha, c.hora AS cita_hora, c.motivo AS cita_motivo
            FROM diagnostico d JOIN vehiculo v ON d.id_vehiculo=v.id_vehiculo
            LEFT JOIN cliente cl ON v.id_cliente=cl.id_cliente
            LEFT JOIN cita c ON d.id_cita=c.id_cita
            WHERE d.id_diagnostico=$1
            """, id)).SingleOrDefault();
        if (fila == null) return NotFound(new { error = "Diagnóstico no encontrado" });
        fila["accesorios"] = await db.Filas("SELECT id_accesorio, nombre, estado, observacion FROM diagnostico_accesorio WHERE id_diagnostico=$1 ORDER BY id_accesorio ASC", id);
        var archivos = await db.Filas("SELECT id_archivo, id_diagnostico, ruta, tipo, nombre_original, tamano, descripcion, creado_en FROM diagnostico_archivo WHERE id_diagnostico=$1 ORDER BY creado_en DESC", id);
        var urls = new Dictionary<string, string>();
        if (storage.Configurado && archivos.Count > 0)
        {
            try
            {
                foreach (var grupo in archivos.Select(a => (string)a["ruta"]!).GroupBy(BucketArchivo))
                    foreach (var enlace in await storage.Enlaces(grupo, grupo.Key))
                        urls[enlace.Key] = enlace.Value;
            }
            catch (Exception e) when (e is ErrorOperacion or HttpRequestException or TaskCanceledException)
            {
                urls.Clear();
                logger.LogWarning("No se pudieron generar URLs firmadas de diagnóstico ({TipoError})", e.GetType().Name);
            }
        }
        foreach (var archivo in archivos)
        {
            var ruta = (string)archivo["ruta"]!;
            archivo["url"] = urls.GetValueOrDefault(ruta, ruta);
        }
        fila["archivos"] = archivos;
        return Ok(fila);
    }

    [HttpPost]
    public Task<IActionResult> Crear(Datos datos) => Guardar(null, datos);

    [HttpPut("{id}")]
    public Task<IActionResult> Actualizar(int id, Datos datos) => Guardar(id, datos);

    private async Task<IActionResult> Guardar(int? id, Datos d)
    {
        await using var db = await origen.OpenConnectionAsync();
        await using var tx = await db.BeginTransactionAsync();
        Dictionary<string, object?> fila;
        if (id == null)
        {
            if (d.IdVehiculo == null || d.Kilometraje == null || string.IsNullOrWhiteSpace(d.NivelGasolina))
                return BadRequest(new { error = "Vehículo, kilometraje y nivel de gasolina son obligatorios" });
            if ((await db.Filas("SELECT 1 FROM vehiculo WHERE id_vehiculo=$1", d.IdVehiculo)).Count == 0)
                return NotFound(new { error = "Vehículo no encontrado" });
            if (d.IdCita != null && (await db.Filas("SELECT 1 FROM cita WHERE id_cita=$1", d.IdCita)).Count == 0)
                return NotFound(new { error = "Cita no encontrada" });
            fila = (await db.Filas("""
                INSERT INTO diagnostico(id_vehiculo,id_cita,fecha_ingreso,kilometraje,nivel_gasolina,observaciones,estado)
                VALUES($1,$2,COALESCE($3::timestamp,LOCALTIMESTAMP),$4,$5,$6,$7) RETURNING *
                """, d.IdVehiculo, d.IdCita, d.FechaIngreso, d.Kilometraje, d.NivelGasolina, d.Observaciones, d.Estado ?? "En proceso")).Single();
        }
        else
        {
            var filas = await db.Filas("""
                UPDATE diagnostico SET fecha_ingreso=COALESCE($2,fecha_ingreso),kilometraje=COALESCE($3,kilometraje),
                    nivel_gasolina=COALESCE($4,nivel_gasolina),observaciones=COALESCE($5,observaciones),estado=COALESCE($6,estado)
                WHERE id_diagnostico=$1 RETURNING *
                """, id, d.FechaIngreso, d.Kilometraje, d.NivelGasolina, d.Observaciones, d.Estado);
            if (filas.Count == 0) return NotFound(new { error = "Diagnóstico no encontrado" });
            fila = filas.Single();
        }
        if (d.Accesorios != null)
        {
            if (d.Accesorios.DistinctBy(a => a.Nombre).Count() != d.Accesorios.Count)
                return BadRequest(new { error = "Accesorio repetido" });
            var clave = fila["id_diagnostico"];
            await db.Filas("DELETE FROM diagnostico_accesorio WHERE id_diagnostico=$1", clave);
            foreach (var a in d.Accesorios)
                await db.Filas("INSERT INTO diagnostico_accesorio(id_diagnostico,nombre,estado,observacion) VALUES($1,$2,$3,$4)",
                    clave, a.Nombre, a.Estado, a.Observacion);
        }
        await tx.CommitAsync();
        return StatusCode(id == null ? 201 : 200, fila);
    }

    [HttpPost("{id}/archivos")]
    public async Task<IActionResult> Subir(int id, Archivo a)
    {
        var tipos = (config["DIAG_ALLOWED_MIME"] ?? "image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime").Split(',', StringSplitOptions.TrimEntries);
        if (a.Tipo is not ("imagen" or "video") || !tipos.Contains(a.Mime) || a.Tamano <= 0)
            return BadRequest(new { error = "Tipo, MIME o tamaño inválido" });
        if (a.Tamano > config.GetValue("DIAG_MAX_MB", 10) * 1048576L) return StatusCode(413, new { error = "Archivo demasiado grande" });
        await using var db = await origen.OpenConnectionAsync();
        if ((await db.Filas("SELECT 1 FROM diagnostico WHERE id_diagnostico=$1", id)).Count == 0)
            return NotFound(new { error = "Diagnóstico no encontrado" });
        var bucket = config["DIAG_BUCKET"] ?? "diagnosticos";
        var ext = Path.GetExtension(a.NombreOriginal);
        if (!System.Text.RegularExpressions.Regex.IsMatch(ext, "^[.][A-Za-z0-9]{1,6}$")) ext = a.Tipo == "imagen" ? ".jpg" : ".mp4";
        var ruta = $"archivos/{id}/{a.Tipo}-{Guid.NewGuid():N}{ext}";
        var firma = await storage.Firmar(bucket, ruta);
        await db.Filas("INSERT INTO diagnostico_archivo(id_diagnostico,ruta,tipo,nombre_original,tamano,descripcion) VALUES($1,$2,$3,$4,$5,$6)",
            id, ruta, a.Tipo, a.NombreOriginal, a.Tamano, a.Descripcion);
        return Ok(firma);
    }

    private string BucketArchivo(string ruta) => ruta.StartsWith("archivos/") ? config["DIAG_BUCKET"] ?? "diagnosticos" : storage.Bucket;

    [HttpDelete("{id}/archivos/{archivoId}")]
    public async Task<IActionResult> EliminarArchivo(int id, int archivoId)
    {
        await using var db = await origen.OpenConnectionAsync();
        var filas = await db.Filas("SELECT ruta FROM diagnostico_archivo WHERE id_diagnostico=$1 AND id_archivo=$2", id, archivoId);
        if (filas.Count == 0) return NotFound(new { error = "Archivo no encontrado" });
        var ruta = (string)filas[0]["ruta"]!;
        await storage.Eliminar(BucketArchivo(ruta), [ruta]);
        await db.Filas("DELETE FROM diagnostico_archivo WHERE id_diagnostico=$1 AND id_archivo=$2", id, archivoId);
        return Ok(new { mensaje = "Archivo eliminado" });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Eliminar(int id)
    {
        await using var db = await origen.OpenConnectionAsync();
        await using var tx = await db.BeginTransactionAsync();
        await db.Filas("SELECT 1 FROM diagnostico WHERE id_diagnostico=$1 FOR UPDATE", id);
        var filas = await db.Filas("SELECT ruta FROM diagnostico_archivo WHERE id_diagnostico=$1", id);
        foreach (var grupo in filas.Select(f => (string)f["ruta"]!).GroupBy(BucketArchivo))
            await storage.Eliminar(grupo.Key, grupo.ToArray());
        await db.Filas("DELETE FROM diagnostico WHERE id_diagnostico=$1", id);
        await tx.CommitAsync();
        return Ok(new { mensaje = "Diagnóstico eliminado" });
    }
}

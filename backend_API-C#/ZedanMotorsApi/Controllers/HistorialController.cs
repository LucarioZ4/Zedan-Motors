using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ZedanMotorsApi.Data;
using ZedanMotorsApi.DTOs;

namespace ZedanMotorsApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class HistorialController : ControllerBase
    {
        private readonly AppDBContext _context;

        public HistorialController(AppDBContext context)
        {
            _context = context;
        }

        private static readonly Dictionary<string, string> Colores = new()
        {
            ["Cita"] = "#4A90D9",
            ["Orden"] = "#E8681A",
            ["Servicio"] = "#27AE60",
            ["Repuesto"] = "#F5A623",
            ["Factura"] = "#9B59B6",
            ["Mensaje WhatsApp"] = "#25D366",
            ["Mensaje Telegram"] = "#0088CC"
        };

        private static readonly Dictionary<string, string> Iconos = new()
        {
            ["Cita"] = "bi-calendar-check",
            ["Orden"] = "bi-clipboard2-check",
            ["Servicio"] = "bi-tools",
            ["Repuesto"] = "bi-box-seam",
            ["Factura"] = "bi-receipt",
            ["Mensaje WhatsApp"] = "bi-whatsapp",
            ["Mensaje Telegram"] = "bi-telegram"
        };

        // GET: api/Historial/vehiculo/5
        // Línea de tiempo del vehículo: citas, órdenes, servicios, repuestos, facturas y mensajes.
        // Es la misma consulta del backend Node; {id} viaja como parámetro (no se concatena).
        [HttpGet("vehiculo/{id}")]
        public async Task<ActionResult<IEnumerable<HistorialEventoDTO>>> GetPorVehiculo(int id)
        {
            var filas = await _context.Database.SqlQuery<HistorialFila>($@"
                SELECT
                    c.fecha::timestamp AS fecha,
                    'Cita' AS tipo_evento,
                    CONCAT('Cita agendada — ', COALESCE(c.motivo, 'Sin motivo'),
                           ' | Estado: ', e.nombre_estado) AS descripcion,
                    '' AS empleado,
                    1 AS orden_tipo
                FROM cita c
                INNER JOIN estado e ON c.id_estado = e.id_estado
                WHERE c.id_vehiculo = {id}

                UNION ALL

                SELECT
                    o.fecha_inicio::timestamp AS fecha,
                    'Orden' AS tipo_evento,
                    CONCAT('Orden #', o.id_orden, ' iniciada',
                        CASE WHEN o.observaciones IS NOT NULL
                             THEN CONCAT(' — ', o.observaciones)
                             ELSE '' END) AS descripcion,
                    COALESCE(emp.nombre || ' ' || emp.apellido, '—') AS empleado,
                    2 AS orden_tipo
                FROM orden_trabajo o
                INNER JOIN cita c ON o.id_cita = c.id_cita
                LEFT  JOIN empleado emp ON o.id_empleado = emp.id_empleado
                WHERE c.id_vehiculo = {id}

                UNION ALL

                SELECT
                    o.fecha_inicio::timestamp AS fecha,
                    'Servicio' AS tipo_evento,
                    CONCAT('Servicio realizado: ', s.nombre_servicio,
                           ' — $', s.costo) AS descripcion,
                    COALESCE(emp.nombre || ' ' || emp.apellido, '—') AS empleado,
                    3 AS orden_tipo
                FROM orden_servicio os
                INNER JOIN orden_trabajo o  ON os.id_orden    = o.id_orden
                INNER JOIN servicio s       ON os.id_servicio = s.id_servicio
                INNER JOIN cita c           ON o.id_cita      = c.id_cita
                LEFT  JOIN empleado emp     ON o.id_empleado  = emp.id_empleado
                WHERE c.id_vehiculo = {id}

                UNION ALL

                SELECT
                    o.fecha_inicio::timestamp AS fecha,
                    'Repuesto' AS tipo_evento,
                    CONCAT('Repuesto usado: ', i.nombre,
                           ' (', COALESCE(i.marca, ''), ')',
                           ' x', oi.cantidad,
                           ' — $', (i.precio * oi.cantidad)) AS descripcion,
                    COALESCE(emp.nombre || ' ' || emp.apellido, '—') AS empleado,
                    4 AS orden_tipo
                FROM orden_inventario oi
                INNER JOIN orden_trabajo o ON oi.id_orden    = o.id_orden
                INNER JOIN inventario i    ON oi.id_repuesto = i.id_repuesto
                INNER JOIN cita c          ON o.id_cita      = c.id_cita
                LEFT  JOIN empleado emp    ON o.id_empleado  = emp.id_empleado
                WHERE c.id_vehiculo = {id}

                UNION ALL

                SELECT
                    f.fecha::timestamp AS fecha,
                    'Factura' AS tipo_evento,
                    CONCAT('Factura #', f.id_factura,
                           ' — Total: $', f.total,
                           ' | Método: ', f.metodo_pago) AS descripcion,
                    '' AS empleado,
                    5 AS orden_tipo
                FROM facturacion f
                INNER JOIN orden_trabajo o ON f.id_orden = o.id_orden
                INNER JOIN cita c          ON o.id_cita  = c.id_cita
                WHERE c.id_vehiculo = {id}

                UNION ALL

                SELECT
                    m.fecha AS fecha,
                    CONCAT('Mensaje ', m.plataforma) AS tipo_evento,
                    CONCAT('[', m.tipo_mensaje, '] ', m.mensaje) AS descripcion,
                    m.numero_cliente AS empleado,
                    6 AS orden_tipo
                FROM mensajes_cliente m
                INNER JOIN orden_trabajo o ON m.id_orden = o.id_orden
                INNER JOIN cita c          ON o.id_cita  = c.id_cita
                WHERE c.id_vehiculo = {id}")
                .OrderByDescending(f => f.fecha)
                .ThenBy(f => f.orden_tipo)
                .ToListAsync();

            return filas.Select(f => new HistorialEventoDTO
            {
                fecha = f.fecha,
                tipoEvento = f.tipo_evento,
                descripcion = f.descripcion,
                empleado = f.empleado,
                ordenTipo = f.orden_tipo,
                color = Colores.TryGetValue(f.tipo_evento, out var color) ? color : "#777777",
                icono = Iconos.TryGetValue(f.tipo_evento, out var icono) ? icono : "bi-circle"
            }).ToList();
        }
    }
}
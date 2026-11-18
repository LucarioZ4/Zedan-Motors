using System.Text.Json;
using ZedanMotorsApi.Services;
using System.Linq.Expressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using ZedanMotorsApi.Data;
using ZedanMotorsApi.DTOs;
using ZedanMotorsApi.Models;
using ZedanMotorsApi.Security;

namespace ZedanMotorsApi.Controllers
{
    [Route("api/[controller]")]
    [Route("api/facturacion")]
    [ApiController]
    public class FacturasController : ControllerBase
    {
        private readonly AppDBContext _context;

        private readonly FactusService _factus;

        public FacturasController(AppDBContext context, FactusService factus)
        {
            _context = context;
            _factus = factus;
        }

        private static readonly Expression<Func<Facturacion, FacturaDTO>> ToDto = f => new FacturaDTO
        {
            idFactura = f.idFactura,
            fecha = f.fecha,
            total = f.total,
            metodoPago = f.metodoPago,
            idOrden = f.idOrden
        };

        // GET: api/Facturas
        [HttpGet]
        public async Task<ActionResult<IEnumerable<FacturaListaDTO>>> GetFacturas()
        {
            return await _context.Facturas
                .OrderByDescending(f => f.fecha)
                .Select(f => new FacturaListaDTO
                {
                    idFactura = f.idFactura,
                    fecha = f.fecha,
                    total = f.total,
                    metodoPago = f.metodoPago,
                    idOrden = f.idOrden,
                    cliente = f.Orden.Cita == null ? null
                        : f.Orden.Cita.Vehiculo.Cliente.nombre + " " + f.Orden.Cita.Vehiculo.Cliente.apellido,
                    vehiculo = f.Orden.Cita == null ? null
                        : f.Orden.Cita.Vehiculo.placa + " - " + f.Orden.Cita.Vehiculo.marca + " " + f.Orden.Cita.Vehiculo.modelo
                })
                .ToListAsync();
        }

        // GET: api/Facturas/5
        [HttpGet("{id}")]
        public async Task<ActionResult<FacturaDetalleDTO>> GetFactura(int id)
        {
            var factura = await _context.Facturas
                .Where(f => f.idFactura == id)
                .Select(f => new FacturaDetalleDTO
                {
                    idFactura = f.idFactura,
                    fecha = f.fecha,
                    total = f.total,
                    metodoPago = f.metodoPago,
                    idOrden = f.idOrden,
                    cliente = f.Orden.Cita == null ? null
                        : f.Orden.Cita.Vehiculo.Cliente.nombre + " " + f.Orden.Cita.Vehiculo.Cliente.apellido,
                    vehiculo = f.Orden.Cita == null ? null
                        : f.Orden.Cita.Vehiculo.placa + " - " + f.Orden.Cita.Vehiculo.marca + " " + f.Orden.Cita.Vehiculo.modelo,
                    telefono = f.Orden.Cita == null ? null : f.Orden.Cita.Vehiculo.Cliente.telefono,
                    correo = f.Orden.Cita == null ? null : f.Orden.Cita.Vehiculo.Cliente.correo,
                    observaciones = f.Orden.observaciones,
                    fechaInicio = f.Orden.fechaInicio,
                    fechaFin = f.Orden.fechaFin,

                })
                .FirstOrDefaultAsync();

            if (factura == null)
            {
                return NotFound(new { error = "Factura no encontrada" });
            }

            var copia = await _context.Facturas.AsNoTracking().Where(f => f.idFactura == id)
                .Select(f => new { f.serviciosDetalle, f.repuestosDetalle }).FirstAsync();
            var opciones = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower };
            factura.servicios = JsonSerializer.Deserialize<List<FacturaServicioDTO>>(copia.serviciosDetalle, opciones)!;
            factura.repuestos = JsonSerializer.Deserialize<List<FacturaRepuestoDTO>>(copia.repuestosDetalle, opciones)!;
            return factura;
        }

        // PUT: api/Facturas/5
        // Una factura emitida solo permite corregir el método de pago: la orden, la fecha y el total quedan fijos.
        [Authorize(Roles = RolesApp.Administrador)]
        [HttpPut("{id}")]
        public async Task<IActionResult> PutFactura(int id, FacturaUpdateDTO facturaUpdate)
        {
            var factura = await _context.Facturas.FindAsync(id);
            if (factura == null)
            {
                return NotFound(new { error = "Factura no encontrada" });
            }

            factura.metodoPago = facturaUpdate.metodoPago;

            await _context.SaveChangesAsync();

            return Ok(new { mensaje = "Factura actualizada" });
        }

        // POST: api/Facturas
        // El total se calcula aquí con los servicios y repuestos de la orden; la fecha es la de hoy.
        [Authorize(Roles = RolesApp.Administrador)]
        [HttpPost]
        public async Task<ActionResult<FacturaDTO>> PostFactura(FacturaCreateDTO facturaCreate)
        {
            await using var transaccion = await _context.Database.BeginTransactionAsync();
            if (!await _context.BloquearOrdenAsync(facturaCreate.idOrden))
            {
                return NotFound(new { error = "Orden no encontrada" });
            }

            if (await _context.Facturas.AnyAsync(f => f.idOrden == facturaCreate.idOrden))
            {
                return Conflict(new { error = "Esa orden de trabajo ya tiene una factura." });
            }

            var totalServicios = await _context.OrdenServicios
                .Where(os => os.idOrden == facturaCreate.idOrden)
                .SumAsync(os => (decimal?)os.Servicio.costo) ?? 0m;

            var totalRepuestos = await _context.OrdenInventarios
                .Where(oi => oi.idOrden == facturaCreate.idOrden)
                .SumAsync(oi => (decimal?)(oi.Repuesto.precio * oi.cantidad)) ?? 0m;

            var total = decimal.Round(totalServicios + totalRepuestos, 2);

            if (total <= 0)
            {
                return BadRequest(new
                {
                    error = "La orden no tiene servicios ni repuestos. Agrega items antes de facturar."
                });
            }

            var factura = new Facturacion
            {
                fecha = FechaHoyColombia(),
                total = total,
                metodoPago = facturaCreate.metodoPago,
                idOrden = facturaCreate.idOrden
            };
            _context.Facturas.Add(factura);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex) when (
                ex.InnerException is PostgresException pg && pg.SqlState == PostgresErrorCodes.UniqueViolation)
            {
                // Dos solicitudes simultáneas para la misma orden: la segunda choca con el índice único
                return Conflict(new { error = "Esa orden de trabajo ya tiene una factura." });
            }

            await transaccion.CommitAsync();
            var respuesta = await _context.Facturas.Where(f => f.idFactura == factura.idFactura)
                .Select(ToDto).FirstAsync();

            var emision = new Dictionary<string, object?>
            {
                ["id_factura"] = respuesta.idFactura, ["id_orden"] = respuesta.idOrden,
                ["fecha"] = respuesta.fecha, ["metodo_pago"] = respuesta.metodoPago, ["total"] = respuesta.total
            };
            try
            {
                emision["factus"] = await _factus.Emitir(respuesta);
            }
            catch (Exception ex) when (ex is HttpRequestException or OperationCanceledException or JsonException or UriFormatException)
            {
                emision["factusError"] = "No se pudo emitir la factura electrónica";
            }
            return CreatedAtAction(nameof(GetFactura), new { id = factura.idFactura }, emision);
        }

        // Fecha de emisión en hora de Colombia (UTC-5, sin horario de verano), no la del servidor:
        // con UTC, una factura emitida después de las 7 p. m. quedaría con la fecha de mañana.
        private static DateOnly FechaHoyColombia() =>
            DateOnly.FromDateTime(DateTime.UtcNow.AddHours(-5));

        // DELETE: api/Facturas/5
        [Authorize(Roles = RolesApp.Administrador)]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteFactura(int id)
        {
            var factura = await _context.Facturas.FindAsync(id);
            if (factura == null)
            {
                return NotFound(new { error = "Factura no encontrada" });
            }

            _context.Facturas.Remove(factura);
            await _context.SaveChangesAsync();

            return Ok(new { mensaje = "Factura eliminada" });
        }
    }
}
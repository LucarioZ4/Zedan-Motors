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

        public FacturasController(AppDBContext context)
        {
            _context = context;
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
        public async Task<ActionResult<IEnumerable<FacturaDTO>>> GetFacturas()
        {
            return await _context.Facturas.Select(ToDto).ToListAsync();
        }

        // GET: api/Facturas/5
        [HttpGet("{id}")]
        public async Task<ActionResult<FacturaDTO>> GetFactura(int id)
        {
            var factura = await _context.Facturas.Where(f => f.idFactura == id)
                .Select(ToDto).FirstOrDefaultAsync();

            if (factura == null)
            {
                return NotFound();
            }

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
                return NotFound();
            }

            factura.metodoPago = facturaUpdate.metodoPago;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        // POST: api/Facturas
        [Authorize(Roles = RolesApp.Administrador)]
        [HttpPost]
        public async Task<ActionResult<FacturaDTO>> PostFactura(FacturaCreateDTO facturaCreate)
        {
            if (!await _context.OrdenesTrabajo.AnyAsync(o => o.idOrden == facturaCreate.idOrden))
            {
                return BadRequest(new { mensaje = "La orden de trabajo indicada no existe." });
            }

            if (await _context.Facturas.AnyAsync(f => f.idOrden == facturaCreate.idOrden))
            {
                return Conflict(new { mensaje = "Esa orden de trabajo ya tiene una factura." });
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
                    mensaje = "La orden no tiene servicios ni repuestos. Agrega items antes de facturar."
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
                return Conflict(new { mensaje = "Esa orden de trabajo ya tiene una factura." });
            }

            var respuesta = await _context.Facturas.Where(f => f.idFactura == factura.idFactura)
                .Select(ToDto).FirstAsync();

            return CreatedAtAction(nameof(GetFactura), new { id = factura.idFactura }, respuesta);
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
                return NotFound();
            }

            _context.Facturas.Remove(factura);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
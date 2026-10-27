using System.Linq.Expressions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ZedanMotorsApi.Data;
using ZedanMotorsApi.DTOs;
using ZedanMotorsApi.Models;

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
        // Nota: la orden de una factura no se puede cambiar, solo fecha, total y método de pago.
        [HttpPut("{id}")]
        public async Task<IActionResult> PutFactura(int id, FacturaCreateDTO facturaUpdate)
        {
            var factura = await _context.Facturas.FindAsync(id);
            if (factura == null)
            {
                return NotFound();
            }

            factura.fecha = facturaUpdate.fecha;
            factura.total = facturaUpdate.total;
            factura.metodoPago = facturaUpdate.metodoPago;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        // POST: api/Facturas
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

            var factura = new Facturacion
            {
                fecha = facturaCreate.fecha,
                total = facturaCreate.total,
                metodoPago = facturaCreate.metodoPago,
                idOrden = facturaCreate.idOrden
            };
            _context.Facturas.Add(factura);
            await _context.SaveChangesAsync();

            var respuesta = await _context.Facturas.Where(f => f.idFactura == factura.idFactura)
                .Select(ToDto).FirstAsync();

            return CreatedAtAction(nameof(GetFactura), new { id = factura.idFactura }, respuesta);
        }

        // DELETE: api/Facturas/5
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

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ZedanMotorsApi.Data;
using ZedanMotorsApi.DTOs;
using ZedanMotorsApi.Models;

namespace ZedanMotorsApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class InventarioController : ControllerBase
    {
        private readonly AppDBContext _context;

        public InventarioController(AppDBContext context)
        {
            _context = context;
        }

        // GET: api/Inventario
        [HttpGet]
        public async Task<ActionResult<IEnumerable<InventarioDTO>>> GetInventario()
        {
            return await _context.Inventario.Select(r => new InventarioDTO
            {
                idRepuesto = r.idRepuesto,
                nombre = r.nombre,
                marca = r.marca,
                precio = r.precio,
                stock = r.stock
            }).ToListAsync();
        }

        // GET: api/Inventario/5
        [HttpGet("{id}")]
        public async Task<ActionResult<InventarioDTO>> GetRepuesto(int id)
        {
            var repuesto = await _context.Inventario.Where(r => r.idRepuesto == id)
                .Select(r => new InventarioDTO
                {
                    idRepuesto = r.idRepuesto,
                    nombre = r.nombre,
                    marca = r.marca,
                    precio = r.precio,
                    stock = r.stock
                }).FirstOrDefaultAsync();

            if (repuesto == null)
            {
                return NotFound();
            }

            return repuesto;
        }

        // PUT: api/Inventario/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutRepuesto(int id, InventarioCreateDTO repuestoUpdate)
        {
            var repuesto = await _context.Inventario.FindAsync(id);
            if (repuesto == null)
            {
                return NotFound();
            }

            repuesto.nombre = repuestoUpdate.nombre;
            repuesto.marca = repuestoUpdate.marca;
            repuesto.precio = repuestoUpdate.precio;
            repuesto.stock = repuestoUpdate.stock;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        // POST: api/Inventario
        [HttpPost]
        public async Task<ActionResult<InventarioDTO>> PostRepuesto(InventarioCreateDTO repuestoCreate)
        {
            var repuesto = new Inventario
            {
                nombre = repuestoCreate.nombre,
                marca = repuestoCreate.marca,
                precio = repuestoCreate.precio,
                stock = repuestoCreate.stock
            };
            _context.Inventario.Add(repuesto);
            await _context.SaveChangesAsync();

            var respuesta = new InventarioDTO
            {
                idRepuesto = repuesto.idRepuesto,
                nombre = repuesto.nombre,
                marca = repuesto.marca,
                precio = repuesto.precio,
                stock = repuesto.stock
            };

            return CreatedAtAction(nameof(GetRepuesto), new { id = repuesto.idRepuesto }, respuesta);
        }

        // DELETE: api/Inventario/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteRepuesto(int id)
        {
            var repuesto = await _context.Inventario.FindAsync(id);
            if (repuesto == null)
            {
                return NotFound();
            }

            _context.Inventario.Remove(repuesto);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}

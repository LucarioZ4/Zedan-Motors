using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ZedanMotorsApi.Data;
using ZedanMotorsApi.DTOs;
using ZedanMotorsApi.Models;

namespace ZedanMotorsApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ServiciosController : ControllerBase
    {
        private readonly AppDBContext _context;

        public ServiciosController(AppDBContext context)
        {
            _context = context;
        }

        // GET: api/Servicios
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ServicioDTO>>> GetServicios()
        {
            return await _context.Servicios.Select(s => new ServicioDTO
            {
                idServicio = s.idServicio,
                nombreServicio = s.nombreServicio,
                descripcion = s.descripcion,
                costo = s.costo
            }).ToListAsync();
        }

        // GET: api/Servicios/5
        [HttpGet("{id}")]
        public async Task<ActionResult<ServicioDTO>> GetServicio(int id)
        {
            var servicio = await _context.Servicios.Where(s => s.idServicio == id)
                .Select(s => new ServicioDTO
                {
                    idServicio = s.idServicio,
                    nombreServicio = s.nombreServicio,
                    descripcion = s.descripcion,
                    costo = s.costo
                }).FirstOrDefaultAsync();

            if (servicio == null)
            {
                return NotFound();
            }

            return servicio;
        }

        // PUT: api/Servicios/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutServicio(int id, ServicioCreateDTO servicioUpdate)
        {
            var servicio = await _context.Servicios.FindAsync(id);
            if (servicio == null)
            {
                return NotFound();
            }

            servicio.nombreServicio = servicioUpdate.nombreServicio;
            servicio.descripcion = servicioUpdate.descripcion;
            servicio.costo = servicioUpdate.costo;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                return Conflict(new { mensaje = "Ya existe un servicio con ese nombre." });
            }

            return NoContent();
        }

        // POST: api/Servicios
        [HttpPost]
        public async Task<ActionResult<ServicioDTO>> PostServicio(ServicioCreateDTO servicioCreate)
        {
            var servicio = new Servicio
            {
                nombreServicio = servicioCreate.nombreServicio,
                descripcion = servicioCreate.descripcion,
                costo = servicioCreate.costo
            };
            _context.Servicios.Add(servicio);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                return Conflict(new { mensaje = "Ya existe un servicio con ese nombre." });
            }

            var respuesta = new ServicioDTO
            {
                idServicio = servicio.idServicio,
                nombreServicio = servicio.nombreServicio,
                descripcion = servicio.descripcion,
                costo = servicio.costo
            };

            return CreatedAtAction(nameof(GetServicio), new { id = servicio.idServicio }, respuesta);
        }

        // DELETE: api/Servicios/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteServicio(int id)
        {
            var servicio = await _context.Servicios.FindAsync(id);
            if (servicio == null)
            {
                return NotFound();
            }

            _context.Servicios.Remove(servicio);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}

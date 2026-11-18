using ZedanMotorsApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ZedanMotorsApi.Data;
using ZedanMotorsApi.DTOs;
using ZedanMotorsApi.Models;
using ZedanMotorsApi.Security;

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
        public async Task<ActionResult<IEnumerable<ServicioDTO>>> GetServicios([FromQuery] string? buscar)
        {
            var query = _context.Servicios.AsQueryable();
            if (!string.IsNullOrWhiteSpace(buscar))
            {
                var patron = BusquedaHelper.PatronContiene(buscar);
                query = query.Where(s => EF.Functions.ILike(s.nombreServicio, patron) ||
                    (s.descripcion != null && EF.Functions.ILike(s.descripcion, patron)));
            }

            return await query.OrderBy(s => s.nombreServicio).Select(s => new ServicioDTO
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
                return NotFound(new { error = "Servicio no encontrado" });
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
                return NotFound(new { error = "Servicio no encontrado" });
            }

            servicio.nombreServicio = servicioUpdate.nombreServicio.Trim();
            servicio.descripcion = string.IsNullOrEmpty(servicioUpdate.descripcion) ? null : servicioUpdate.descripcion;
            servicio.costo = servicioUpdate.costo;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex) when (ex.InnerException is Npgsql.PostgresException { SqlState: "23505" })
            {
                return Conflict(new { error = "Ya existe un servicio con ese nombre." });
            }

            return Ok(new ServicioDTO
            {
                idServicio = servicio.idServicio, nombreServicio = servicio.nombreServicio,
                descripcion = servicio.descripcion, costo = servicio.costo
            });
        }

        // POST: api/Servicios
        [HttpPost]
        public async Task<ActionResult<ServicioDTO>> PostServicio(ServicioCreateDTO servicioCreate)
        {
            var servicio = new Servicio
            {
                nombreServicio = servicioCreate.nombreServicio.Trim(),
                descripcion = string.IsNullOrEmpty(servicioCreate.descripcion) ? null : servicioCreate.descripcion,
                costo = servicioCreate.costo
            };
            _context.Servicios.Add(servicio);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex) when (ex.InnerException is Npgsql.PostgresException { SqlState: "23505" })
            {
                return Conflict(new { error = "Ya existe un servicio con ese nombre." });
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
        [Authorize(Roles = RolesApp.Administrador)]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteServicio(int id)
        {
            var servicio = await _context.Servicios.FindAsync(id);
            if (servicio == null)
            {
                return NotFound(new { error = "Servicio no encontrado" });
            }

            _context.Servicios.Remove(servicio);
            await _context.SaveChangesAsync();

            return Ok(new { mensaje = "Servicio eliminado" });
        }
    }
}

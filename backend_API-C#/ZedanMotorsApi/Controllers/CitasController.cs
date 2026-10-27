using System.Linq.Expressions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ZedanMotorsApi.Data;
using ZedanMotorsApi.DTOs;
using ZedanMotorsApi.Models;

namespace ZedanMotorsApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CitasController : ControllerBase
    {
        private readonly AppDBContext _context;

        public CitasController(AppDBContext context)
        {
            _context = context;
        }

        private static readonly Expression<Func<Cita, CitaDTO>> ToDto = c => new CitaDTO
        {
            idCita = c.idCita,
            fecha = c.fecha,
            hora = c.hora,
            motivo = c.motivo,
            idVehiculo = c.idVehiculo,
            placaVehiculo = c.Vehiculo.placa,
            idEstado = c.idEstado,
            nombreEstado = c.Estado == null ? null : c.Estado.nombreEstado
        };

        // GET: api/Citas
        [HttpGet]
        public async Task<ActionResult<IEnumerable<CitaDTO>>> GetCitas()
        {
            return await _context.Citas.OrderBy(c => c.fecha).ThenBy(c => c.hora)
                .Select(ToDto).ToListAsync();
        }

        // GET: api/Citas/5
        [HttpGet("{id}")]
        public async Task<ActionResult<CitaDTO>> GetCita(int id)
        {
            var cita = await _context.Citas.Where(c => c.idCita == id)
                .Select(ToDto).FirstOrDefaultAsync();

            if (cita == null)
            {
                return NotFound();
            }

            return cita;
        }

        // PUT: api/Citas/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutCita(int id, CitaCreateDTO citaUpdate)
        {
            var cita = await _context.Citas.FindAsync(id);
            if (cita == null)
            {
                return NotFound();
            }

            var error = await ValidarRelaciones(citaUpdate);
            if (error != null)
            {
                return BadRequest(new { mensaje = error });
            }

            cita.fecha = citaUpdate.fecha;
            cita.hora = citaUpdate.hora;
            cita.motivo = citaUpdate.motivo;
            cita.idVehiculo = citaUpdate.idVehiculo;
            cita.idEstado = citaUpdate.idEstado;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        // POST: api/Citas
        [HttpPost]
        public async Task<ActionResult<CitaDTO>> PostCita(CitaCreateDTO citaCreate)
        {
            var error = await ValidarRelaciones(citaCreate);
            if (error != null)
            {
                return BadRequest(new { mensaje = error });
            }

            var cita = new Cita
            {
                fecha = citaCreate.fecha,
                hora = citaCreate.hora,
                motivo = citaCreate.motivo,
                idVehiculo = citaCreate.idVehiculo,
                idEstado = citaCreate.idEstado
            };
            _context.Citas.Add(cita);
            await _context.SaveChangesAsync();

            var respuesta = await _context.Citas.Where(c => c.idCita == cita.idCita)
                .Select(ToDto).FirstAsync();

            return CreatedAtAction(nameof(GetCita), new { id = cita.idCita }, respuesta);
        }

        // DELETE: api/Citas/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCita(int id)
        {
            var cita = await _context.Citas.FindAsync(id);
            if (cita == null)
            {
                return NotFound();
            }

            _context.Citas.Remove(cita);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private async Task<string?> ValidarRelaciones(CitaCreateDTO dto)
        {
            if (!await _context.Vehiculos.AnyAsync(v => v.idVehiculo == dto.idVehiculo))
            {
                return "El vehículo indicado no existe.";
            }

            if (dto.idEstado != null && !await _context.Estados.AnyAsync(e => e.idEstado == dto.idEstado))
            {
                return "El estado indicado no existe.";
            }

            return null;
        }
    }
}

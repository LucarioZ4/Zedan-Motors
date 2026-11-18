using System.Linq.Expressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ZedanMotorsApi.Data;
using ZedanMotorsApi.DTOs;
using ZedanMotorsApi.Models;
using ZedanMotorsApi.Security;
using ZedanMotorsApi.Services;

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
            idCliente = c.Vehiculo.idCliente,
            cliente = c.Vehiculo.Cliente.nombre + " " + c.Vehiculo.Cliente.apellido,
            vehiculo = c.Vehiculo.placa + " - " + c.Vehiculo.marca + " " + c.Vehiculo.modelo,
            idEstado = c.idEstado,
            estado = c.Estado == null ? null : c.Estado.nombreEstado
        };

        // GET: api/Citas
        [HttpGet]
        public async Task<ActionResult<IEnumerable<CitaDTO>>> GetCitas([FromQuery] string? buscar)
        {
            var consulta = _context.Citas.AsQueryable();

            // Búsqueda por cliente, placa o motivo (el React envía ?buscar=)
            if (!string.IsNullOrWhiteSpace(buscar))
            {
                var patron = BusquedaHelper.PatronContiene(buscar);
                consulta = consulta.Where(c =>
                    EF.Functions.ILike(c.Vehiculo.Cliente.nombre, patron) ||
                    EF.Functions.ILike(c.Vehiculo.Cliente.apellido, patron) ||
                    EF.Functions.ILike(c.Vehiculo.placa, patron) ||
                    (c.motivo != null && EF.Functions.ILike(c.motivo, patron)));
            }

            return await consulta
                .OrderByDescending(c => c.fecha).ThenBy(c => c.hora)
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
                return NotFound(new { error = "Cita no encontrada" });
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
                return NotFound(new { error = "Cita no encontrada" });
            }

            var error = await ValidarRelaciones(citaUpdate);
            if (error != null)
            {
                return BadRequest(new { error = error });
            }

            cita.fecha = citaUpdate.fecha;
            cita.hora = citaUpdate.hora;
            cita.motivo = citaUpdate.motivo;
            cita.idVehiculo = citaUpdate.idVehiculo;
            cita.idEstado = citaUpdate.idEstado ?? 1;

            await _context.SaveChangesAsync();

            return Ok((await GetCita(id)).Value);
        }

        // POST: api/Citas
        [HttpPost]
        public async Task<ActionResult<CitaDTO>> PostCita(CitaCreateDTO citaCreate)
        {
            if (citaCreate.fecha < FechaColombia.Hoy()) return BadRequest(new { error = "No puede agendar citas en fechas pasadas" });
            var error = await ValidarRelaciones(citaCreate);
            if (error != null)
            {
                return BadRequest(new { error = error });
            }

            var cita = new Cita
            {
                fecha = citaCreate.fecha,
                hora = citaCreate.hora,
                motivo = citaCreate.motivo,
                idVehiculo = citaCreate.idVehiculo,
                idEstado = citaCreate.idEstado ?? 1
            };
            _context.Citas.Add(cita);
            await _context.SaveChangesAsync();

            var respuesta = await _context.Citas.Where(c => c.idCita == cita.idCita)
                .Select(ToDto).FirstAsync();

            return CreatedAtAction(nameof(GetCita), new { id = cita.idCita }, respuesta);
        }

        // DELETE: api/Citas/5
        [Authorize(Roles = RolesApp.Administrador)]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCita(int id)
        {
            var cita = await _context.Citas.FindAsync(id);
            if (cita == null)
            {
                return NotFound(new { error = "Cita no encontrada" });
            }

            _context.Citas.Remove(cita);
            await _context.SaveChangesAsync();

            return Ok(new { mensaje = "Cita eliminada" });
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
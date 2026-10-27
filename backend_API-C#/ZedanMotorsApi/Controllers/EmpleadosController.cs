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
    public class EmpleadosController : ControllerBase
    {
        private readonly AppDBContext _context;

        public EmpleadosController(AppDBContext context)
        {
            _context = context;
        }

        private static readonly Expression<Func<Empleado, EmpleadoDTO>> ToDto = e => new EmpleadoDTO
        {
            idEmpleado = e.idEmpleado,
            nombre = e.nombre,
            apellido = e.apellido,
            telefono = e.telefono,
            correo = e.correo,
            idCargo = e.idCargo,
            nombreCargo = e.Cargo == null ? null : e.Cargo.nombreCargo
        };

        // GET: api/Empleados
        [HttpGet]
        public async Task<ActionResult<IEnumerable<EmpleadoDTO>>> GetEmpleados()
        {
            return await _context.Empleados.Select(ToDto).ToListAsync();
        }

        // GET: api/Empleados/5
        [HttpGet("{id}")]
        public async Task<ActionResult<EmpleadoDTO>> GetEmpleado(int id)
        {
            var empleado = await _context.Empleados.Where(e => e.idEmpleado == id)
                .Select(ToDto).FirstOrDefaultAsync();

            if (empleado == null)
            {
                return NotFound();
            }

            return empleado;
        }

        // PUT: api/Empleados/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutEmpleado(int id, EmpleadoCreateDTO empleadoUpdate)
        {
            var empleado = await _context.Empleados.FindAsync(id);
            if (empleado == null)
            {
                return NotFound();
            }

            if (empleadoUpdate.idCargo != null &&
                !await _context.Cargos.AnyAsync(c => c.idCargo == empleadoUpdate.idCargo))
            {
                return BadRequest(new { mensaje = "El cargo indicado no existe." });
            }

            empleado.nombre = empleadoUpdate.nombre;
            empleado.apellido = empleadoUpdate.apellido;
            empleado.telefono = empleadoUpdate.telefono;
            empleado.correo = empleadoUpdate.correo;
            empleado.idCargo = empleadoUpdate.idCargo;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                return Conflict(new { mensaje = "El teléfono o el correo ya están registrados." });
            }

            return NoContent();
        }

        // POST: api/Empleados
        [HttpPost]
        public async Task<ActionResult<EmpleadoDTO>> PostEmpleado(EmpleadoCreateDTO empleadoCreate)
        {
            if (empleadoCreate.idCargo != null &&
                !await _context.Cargos.AnyAsync(c => c.idCargo == empleadoCreate.idCargo))
            {
                return BadRequest(new { mensaje = "El cargo indicado no existe." });
            }

            var empleado = new Empleado
            {
                nombre = empleadoCreate.nombre,
                apellido = empleadoCreate.apellido,
                telefono = empleadoCreate.telefono,
                correo = empleadoCreate.correo,
                idCargo = empleadoCreate.idCargo
            };
            _context.Empleados.Add(empleado);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                return Conflict(new { mensaje = "El teléfono o el correo ya están registrados." });
            }

            var respuesta = await _context.Empleados.Where(e => e.idEmpleado == empleado.idEmpleado)
                .Select(ToDto).FirstAsync();

            return CreatedAtAction(nameof(GetEmpleado), new { id = empleado.idEmpleado }, respuesta);
        }

        // DELETE: api/Empleados/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteEmpleado(int id)
        {
            var empleado = await _context.Empleados.FindAsync(id);
            if (empleado == null)
            {
                return NotFound();
            }

            _context.Empleados.Remove(empleado);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}

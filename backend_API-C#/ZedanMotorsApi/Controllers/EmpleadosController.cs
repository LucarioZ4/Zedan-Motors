using System.Linq.Expressions;
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
            cargo = e.Cargo == null ? null : e.Cargo.nombreCargo
        };

        // GET: api/Empleados
        [HttpGet]
        public async Task<ActionResult<IEnumerable<EmpleadoDTO>>> GetEmpleados()
        {
            return await _context.Empleados.OrderBy(e => e.apellido).ThenBy(e => e.nombre).Select(ToDto).ToListAsync();
        }

        // GET: api/Empleados/5
        [HttpGet("{id}")]
        public async Task<ActionResult<EmpleadoDTO>> GetEmpleado(int id)
        {
            var empleado = await _context.Empleados.Where(e => e.idEmpleado == id)
                .Select(ToDto).FirstOrDefaultAsync();

            if (empleado == null)
            {
                return NotFound(new { error = "Empleado no encontrado" });
            }

            return empleado;
        }

        // PUT: api/Empleados/5
        [Authorize(Roles = RolesApp.Administrador)]
        [HttpPut("{id}")]
        public async Task<IActionResult> PutEmpleado(int id, EmpleadoCreateDTO empleadoUpdate)
        {
            var empleado = await _context.Empleados.FindAsync(id);
            if (empleado == null)
            {
                return NotFound(new { error = "Empleado no encontrado" });
            }

            if (empleadoUpdate.idCargo != null &&
                !await _context.Cargos.AnyAsync(c => c.idCargo == empleadoUpdate.idCargo))
            {
                return BadRequest(new { error = "El cargo indicado no existe." });
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
                return Conflict(new { error = "El teléfono o el correo ya están registrados." });
            }

            return Ok(new { mensaje = "Empleado actualizado" });
        }

        // POST: api/Empleados
        [Authorize(Roles = RolesApp.Administrador)]
        [HttpPost]
        public async Task<ActionResult<EmpleadoDTO>> PostEmpleado(EmpleadoCreateDTO empleadoCreate)
        {
            if (empleadoCreate.idCargo != null &&
                !await _context.Cargos.AnyAsync(c => c.idCargo == empleadoCreate.idCargo))
            {
                return BadRequest(new { error = "El cargo indicado no existe." });
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
                return Conflict(new { error = "El teléfono o el correo ya están registrados." });
            }

            var respuesta = await _context.Empleados.Where(e => e.idEmpleado == empleado.idEmpleado)
                .Select(ToDto).FirstAsync();

            return CreatedAtAction(nameof(GetEmpleado), new { id = empleado.idEmpleado }, respuesta);
        }

        // DELETE: api/Empleados/5
        [Authorize(Roles = RolesApp.Administrador)]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteEmpleado(int id)
        {
            var empleado = await _context.Empleados.FindAsync(id);
            if (empleado == null)
            {
                return NotFound(new { error = "Empleado no encontrado" });
            }

            _context.Empleados.Remove(empleado);
            await _context.SaveChangesAsync();

            return Ok(new { mensaje = "Empleado eliminado" });
        }
    }
}
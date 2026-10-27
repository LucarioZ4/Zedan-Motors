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
    public class VehiculosController : ControllerBase
    {
        private readonly AppDBContext _context;

        public VehiculosController(AppDBContext context)
        {
            _context = context;
        }

        private static readonly Expression<Func<Vehiculo, VehiculoDTO>> ToDto = v => new VehiculoDTO
        {
            idVehiculo = v.idVehiculo,
            placa = v.placa,
            modelo = v.modelo,
            anio = v.anio,
            marca = v.marca,
            color = v.color,
            idCliente = v.idCliente,
            nombreCliente = v.Cliente.nombre + " " + v.Cliente.apellido
        };

        // GET: api/Vehiculos
        [HttpGet]
        public async Task<ActionResult<IEnumerable<VehiculoDTO>>> GetVehiculos()
        {
            return await _context.Vehiculos.Select(ToDto).ToListAsync();
        }

        // GET: api/Vehiculos/5
        [HttpGet("{id}")]
        public async Task<ActionResult<VehiculoDTO>> GetVehiculo(int id)
        {
            var vehiculo = await _context.Vehiculos.Where(v => v.idVehiculo == id)
                .Select(ToDto).FirstOrDefaultAsync();

            if (vehiculo == null)
            {
                return NotFound();
            }

            return vehiculo;
        }

        // PUT: api/Vehiculos/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutVehiculo(int id, VehiculoCreateDTO vehiculoUpdate)
        {
            var vehiculo = await _context.Vehiculos.FindAsync(id);
            if (vehiculo == null)
            {
                return NotFound();
            }

            if (!await _context.Clientes.AnyAsync(c => c.idCliente == vehiculoUpdate.idCliente))
            {
                return BadRequest(new { mensaje = "El cliente indicado no existe." });
            }

            vehiculo.placa = vehiculoUpdate.placa;
            vehiculo.modelo = vehiculoUpdate.modelo;
            vehiculo.anio = vehiculoUpdate.anio;
            vehiculo.marca = vehiculoUpdate.marca;
            vehiculo.color = vehiculoUpdate.color;
            vehiculo.idCliente = vehiculoUpdate.idCliente;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                return Conflict(new { mensaje = "Ya existe un vehículo con esa placa." });
            }

            return NoContent();
        }

        // POST: api/Vehiculos
        [HttpPost]
        public async Task<ActionResult<VehiculoDTO>> PostVehiculo(VehiculoCreateDTO vehiculoCreate)
        {
            if (!await _context.Clientes.AnyAsync(c => c.idCliente == vehiculoCreate.idCliente))
            {
                return BadRequest(new { mensaje = "El cliente indicado no existe." });
            }

            var vehiculo = new Vehiculo
            {
                placa = vehiculoCreate.placa,
                modelo = vehiculoCreate.modelo,
                anio = vehiculoCreate.anio,
                marca = vehiculoCreate.marca,
                color = vehiculoCreate.color,
                idCliente = vehiculoCreate.idCliente
            };
            _context.Vehiculos.Add(vehiculo);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                return Conflict(new { mensaje = "Ya existe un vehículo con esa placa." });
            }

            var respuesta = await _context.Vehiculos.Where(v => v.idVehiculo == vehiculo.idVehiculo)
                .Select(ToDto).FirstAsync();

            return CreatedAtAction(nameof(GetVehiculo), new { id = vehiculo.idVehiculo }, respuesta);
        }

        // DELETE: api/Vehiculos/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteVehiculo(int id)
        {
            var vehiculo = await _context.Vehiculos.FindAsync(id);
            if (vehiculo == null)
            {
                return NotFound();
            }

            _context.Vehiculos.Remove(vehiculo);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}

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
    public class ClientesController : ControllerBase
    {
        private readonly AppDBContext _context;

        public ClientesController(AppDBContext context)
        {
            _context = context;
        }

        // GET: api/Clientes
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ClienteListaDTO>>> GetClientes([FromQuery] string? buscar)
        {
            var consulta = _context.Clientes.AsQueryable();

            // Búsqueda por nombre, apellido o teléfono (el React envía ?buscar=)
            if (!string.IsNullOrWhiteSpace(buscar))
            {
                var patron = BusquedaHelper.PatronContiene(buscar);
                consulta = consulta.Where(c =>
                    EF.Functions.ILike(c.nombre, patron) ||
                    EF.Functions.ILike(c.apellido, patron) ||
                    EF.Functions.ILike(c.telefono, patron));
            }

            return await consulta
                .OrderBy(c => c.apellido).ThenBy(c => c.nombre)
                .Select(c => new ClienteListaDTO
                {
                    idCliente = c.idCliente,
                    nombre = c.nombre,
                    apellido = c.apellido,
                    telefono = c.telefono,
                    correo = c.correo,
                    direccion = c.direccion,
                    totalVehiculos = c.Vehiculos.Count()
                }).ToListAsync();
        }

        // GET: api/Clientes/5
        [HttpGet("{id}")]
        public async Task<ActionResult<ClienteDTO>> GetCliente(int id)
        {
            var cliente = await _context.Clientes.Where(c => c.idCliente == id)
                .Select(c => new ClienteDTO
                {
                    idCliente = c.idCliente,
                    nombre = c.nombre,
                    apellido = c.apellido,
                    telefono = c.telefono,
                    correo = c.correo,
                    direccion = c.direccion,
                    Vehiculos = c.Vehiculos.Select(v => new VehiculoDTO
                    {
                        idVehiculo = v.idVehiculo,
                        placa = v.placa,
                        modelo = v.modelo,
                        anio = v.anio,
                        marca = v.marca,
                        color = v.color,
                        idCliente = v.idCliente
                    }).ToList()
                }).FirstOrDefaultAsync();

            if (cliente == null)
            {
                return NotFound(new { error = "Cliente no encontrado" });
            }

            return cliente;
        }

        // GET: api/Clientes/5/Vehiculos
        [HttpGet("{id}/Vehiculos")]
        public async Task<ActionResult<IEnumerable<VehiculoDTO>>> GetVehiculosPorCliente(int id)
        {
            var vehiculos = await _context.Vehiculos
                .Where(v => v.idCliente == id)
                .Select(v => new VehiculoDTO
                {
                    idVehiculo = v.idVehiculo,
                    placa = v.placa,
                    modelo = v.modelo,
                    anio = v.anio,
                    marca = v.marca,
                    color = v.color,
                    idCliente = v.idCliente,
                    cliente = v.Cliente.nombre + " " + v.Cliente.apellido
                }).ToListAsync();

            return vehiculos;
        }

        // PUT: api/Clientes/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutCliente(int id, ClienteCreateDTO clienteUpdate)
        {
            var cliente = await _context.Clientes.FindAsync(id);
            if (cliente == null)
            {
                return NotFound(new { error = "Cliente no encontrado" });
            }

            cliente.nombre = clienteUpdate.nombre;
            cliente.apellido = clienteUpdate.apellido;
            cliente.telefono = clienteUpdate.telefono;
            cliente.correo = clienteUpdate.correo;
            cliente.direccion = clienteUpdate.direccion;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                return Conflict(new { error = "El teléfono o el correo ya están registrados." });
            }

            return Ok(new { mensaje = "Cliente actualizado" });
        }

        // POST: api/Clientes
        [HttpPost]
        public async Task<ActionResult<ClienteDTO>> PostCliente(ClienteCreateDTO clienteCreate)
        {
            var cliente = new Cliente
            {
                nombre = clienteCreate.nombre,
                apellido = clienteCreate.apellido,
                telefono = clienteCreate.telefono,
                correo = clienteCreate.correo,
                direccion = clienteCreate.direccion
            };
            _context.Clientes.Add(cliente);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                return Conflict(new { error = "El teléfono o el correo ya están registrados." });
            }

            var respuesta = new ClienteDTO
            {
                idCliente = cliente.idCliente,
                nombre = cliente.nombre,
                apellido = cliente.apellido,
                telefono = cliente.telefono,
                correo = cliente.correo,
                direccion = cliente.direccion
            };

            return CreatedAtAction(nameof(GetCliente), new { id = cliente.idCliente }, respuesta);
        }

        // DELETE: api/Clientes/5
        [Authorize(Roles = RolesApp.Administrador)]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCliente(int id)
        {
            var cliente = await _context.Clientes.FindAsync(id);
            if (cliente == null)
            {
                return NotFound(new { error = "Cliente no encontrado" });
            }

            _context.Clientes.Remove(cliente);
            await _context.SaveChangesAsync();

            return Ok(new { mensaje = "Cliente eliminado" });
        }
    }
}
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ZedanMotorsApi.Data;
using ZedanMotorsApi.DTOs;
using ZedanMotorsApi.Models;

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
        public async Task<ActionResult<IEnumerable<ClienteListaDTO>>> GetClientes()
        {
            return await _context.Clientes.Select(c => new ClienteListaDTO
            {
                idCliente = c.idCliente,
                nombre = c.nombre,
                apellido = c.apellido,
                telefono = c.telefono,
                correo = c.correo,
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
                return NotFound();
            }

            return cliente;
        }

        // PUT: api/Clientes/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutCliente(int id, ClienteCreateDTO clienteUpdate)
        {
            var cliente = await _context.Clientes.FindAsync(id);
            if (cliente == null)
            {
                return NotFound();
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
                return Conflict(new { mensaje = "El teléfono o el correo ya están registrados." });
            }

            return NoContent();
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
                return Conflict(new { mensaje = "El teléfono o el correo ya están registrados." });
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
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCliente(int id)
        {
            var cliente = await _context.Clientes.FindAsync(id);
            if (cliente == null)
            {
                return NotFound();
            }

            _context.Clientes.Remove(cliente);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}

using System.Linq.Expressions;
using System.Text.Json;
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
    public class VehiculosController : ControllerBase
    {
        private readonly AppDBContext _context;
        private readonly ILogger<VehiculosController> _logger;

        public VehiculosController(AppDBContext context, ILogger<VehiculosController> logger)
        {
            _context = context;
            _logger = logger;
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
        [Authorize(Roles = RolesApp.Administrador)]
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

        // POST: api/Vehiculos/importar
        // Acepta un arreglo o { items: [...], idClienteDefecto }. Las filas válidas se guardan juntas;
        // las inválidas se devuelven en "errores" sin impedir que se guarden las demás.
        [HttpPost("importar")]
        public async Task<IActionResult> Importar([FromBody] JsonElement body)
        {
            if (!ImportacionHelper.TryObtenerFilas(body, out var filas))
            {
                return BadRequest(new { error = "No se enviaron datos para importar" });
            }

            if (filas.Count > ImportacionHelper.MaxFilas)
            {
                return BadRequest(new { error = $"Máximo {ImportacionHelper.MaxFilas} filas por importación." });
            }

            int? idClienteDefecto = null;
            if (ImportacionHelper.TryEntero(ImportacionHelper.Texto(body, "idClienteDefecto"), out var defecto))
            {
                idClienteDefecto = defecto;
            }

            // Clientes existentes: se pueden indicar por id, correo o nombre completo
            var clientes = await _context.Clientes
                .AsNoTracking()
                .Select(c => new { c.idCliente, c.nombre, c.apellido, c.correo })
                .ToListAsync();

            var idsClientes = clientes.Select(c => c.idCliente).ToHashSet();
            var clientesPorClave = new Dictionary<string, int>();
            foreach (var c in clientes)
            {
                if (!string.IsNullOrWhiteSpace(c.correo))
                {
                    clientesPorClave[c.correo.ToLowerInvariant().Trim()] = c.idCliente;
                }
                clientesPorClave[$"{c.nombre} {c.apellido}".ToLowerInvariant().Trim()] = c.idCliente;
            }

            // Placas que ya existen en la base
            var placasArchivo = filas
                .Select(f => ImportacionHelper.Texto(f, "placa").ToUpperInvariant())
                .Where(p => p.Length > 0)
                .Distinct()
                .ToList();
            var placasExistentes = (await _context.Vehiculos
                .Where(v => placasArchivo.Contains(v.placa))
                .Select(v => v.placa)
                .ToListAsync()).ToHashSet();
            var placasVistas = new HashSet<string>();

            var nuevos = new List<Vehiculo>();
            var errores = new List<string>();
            var anioMaximo = FechaColombia.Hoy().Year + 1;

            for (var i = 0; i < filas.Count; i++)
            {
                var item = filas[i];
                var fila = i + 1;

                var placa = ImportacionHelper.Texto(item, "placa").ToUpperInvariant();
                var marca = ImportacionHelper.Texto(item, "marca");
                var modelo = ImportacionHelper.Texto(item, "modelo");
                var anioTexto = ImportacionHelper.Texto(item, "anio");
                var color = ImportacionHelper.Texto(item, "color");

                // Cliente: id_cliente, luego "cliente" (id, correo o nombre completo), luego el valor por defecto
                int? idCliente = null;
                if (ImportacionHelper.TryEntero(ImportacionHelper.Texto(item, "id_cliente"), out var idDirecto))
                {
                    idCliente = idDirecto;
                }
                if (idCliente == null)
                {
                    var clave = ImportacionHelper.Texto(item, "cliente").ToLowerInvariant();
                    if (clave.Length > 0)
                    {
                        if (clientesPorClave.TryGetValue(clave, out var idPorNombre))
                        {
                            idCliente = idPorNombre;
                        }
                        else if (ImportacionHelper.TryEntero(clave, out var idPorTexto) && idsClientes.Contains(idPorTexto))
                        {
                            idCliente = idPorTexto;
                        }
                    }
                }
                if (idCliente == null && idClienteDefecto != null)
                {
                    idCliente = idClienteDefecto;
                }

                if (placa.Length == 0)
                {
                    errores.Add($"Fila {fila}: La placa es obligatoria.");
                    continue;
                }
                if (placa.Length > 10)
                {
                    errores.Add($"Fila {fila} ({placa}): La placa no puede tener más de 10 caracteres.");
                    continue;
                }
                if (marca.Length == 0)
                {
                    errores.Add($"Fila {fila} ({placa}): La marca es obligatoria.");
                    continue;
                }
                if (modelo.Length == 0)
                {
                    errores.Add($"Fila {fila} ({placa}): El modelo es obligatorio.");
                    continue;
                }
                if (marca.Length > 50 || modelo.Length > 50)
                {
                    errores.Add($"Fila {fila} ({placa}): La marca y el modelo no pueden tener más de 50 caracteres.");
                    continue;
                }
                if (color.Length > 20)
                {
                    errores.Add($"Fila {fila} ({placa}): El color no puede tener más de 20 caracteres.");
                    continue;
                }
                if (idCliente == null || !idsClientes.Contains(idCliente.Value))
                {
                    errores.Add($"Fila {fila} ({placa}): Debe especificar un cliente válido existente.");
                    continue;
                }

                int? anio = null;
                if (anioTexto.Length > 0)
                {
                    if (!ImportacionHelper.TryEntero(anioTexto, out var anioNumero)
                        || anioNumero < 1900 || anioNumero > anioMaximo)
                    {
                        errores.Add($"Fila {fila} ({placa}): Año no válido ({anioTexto}).");
                        continue;
                    }
                    anio = anioNumero;
                }

                // También detecta placas repetidas dentro del mismo archivo
                if (placasExistentes.Contains(placa) || !placasVistas.Add(placa))
                {
                    errores.Add($"Fila {fila} ({placa}): La placa ya está registrada.");
                    continue;
                }

                nuevos.Add(new Vehiculo
                {
                    placa = placa,
                    marca = marca,
                    modelo = modelo,
                    anio = anio,
                    color = color.Length > 0 ? color : null,
                    idCliente = idCliente.Value
                });
            }

            if (nuevos.Count > 0)
            {
                _context.Vehiculos.AddRange(nuevos);
                try
                {
                    await _context.SaveChangesAsync();
                }
                catch (DbUpdateException ex)
                {
                    _logger.LogError(ex, "Error al importar vehículos");
                    return StatusCode(StatusCodes.Status500InternalServerError,
                        new { error = "Error al importar vehículos" });
                }
            }

            return StatusCode(StatusCodes.Status201Created, new ImportacionRespuestaDTO<VehiculoDTO>
            {
                mensaje = $"Se importaron {nuevos.Count} vehículos correctamente.",
                total = nuevos.Count,
                errores = errores.Count > 0 ? errores : null,
                data = nuevos.Select(v => new VehiculoDTO
                {
                    idVehiculo = v.idVehiculo,
                    placa = v.placa,
                    modelo = v.modelo,
                    anio = v.anio,
                    marca = v.marca,
                    color = v.color,
                    idCliente = v.idCliente
                }).ToList()
            });
        }
    }
}
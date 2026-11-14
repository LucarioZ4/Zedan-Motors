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
    public class InventarioController : ControllerBase
    {
        private readonly AppDBContext _context;
        private readonly ILogger<InventarioController> _logger;

        public InventarioController(AppDBContext context, ILogger<InventarioController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/Inventario
        [HttpGet]
        public async Task<ActionResult<IEnumerable<InventarioDTO>>> GetInventario()
        {
            return await _context.Inventario.Select(r => new InventarioDTO
            {
                idRepuesto = r.idRepuesto,
                nombre = r.nombre,
                marca = r.marca,
                precio = r.precio,
                stock = r.stock
            }).ToListAsync();
        }

        // GET: api/Inventario/5
        [HttpGet("{id}")]
        public async Task<ActionResult<InventarioDTO>> GetRepuesto(int id)
        {
            var repuesto = await _context.Inventario.Where(r => r.idRepuesto == id)
                .Select(r => new InventarioDTO
                {
                    idRepuesto = r.idRepuesto,
                    nombre = r.nombre,
                    marca = r.marca,
                    precio = r.precio,
                    stock = r.stock
                }).FirstOrDefaultAsync();

            if (repuesto == null)
            {
                return NotFound();
            }

            return repuesto;
        }

        // PUT: api/Inventario/5
        [Authorize(Roles = RolesApp.AdminOJefe)]
        [HttpPut("{id}")]
        public async Task<IActionResult> PutRepuesto(int id, InventarioCreateDTO repuestoUpdate)
        {
            var repuesto = await _context.Inventario.FindAsync(id);
            if (repuesto == null)
            {
                return NotFound();
            }

            repuesto.nombre = repuestoUpdate.nombre;
            repuesto.marca = repuestoUpdate.marca;
            repuesto.precio = repuestoUpdate.precio;
            repuesto.stock = repuestoUpdate.stock;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        // POST: api/Inventario
        [Authorize(Roles = RolesApp.AdminOJefe)]
        [HttpPost]
        public async Task<ActionResult<InventarioDTO>> PostRepuesto(InventarioCreateDTO repuestoCreate)
        {
            var repuesto = new Inventario
            {
                nombre = repuestoCreate.nombre,
                marca = repuestoCreate.marca,
                precio = repuestoCreate.precio,
                stock = repuestoCreate.stock
            };
            _context.Inventario.Add(repuesto);
            await _context.SaveChangesAsync();

            var respuesta = new InventarioDTO
            {
                idRepuesto = repuesto.idRepuesto,
                nombre = repuesto.nombre,
                marca = repuesto.marca,
                precio = repuesto.precio,
                stock = repuesto.stock
            };

            return CreatedAtAction(nameof(GetRepuesto), new { id = repuesto.idRepuesto }, respuesta);
        }

        // DELETE: api/Inventario/5
        [Authorize(Roles = RolesApp.Administrador)]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteRepuesto(int id)
        {
            var repuesto = await _context.Inventario.FindAsync(id);
            if (repuesto == null)
            {
                return NotFound();
            }

            _context.Inventario.Remove(repuesto);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // POST: api/Inventario/importar
        // Acepta un arreglo o { items: [...] }. Las filas válidas se guardan juntas;
        // las inválidas se devuelven en "errores" sin impedir que se guarden las demás.
        [Authorize(Roles = RolesApp.AdminOJefe)]
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

            var nuevos = new List<Inventario>();
            var errores = new List<string>();

            for (var i = 0; i < filas.Count; i++)
            {
                var item = filas[i];
                var fila = i + 1;

                var nombre = ImportacionHelper.Texto(item, "nombre");
                var marca = ImportacionHelper.Texto(item, "marca");
                var precioTexto = ImportacionHelper.Texto(item, "precio");
                var stockTexto = ImportacionHelper.Texto(item, "stock");

                if (nombre.Length == 0)
                {
                    errores.Add($"Fila {fila}: El nombre es obligatorio.");
                    continue;
                }
                if (nombre.Length > 100)
                {
                    errores.Add($"Fila {fila} ({nombre}): El nombre no puede tener más de 100 caracteres.");
                    continue;
                }
                if (marca.Length > 50)
                {
                    errores.Add($"Fila {fila} ({nombre}): La marca no puede tener más de 50 caracteres.");
                    continue;
                }
                if (!ImportacionHelper.TryDecimal(precioTexto, out var precio) || precio <= 0 || precio > 99999999.99m)
                {
                    errores.Add($"Fila {fila} ({nombre}): Precio inválido ({precioTexto}). Debe ser mayor a cero.");
                    continue;
                }

                // Sin stock indicado se asume 0
                var stock = 0;
                if (stockTexto.Length > 0 && (!ImportacionHelper.TryEntero(stockTexto, out stock) || stock < 0))
                {
                    errores.Add($"Fila {fila} ({nombre}): Stock inválido ({stockTexto}). No puede ser negativo.");
                    continue;
                }

                nuevos.Add(new Inventario
                {
                    nombre = nombre,
                    marca = marca.Length > 0 ? marca : null,
                    precio = decimal.Round(precio, 2),
                    stock = stock
                });
            }

            if (nuevos.Count > 0)
            {
                _context.Inventario.AddRange(nuevos);
                try
                {
                    await _context.SaveChangesAsync();
                }
                catch (DbUpdateException ex)
                {
                    _logger.LogError(ex, "Error al importar repuestos");
                    return StatusCode(StatusCodes.Status500InternalServerError,
                        new { error = "Error al importar repuestos" });
                }
            }

            return StatusCode(StatusCodes.Status201Created, new ImportacionRespuestaDTO<InventarioDTO>
            {
                mensaje = $"Se importaron {nuevos.Count} repuestos correctamente.",
                total = nuevos.Count,
                errores = errores.Count > 0 ? errores : null,
                data = nuevos.Select(r => new InventarioDTO
                {
                    idRepuesto = r.idRepuesto,
                    nombre = r.nombre,
                    marca = r.marca,
                    precio = r.precio,
                    stock = r.stock
                }).ToList()
            });
        }
    }
}
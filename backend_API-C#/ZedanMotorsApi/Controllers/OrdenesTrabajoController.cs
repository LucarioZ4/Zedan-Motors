using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ZedanMotorsApi.Data;
using ZedanMotorsApi.DTOs;
using ZedanMotorsApi.Models;

namespace ZedanMotorsApi.Controllers
{
    [Route("api/[controller]")]
    [Route("api/ordenes")]
    [ApiController]
    public class OrdenesTrabajoController : ControllerBase
    {
        private readonly AppDBContext _context;

        public OrdenesTrabajoController(AppDBContext context)
        {
            _context = context;
        }

        // GET: api/OrdenesTrabajo
        [HttpGet]
        public async Task<ActionResult<IEnumerable<OrdenTrabajoListaDTO>>> GetOrdenes()
        {
            return await _context.OrdenesTrabajo.Select(o => new OrdenTrabajoListaDTO
            {
                idOrden = o.idOrden,
                fechaInicio = o.fechaInicio,
                fechaFin = o.fechaFin,
                idCita = o.idCita,
                idEmpleado = o.idEmpleado,
                nombreEmpleado = o.Empleado == null ? null : o.Empleado.nombre + " " + o.Empleado.apellido,
                totalServicios = o.Servicios.Count(),
                totalRepuestos = o.Repuestos.Count()
            }).ToListAsync();
        }

        // GET: api/OrdenesTrabajo/5
        [HttpGet("{id}")]
        public async Task<ActionResult<OrdenTrabajoDTO>> GetOrden(int id)
        {
            var orden = await _context.OrdenesTrabajo.Where(o => o.idOrden == id)
                .Select(o => new OrdenTrabajoDTO
                {
                    idOrden = o.idOrden,
                    fechaInicio = o.fechaInicio,
                    fechaFin = o.fechaFin,
                    observaciones = o.observaciones,
                    idCita = o.idCita,
                    idEmpleado = o.idEmpleado,
                    nombreEmpleado = o.Empleado == null ? null : o.Empleado.nombre + " " + o.Empleado.apellido,
                    Servicios = o.Servicios.Select(s => new OrdenServicioDTO
                    {
                        idServicio = s.idServicio,
                        nombreServicio = s.Servicio.nombreServicio,
                        costo = s.Servicio.costo
                    }).ToList(),
                    Repuestos = o.Repuestos.Select(r => new OrdenRepuestoDTO
                    {
                        idRepuesto = r.idRepuesto,
                        nombre = r.Repuesto.nombre,
                        precio = r.Repuesto.precio,
                        cantidad = r.cantidad
                    }).ToList(),
                    Factura = o.Factura == null ? null : new FacturaDTO
                    {
                        idFactura = o.Factura.idFactura,
                        fecha = o.Factura.fecha,
                        total = o.Factura.total,
                        metodoPago = o.Factura.metodoPago,
                        idOrden = o.Factura.idOrden
                    }
                }).FirstOrDefaultAsync();

            if (orden == null)
            {
                return NotFound();
            }

            return orden;
        }

        // PUT: api/OrdenesTrabajo/5
        // Solo actualiza los datos de la orden; los servicios y repuestos se definen al crearla.
        [HttpPut("{id}")]
        public async Task<IActionResult> PutOrden(int id, OrdenTrabajoUpdateDTO ordenUpdate)
        {
            var orden = await _context.OrdenesTrabajo.FindAsync(id);
            if (orden == null)
            {
                return NotFound();
            }

            var error = await ValidarOrden(ordenUpdate.fechaInicio, ordenUpdate.fechaFin,
                ordenUpdate.idCita, ordenUpdate.idEmpleado);
            if (error != null)
            {
                return BadRequest(new { mensaje = error });
            }

            orden.fechaInicio = ordenUpdate.fechaInicio;
            orden.fechaFin = ordenUpdate.fechaFin;
            orden.observaciones = ordenUpdate.observaciones;
            orden.idCita = ordenUpdate.idCita;
            orden.idEmpleado = ordenUpdate.idEmpleado;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        // POST: api/OrdenesTrabajo
        // Crea la orden con sus servicios y repuestos; descuenta el stock de los repuestos
        // (todo en un solo SaveChanges, o se guarda todo o no se guarda nada).
        [HttpPost]
        public async Task<ActionResult<OrdenTrabajoDTO>> PostOrden(OrdenTrabajoCreateDTO ordenCreate)
        {
            var error = await ValidarOrden(ordenCreate.fechaInicio, ordenCreate.fechaFin,
                ordenCreate.idCita, ordenCreate.idEmpleado);
            if (error != null)
            {
                return BadRequest(new { mensaje = error });
            }

            var idServicios = ordenCreate.idServicios.Distinct().ToList();
            var cantidadServicios = await _context.Servicios
                .CountAsync(s => idServicios.Contains(s.idServicio));
            if (cantidadServicios != idServicios.Count)
            {
                return BadRequest(new { mensaje = "Alguno de los servicios indicados no existe." });
            }

            // Si un repuesto viene repetido, se suman las cantidades
            var repuestosPedidos = ordenCreate.Repuestos
                .GroupBy(r => r.idRepuesto)
                .Select(g => new OrdenRepuestoCreateDTO
                {
                    idRepuesto = g.Key,
                    cantidad = g.Sum(x => x.cantidad)
                }).ToList();

            var idRepuestos = repuestosPedidos.Select(r => r.idRepuesto).ToList();
            var repuestosBD = await _context.Inventario
                .Where(r => idRepuestos.Contains(r.idRepuesto))
                .ToDictionaryAsync(r => r.idRepuesto);

            foreach (var pedido in repuestosPedidos)
            {
                if (!repuestosBD.TryGetValue(pedido.idRepuesto, out var repuesto))
                {
                    return BadRequest(new { mensaje = $"El repuesto {pedido.idRepuesto} no existe." });
                }

                if (repuesto.stock < pedido.cantidad)
                {
                    return BadRequest(new
                    {
                        mensaje = $"Stock insuficiente de '{repuesto.nombre}' (disponible: {repuesto.stock})."
                    });
                }

                repuesto.stock -= pedido.cantidad;
            }

            var orden = new OrdenTrabajo
            {
                fechaInicio = ordenCreate.fechaInicio,
                fechaFin = ordenCreate.fechaFin,
                observaciones = ordenCreate.observaciones,
                idCita = ordenCreate.idCita,
                idEmpleado = ordenCreate.idEmpleado,
                Servicios = idServicios.Select(id => new OrdenServicio { idServicio = id }).ToList(),
                Repuestos = repuestosPedidos.Select(r => new OrdenInventario
                {
                    idRepuesto = r.idRepuesto,
                    cantidad = r.cantidad
                }).ToList()
            };
            _context.OrdenesTrabajo.Add(orden);
            await _context.SaveChangesAsync();

            var respuesta = (await GetOrden(orden.idOrden)).Value;

            return CreatedAtAction(nameof(GetOrden), new { id = orden.idOrden }, respuesta);
        }

        // DELETE: api/OrdenesTrabajo/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteOrden(int id)
        {
            var orden = await _context.OrdenesTrabajo.FindAsync(id);
            if (orden == null)
            {
                return NotFound();
            }

            _context.OrdenesTrabajo.Remove(orden);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private async Task<string?> ValidarOrden(DateOnly fechaInicio, DateOnly? fechaFin, int? idCita, int? idEmpleado)
        {
            if (fechaFin != null && fechaFin < fechaInicio)
            {
                return "La fecha de fin no puede ser anterior a la fecha de inicio.";
            }

            if (idCita != null && !await _context.Citas.AnyAsync(c => c.idCita == idCita))
            {
                return "La cita indicada no existe.";
            }

            if (idEmpleado != null && !await _context.Empleados.AnyAsync(e => e.idEmpleado == idEmpleado))
            {
                return "El empleado indicado no existe.";
            }

            return null;
        }
    }
}

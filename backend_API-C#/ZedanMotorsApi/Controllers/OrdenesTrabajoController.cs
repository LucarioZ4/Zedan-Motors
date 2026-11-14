using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using ZedanMotorsApi.Data;
using ZedanMotorsApi.DTOs;
using ZedanMotorsApi.Models;
using ZedanMotorsApi.Security;

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
        [Authorize(Roles = RolesApp.Administrador)]
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

        // ── Servicios y repuestos de una orden ──
        // Misma forma de respuesta que el backend Node. Una orden con factura queda cerrada:
        // el total ya facturado no debe cambiar.
        private const string MensajeOrdenFacturada =
            "La orden ya tiene factura: no se pueden modificar sus servicios ni repuestos.";

        // GET: api/ordenes/5/servicios
        [HttpGet("{id}/servicios")]
        public async Task<ActionResult<IEnumerable<OrdenServicioItemDTO>>> GetServiciosDeOrden(int id)
        {
            return await _context.OrdenServicios
                .Where(os => os.idOrden == id)
                .Select(os => new OrdenServicioItemDTO
                {
                    idOrden = os.idOrden,
                    idServicio = os.idServicio,
                    nombreServicio = os.Servicio.nombreServicio,
                    costo = os.Servicio.costo
                })
                .ToListAsync();
        }

        // POST: api/ordenes/5/servicios
        [HttpPost("{id}/servicios")]
        public async Task<IActionResult> AddServicioAOrden(int id, OrdenServicioAddDTO dto)
        {
            if (!await _context.OrdenesTrabajo.AnyAsync(o => o.idOrden == id))
            {
                return NotFound(new { error = "Orden no encontrada" });
            }

            if (!await _context.Servicios.AnyAsync(s => s.idServicio == dto.idServicio))
            {
                return NotFound(new { error = "Servicio no encontrado" });
            }

            if (await _context.Facturas.AnyAsync(f => f.idOrden == id))
            {
                return Conflict(new { error = MensajeOrdenFacturada });
            }

            // Si el servicio ya estaba en la orden no se hace nada (como ON CONFLICT DO NOTHING en Node)
            var yaEsta = await _context.OrdenServicios
                .AnyAsync(os => os.idOrden == id && os.idServicio == dto.idServicio);

            if (!yaEsta)
            {
                _context.OrdenServicios.Add(new OrdenServicio { idOrden = id, idServicio = dto.idServicio });
                try
                {
                    await _context.SaveChangesAsync();
                }
                catch (DbUpdateException ex) when (
                    ex.InnerException is PostgresException pg && pg.SqlState == PostgresErrorCodes.UniqueViolation)
                {
                    // Otra solicitud lo agregó al mismo tiempo: el resultado es el mismo
                }
            }

            return StatusCode(StatusCodes.Status201Created, new { mensaje = "Servicio agregado" });
        }

        // DELETE: api/ordenes/5/servicios/3
        [HttpDelete("{id}/servicios/{servicioId}")]
        public async Task<IActionResult> RemoveServicioDeOrden(int id, int servicioId)
        {
            if (await _context.Facturas.AnyAsync(f => f.idOrden == id))
            {
                return Conflict(new { error = MensajeOrdenFacturada });
            }

            var fila = await _context.OrdenServicios
                .FirstOrDefaultAsync(os => os.idOrden == id && os.idServicio == servicioId);

            if (fila != null)
            {
                _context.OrdenServicios.Remove(fila);
                await _context.SaveChangesAsync();
            }

            return Ok(new { mensaje = "Servicio eliminado" });
        }

        // GET: api/ordenes/5/repuestos
        [HttpGet("{id}/repuestos")]
        public async Task<ActionResult<IEnumerable<OrdenRepuestoItemDTO>>> GetRepuestosDeOrden(int id)
        {
            return await _context.OrdenInventarios
                .Where(oi => oi.idOrden == id)
                .Select(oi => new OrdenRepuestoItemDTO
                {
                    idOrden = oi.idOrden,
                    idRepuesto = oi.idRepuesto,
                    cantidad = oi.cantidad,
                    nombre = oi.Repuesto.nombre,
                    marca = oi.Repuesto.marca,
                    precio = oi.Repuesto.precio,
                    total = oi.Repuesto.precio * oi.cantidad
                })
                .ToListAsync();
        }

        // POST: api/ordenes/5/repuestos
        // Fija la cantidad de un repuesto en la orden y ajusta el stock con la diferencia
        // (si ya estaba con 2 y ahora se piden 5, descuenta 3; si se pide 1, devuelve 1).
        [HttpPost("{id}/repuestos")]
        public async Task<IActionResult> AddRepuestoAOrden(int id, OrdenRepuestoCreateDTO dto)
        {
            if (!await _context.OrdenesTrabajo.AnyAsync(o => o.idOrden == id))
            {
                return NotFound(new { error = "Orden no encontrada" });
            }

            if (await _context.Facturas.AnyAsync(f => f.idOrden == id))
            {
                return Conflict(new { error = MensajeOrdenFacturada });
            }

            // Si algo falla o se sale antes del Commit, todo se revierte al liberar la transacción
            await using var transaccion = await _context.Database.BeginTransactionAsync();

            var repuesto = await _context.Inventario
                .AsNoTracking()
                .Where(i => i.idRepuesto == dto.idRepuesto)
                .Select(i => new { i.nombre, i.stock })
                .FirstOrDefaultAsync();

            if (repuesto == null)
            {
                return NotFound(new { error = "Repuesto no encontrado" });
            }

            var linea = await _context.OrdenInventarios
                .FirstOrDefaultAsync(oi => oi.idOrden == id && oi.idRepuesto == dto.idRepuesto);
            var cantidadPrevia = linea?.cantidad ?? 0;
            var diferencia = dto.cantidad - cantidadPrevia;

            if (diferencia != 0)
            {
                // UPDATE atómico: solo descuenta si el stock alcanza, así dos pedidos
                // simultáneos no pueden dejar el stock en negativo.
                var filas = await _context.Inventario
                    .Where(i => i.idRepuesto == dto.idRepuesto && i.stock >= diferencia)
                    .ExecuteUpdateAsync(s => s.SetProperty(i => i.stock, i => i.stock - diferencia));

                if (filas == 0)
                {
                    return Conflict(new
                    {
                        error = $"Stock insuficiente para \"{repuesto.nombre}\": máximo permitido para esta orden " +
                                $"{repuesto.stock + cantidadPrevia}, solicitado {dto.cantidad}"
                    });
                }
            }

            if (linea == null)
            {
                _context.OrdenInventarios.Add(new OrdenInventario
                {
                    idOrden = id,
                    idRepuesto = dto.idRepuesto,
                    cantidad = dto.cantidad
                });
            }
            else
            {
                linea.cantidad = dto.cantidad;
            }

            await _context.SaveChangesAsync();
            await transaccion.CommitAsync();

            var stockRestante = await _context.Inventario
                .AsNoTracking()
                .Where(i => i.idRepuesto == dto.idRepuesto)
                .Select(i => i.stock)
                .FirstAsync();

            return StatusCode(StatusCodes.Status201Created, new { mensaje = "Repuesto agregado", stockRestante });
        }

        // DELETE: api/ordenes/5/repuestos/3
        // Al quitar el repuesto de la orden, las unidades vuelven al inventario.
        [HttpDelete("{id}/repuestos/{repuestoId}")]
        public async Task<IActionResult> RemoveRepuestoDeOrden(int id, int repuestoId)
        {
            if (await _context.Facturas.AnyAsync(f => f.idOrden == id))
            {
                return Conflict(new { error = MensajeOrdenFacturada });
            }

            await using var transaccion = await _context.Database.BeginTransactionAsync();

            var linea = await _context.OrdenInventarios
                .FirstOrDefaultAsync(oi => oi.idOrden == id && oi.idRepuesto == repuestoId);

            if (linea != null)
            {
                var cantidad = linea.cantidad;

                await _context.Inventario
                    .Where(i => i.idRepuesto == repuestoId)
                    .ExecuteUpdateAsync(s => s.SetProperty(i => i.stock, i => i.stock + cantidad));

                _context.OrdenInventarios.Remove(linea);
                await _context.SaveChangesAsync();
            }

            await transaccion.CommitAsync();

            return Ok(new { mensaje = "Repuesto eliminado" });
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
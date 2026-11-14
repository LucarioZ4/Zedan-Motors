using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ZedanMotorsApi.Data;
using ZedanMotorsApi.DTOs;
using ZedanMotorsApi.Models;
using ZedanMotorsApi.Services;

namespace ZedanMotorsApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MensajesController : ControllerBase
    {
        private readonly AppDBContext _context;

        public MensajesController(AppDBContext context)
        {
            _context = context;
        }

        // GET: api/Mensajes
        // Mensajes de clientes (WhatsApp / Telegram) con los datos de su orden, vehículo y cliente
        [HttpGet]
        public async Task<ActionResult<IEnumerable<MensajeListaDTO>>> GetMensajes()
        {
            return await _context.MensajesCliente
                .OrderByDescending(m => m.fecha)
                .Select(m => new MensajeListaDTO
                {
                    idMensaje = m.idMensaje,
                    idOrden = m.idOrden,
                    numeroCliente = m.numeroCliente,
                    plataforma = m.plataforma,
                    tipoMensaje = m.tipoMensaje,
                    mensaje = m.mensaje,
                    fecha = m.fecha,
                    clienteNombre = m.Orden.Cita!.Vehiculo.Cliente.nombre,
                    clienteApellido = m.Orden.Cita!.Vehiculo.Cliente.apellido,
                    placa = m.Orden.Cita!.Vehiculo.placa,
                    marca = m.Orden.Cita!.Vehiculo.marca,
                    modelo = m.Orden.Cita!.Vehiculo.modelo
                })
                .ToListAsync();
        }

        // POST: api/Mensajes
        [HttpPost]
        public async Task<ActionResult<MensajeDTO>> PostMensaje(MensajeCreateDTO dto)
        {
            if (!await _context.OrdenesTrabajo.AnyAsync(o => o.idOrden == dto.idOrden))
            {
                return BadRequest(new { error = "La orden indicada no existe." });
            }

            var mensaje = new MensajeCliente
            {
                idOrden = dto.idOrden,
                numeroCliente = dto.numeroCliente,
                plataforma = dto.plataforma,
                tipoMensaje = dto.tipoMensaje,
                mensaje = dto.mensaje,
                fecha = FechaColombia.Ahora()
            };
            _context.MensajesCliente.Add(mensaje);
            await _context.SaveChangesAsync();

            return StatusCode(StatusCodes.Status201Created, new MensajeDTO
            {
                idMensaje = mensaje.idMensaje,
                idOrden = mensaje.idOrden,
                numeroCliente = mensaje.numeroCliente,
                plataforma = mensaje.plataforma,
                tipoMensaje = mensaje.tipoMensaje,
                mensaje = mensaje.mensaje,
                fecha = mensaje.fecha
            });
        }
    }
}
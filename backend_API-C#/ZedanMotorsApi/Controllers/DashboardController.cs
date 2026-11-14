using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ZedanMotorsApi.Data;
using ZedanMotorsApi.DTOs;
using ZedanMotorsApi.Services;

namespace ZedanMotorsApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DashboardController : ControllerBase
    {
        private readonly AppDBContext _context;

        public DashboardController(AppDBContext context)
        {
            _context = context;
        }

        // GET: api/Dashboard/kpis
        // Los ids de estado salen de los datos iniciales de la tabla estado:
        // 1 = Pendiente, 2 = Confirmada, 3 = En proceso.
        [HttpGet("kpis")]
        public async Task<ActionResult<DashboardKpisDTO>> GetKpis()
        {
            var hoy = FechaColombia.Hoy();
            var primerDiaMes = new DateOnly(hoy.Year, hoy.Month, 1);
            var primerDiaMesSiguiente = primerDiaMes.AddMonths(1);

            return new DashboardKpisDTO
            {
                clientes = await _context.Clientes.CountAsync(),
                vehiculos = await _context.Vehiculos.CountAsync(),
                empleados = await _context.Empleados.CountAsync(),
                stockBajo = await _context.Inventario.CountAsync(i => i.stock < 5),
                ordenes = await _context.OrdenesTrabajo.CountAsync(o =>
                    o.Cita != null && (o.Cita.idEstado == 2 || o.Cita.idEstado == 3)),
                citasHoy = await _context.Citas.CountAsync(c =>
                    c.fecha == hoy && (c.idEstado == 1 || c.idEstado == 2)),
                facturas = await _context.Facturas.CountAsync(f =>
                    f.fecha >= primerDiaMes && f.fecha < primerDiaMesSiguiente)
            };
        }

        // GET: api/Dashboard/citas-hoy
        [HttpGet("citas-hoy")]
        public async Task<ActionResult<IEnumerable<CitaHoyDTO>>> GetCitasHoy()
        {
            var hoy = FechaColombia.Hoy();

            var citas = await _context.Citas
                .Where(c => c.fecha == hoy && c.idEstado != null)
                .OrderBy(c => c.hora)
                .Select(c => new
                {
                    c.idCita,
                    c.hora,
                    nombre = c.Vehiculo.Cliente.nombre,
                    apellido = c.Vehiculo.Cliente.apellido,
                    marca = c.Vehiculo.marca,
                    modelo = c.Vehiculo.modelo,
                    placa = c.Vehiculo.placa,
                    estado = c.Estado!.nombreEstado
                })
                .ToListAsync();

            return citas.Select(c => new CitaHoyDTO
            {
                idCita = c.idCita,
                hora = c.hora.ToString("HH:mm"),
                cliente = $"{c.nombre} {c.apellido}",
                vehiculo = $"{c.marca} {c.modelo} - {c.placa}",
                estado = c.estado
            }).ToList();
        }
    }
}
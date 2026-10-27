using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ZedanMotorsApi.Data;
using ZedanMotorsApi.DTOs;

namespace ZedanMotorsApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class EstadosController : ControllerBase
    {
        private readonly AppDBContext _context;

        public EstadosController(AppDBContext context)
        {
            _context = context;
        }

        // GET: api/Estados
        [HttpGet]
        public async Task<ActionResult<IEnumerable<EstadoDTO>>> GetEstados()
        {
            return await _context.Estados.Select(e => new EstadoDTO
            {
                idEstado = e.idEstado,
                nombreEstado = e.nombreEstado
            }).ToListAsync();
        }

        // GET: api/Estados/5
        [HttpGet("{id}")]
        public async Task<ActionResult<EstadoDTO>> GetEstado(int id)
        {
            var estado = await _context.Estados.Where(e => e.idEstado == id)
                .Select(e => new EstadoDTO { idEstado = e.idEstado, nombreEstado = e.nombreEstado })
                .FirstOrDefaultAsync();

            if (estado == null)
            {
                return NotFound();
            }

            return estado;
        }
    }
}

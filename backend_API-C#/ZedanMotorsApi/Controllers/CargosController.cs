using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ZedanMotorsApi.Data;
using ZedanMotorsApi.DTOs;

namespace ZedanMotorsApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CargosController : ControllerBase
    {
        private readonly AppDBContext _context;

        public CargosController(AppDBContext context)
        {
            _context = context;
        }

        // GET: api/Cargos
        [HttpGet]
        public async Task<ActionResult<IEnumerable<CargoDTO>>> GetCargos()
        {
            return await _context.Cargos.Select(c => new CargoDTO
            {
                idCargo = c.idCargo,
                nombreCargo = c.nombreCargo
            }).ToListAsync();
        }

        // GET: api/Cargos/5
        [HttpGet("{id}")]
        public async Task<ActionResult<CargoDTO>> GetCargo(int id)
        {
            var cargo = await _context.Cargos.Where(c => c.idCargo == id)
                .Select(c => new CargoDTO { idCargo = c.idCargo, nombreCargo = c.nombreCargo })
                .FirstOrDefaultAsync();

            if (cargo == null)
            {
                return NotFound();
            }

            return cargo;
        }
    }
}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ZedanMotorsApi.Data;
using ZedanMotorsApi.DTOs;
using ZedanMotorsApi.Services;

namespace ZedanMotorsApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        // Si el usuario no existe igual se calcula un BCrypt contra este hash de relleno,
        // para que el tiempo de respuesta no revele qué usuarios existen.
        private static readonly string HashRelleno =
            BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString(), 10);

        private readonly AppDBContext _context;
        private readonly JwtTokenService _tokens;
        private readonly LoginAttemptTracker _intentos;
        private readonly ILogger<AuthController> _logger;

        public AuthController(
            AppDBContext context,
            JwtTokenService tokens,
            LoginAttemptTracker intentos,
            ILogger<AuthController> logger)
        {
            _context = context;
            _tokens = tokens;
            _intentos = intentos;
            _logger = logger;
        }

        // POST: api/Auth/login  (única ruta pública de la API)
        [HttpPost("login")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(LoginRespuestaDTO), StatusCodes.Status200OK)]
        public async Task<IActionResult> Login(LoginDTO dto)
        {
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "desconocida";

            if (_intentos.EstaBloqueada(ip, out var restante))
            {
                Response.Headers["Retry-After"] = ((int)Math.Ceiling(restante.TotalSeconds)).ToString();
                return StatusCode(StatusCodes.Status429TooManyRequests, new
                {
                    error = "Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos."
                });
            }

            var fila = await _context.Usuarios
                .AsNoTracking()
                .Where(u => u.nombreUsuario == dto.usuario)
                .Select(u => new
                {
                    u.idUsuario,
                    u.nombreUsuario,
                    u.passwordHash,
                    u.activo,
                    u.idEmpleado,
                    nombre = u.Empleado.nombre,
                    rol = u.Empleado.Cargo != null ? u.Empleado.Cargo.nombreCargo : null
                })
                .FirstOrDefaultAsync();

            // Los hashes de la base los generó pgcrypto ($2a$10$...): BCrypt.Net los verifica sin problema.
            var claveCorrecta = false;
            try
            {
                claveCorrecta = BCrypt.Net.BCrypt.Verify(dto.password, fila?.passwordHash ?? HashRelleno);
            }
            catch (Exception ex)
            {
                // Hash con formato inválido en la base: se trata como credencial incorrecta
                _logger.LogWarning(ex, "No se pudo verificar el hash del usuario {Usuario}", dto.usuario);
            }

            // Mismo mensaje si el usuario no existe, está inactivo o la clave es incorrecta
            if (fila is null || !fila.activo || !claveCorrecta)
            {
                _intentos.RegistrarFallo(ip);
                return Unauthorized(new { error = "Credenciales incorrectas" });
            }

            var sesion = new UsuarioSesionDTO
            {
                id = fila.idUsuario,
                idEmpleado = fila.idEmpleado,
                usuario = fila.nombreUsuario,
                rol = fila.rol,
                nombre = fila.nombre
            };

            return Ok(new LoginRespuestaDTO
            {
                token = _tokens.Generar(sesion),
                usuario = sesion
            });
        }

        // GET: api/Auth/verificar  (requiere token válido)
        [HttpGet("verificar")]
        public IActionResult Verificar()
        {
            int.TryParse(User.FindFirst("id")?.Value, out var id);
            int.TryParse(User.FindFirst("id_empleado")?.Value, out var idEmpleado);

            return Ok(new
            {
                usuario = new UsuarioSesionDTO
                {
                    id = id,
                    idEmpleado = idEmpleado,
                    usuario = User.FindFirst("usuario")?.Value ?? string.Empty,
                    rol = User.FindFirst("rol")?.Value,
                    nombre = User.FindFirst("nombre")?.Value ?? string.Empty
                }
            });
        }
    }
}

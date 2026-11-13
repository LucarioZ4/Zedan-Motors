using System.ComponentModel.DataAnnotations;

namespace ZedanMotorsApi.DTOs
{
    public class LoginDTO
    {
        [Required, StringLength(128)]
        public string usuario { get; set; } = string.Empty;
        [Required, StringLength(128)]
        public string password { get; set; } = string.Empty;
    }

    public class UsuarioSesionDTO
    {
        public int id { get; set; }
        public int idEmpleado { get; set; }
        public string usuario { get; set; } = string.Empty;
        public string? rol { get; set; }
        public string nombre { get; set; } = string.Empty;
    }

    public class LoginRespuestaDTO
    {
        public string token { get; set; } = string.Empty;
        public UsuarioSesionDTO usuario { get; set; } = new();
    }
}

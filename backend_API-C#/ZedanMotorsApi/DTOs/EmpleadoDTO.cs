using System.ComponentModel.DataAnnotations;

namespace ZedanMotorsApi.DTOs
{
    public class EmpleadoDTO
    {
        public int idEmpleado { get; set; }
        public string nombre { get; set; } = string.Empty;
        public string apellido { get; set; } = string.Empty;
        public string telefono { get; set; } = string.Empty;
        public string? correo { get; set; }
        public int? idCargo { get; set; }
        public string? nombreCargo { get; set; }
    }

    public class EmpleadoCreateDTO
    {
        [Required, StringLength(100)]
        public string nombre { get; set; } = string.Empty;
        [Required, StringLength(100)]
        public string apellido { get; set; } = string.Empty;
        [Required, StringLength(20)]
        public string telefono { get; set; } = string.Empty;
        [EmailAddress, StringLength(100)]
        public string? correo { get; set; }
        public int? idCargo { get; set; }
    }
}

using System.ComponentModel.DataAnnotations;

namespace ZedanMotorsApi.DTOs
{
    public class CitaDTO
    {
        public int idCita { get; set; }
        public DateOnly fecha { get; set; }
        public TimeOnly hora { get; set; }
        public string? motivo { get; set; }
        public int idVehiculo { get; set; }
        public int idCliente { get; set; }
        public string? cliente { get; set; }
        public string? vehiculo { get; set; }
        public int? idEstado { get; set; }
        public string? estado { get; set; }
    }

    public class CitaCreateDTO
    {
        [Required]
        public DateOnly fecha { get; set; }
        [Required]
        public TimeOnly hora { get; set; }
        [StringLength(200)]
        public string? motivo { get; set; }
        [Required]
        public int idVehiculo { get; set; }
        public int? idEstado { get; set; }
    }
}
using System.ComponentModel.DataAnnotations;

namespace ZedanMotorsApi.DTOs
{
    public class VehiculoDTO
    {
        public int idVehiculo { get; set; }
        public string placa { get; set; } = string.Empty;
        public string modelo { get; set; } = string.Empty;
        public int? anio { get; set; }
        public string marca { get; set; } = string.Empty;
        public string? color { get; set; }
        public int idCliente { get; set; }
        public string? nombreCliente { get; set; }
    }

    public class VehiculoCreateDTO
    {
        [Required, StringLength(10)]
        public string placa { get; set; } = string.Empty;
        [Required, StringLength(50)]
        public string modelo { get; set; } = string.Empty;
        [Range(1900, 2100)]
        public int? anio { get; set; }
        [Required, StringLength(50)]
        public string marca { get; set; } = string.Empty;
        [StringLength(20)]
        public string? color { get; set; }
        [Required]
        public int idCliente { get; set; }
    }
}

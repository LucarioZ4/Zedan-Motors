using System.ComponentModel.DataAnnotations;

namespace ZedanMotorsApi.DTOs
{
    public class ServicioDTO
    {
        public int idServicio { get; set; }
        public string nombreServicio { get; set; } = string.Empty;
        public string? descripcion { get; set; }
        public decimal costo { get; set; }
    }

    public class ServicioCreateDTO
    {
        [Required, StringLength(100)]
        public string nombreServicio { get; set; } = string.Empty;
        [StringLength(200)]
        public string? descripcion { get; set; }
        [Range(0.01, 99999999.99)]
        public decimal costo { get; set; }
    }
}

using System.ComponentModel.DataAnnotations;

namespace ZedanMotorsApi.DTOs
{
    public class InventarioDTO
    {
        public int idRepuesto { get; set; }
        public string nombre { get; set; } = string.Empty;
        public string? marca { get; set; }
        public decimal precio { get; set; }
        public int stock { get; set; }
    }

    public class InventarioCreateDTO
    {
        [Required, StringLength(100)]
        public string nombre { get; set; } = string.Empty;
        [StringLength(50)]
        public string? marca { get; set; }
        [Range(0.01, 99999999.99)]
        public decimal precio { get; set; }
        [Range(0, int.MaxValue)]
        public int stock { get; set; }
    }
}

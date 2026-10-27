using System.ComponentModel.DataAnnotations;

namespace ZedanMotorsApi.DTOs
{
    public class FacturaDTO
    {
        public int idFactura { get; set; }
        public DateOnly fecha { get; set; }
        public decimal total { get; set; }
        public string metodoPago { get; set; } = string.Empty;
        public int idOrden { get; set; }
    }

    public class FacturaCreateDTO
    {
        [Required]
        public DateOnly fecha { get; set; }
        [Range(0.01, 99999999.99)]
        public decimal total { get; set; }
        [Required]
        [RegularExpression("^(Efectivo|Tarjeta|Transferencia)$",
            ErrorMessage = "metodoPago debe ser Efectivo, Tarjeta o Transferencia.")]
        public string metodoPago { get; set; } = string.Empty;
        [Required]
        public int idOrden { get; set; }
    }
}

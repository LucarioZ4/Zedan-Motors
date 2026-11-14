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
        [Range(1, int.MaxValue, ErrorMessage = "idOrden debe ser un número válido.")]
        public int idOrden { get; set; }
        [Required]
        [RegularExpression("^(Efectivo|Tarjeta|Transferencia)$",
            ErrorMessage = "metodoPago debe ser Efectivo, Tarjeta o Transferencia.")]
        public string metodoPago { get; set; } = string.Empty;
    }

    public class FacturaUpdateDTO
    {
        [Required]
        [RegularExpression("^(Efectivo|Tarjeta|Transferencia)$",
            ErrorMessage = "metodoPago debe ser Efectivo, Tarjeta o Transferencia.")]
        public string metodoPago { get; set; } = string.Empty;
    }
}
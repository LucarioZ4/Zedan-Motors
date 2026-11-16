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

    public class FacturaListaDTO : FacturaDTO
    {
        public string? cliente { get; set; }
        public string? vehiculo { get; set; }
    }

    public class FacturaDetalleDTO : FacturaListaDTO
    {
        public string? telefono { get; set; }
        public string? correo { get; set; }
        public string? observaciones { get; set; }
        public DateOnly fechaInicio { get; set; }
        public DateOnly? fechaFin { get; set; }
        public List<FacturaServicioDTO> servicios { get; set; } = new();
        public List<FacturaRepuestoDTO> repuestos { get; set; } = new();
    }

    public class FacturaServicioDTO
    {
        public string nombreServicio { get; set; } = string.Empty;
        public decimal costo { get; set; }
    }

    public class FacturaRepuestoDTO
    {
        public string nombre { get; set; } = string.Empty;
        public string? marca { get; set; }
        public int cantidad { get; set; }
        public decimal precio { get; set; }
        public decimal total { get; set; }
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
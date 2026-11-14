using System.ComponentModel.DataAnnotations;

namespace ZedanMotorsApi.DTOs
{
    // Fila de GET api/ordenes/{id}/servicios
    public class OrdenServicioItemDTO
    {
        public int idOrden { get; set; }
        public int idServicio { get; set; }
        public string nombreServicio { get; set; } = string.Empty;
        public decimal costo { get; set; }
    }

    // Fila de GET api/ordenes/{id}/repuestos
    public class OrdenRepuestoItemDTO
    {
        public int idOrden { get; set; }
        public int idRepuesto { get; set; }
        public int cantidad { get; set; }
        public string nombre { get; set; } = string.Empty;
        public string? marca { get; set; }
        public decimal precio { get; set; }
        public decimal total { get; set; }
    }

    public class OrdenServicioAddDTO
    {
        [Range(1, int.MaxValue, ErrorMessage = "idServicio debe ser un número válido.")]
        public int idServicio { get; set; }
    }
}
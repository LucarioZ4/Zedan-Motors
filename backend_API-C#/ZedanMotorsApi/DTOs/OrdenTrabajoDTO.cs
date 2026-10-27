using System.ComponentModel.DataAnnotations;

namespace ZedanMotorsApi.DTOs
{
    public class OrdenServicioDTO
    {
        public int idServicio { get; set; }
        public string nombreServicio { get; set; } = string.Empty;
        public decimal costo { get; set; }
    }

    public class OrdenRepuestoDTO
    {
        public int idRepuesto { get; set; }
        public string nombre { get; set; } = string.Empty;
        public decimal precio { get; set; }
        public int cantidad { get; set; }
    }

    public class OrdenTrabajoDTO
    {
        public int idOrden { get; set; }
        public DateOnly fechaInicio { get; set; }
        public DateOnly? fechaFin { get; set; }
        public string? observaciones { get; set; }
        public int? idCita { get; set; }
        public int? idEmpleado { get; set; }
        public string? nombreEmpleado { get; set; }
        public List<OrdenServicioDTO> Servicios { get; set; } = new();
        public List<OrdenRepuestoDTO> Repuestos { get; set; } = new();
        public FacturaDTO? Factura { get; set; }
    }

    public class OrdenTrabajoListaDTO
    {
        public int idOrden { get; set; }
        public DateOnly fechaInicio { get; set; }
        public DateOnly? fechaFin { get; set; }
        public int? idCita { get; set; }
        public int? idEmpleado { get; set; }
        public string? nombreEmpleado { get; set; }
        public int totalServicios { get; set; }
        public int totalRepuestos { get; set; }
    }

    public class OrdenRepuestoCreateDTO
    {
        [Required]
        public int idRepuesto { get; set; }
        [Range(1, int.MaxValue)]
        public int cantidad { get; set; }
    }

    public class OrdenTrabajoCreateDTO
    {
        [Required]
        public DateOnly fechaInicio { get; set; }
        public DateOnly? fechaFin { get; set; }
        [StringLength(300)]
        public string? observaciones { get; set; }
        public int? idCita { get; set; }
        public int? idEmpleado { get; set; }
        public List<int> idServicios { get; set; } = new();
        public List<OrdenRepuestoCreateDTO> Repuestos { get; set; } = new();
    }

    // Para PUT: solo datos propios de la orden (servicios y repuestos se fijan al crearla)
    public class OrdenTrabajoUpdateDTO
    {
        [Required]
        public DateOnly fechaInicio { get; set; }
        public DateOnly? fechaFin { get; set; }
        [StringLength(300)]
        public string? observaciones { get; set; }
        public int? idCita { get; set; }
        public int? idEmpleado { get; set; }
    }
}

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ZedanMotorsApi.Models
{
    [Table("orden_trabajo")]
    public class OrdenTrabajo
    {
        [Key]
        [Column("id_orden")]
        public int idOrden { get; set; }
        [Column("fecha_inicio")]
        public DateOnly fechaInicio { get; set; }
        [Column("fecha_fin")]
        public DateOnly? fechaFin { get; set; }
        public string? observaciones { get; set; }
        [Column("id_cita")]
        public int? idCita { get; set; }
        [ForeignKey("idCita")]
        public Cita? Cita { get; set; }
        [Column("id_empleado")]
        public int? idEmpleado { get; set; }
        [ForeignKey("idEmpleado")]
        public Empleado? Empleado { get; set; }
        public ICollection<OrdenServicio> Servicios { get; set; } = new List<OrdenServicio>();
        public ICollection<OrdenInventario> Repuestos { get; set; } = new List<OrdenInventario>();
        public Facturacion? Factura { get; set; }
    }
}

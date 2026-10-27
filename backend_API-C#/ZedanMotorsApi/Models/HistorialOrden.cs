using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ZedanMotorsApi.Models
{
    [Table("historial_orden")]
    public class HistorialOrden
    {
        [Key]
        [Column("id_historial")]
        public int idHistorial { get; set; }
        [Column("id_orden")]
        public int idOrden { get; set; }
        [ForeignKey("idOrden")]
        public OrdenTrabajo Orden { get; set; } = null!;
        [Column("id_empleado")]
        public int? idEmpleado { get; set; }
        [ForeignKey("idEmpleado")]
        public Empleado? Empleado { get; set; }
        public DateTime fecha { get; set; }
        [Column("tipo_evento")]
        public string tipoEvento { get; set; } = string.Empty;
        public string? descripcion { get; set; }
    }
}

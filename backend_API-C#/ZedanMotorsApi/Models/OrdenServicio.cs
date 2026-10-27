using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ZedanMotorsApi.Models
{
    // Tabla intermedia (llave compuesta definida en AppDBContext)
    [Table("orden_servicio")]
    public class OrdenServicio
    {
        [Column("id_orden")]
        public int idOrden { get; set; }
        [ForeignKey("idOrden")]
        public OrdenTrabajo Orden { get; set; } = null!;
        [Column("id_servicio")]
        public int idServicio { get; set; }
        [ForeignKey("idServicio")]
        public Servicio Servicio { get; set; } = null!;
    }
}

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ZedanMotorsApi.Models
{
    // Tabla intermedia (llave compuesta definida en AppDBContext)
    [Table("orden_inventario")]
    public class OrdenInventario
    {
        [Column("id_orden")]
        public int idOrden { get; set; }
        [ForeignKey("idOrden")]
        public OrdenTrabajo Orden { get; set; } = null!;
        [Column("id_repuesto")]
        public int idRepuesto { get; set; }
        [ForeignKey("idRepuesto")]
        public Inventario Repuesto { get; set; } = null!;
        public int cantidad { get; set; }
    }
}

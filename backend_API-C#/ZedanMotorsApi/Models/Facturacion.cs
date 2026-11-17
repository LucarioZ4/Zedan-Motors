using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ZedanMotorsApi.Models
{
    [Table("facturacion")]
    public class Facturacion
    {
        [Key]
        [Column("id_factura")]
        public int idFactura { get; set; }
        public DateOnly fecha { get; set; }
        [Column(TypeName = "numeric(10,2)")]
        public decimal total { get; set; }
        [Column("metodo_pago")]
        public string metodoPago { get; set; } = string.Empty;
        [Column("id_orden")]
        public int idOrden { get; set; }
        [Column("servicios_detalle", TypeName = "jsonb")]
        [DatabaseGenerated(DatabaseGeneratedOption.Computed)]
        public string serviciosDetalle { get; set; } = "[]";
        [Column("repuestos_detalle", TypeName = "jsonb")]
        [DatabaseGenerated(DatabaseGeneratedOption.Computed)]
        public string repuestosDetalle { get; set; } = "[]";
        public OrdenTrabajo Orden { get; set; } = null!;
    }
}

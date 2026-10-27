using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ZedanMotorsApi.Models
{
    [Table("servicio")]
    public class Servicio
    {
        [Key]
        [Column("id_servicio")]
        public int idServicio { get; set; }
        [Column("nombre_servicio")]
        public string nombreServicio { get; set; } = string.Empty;
        public string? descripcion { get; set; }
        [Column(TypeName = "numeric(10,2)")]
        public decimal costo { get; set; }
    }
}

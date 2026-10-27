using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ZedanMotorsApi.Models
{
    [Table("inventario")]
    public class Inventario
    {
        [Key]
        [Column("id_repuesto")]
        public int idRepuesto { get; set; }
        public string nombre { get; set; } = string.Empty;
        public string? marca { get; set; }
        [Column(TypeName = "numeric(10,2)")]
        public decimal precio { get; set; }
        public int stock { get; set; }
    }
}

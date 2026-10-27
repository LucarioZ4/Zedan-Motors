using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ZedanMotorsApi.Models
{
    [Table("estado")]
    public class Estado
    {
        [Key]
        [Column("id_estado")]
        public int idEstado { get; set; }
        [Column("nombre_estado")]
        public string nombreEstado { get; set; } = string.Empty;
        public ICollection<Cita> Citas { get; set; } = new List<Cita>();
    }
}

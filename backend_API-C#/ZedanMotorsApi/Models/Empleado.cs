using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ZedanMotorsApi.Models
{
    [Table("empleado")]
    public class Empleado
    {
        [Key]
        [Column("id_empleado")]
        public int idEmpleado { get; set; }
        public string nombre { get; set; } = string.Empty;
        public string apellido { get; set; } = string.Empty;
        public string telefono { get; set; } = string.Empty;
        public string? correo { get; set; }
        [Column("id_cargo")]
        public int? idCargo { get; set; }
        [ForeignKey("idCargo")]
        public Cargo? Cargo { get; set; }
    }
}

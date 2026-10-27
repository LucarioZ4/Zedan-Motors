using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ZedanMotorsApi.Models
{
    [Table("cargo")]
    public class Cargo
    {
        [Key]
        [Column("id_cargo")]
        public int idCargo { get; set; }
        [Column("nombre_cargo")]
        public string nombreCargo { get; set; } = string.Empty;
        public ICollection<Empleado> Empleados { get; set; } = new List<Empleado>();
    }
}

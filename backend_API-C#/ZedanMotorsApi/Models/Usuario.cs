using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ZedanMotorsApi.Models
{
    [Table("usuario")]
    public class Usuario
    {
        [Key]
        [Column("id_usuario")]
        public int idUsuario { get; set; }
        [Column("id_empleado")]
        public int idEmpleado { get; set; }
        [ForeignKey("idEmpleado")]
        public Empleado Empleado { get; set; } = null!;
        [Column("nombre_usuario")]
        public string nombreUsuario { get; set; } = string.Empty;
        [Column("password_hash")]
        public string passwordHash { get; set; } = string.Empty;
        public bool activo { get; set; } = true;
    }
}

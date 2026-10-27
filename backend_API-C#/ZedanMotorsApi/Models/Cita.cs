using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ZedanMotorsApi.Models
{
    [Table("cita")]
    public class Cita
    {
        [Key]
        [Column("id_cita")]
        public int idCita { get; set; }
        public DateOnly fecha { get; set; }
        public TimeOnly hora { get; set; }
        public string? motivo { get; set; }
        [Column("id_vehiculo")]
        public int idVehiculo { get; set; }
        [ForeignKey("idVehiculo")]
        public Vehiculo Vehiculo { get; set; } = null!;
        [Column("id_estado")]
        public int? idEstado { get; set; }
        [ForeignKey("idEstado")]
        public Estado? Estado { get; set; }
    }
}

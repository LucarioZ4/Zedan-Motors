using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ZedanMotorsApi.Models
{
    [Table("vehiculo")]
    public class Vehiculo
    {
        [Key]
        [Column("id_vehiculo")]
        public int idVehiculo { get; set; }
        public string placa { get; set; } = string.Empty;
        public string modelo { get; set; } = string.Empty;
        public int? anio { get; set; }
        public string marca { get; set; } = string.Empty;
        public string? color { get; set; }
        [Column("id_cliente")]
        public int idCliente { get; set; }
        [ForeignKey("idCliente")]
        public Cliente Cliente { get; set; } = null!;
    }
}

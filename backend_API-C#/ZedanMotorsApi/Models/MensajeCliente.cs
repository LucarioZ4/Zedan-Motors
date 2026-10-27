using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ZedanMotorsApi.Models
{
    [Table("mensajes_cliente")]
    public class MensajeCliente
    {
        [Key]
        [Column("id_mensaje")]
        public int idMensaje { get; set; }
        [Column("id_orden")]
        public int idOrden { get; set; }
        [ForeignKey("idOrden")]
        public OrdenTrabajo Orden { get; set; } = null!;
        [Column("numero_cliente")]
        public string numeroCliente { get; set; } = string.Empty;
        public string plataforma { get; set; } = string.Empty;
        [Column("tipo_mensaje")]
        public string tipoMensaje { get; set; } = string.Empty;
        public string mensaje { get; set; } = string.Empty;
        public DateTime fecha { get; set; }
    }
}

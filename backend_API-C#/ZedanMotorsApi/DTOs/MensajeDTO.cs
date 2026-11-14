using System.ComponentModel.DataAnnotations;

namespace ZedanMotorsApi.DTOs
{
    public class MensajeDTO
    {
        public int idMensaje { get; set; }
        public int idOrden { get; set; }
        public string numeroCliente { get; set; } = string.Empty;
        public string plataforma { get; set; } = string.Empty;
        public string tipoMensaje { get; set; } = string.Empty;
        public string mensaje { get; set; } = string.Empty;
        public DateTime fecha { get; set; }
    }

    // Mensaje con los datos del cliente y vehículo de su orden (para el listado)
    public class MensajeListaDTO : MensajeDTO
    {
        public string? clienteNombre { get; set; }
        public string? clienteApellido { get; set; }
        public string? placa { get; set; }
        public string? marca { get; set; }
        public string? modelo { get; set; }
    }

    public class MensajeCreateDTO
    {
        [Range(1, int.MaxValue, ErrorMessage = "idOrden debe ser un número válido.")]
        public int idOrden { get; set; }
        [Required, StringLength(20)]
        public string numeroCliente { get; set; } = string.Empty;
        [Required]
        [RegularExpression("^(WhatsApp|Telegram)$",
            ErrorMessage = "plataforma debe ser WhatsApp o Telegram.")]
        public string plataforma { get; set; } = string.Empty;
        [Required]
        [RegularExpression("^(Enviado|Recibido|Autorizacion|Notificacion)$",
            ErrorMessage = "tipoMensaje debe ser Enviado, Recibido, Autorizacion o Notificacion.")]
        public string tipoMensaje { get; set; } = string.Empty;
        [Required]
        public string mensaje { get; set; } = string.Empty;
    }
}
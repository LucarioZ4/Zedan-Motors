using System.ComponentModel.DataAnnotations;

namespace ZedanMotorsApi.DTOs
{
    public class ClienteDTO
    {
        public int idCliente { get; set; }
        public string nombre { get; set; } = string.Empty;
        public string apellido { get; set; } = string.Empty;
        public string telefono { get; set; } = string.Empty;
        public string? correo { get; set; }
        public string? direccion { get; set; }
        public List<VehiculoDTO> Vehiculos { get; set; } = new();
    }

    public class ClienteListaDTO
    {
        public int idCliente { get; set; }
        public string nombre { get; set; } = string.Empty;
        public string apellido { get; set; } = string.Empty;
        public string telefono { get; set; } = string.Empty;
        public string? correo { get; set; }
        public int totalVehiculos { get; set; }
    }

    public class ClienteCreateDTO
    {
        [Required, StringLength(100)]
        public string nombre { get; set; } = string.Empty;
        [Required, StringLength(100)]
        public string apellido { get; set; } = string.Empty;
        [Required, StringLength(20)]
        public string telefono { get; set; } = string.Empty;
        [EmailAddress, StringLength(100)]
        public string? correo { get; set; }
        [StringLength(150)]
        public string? direccion { get; set; }
    }
}

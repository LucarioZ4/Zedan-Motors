using System.Text.Json.Serialization;

namespace ZedanMotorsApi.DTOs
{
    public class DashboardKpisDTO
    {
        public int clientes { get; set; }
        public int vehiculos { get; set; }
        public int empleados { get; set; }
        [JsonPropertyName("stockBajo")]
        public int stockBajo { get; set; }
        public int ordenes { get; set; }
        [JsonPropertyName("citasHoy")]
        public int citasHoy { get; set; }
        public int facturas { get; set; }
    }

    public class CitaHoyDTO
    {
        public int idCita { get; set; }
        public string hora { get; set; } = string.Empty;
        public string cliente { get; set; } = string.Empty;
        public string vehiculo { get; set; } = string.Empty;
        public string estado { get; set; } = string.Empty;
    }
}
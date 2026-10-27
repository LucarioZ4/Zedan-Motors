namespace ZedanMotorsApi.DTOs
{
    public class CargoDTO
    {
        public int idCargo { get; set; }
        public string nombreCargo { get; set; } = string.Empty;
    }

    public class EstadoDTO
    {
        public int idEstado { get; set; }
        public string nombreEstado { get; set; } = string.Empty;
    }
}

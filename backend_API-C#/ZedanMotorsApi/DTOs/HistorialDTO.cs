namespace ZedanMotorsApi.DTOs
{
    public class HistorialEventoDTO
    {
        public DateTime fecha { get; set; }
        public string tipoEvento { get; set; } = string.Empty;
        public string descripcion { get; set; } = string.Empty;
        public string empleado { get; set; } = string.Empty;
        public int ordenTipo { get; set; }
        public string color { get; set; } = string.Empty;
        public string icono { get; set; } = string.Empty;
    }

    // Fila cruda de la consulta SQL del historial: los nombres de las propiedades
    // coinciden con los alias de las columnas del SELECT (por eso van en snake_case).
    public class HistorialFila
    {
        public DateTime fecha { get; set; }
        public string tipo_evento { get; set; } = string.Empty;
        public string descripcion { get; set; } = string.Empty;
        public string empleado { get; set; } = string.Empty;
        public int orden_tipo { get; set; }
    }
}
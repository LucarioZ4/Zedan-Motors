using System.Text.Json.Serialization;

namespace ZedanMotorsApi.DTOs
{
    public class ImportacionRespuestaDTO<T>
    {
        public string mensaje { get; set; } = string.Empty;
        public int total { get; set; }
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public List<string>? errores { get; set; }
        public List<T> data { get; set; } = new();
    }
}
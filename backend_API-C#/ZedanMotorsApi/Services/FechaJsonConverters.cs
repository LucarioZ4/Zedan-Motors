using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace ZedanMotorsApi.Services
{
    // Se escribe "2026-11-13T00:00:00" (sin zona horaria): new Date(...) del navegador la toma como
    // hora LOCAL y muestra el día correcto. Con "2026-11-13" a secas, JavaScript la interpreta como
    // UTC y en Colombia (UTC-5) se vería un día antes. Al leer se acepta "yyyy-MM-dd" con o sin hora.
    public class DateOnlyJsonConverter : JsonConverter<DateOnly>
    {
        public override DateOnly Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            var texto = reader.GetString();
            if (texto is { Length: >= 10 }
                && DateOnly.TryParseExact(texto.Substring(0, 10), "yyyy-MM-dd",
                    CultureInfo.InvariantCulture, DateTimeStyles.None, out var fecha))
            {
                return fecha;
            }

            throw new JsonException("Fecha no válida: use el formato yyyy-MM-dd.");
        }

        public override void Write(Utf8JsonWriter writer, DateOnly value, JsonSerializerOptions options) =>
            writer.WriteStringValue(value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) + "T00:00:00");
    }

    // Horas como "HH:mm". Al leer se acepta con o sin segundos:
    // el formato "09:30" que envía el formulario no lo acepta el lector por defecto.
    public class TimeOnlyJsonConverter : JsonConverter<TimeOnly>
    {
        private static readonly string[] Formatos = { "HH:mm", "HH:mm:ss", "HH:mm:ss.FFFFFFF" };

        public override TimeOnly Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            var texto = reader.GetString();
            if (texto != null
                && TimeOnly.TryParseExact(texto, Formatos, CultureInfo.InvariantCulture,
                    DateTimeStyles.None, out var hora))
            {
                return hora;
            }

            throw new JsonException("Hora no válida: use el formato HH:mm.");
        }

        public override void Write(Utf8JsonWriter writer, TimeOnly value, JsonSerializerOptions options) =>
            writer.WriteStringValue(value.ToString("HH:mm", CultureInfo.InvariantCulture));
    }
}
using System.Globalization;
using System.Text.Json;

namespace ZedanMotorsApi.Services
{
    // Utilidades para las importaciones masivas (vehículos e inventario).
    // Los datos suelen venir de CSV/Excel, así que se aceptan números escritos como texto.
    public static class ImportacionHelper
    {
        public const int MaxFilas = 1000;

        // Acepta un arreglo directo o un objeto { items: [...] }
        public static bool TryObtenerFilas(JsonElement body, out List<JsonElement> filas)
        {
            filas = new List<JsonElement>();

            JsonElement arreglo;
            if (body.ValueKind == JsonValueKind.Array)
            {
                arreglo = body;
            }
            else if (body.ValueKind == JsonValueKind.Object
                     && body.TryGetProperty("items", out var items)
                     && items.ValueKind == JsonValueKind.Array)
            {
                arreglo = items;
            }
            else
            {
                return false;
            }

            filas = arreglo.EnumerateArray().ToList();
            return filas.Count > 0;
        }

        // Valor de una propiedad como texto recortado ("" si falta, es null u otro tipo)
        public static string Texto(JsonElement item, string propiedad)
        {
            if (item.ValueKind != JsonValueKind.Object || !item.TryGetProperty(propiedad, out var valor))
                return string.Empty;

            return valor.ValueKind switch
            {
                JsonValueKind.String => (valor.GetString() ?? string.Empty).Trim(),
                JsonValueKind.Number => valor.GetRawText(),
                _ => string.Empty
            };
        }

        public static bool TryEntero(string texto, out int valor) =>
            int.TryParse(texto, NumberStyles.Integer, CultureInfo.InvariantCulture, out valor);

        public static bool TryDecimal(string texto, out decimal valor) =>
            decimal.TryParse(texto, NumberStyles.Number, CultureInfo.InvariantCulture, out valor);
    }
}
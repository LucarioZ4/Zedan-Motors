using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace ZedanMotorsApi.Services
{
    // Convierte los errores de validación automáticos de ASP.NET (ModelState) en un solo texto
    // en español, para responder { "error": "..." }
    public static class ErroresApi
    {
        public static string MensajeDeValidacion(ModelStateDictionary modelState)
        {
            var mensajes = modelState
                .Where(kv => kv.Value != null && kv.Value.Errors.Count > 0)
                .SelectMany(kv => kv.Value!.Errors.Select(e => Traducir(kv.Key, e.ErrorMessage)))
                .Where(m => !string.IsNullOrWhiteSpace(m))
                .Distinct()
                .ToList();

            return mensajes.Count > 0
                ? string.Join(". ", mensajes)
                : "Los datos enviados no son válidos";
        }

        private static string Traducir(string clave, string texto)
        {
            var campo = NombreLegible(clave);

            // Cuerpo ausente, JSON mal formado o un valor de tipo incorrecto (texto donde va un número)
            if (string.IsNullOrWhiteSpace(texto)
                || texto.Contains("JSON", StringComparison.OrdinalIgnoreCase)
                || texto.StartsWith("The input was not valid", StringComparison.Ordinal)
                || texto.StartsWith("The value '", StringComparison.Ordinal))
            {
                return campo.Length > 0
                    ? $"El campo {campo} tiene un formato no válido"
                    : "Los datos enviados no son válidos";
            }

            if (texto.StartsWith("A non-empty request body is required", StringComparison.Ordinal))
                return "Se requiere un cuerpo en la solicitud";

            // Mensajes por defecto de DataAnnotations (vienen en inglés)
            var m = Regex.Match(texto, @"^The (.+) field is required\.$");
            if (m.Success) return $"El campo {NombreLegible(m.Groups[1].Value)} es obligatorio";

            m = Regex.Match(texto, @"^The field (.+) must be a string with a minimum length of (\d+) and a maximum length of (\d+)\.$");
            if (m.Success)
                return $"El campo {NombreLegible(m.Groups[1].Value)} debe tener entre {m.Groups[2].Value} y {m.Groups[3].Value} caracteres";

            m = Regex.Match(texto, @"^The field (.+) must be a string with a maximum length of (\d+)\.$");
            if (m.Success)
                return $"El campo {NombreLegible(m.Groups[1].Value)} no puede superar los {m.Groups[2].Value} caracteres";

            m = Regex.Match(texto, @"^The field (.+) must be between (.+) and (.+)\.$");
            if (m.Success)
                return $"El campo {NombreLegible(m.Groups[1].Value)} debe estar entre {m.Groups[2].Value} y {m.Groups[3].Value}";

            m = Regex.Match(texto, @"^The (.+) field is not a valid e-mail address\.$");
            if (m.Success) return $"El campo {NombreLegible(m.Groups[1].Value)} no es un correo válido";

            m = Regex.Match(texto, @"^The field (.+) must match the regular expression");
            if (m.Success) return $"El campo {NombreLegible(m.Groups[1].Value)} no tiene un formato válido";

            // Cualquier otro mensaje ya es uno propio de los DTO (escrito en español)
            return texto;
        }

        // "$.items[0].idCliente" -> "id cliente"; "nombreServicio" -> "nombre servicio"
        private static string NombreLegible(string clave)
        {
            if (string.IsNullOrWhiteSpace(clave)) return string.Empty;

            var ultimo = clave.Split('.').Last();
            ultimo = Regex.Replace(ultimo, @"\[\d+\]", string.Empty);
            ultimo = ultimo.Replace('_', ' ');
            ultimo = Regex.Replace(ultimo, "([a-z0-9])([A-Z])", "$1 $2");
            return ultimo.Trim().ToLowerInvariant();
        }
    }
}
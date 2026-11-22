using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace ZedanMotorsApi.Services;

public class AnalisisInventario(HttpClient http, IConfiguration cfg)
{
    private static readonly JsonNode Instrucciones = JsonNode.Parse(File.ReadAllText(
        Path.Combine(AppContext.BaseDirectory, "analisis-inventario.json")))!;

    public async Task<object> Analizar(string base64, string mime, List<Dictionary<string, object?>> catalogo, CancellationToken ct)
    {
        var prompt = "Catálogo actual del taller (id | nombre | marca | stock):\n" +
            string.Join("\n", catalogo.Select(r => $"{r["id_repuesto"]} | {r["nombre"]} | {r["marca"] ?? "-"} | stock {r["stock"]}")) +
            "\nAnaliza la foto adjunta.";
        var sistema = (string?)Instrucciones["sistema"];
        JsonNode? salida;
        try
        {
            if (cfg["GEMINI_API_KEY"] is { Length: > 0 } gemini)
            {
                salida = null;
                foreach (var modelo in new[] { cfg["GEMINI_MODEL"] ?? "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.5-flash" }.Distinct())
                {
                    using var req = new HttpRequestMessage(HttpMethod.Post,
                        $"https://generativelanguage.googleapis.com/v1beta/models/{Uri.EscapeDataString(modelo)}:generateContent");
                    req.Headers.Add("x-goog-api-key", gemini);
                    req.Content = JsonContent.Create(new
                    {
                        systemInstruction = new { parts = new[] { new { text = sistema } } },
                        contents = new[] { new { parts = new object[] { new { text = prompt }, new { inlineData = new { mimeType = mime, data = base64 } } } } },
                        generationConfig = new { responseMimeType = "application/json", temperature = 0.1 }
                    });
                    using var res = await http.SendAsync(req, ct);
                    if ((int)res.StatusCode is 404 or 503) continue;
                    var json = await Leer(res, ct);
                    var texto = (string?)json?["candidates"]?[0]?["content"]?["parts"]?[0]?["text"];
                    salida = texto == null ? null : JsonNode.Parse(texto);
                    break;
                }
            }
            else if (cfg["ANTHROPIC_API_KEY"] is { Length: > 0 } claude)
            {
                using var req = new HttpRequestMessage(HttpMethod.Post, (cfg["ANTHROPIC_BASE_URL"] ?? "https://api.anthropic.com").TrimEnd('/') + "/v1/messages");
                req.Headers.Add("x-api-key", claude);
                req.Headers.Add("anthropic-version", "2023-06-01");
                req.Content = JsonContent.Create(new
                {
                    model = cfg["ANTHROPIC_MODEL"] ?? "claude-sonnet-5-5",
                    max_tokens = 2048,
                    system = sistema,
                    tools = new[] { Instrucciones["herramienta"] },
                    tool_choice = new { type = "tool", name = "registrar_conteo" },
                    messages = new[]{new {role="user",content=new object[]{
                        new {type="image",source=new {type="base64",media_type=mime,data=base64}},new {type="text",text=prompt}
                    }}}
                });
                using var res = await http.SendAsync(req, ct);
                var json = await Leer(res, ct);
                salida = json?["content"]?.AsArray().FirstOrDefault(x => (string?)x?["type"] == "tool_use" &&
                    (string?)x["name"] == "registrar_conteo")?["input"];
            }
            else throw new ErrorOperacion(503, "La función de IA no está configurada.");
            if (salida is not JsonObject propuesta) throw new ErrorOperacion(502, "La IA no devolvió un resultado utilizable.");
            return Normalizar(propuesta, catalogo.Select(r => (int)r["id_repuesto"]!).ToHashSet());
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested) { throw new ErrorOperacion(504, "La IA tardó demasiado en responder."); }
        catch (Exception ex) when (ex is HttpRequestException or JsonException or InvalidOperationException or ArgumentOutOfRangeException)
        { throw new ErrorOperacion(502, "Error al comunicarse con la IA."); }
    }

    private static async Task<JsonNode?> Leer(HttpResponseMessage res, CancellationToken ct)
    {
        if ((int)res.StatusCode == 429) throw new ErrorOperacion(429, "Límite de peticiones de IA excedido.");
        if (!res.IsSuccessStatusCode) throw new ErrorOperacion(502, "Error al comunicarse con la IA.");
        return await res.Content.ReadFromJsonAsync<JsonNode>(ct);
    }

    private static string? Texto(JsonNode? nodo, int max)
    {
        if (nodo is not JsonValue v || !v.TryGetValue<string>(out var s) || string.IsNullOrWhiteSpace(s)) return null;
        s = s.Trim();
        return s[..Math.Min(max, s.Length)];
    }
    private static int? Entero(JsonNode? n) => n is JsonValue v && v.TryGetValue<int>(out var i) ? i : null;

    private static object Normalizar(JsonObject propuesta, HashSet<int> ids)
    {
        var items = new List<object>();
        foreach (var n in (propuesta["items"] as JsonArray ?? new JsonArray()).Take(100))
        {
            var fila = n as JsonObject;
            var id = Entero(fila?["id_repuesto"]);
            var confianza = Texto(fila?["confianza"], 10);
            var cantidad = Entero(fila?["cantidad"]);
            if (cantidad is not (>= 1 and <= 100000)) cantidad = null;
            items.Add(new
            {
                id_repuesto = id.HasValue && ids.Contains(id.Value) ? id : null,
                nombre_detectado = Texto(fila?["nombre_detectado"], 100) ?? "Repuesto automotriz",
                marca_detectada = Texto(fila?["marca_detectada"], 50),
                cantidad,
                confianza = cantidad == null ? "baja" : confianza is "alta" or "baja" ? confianza : "media",
                nota = cantidad == null ? "Indica la cantidad: la IA no devolvió un conteo válido." : Texto(fila?["nota"], 200)
            });
        }
        var calidad = Texto(propuesta["calidad_imagen"], 10);
        return new { items, observaciones = Texto(propuesta["observaciones"], 500) ?? "", calidad_imagen = calidad is "mala" or "regular" ? calidad : "buena" };
    }
}

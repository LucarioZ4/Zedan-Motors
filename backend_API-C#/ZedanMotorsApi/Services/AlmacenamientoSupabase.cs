using System.Net.Http.Json;
using System.Text.Json.Nodes;

namespace ZedanMotorsApi.Services;

public class ErrorOperacion(int estado, string mensaje) : Exception(mensaje)
{
    public int Estado { get; } = estado;
}

public class AlmacenamientoSupabase(HttpClient http, IConfiguration config)
{
    private string Base => (config["SUPABASE_URL"] ?? "").TrimEnd('/') + "/storage/v1";
    public bool Configurado => !string.IsNullOrEmpty(config["SUPABASE_URL"]) &&
                               !string.IsNullOrEmpty(config["SUPABASE_SERVICE_ROLE_KEY"]);
    public string Bucket => config["VIDEOS_BUCKET"] ?? "videos-ordenes";
    public int MaxMb => config.GetValue("VIDEO_MAX_MB", 50);

    private async Task<JsonNode?> Enviar(HttpMethod metodo, string ruta, object? datos = null)
    {
        if (!Configurado) throw new ErrorOperacion(503, "El almacenamiento no está configurado.");
        using var peticion = new HttpRequestMessage(metodo, Base + ruta);
        var clave = config["SUPABASE_SERVICE_ROLE_KEY"];
        peticion.Headers.Add("apikey", clave);
        peticion.Headers.Authorization = new("Bearer", clave);
        if (datos != null) peticion.Content = JsonContent.Create(datos);
        using var respuesta = await http.SendAsync(peticion);
        if (!respuesta.IsSuccessStatusCode)
            throw new ErrorOperacion(502, "Supabase no pudo completar la operación de almacenamiento.");
        var texto = await respuesta.Content.ReadAsStringAsync();
        return string.IsNullOrWhiteSpace(texto) ? null : JsonNode.Parse(texto);
    }

    private static string Ruta(string ruta) => string.Join("/", ruta.Split('/').Select(Uri.EscapeDataString));

    private async Task AsegurarBucket(string bucket)
    {
        try
        {
            await Enviar(HttpMethod.Get, $"/bucket/{Ruta(bucket)}");
            return;
        }
        catch (ErrorOperacion e) when (e.Estado == 502)
        {
            bool diagnostico = bucket == (config["DIAG_BUCKET"] ?? "diagnosticos");
            var tipos = diagnostico
                ? (config["DIAG_ALLOWED_MIME"] ?? "image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime").Split(',', StringSplitOptions.TrimEntries)
                : new[] { "video/*" };
            try
            {
                await Enviar(HttpMethod.Post, "/bucket", new
                {
                    id = bucket,
                    name = bucket,
                    @public = false,
                    file_size_limit = (diagnostico ? config.GetValue("DIAG_MAX_MB", 10) : MaxMb) * 1048576L,
                    allowed_mime_types = tipos
                });
            }
            catch (ErrorOperacion)
            {
                // Otra instancia puede haber creado el bucket al mismo tiempo.
                await Enviar(HttpMethod.Get, $"/bucket/{Ruta(bucket)}");
            }
        }
    }

    public async Task<object> Firmar(string bucket, string ruta)
    {
        await AsegurarBucket(bucket);
        var firma = await Enviar(HttpMethod.Post, $"/object/upload/sign/{Ruta(bucket)}/{Ruta(ruta)}", new { });
        var url = firma?["url"]?.GetValue<string>();
        var token = url == null ? null : Microsoft.AspNetCore.WebUtilities.QueryHelpers
            .ParseQuery(new Uri(new Uri(Base + "/"), url).Query)["token"].ToString();
        if (string.IsNullOrEmpty(token)) throw new ErrorOperacion(502, "Subida sin token.");
        return new { ruta, token, bucket };
    }

    public async Task<Dictionary<string, string>> Enlaces(IEnumerable<string> rutas, string? bucket = null)
    {
        var paths = rutas.ToArray();
        var resultado = new Dictionary<string, string>();
        if (paths.Length == 0) return resultado;
        var items = await Enviar(HttpMethod.Post, $"/object/sign/{Ruta(bucket ?? Bucket)}", new { paths, expiresIn = 3600 });
        foreach (var item in items!.AsArray())
            if (item?["path"]?.GetValue<string>() is string path && item["signedURL"]?.GetValue<string>() is string url)
                resultado[path] = Base + url;
        return resultado;
    }

    public async Task<JsonNode?> Metadata(string ruta)
    {
        var i = ruta.LastIndexOf('/');
        var nombre = ruta[(i + 1)..];
        var lista = await Enviar(HttpMethod.Post, $"/object/list/{Ruta(Bucket)}",
            new { prefix = ruta[..i], search = nombre, limit = 100 });
        return lista?.AsArray().FirstOrDefault(x => (string?)x?["name"] == nombre)?["metadata"];
    }

    public async Task Eliminar(string bucket, string[] rutas)
    {
        if (rutas.Length > 0)
            await Enviar(HttpMethod.Delete, $"/object/{Ruta(bucket)}", new { prefixes = rutas });
    }
}

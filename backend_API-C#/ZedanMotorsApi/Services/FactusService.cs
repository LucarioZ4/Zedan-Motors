using System.Net.Http.Headers;
using System.Text.Json;
using ZedanMotorsApi.DTOs;

namespace ZedanMotorsApi.Services;

public class FactusService(HttpClient http, IConfiguration config)
{
    public async Task<object> Emitir(FacturaDTO factura)
    {
        var token = config["FACTUS_API_TOKEN"];
        if (string.IsNullOrEmpty(token) || token == "dummy_token_para_pruebas_12345")
            return new
            {
                numero = $"FV-SIM-{Random.Shared.Next(10000)}",
                cufe = "cufe_simulado_1234567890abcdef",
                qr_url = "https://factus.com.co/qr/simulado",
                pdf_url = "https://factus.com.co/pdf/simulado.pdf"
            };

        var url = (config["FACTUS_API_URL"] ?? "https://api-sandbox.factus.com.co/v1").TrimEnd('/');
        using var request = new HttpRequestMessage(HttpMethod.Post, url + "/facturas/electronicas");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        request.Content = JsonContent.Create(new
        {
            referencia = factura.idFactura.ToString(),
            fecha = factura.fecha,
            factura.total,
            metodo_pago = factura.metodoPago
        });
        using var response = await http.SendAsync(request);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }
}

namespace ZedanMotorsApi.Services
{
    // Configuración del JWT, leída una sola vez en Program.cs
    public record JwtSettings(string Key, string Issuer, string Audience, int ExpiresHours);
}

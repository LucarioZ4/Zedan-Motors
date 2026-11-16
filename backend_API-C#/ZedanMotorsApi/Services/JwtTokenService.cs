using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using ZedanMotorsApi.DTOs;

namespace ZedanMotorsApi.Services
{
    public class JwtTokenService
    {
        private readonly JwtSettings _settings;

        public JwtTokenService(JwtSettings settings)
        {
            _settings = settings;
        }

        public string Generar(UsuarioSesionDTO u)
        {
            var claims = new List<Claim>
            {
                new Claim("id", u.id.ToString()),
                new Claim("id_empleado", u.idEmpleado.ToString()),
                new Claim("usuario", u.usuario),
                new Claim("nombre", u.nombre)
            };

            // Si el empleado no tiene cargo no hay rol: las rutas con rol responderán 403
            if (!string.IsNullOrEmpty(u.rol))
                claims.Add(new Claim("rol", u.rol));

            var credenciales = new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.Key)),
                SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _settings.Issuer,
                audience: _settings.Audience,
                claims: claims,
                notBefore: DateTime.UtcNow,
                expires: DateTime.UtcNow.AddHours(_settings.ExpiresHours),
                signingCredentials: credenciales);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}

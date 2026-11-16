using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Threading.RateLimiting;
using ZedanMotorsApi.Data;
using ZedanMotorsApi.Services;

var builder = WebApplication.CreateBuilder(args);

// ── JWT: la API no arranca si la clave falta o es débil ──
// Una clave corta o vacía permite falsificar tokens. Se define en appsettings.json,
// con 'dotnet user-secrets' o con la variable de entorno Jwt__Key.
const int JwtKeyMinBytes = 32;
var jwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrWhiteSpace(jwtKey) || Encoding.UTF8.GetByteCount(jwtKey) < JwtKeyMinBytes)
{
    throw new InvalidOperationException(
        "Jwt:Key no está definida o es demasiado corta (mínimo 32 caracteres). " +
        "Genera una con: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\"");
}

var jwtSettings = new JwtSettings(
    Key: jwtKey,
    Issuer: builder.Configuration["Jwt:Issuer"] ?? "ZedanMotorsApi",
    Audience: builder.Configuration["Jwt:Audience"] ?? "ZedanMotorsFrontend",
    ExpiresHours: builder.Configuration.GetValue<int?>("Jwt:ExpiresHours") ?? 8);

builder.Services.AddSingleton(jwtSettings);
builder.Services.AddSingleton<JwtTokenService>();
builder.Services.AddSingleton<LoginAttemptTracker>();

// Límite general de solicitudes por IP
var permitLimit = builder.Configuration.GetValue<int?>("RateLimit:PermitLimit") ?? 1000;
var ventanaMinutos = builder.Configuration.GetValue<int?>("RateLimit:WindowMinutes") ?? 15;

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
    {
        // Solo se limita la API; Swagger y demás rutas quedan fuera
        if (!context.Request.Path.StartsWithSegments("/api"))
            return RateLimitPartition.GetNoLimiter("fuera-de-api");

        var ip = context.Connection.RemoteIpAddress?.ToString() ?? "desconocida";
        return RateLimitPartition.GetFixedWindowLimiter(ip, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = permitLimit,
            Window = TimeSpan.FromMinutes(ventanaMinutos),
            QueueLimit = 0,
            AutoReplenishment = true
        });
    });

    options.OnRejected = async (context, cancellationToken) =>
    {
        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
            context.HttpContext.Response.Headers["Retry-After"] = ((int)retryAfter.TotalSeconds).ToString();

        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        await context.HttpContext.Response.WriteAsJsonAsync(
            new { error = "Demasiadas solicitudes. Intenta de nuevo en unos minutos." },
            cancellationToken);
    };
});

// Add services to the container.
builder.Services.AddDbContext<AppDBContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("ZedanMotorsConexion")));

// Controladores + JSON en snake_case (idCliente -> id_cliente)
builder.Services.AddControllers()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower;
        // Fechas y horas con el formato que enviaba Node (evita que el navegador muestre un día antes)
        o.JsonSerializerOptions.Converters.Add(new DateOnlyJsonConverter());
        o.JsonSerializerOptions.Converters.Add(new TimeOnlyJsonConverter());
    })
    .ConfigureApiBehaviorOptions(options =>
    {
        // Errores de validación: { "error": "..." } en vez del ProblemDetails por defecto,
        // que es lo que lee el frontend
        options.InvalidModelStateResponseFactory = context =>
            new BadRequestObjectResult(new { error = ErroresApi.MensajeDeValidacion(context.ModelState) });
    });

// ── Autenticación JWT ──
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // Se conservan los nombres de claim tal cual vienen en el token (id, usuario, rol...)
        options.MapInboundClaims = false;

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtSettings.Issuer,
            ValidateAudience = true,
            ValidAudience = jwtSettings.Audience,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Key)),
            ClockSkew = TimeSpan.FromSeconds(30),
            NameClaimType = "usuario",
            RoleClaimType = "rol"
        };

        options.Events = new JwtBearerEvents
        {
            OnChallenge = async context =>
            {
                context.HandleResponse();
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                var mensaje = context.AuthenticateFailure is null
                    ? "Token requerido"
                    : "Token inválido o expirado";
                await context.Response.WriteAsJsonAsync(new { error = mensaje });
            },
            OnForbidden = async context =>
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                await context.Response.WriteAsJsonAsync(new { error = "Acceso denegado: rol insuficiente" });
            }
        };
    });

// Política por defecto: TODA ruta exige un token válido, salvo las marcadas con [AllowAnonymous]
// (solo el login). Así un controller nuevo no queda público por olvido.
builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
});

// CORS: permite que el frontend (Vite / React y HTML estático) llame a la API
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.WithOrigins(
                "http://localhost:5173",   // Vite (frontend-react)
                "http://localhost:3000")   // frontend estático
              .AllowAnyHeader()
              .AllowAnyMethod());
});

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    // Botón "Authorize" en Swagger UI: pegar el token que devuelve POST /api/auth/login
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Pega solo el token (sin la palabra Bearer)."
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// Errores no controlados: se registran en consola y se responde { "error": "..." }
app.UseExceptionHandler(errorApp =>
    errorApp.Run(async context =>
    {
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        await context.Response.WriteAsJsonAsync(new { error = "Error interno del servidor" });
    }));

// Respuestas de error que salen sin cuerpo (ruta inexistente, método o tipo de contenido no
// permitido...) -> { "error": "..." }. Así el frontend siempre puede leer el cuerpo como JSON.
app.UseStatusCodePages(async context =>
{
    var respuesta = context.HttpContext.Response;
    var mensaje = respuesta.StatusCode switch
    {
        StatusCodes.Status404NotFound => "Recurso no encontrado",
        StatusCodes.Status405MethodNotAllowed => "Método no permitido",
        StatusCodes.Status415UnsupportedMediaType => "Tipo de contenido no soportado",
        _ => "Error en la solicitud"
    };
    await respuesta.WriteAsJsonAsync(new { error = mensaje });
});

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors("Frontend");

app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
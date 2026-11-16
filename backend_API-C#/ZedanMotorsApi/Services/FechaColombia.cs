namespace ZedanMotorsApi.Services
{
    // Colombia es UTC-5 todo el año (no tiene horario de verano). Se usa en lugar de la hora del
    // servidor (en la nube suele ser UTC) para que "hoy" y las horas coincidan con las del taller.
    public static class FechaColombia
    {
        private static readonly TimeSpan Desfase = TimeSpan.FromHours(-5);

        public static DateOnly Hoy() => DateOnly.FromDateTime(DateTime.UtcNow + Desfase);

        // Hora local sin zona (Kind = Unspecified): es lo que Npgsql acepta para
        // columnas "timestamp without time zone".
        public static DateTime Ahora() =>
            DateTime.SpecifyKind(DateTime.UtcNow + Desfase, DateTimeKind.Unspecified);
    }
}
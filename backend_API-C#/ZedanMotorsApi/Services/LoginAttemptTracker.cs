namespace ZedanMotorsApi.Services
{
    public class LoginAttemptTracker
    {
        private const int MaxFallos = 5;
        private static readonly TimeSpan Ventana = TimeSpan.FromMinutes(15);

        private class Registro
        {
            public int Fallos;
            public DateTime Inicio;
        }

        private readonly Dictionary<string, Registro> _registros = new();
        private readonly object _lock = new();

        // true si esa IP ya agotó sus intentos fallidos dentro de la ventana actual
        public bool EstaBloqueada(string ip, out TimeSpan restante)
        {
            restante = TimeSpan.Zero;
            lock (_lock)
            {
                if (!_registros.TryGetValue(ip, out var r))
                    return false;

                var transcurrido = DateTime.UtcNow - r.Inicio;
                if (transcurrido >= Ventana)
                {
                    _registros.Remove(ip);
                    return false;
                }

                if (r.Fallos >= MaxFallos)
                {
                    restante = Ventana - transcurrido;
                    return true;
                }

                return false;
            }
        }

        public void RegistrarFallo(string ip)
        {
            lock (_lock)
            {
                var ahora = DateTime.UtcNow;

                // Limpieza oportunista para que el diccionario no crezca sin límite
                if (_registros.Count > 10000)
                {
                    var vencidas = _registros
                        .Where(kv => ahora - kv.Value.Inicio >= Ventana)
                        .Select(kv => kv.Key)
                        .ToList();
                    foreach (var clave in vencidas)
                        _registros.Remove(clave);
                }

                if (!_registros.TryGetValue(ip, out var r) || ahora - r.Inicio >= Ventana)
                {
                    r = new Registro { Fallos = 0, Inicio = ahora };
                    _registros[ip] = r;
                }

                r.Fallos++;
            }
        }
    }
}

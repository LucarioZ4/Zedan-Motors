namespace ZedanMotorsApi.Services
{
    public static class BusquedaHelper
    {
        // Patrón para ILIKE "contiene" (como el LIKE '%texto%' de Node). Se escapan \, % y _
        // para que el texto escrito por el usuario se busque tal cual, sin actuar como comodín.
        public static string PatronContiene(string texto)
        {
            var limpio = texto.Trim()
                .Replace("\\", "\\\\")
                .Replace("%", "\\%")
                .Replace("_", "\\_");
            return $"%{limpio}%";
        }
    }
}
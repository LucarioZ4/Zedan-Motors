namespace ZedanMotorsApi.Security
{
    // Nombres de rol = nombre del cargo del empleado (tabla cargo)
    public static class RolesApp
    {
        public const string Administrador = "Administrador";
        public const string JefeDeTaller  = "Jefe de taller";

        // [Authorize(Roles = ...)] acepta varios roles separados por coma
        public const string AdminOJefe = Administrador + "," + JefeDeTaller;
    }
}

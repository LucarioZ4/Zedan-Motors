using Microsoft.EntityFrameworkCore;
using ZedanMotorsApi.Models;

namespace ZedanMotorsApi.Data
{
    public class AppDBContext : DbContext
    {
        public AppDBContext(DbContextOptions<AppDBContext> options) : base(options)
        {

        }

        public DbSet<Cargo> Cargos { get; set; }
        public DbSet<Estado> Estados { get; set; }
        public DbSet<Servicio> Servicios { get; set; }
        public DbSet<Inventario> Inventario { get; set; }
        public DbSet<Cliente> Clientes { get; set; }
        public DbSet<Empleado> Empleados { get; set; }
        public DbSet<Vehiculo> Vehiculos { get; set; }
        public DbSet<Cita> Citas { get; set; }
        public DbSet<OrdenTrabajo> OrdenesTrabajo { get; set; }
        public DbSet<Facturacion> Facturas { get; set; }
        public DbSet<OrdenServicio> OrdenServicios { get; set; }
        public DbSet<OrdenInventario> OrdenInventarios { get; set; }
        public DbSet<HistorialOrden> HistorialOrdenes { get; set; }
        public DbSet<MensajeCliente> MensajesCliente { get; set; }
        public DbSet<Usuario> Usuarios { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Llaves compuestas de las tablas intermedias
            modelBuilder.Entity<OrdenServicio>()
                .HasKey(os => new { os.idOrden, os.idServicio });

            modelBuilder.Entity<OrdenInventario>()
                .HasKey(oi => new { oi.idOrden, oi.idRepuesto });

            // Relación 1 a 1: una orden tiene como máximo una factura
            modelBuilder.Entity<Facturacion>()
                .HasOne(f => f.Orden)
                .WithOne(o => o.Factura)
                .HasForeignKey<Facturacion>(f => f.idOrden);

            // Relación 1 a 1: un empleado tiene como máximo un usuario
            modelBuilder.Entity<Usuario>()
                .HasOne(u => u.Empleado)
                .WithOne()
                .HasForeignKey<Usuario>(u => u.idEmpleado);

            // La base de datos pone la fecha por defecto (current_timestamp)
            modelBuilder.Entity<HistorialOrden>()
                .Property(h => h.fecha)
                .HasDefaultValueSql("current_timestamp");

            modelBuilder.Entity<MensajeCliente>()
                .Property(m => m.fecha)
                .HasDefaultValueSql("current_timestamp");
        }
    }
}

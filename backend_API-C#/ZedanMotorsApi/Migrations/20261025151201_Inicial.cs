using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ZedanMotorsApi.Migrations
{
    /// <inheritdoc />
    public partial class Inicial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "cargo",
                columns: table => new
                {
                    id_cargo = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    nombre_cargo = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cargo", x => x.id_cargo);
                });

            migrationBuilder.CreateTable(
                name: "cliente",
                columns: table => new
                {
                    id_cliente = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    nombre = table.Column<string>(type: "text", nullable: false),
                    apellido = table.Column<string>(type: "text", nullable: false),
                    telefono = table.Column<string>(type: "text", nullable: false),
                    correo = table.Column<string>(type: "text", nullable: true),
                    direccion = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cliente", x => x.id_cliente);
                });

            migrationBuilder.CreateTable(
                name: "estado",
                columns: table => new
                {
                    id_estado = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    nombre_estado = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_estado", x => x.id_estado);
                });

            migrationBuilder.CreateTable(
                name: "inventario",
                columns: table => new
                {
                    id_repuesto = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    nombre = table.Column<string>(type: "text", nullable: false),
                    marca = table.Column<string>(type: "text", nullable: true),
                    precio = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                    stock = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_inventario", x => x.id_repuesto);
                });

            migrationBuilder.CreateTable(
                name: "servicio",
                columns: table => new
                {
                    id_servicio = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    nombre_servicio = table.Column<string>(type: "text", nullable: false),
                    descripcion = table.Column<string>(type: "text", nullable: true),
                    costo = table.Column<decimal>(type: "numeric(10,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_servicio", x => x.id_servicio);
                });

            migrationBuilder.CreateTable(
                name: "empleado",
                columns: table => new
                {
                    id_empleado = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    nombre = table.Column<string>(type: "text", nullable: false),
                    apellido = table.Column<string>(type: "text", nullable: false),
                    telefono = table.Column<string>(type: "text", nullable: false),
                    correo = table.Column<string>(type: "text", nullable: true),
                    id_cargo = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_empleado", x => x.id_empleado);
                    table.ForeignKey(
                        name: "FK_empleado_cargo_id_cargo",
                        column: x => x.id_cargo,
                        principalTable: "cargo",
                        principalColumn: "id_cargo");
                });

            migrationBuilder.CreateTable(
                name: "vehiculo",
                columns: table => new
                {
                    id_vehiculo = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    placa = table.Column<string>(type: "text", nullable: false),
                    modelo = table.Column<string>(type: "text", nullable: false),
                    anio = table.Column<int>(type: "integer", nullable: true),
                    marca = table.Column<string>(type: "text", nullable: false),
                    color = table.Column<string>(type: "text", nullable: true),
                    id_cliente = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_vehiculo", x => x.id_vehiculo);
                    table.ForeignKey(
                        name: "FK_vehiculo_cliente_id_cliente",
                        column: x => x.id_cliente,
                        principalTable: "cliente",
                        principalColumn: "id_cliente",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "usuario",
                columns: table => new
                {
                    id_usuario = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    id_empleado = table.Column<int>(type: "integer", nullable: false),
                    nombre_usuario = table.Column<string>(type: "text", nullable: false),
                    password_hash = table.Column<string>(type: "text", nullable: false),
                    activo = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_usuario", x => x.id_usuario);
                    table.ForeignKey(
                        name: "FK_usuario_empleado_id_empleado",
                        column: x => x.id_empleado,
                        principalTable: "empleado",
                        principalColumn: "id_empleado",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "cita",
                columns: table => new
                {
                    id_cita = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    fecha = table.Column<DateOnly>(type: "date", nullable: false),
                    hora = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    motivo = table.Column<string>(type: "text", nullable: true),
                    id_vehiculo = table.Column<int>(type: "integer", nullable: false),
                    id_estado = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cita", x => x.id_cita);
                    table.ForeignKey(
                        name: "FK_cita_estado_id_estado",
                        column: x => x.id_estado,
                        principalTable: "estado",
                        principalColumn: "id_estado");
                    table.ForeignKey(
                        name: "FK_cita_vehiculo_id_vehiculo",
                        column: x => x.id_vehiculo,
                        principalTable: "vehiculo",
                        principalColumn: "id_vehiculo",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "orden_trabajo",
                columns: table => new
                {
                    id_orden = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    fecha_inicio = table.Column<DateOnly>(type: "date", nullable: false),
                    fecha_fin = table.Column<DateOnly>(type: "date", nullable: true),
                    observaciones = table.Column<string>(type: "text", nullable: true),
                    id_cita = table.Column<int>(type: "integer", nullable: true),
                    id_empleado = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_orden_trabajo", x => x.id_orden);
                    table.ForeignKey(
                        name: "FK_orden_trabajo_cita_id_cita",
                        column: x => x.id_cita,
                        principalTable: "cita",
                        principalColumn: "id_cita");
                    table.ForeignKey(
                        name: "FK_orden_trabajo_empleado_id_empleado",
                        column: x => x.id_empleado,
                        principalTable: "empleado",
                        principalColumn: "id_empleado");
                });

            migrationBuilder.CreateTable(
                name: "facturacion",
                columns: table => new
                {
                    id_factura = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    fecha = table.Column<DateOnly>(type: "date", nullable: false),
                    total = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                    metodo_pago = table.Column<string>(type: "text", nullable: false),
                    id_orden = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_facturacion", x => x.id_factura);
                    table.ForeignKey(
                        name: "FK_facturacion_orden_trabajo_id_orden",
                        column: x => x.id_orden,
                        principalTable: "orden_trabajo",
                        principalColumn: "id_orden",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "historial_orden",
                columns: table => new
                {
                    id_historial = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    id_orden = table.Column<int>(type: "integer", nullable: false),
                    id_empleado = table.Column<int>(type: "integer", nullable: true),
                    fecha = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "current_timestamp"),
                    tipo_evento = table.Column<string>(type: "text", nullable: false),
                    descripcion = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_historial_orden", x => x.id_historial);
                    table.ForeignKey(
                        name: "FK_historial_orden_empleado_id_empleado",
                        column: x => x.id_empleado,
                        principalTable: "empleado",
                        principalColumn: "id_empleado");
                    table.ForeignKey(
                        name: "FK_historial_orden_orden_trabajo_id_orden",
                        column: x => x.id_orden,
                        principalTable: "orden_trabajo",
                        principalColumn: "id_orden",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "mensajes_cliente",
                columns: table => new
                {
                    id_mensaje = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    id_orden = table.Column<int>(type: "integer", nullable: false),
                    numero_cliente = table.Column<string>(type: "text", nullable: false),
                    plataforma = table.Column<string>(type: "text", nullable: false),
                    tipo_mensaje = table.Column<string>(type: "text", nullable: false),
                    mensaje = table.Column<string>(type: "text", nullable: false),
                    fecha = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "current_timestamp")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_mensajes_cliente", x => x.id_mensaje);
                    table.ForeignKey(
                        name: "FK_mensajes_cliente_orden_trabajo_id_orden",
                        column: x => x.id_orden,
                        principalTable: "orden_trabajo",
                        principalColumn: "id_orden",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "orden_inventario",
                columns: table => new
                {
                    id_orden = table.Column<int>(type: "integer", nullable: false),
                    id_repuesto = table.Column<int>(type: "integer", nullable: false),
                    cantidad = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_orden_inventario", x => new { x.id_orden, x.id_repuesto });
                    table.ForeignKey(
                        name: "FK_orden_inventario_inventario_id_repuesto",
                        column: x => x.id_repuesto,
                        principalTable: "inventario",
                        principalColumn: "id_repuesto",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_orden_inventario_orden_trabajo_id_orden",
                        column: x => x.id_orden,
                        principalTable: "orden_trabajo",
                        principalColumn: "id_orden",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "orden_servicio",
                columns: table => new
                {
                    id_orden = table.Column<int>(type: "integer", nullable: false),
                    id_servicio = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_orden_servicio", x => new { x.id_orden, x.id_servicio });
                    table.ForeignKey(
                        name: "FK_orden_servicio_orden_trabajo_id_orden",
                        column: x => x.id_orden,
                        principalTable: "orden_trabajo",
                        principalColumn: "id_orden",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_orden_servicio_servicio_id_servicio",
                        column: x => x.id_servicio,
                        principalTable: "servicio",
                        principalColumn: "id_servicio",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_cita_id_estado",
                table: "cita",
                column: "id_estado");

            migrationBuilder.CreateIndex(
                name: "IX_cita_id_vehiculo",
                table: "cita",
                column: "id_vehiculo");

            migrationBuilder.CreateIndex(
                name: "IX_empleado_id_cargo",
                table: "empleado",
                column: "id_cargo");

            migrationBuilder.CreateIndex(
                name: "IX_facturacion_id_orden",
                table: "facturacion",
                column: "id_orden",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_historial_orden_id_empleado",
                table: "historial_orden",
                column: "id_empleado");

            migrationBuilder.CreateIndex(
                name: "IX_historial_orden_id_orden",
                table: "historial_orden",
                column: "id_orden");

            migrationBuilder.CreateIndex(
                name: "IX_mensajes_cliente_id_orden",
                table: "mensajes_cliente",
                column: "id_orden");

            migrationBuilder.CreateIndex(
                name: "IX_orden_inventario_id_repuesto",
                table: "orden_inventario",
                column: "id_repuesto");

            migrationBuilder.CreateIndex(
                name: "IX_orden_servicio_id_servicio",
                table: "orden_servicio",
                column: "id_servicio");

            migrationBuilder.CreateIndex(
                name: "IX_orden_trabajo_id_cita",
                table: "orden_trabajo",
                column: "id_cita");

            migrationBuilder.CreateIndex(
                name: "IX_orden_trabajo_id_empleado",
                table: "orden_trabajo",
                column: "id_empleado");

            migrationBuilder.CreateIndex(
                name: "IX_usuario_id_empleado",
                table: "usuario",
                column: "id_empleado",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_vehiculo_id_cliente",
                table: "vehiculo",
                column: "id_cliente");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "facturacion");

            migrationBuilder.DropTable(
                name: "historial_orden");

            migrationBuilder.DropTable(
                name: "mensajes_cliente");

            migrationBuilder.DropTable(
                name: "orden_inventario");

            migrationBuilder.DropTable(
                name: "orden_servicio");

            migrationBuilder.DropTable(
                name: "usuario");

            migrationBuilder.DropTable(
                name: "inventario");

            migrationBuilder.DropTable(
                name: "orden_trabajo");

            migrationBuilder.DropTable(
                name: "servicio");

            migrationBuilder.DropTable(
                name: "cita");

            migrationBuilder.DropTable(
                name: "empleado");

            migrationBuilder.DropTable(
                name: "estado");

            migrationBuilder.DropTable(
                name: "vehiculo");

            migrationBuilder.DropTable(
                name: "cargo");

            migrationBuilder.DropTable(
                name: "cliente");
        }
    }
}

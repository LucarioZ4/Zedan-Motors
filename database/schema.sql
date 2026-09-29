-- ============================================================
-- Zedan Motors - SCHEMA
-- Estructura de la base de datos: tablas, funciones y catálogos.
-- Seguro de correr en CUALQUIER ambiente, incluida producción.
-- No contiene usuarios ni datos de prueba (ver seed.sql).
-- ============================================================

-- Extensión para hashes bcrypt (usada por la tabla usuario)
create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- TABLAS
-- ------------------------------------------------------------

create table cargo (

	id_cargo serial primary key,
	nombre_cargo varchar(100) not null unique
);

create table estado (

	id_estado serial primary key,
	nombre_estado varchar(50) not null unique
);

create table servicio (

	id_servicio serial primary key,
	nombre_servicio varchar(100) not null unique,
	descripcion varchar(200),
	costo decimal(10,2) not null,

	constraint chk_costo_servicio
	check (costo > 0)
);

create table inventario (

	id_repuesto serial primary key,
	nombre varchar(100) not null,
	marca varchar(50),
	precio decimal(10,2) not null,
	stock int not null default 0,

	constraint chk_precio
	check (precio > 0),

	constraint chk_stock
	check (stock >= 0)
);

create table cliente (

	id_cliente serial primary key,
	nombre varchar(100) not null,
	apellido varchar(100) not null,
	telefono varchar(20) not null unique,
	correo varchar(100) unique,
	direccion varchar(150)
);

create table empleado (

	id_empleado serial primary key,
	nombre varchar(100) not null,
	apellido varchar(100) not null,
	telefono varchar(20) not null unique,
	correo varchar(100) unique,
	id_cargo int,

	constraint fk_empleado_cargo
	foreign key (id_cargo)
	references cargo(id_cargo)
	on delete set null
);

create table vehiculo (

	id_vehiculo serial primary key,
	placa varchar(10) not null unique,
	modelo varchar(50) not null,
	anio int,
	marca varchar(50) not null,
	color varchar(20),

	id_cliente int not null,

	constraint fk_vehiculo_cliente
	foreign key (id_cliente)
	references cliente(id_cliente)
	on delete cascade
);

create table cita (

	id_cita serial primary key,
	fecha date not null,
	hora time not null,
	motivo varchar(200),

	id_vehiculo int not null,
	id_estado int,

	constraint fk_cita_vehiculo
	foreign key (id_vehiculo)
	references vehiculo(id_vehiculo)
	on delete cascade,

	constraint fk_cita_estado
	foreign key (id_estado)
	references estado(id_estado)
	on delete set null
);

create table orden_trabajo (

	id_orden serial primary key,
	fecha_inicio date not null,
	fecha_fin date,
	observaciones varchar(300),

	id_cita int,
	id_empleado int,

	constraint chk_fecha_orden
	check (
		fecha_fin is null
		or fecha_fin >= fecha_inicio
	),

	constraint fk_orden_cita
	foreign key (id_cita)
	references cita(id_cita)
	on delete cascade,

	constraint fk_orden_empleado
	foreign key (id_empleado)
	references empleado(id_empleado)
	on delete set null
);

create table facturacion (

	id_factura serial primary key,
	fecha date not null,
	total decimal(10,2) not null,
	metodo_pago varchar(50) not null,

	id_orden int not null unique,

	constraint fk_factura_orden
	foreign key (id_orden)
	references orden_trabajo(id_orden)
	on delete cascade,

	constraint chk_total
	check (total > 0),

	constraint chk_metodo_pago
	check (
		metodo_pago in (
			'Efectivo',
			'Tarjeta',
			'Transferencia'
		)
	)
);

create table orden_servicio (

	id_orden int not null,
	id_servicio int not null,

	primary key (id_orden, id_servicio),

	constraint fk_os_orden
	foreign key (id_orden)
	references orden_trabajo(id_orden)
	on delete cascade,

	constraint fk_os_servicio
	foreign key (id_servicio)
	references servicio(id_servicio)
	on delete cascade
);

create table orden_inventario (

	id_orden int not null,
	id_repuesto int not null,
	cantidad int not null,

	primary key (id_orden, id_repuesto),

	constraint fk_oi_orden
	foreign key (id_orden)
	references orden_trabajo(id_orden)
	on delete cascade,

	constraint fk_oi_inventario
	foreign key (id_repuesto)
	references inventario(id_repuesto)
	on delete cascade,

	constraint chk_cantidad
	check (cantidad > 0)
);

create table historial_orden (

	id_historial serial primary key,

	id_orden int not null,
	id_empleado int,

	fecha timestamp not null default current_timestamp,

	tipo_evento varchar(100) not null,

	descripcion varchar(500),

	constraint fk_historial_orden
	foreign key (id_orden)
	references orden_trabajo(id_orden)
	on delete cascade,

	constraint fk_historial_empleado
	foreign key (id_empleado)
	references empleado(id_empleado)
	on delete set null
);

create table mensajes_cliente (

	id_mensaje serial primary key,

	id_orden int not null,

	numero_cliente varchar(20) not null,

	plataforma varchar(20) not null,

	tipo_mensaje varchar(30) not null,

	mensaje text not null,

	fecha timestamp not null default current_timestamp,

	constraint fk_mensaje_orden
	foreign key (id_orden)
	references orden_trabajo(id_orden)
	on delete cascade,

	constraint chk_plataforma
	check (
		plataforma in ('WhatsApp', 'Telegram')
	),

	constraint chk_tipo_mensaje
	check (
		tipo_mensaje in (
			'Enviado',
			'Recibido',
			'Autorizacion',
			'Notificacion'
		)
	)
);

-- Usuarios del sistema (login). Cada usuario está ligado a un empleado;
-- el cargo del empleado es el rol que va en el token.
create table usuario (

	id_usuario serial primary key,
	id_empleado int not null unique,
	nombre_usuario varchar(50) not null unique,
	password_hash varchar(100) not null,
	activo boolean not null default true,

	constraint fk_usuario_empleado
	foreign key (id_empleado)
	references empleado(id_empleado)
	on delete cascade
);

-- ------------------------------------------------------------
-- FUNCIONES
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION total_facturado_cliente(
    p_id_cliente INT
)
RETURNS NUMERIC
AS $$
DECLARE
    total NUMERIC;
BEGIN

    SELECT SUM(f.total)
    INTO total
    FROM facturacion f
    INNER JOIN orden_trabajo o
        ON f.id_orden = o.id_orden
    INNER JOIN cita c
        ON o.id_cita = c.id_cita
    INNER JOIN vehiculo v
        ON c.id_vehiculo = v.id_vehiculo
    WHERE v.id_cliente = p_id_cliente;

    RETURN COALESCE(total,0);

END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- CATÁLOGOS (datos reales del negocio, no son "de prueba")
-- ------------------------------------------------------------

INSERT INTO estado (nombre_estado) VALUES
('Pendiente'),
('Confirmada'),
('En proceso'),
('Completada'),
('Cancelada');

INSERT INTO cargo (nombre_cargo) VALUES
('Mecánico'),
('Electricista automotriz'),
('Técnico de diagnóstico'),
('Jefe de taller'),
('Recepcionista'),
('Administrador');

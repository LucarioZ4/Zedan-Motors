-- ============================================================
-- Zedan Motors - SEED (datos de prueba)
-- SOLO para desarrollo local. NO ejecutar en la base de producción/nube.
-- Requiere haber corrido schema.sql antes.
-- ============================================================

-- Empleados de prueba (uno por rol del sistema)
insert into empleado (nombre, apellido, telefono, correo, id_cargo) values
('Admin',     'Sistema', '3000000001', 'admin@zedanmotors.com',
	(select id_cargo from cargo where nombre_cargo = 'Administrador')),
('Mecánico',  'Prueba',  '3000000002', 'mecanico@zedanmotors.com',
	(select id_cargo from cargo where nombre_cargo = 'Mecánico')),
('Recepción', 'Prueba',  '3000000003', 'recepcion@zedanmotors.com',
	(select id_cargo from cargo where nombre_cargo = 'Recepcionista'))
on conflict do nothing;

-- Usuarios de prueba (contraseña: 1234, se guarda hasheada con bcrypt)
-- ADVERTENCIA: credenciales débiles a propósito, solo para desarrollo.
insert into usuario (id_empleado, nombre_usuario, password_hash)
select e.id_empleado, 'admin', crypt('1234', gen_salt('bf', 10))
from empleado e where e.correo = 'admin@zedanmotors.com'
on conflict do nothing;

insert into usuario (id_empleado, nombre_usuario, password_hash)
select e.id_empleado, 'mecanico', crypt('1234', gen_salt('bf', 10))
from empleado e where e.correo = 'mecanico@zedanmotors.com'
on conflict do nothing;

insert into usuario (id_empleado, nombre_usuario, password_hash)
select e.id_empleado, 'recepcion', crypt('1234', gen_salt('bf', 10))
from empleado e where e.correo = 'recepcion@zedanmotors.com'
on conflict do nothing;

-- Verificación: deben salir 3 usuarios con inicio_hash = $2a$10$
select u.nombre_usuario, c.nombre_cargo as rol, left(u.password_hash, 7) as inicio_hash
from usuario u
join empleado e on u.id_empleado = e.id_empleado
join cargo c on e.id_cargo = c.id_cargo;

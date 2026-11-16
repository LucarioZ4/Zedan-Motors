-- Migration: create tables para módulo Diagnóstico

CREATE TABLE diagnostico (
    id_diagnostico serial PRIMARY KEY,
    id_vehiculo int NOT NULL REFERENCES vehiculo(id_vehiculo),
    id_cita int REFERENCES cita(id_cita),
    fecha_ingreso timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    kilometraje int NOT NULL CHECK (kilometraje >= 0),
    nivel_gasolina varchar(20) NOT NULL,
    observaciones text,
    estado varchar(20) NOT NULL DEFAULT 'En proceso'
);

CREATE TABLE diagnostico_accesorio (
    id_diagnostico int REFERENCES diagnostico(id_diagnostico) ON DELETE CASCADE,
    nombre varchar(50) NOT NULL,
    estado varchar(10) NOT NULL CHECK (estado IN ('Bueno','Regular','Malo','No tiene')),
    observacion text,
    PRIMARY KEY (id_diagnostico, nombre)
);

CREATE TABLE diagnostico_archivo (
    id_archivo serial PRIMARY KEY,
    id_diagnostico int REFERENCES diagnostico(id_diagnostico) ON DELETE CASCADE,
    ruta varchar(255) NOT NULL,
    tipo varchar(10) NOT NULL CHECK (tipo IN ('imagen','video')),
    nombre_original varchar(255) NOT NULL,
    tamano int NOT NULL,
    fecha timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    descripcion varchar(200)
);


-- ============================================================================
-- MIGRACIÓN: Módulo de Bitácora y Auditoría por Sesión - Zedan Motors
-- Base de Datos: PostgreSQL 16 (Supabase / Local)
-- Idempotente y compatible con transaction poolers
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Enumeradores si no existen
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_sesion_bitacora') THEN
        CREATE TYPE estado_sesion_bitacora AS ENUM ('activa', 'cerrada', 'expirada');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'modulo_bitacora') THEN
        CREATE TYPE modulo_bitacora AS ENUM (
            'auth', 'diagnostico', 'inventario', 'orden', 
            'cita', 'cliente', 'vehiculo', 'ia', 'facturacion', 'empleados', 'servicios'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'accion_bitacora') THEN
        CREATE TYPE accion_bitacora AS ENUM (
            'login', 'logout', 'crear', 'actualizar', 
            'eliminar', 'cambiar_estado', 'confirmar_ia'
        );
    END IF;
END $$;

-- 2. Tabla: Control de Sesiones
CREATE TABLE IF NOT EXISTS sesion_bitacora (
    id_sesion          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_usuario         INT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    inicio_en          TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    ultima_actividad   TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    fin_en             TIMESTAMPTZ,
    estado             estado_sesion_bitacora NOT NULL DEFAULT 'activa',
    ip                 VARCHAR(45),
    user_agent         VARCHAR(255),
    CONSTRAINT chk_fechas_sesion CHECK (fin_en IS NULL OR fin_en >= inicio_en)
);

CREATE INDEX IF NOT EXISTS ix_sesion_usuario_estado 
    ON sesion_bitacora(id_usuario, estado);

CREATE INDEX IF NOT EXISTS ix_sesion_ultima_actividad 
    ON sesion_bitacora(ultima_actividad DESC);

-- 3. Tabla: Eventos y Cambios de la Bitácora
CREATE TABLE IF NOT EXISTS bitacora_evento (
    id_evento          BIGSERIAL PRIMARY KEY,
    id_sesion          UUID NOT NULL REFERENCES sesion_bitacora(id_sesion) ON DELETE CASCADE,
    id_usuario         INT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    modulo             modulo_bitacora NOT NULL,
    accion             accion_bitacora NOT NULL,
    entidad            VARCHAR(60) NOT NULL,
    id_registro        VARCHAR(50),
    descripcion        TEXT NOT NULL,
    datos_antes        JSONB,
    datos_despues      JSONB,
    campos_modificados TEXT[] DEFAULT '{}',
    contexto           JSONB DEFAULT '{}'::jsonb,
    creado_en          TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS ix_bitacora_sesion 
    ON bitacora_evento(id_sesion, creado_en DESC);

CREATE INDEX IF NOT EXISTS ix_bitacora_usuario_modulo 
    ON bitacora_evento(id_usuario, modulo, creado_en DESC);

CREATE INDEX IF NOT EXISTS ix_bitacora_entidad_registro 
    ON bitacora_evento(entidad, id_registro);

CREATE INDEX IF NOT EXISTS ix_bitacora_contexto_gin 
    ON bitacora_evento USING GIN (contexto);

-- 4. Soporte para tabla diagnostico si no existía aún en el entorno
CREATE TABLE IF NOT EXISTS diagnostico (
    id_diagnostico  SERIAL PRIMARY KEY,
    id_vehiculo     INT NOT NULL REFERENCES vehiculo(id_vehiculo) ON DELETE CASCADE,
    id_cita         INT REFERENCES cita(id_cita) ON DELETE SET NULL,
    kilometraje     INT NOT NULL CHECK (kilometraje >= 0),
    nivel_gasolina  VARCHAR(30) DEFAULT '1/2',
    observaciones   TEXT,
    estado          VARCHAR(30) NOT NULL DEFAULT 'pendiente',
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS ix_diagnostico_vehiculo ON diagnostico(id_vehiculo);
CREATE INDEX IF NOT EXISTS ix_diagnostico_cita ON diagnostico(id_cita);

-- 5. Función de expiración de sesiones inactivas
CREATE OR REPLACE FUNCTION expirar_sesiones_inactivas(horas_inactividad INT DEFAULT 8)
RETURNS INT AS $$
DECLARE
    sesiones_afectadas INT;
BEGIN
    UPDATE sesion_bitacora
    SET estado = 'expirada',
        fin_en = ultima_actividad
    WHERE estado = 'activa'
      AND ultima_actividad < (NOW() - (horas_inactividad || ' hours')::INTERVAL);
    
    GET DIAGNOSTICS sesiones_afectadas = ROW_COUNT;
    RETURN sesiones_afectadas;
END;
$$ LANGUAGE plpgsql;

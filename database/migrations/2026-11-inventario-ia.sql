-- ============================================================
-- Migración Idempotente: Módulo Inventario con IA
-- Fecha: 2026-11
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE inventario ADD COLUMN IF NOT EXISTS referencia VARCHAR(60);
ALTER TABLE inventario ADD COLUMN IF NOT EXISTS codigo_barras VARCHAR(40);
CREATE UNIQUE INDEX IF NOT EXISTS ux_inventario_codigo_barras ON inventario(codigo_barras) WHERE codigo_barras IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_inventario_referencia ON inventario(lower(referencia));
CREATE INDEX IF NOT EXISTS ix_inventario_trgm ON inventario USING gin ((lower(nombre || ' ' || coalesce(marca,''))) gin_trgm_ops);

CREATE TABLE IF NOT EXISTS analisis_ia (
  id_analisis    SERIAL PRIMARY KEY,
  id_usuario     INT NOT NULL REFERENCES usuario(id_usuario),
  modo           VARCHAR(10) NOT NULL CHECK (modo IN ('entrada','conteo')),
  estado         VARCHAR(12) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','confirmado','descartado')),
  resultado      JSONB NOT NULL,            -- propuesta normalizada (items, candidatos, advertencias)
  imagenes       JSONB NOT NULL DEFAULT '[]',
  modelo         VARCHAR(60),
  tokens_entrada INT, tokens_salida INT,
  creado_en      TIMESTAMP NOT NULL DEFAULT now(),
  confirmado_en  TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventario_movimiento (
  id_movimiento  SERIAL PRIMARY KEY,
  id_repuesto    INT NOT NULL REFERENCES inventario(id_repuesto),
  tipo           VARCHAR(12) NOT NULL CHECK (tipo IN ('entrada','ajuste','salida_orden','devolucion')),
  cantidad       INT NOT NULL,
  stock_anterior INT NOT NULL,
  stock_nuevo    INT NOT NULL,
  origen         VARCHAR(10) NOT NULL CHECK (origen IN ('manual','ia','orden')),
  id_analisis    INT REFERENCES analisis_ia(id_analisis),
  id_usuario     INT REFERENCES usuario(id_usuario),
  creado_en      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS repuesto_alias (
  alias_normalizado TEXT PRIMARY KEY,
  id_repuesto INT NOT NULL REFERENCES inventario(id_repuesto) ON DELETE CASCADE
);

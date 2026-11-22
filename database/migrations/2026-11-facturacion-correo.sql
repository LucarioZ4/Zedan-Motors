-- Migración para registrar estado de envío de correo en facturación
ALTER TABLE facturacion ADD COLUMN IF NOT EXISTS correo_enviado boolean DEFAULT false;
ALTER TABLE facturacion ADD COLUMN IF NOT EXISTS fecha_envio_correo timestamp with time zone;

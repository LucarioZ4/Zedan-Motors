BEGIN;
ALTER TABLE facturacion ADD COLUMN IF NOT EXISTS servicios_detalle jsonb;
ALTER TABLE facturacion ADD COLUMN IF NOT EXISTS repuestos_detalle jsonb;

CREATE OR REPLACE FUNCTION detalle_orden_factura(orden_id integer) RETURNS jsonb
LANGUAGE sql STABLE SET search_path = public AS $$
    SELECT jsonb_build_object(
        'servicios', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'nombre_servicio', s.nombre_servicio, 'costo', s.costo) ORDER BY s.id_servicio), '[]'::jsonb)
            FROM orden_servicio os JOIN servicio s USING(id_servicio) WHERE os.id_orden = orden_id),
        'repuestos', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'nombre', i.nombre, 'marca', i.marca, 'cantidad', oi.cantidad,
            'precio', i.precio, 'total', i.precio * oi.cantidad) ORDER BY i.id_repuesto), '[]'::jsonb)
            FROM orden_inventario oi JOIN inventario i USING(id_repuesto) WHERE oi.id_orden = orden_id));
$$;

-- Facturas previas: conserva el total original y fija los detalles disponibles hoy.
-- Los precios históricos que ya cambiaron no se pueden reconstruir.
UPDATE facturacion SET
    servicios_detalle = COALESCE(servicios_detalle, detalle_orden_factura(id_orden)->'servicios'),
    repuestos_detalle = COALESCE(repuestos_detalle, detalle_orden_factura(id_orden)->'repuestos')
WHERE servicios_detalle IS NULL OR repuestos_detalle IS NULL;
ALTER TABLE facturacion ALTER COLUMN servicios_detalle SET NOT NULL;
ALTER TABLE facturacion ALTER COLUMN repuestos_detalle SET NOT NULL;

CREATE OR REPLACE FUNCTION capturar_detalle_factura() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE detalle jsonb;
BEGIN
    PERFORM 1 FROM orden_trabajo WHERE id_orden = NEW.id_orden FOR UPDATE;
    detalle := detalle_orden_factura(NEW.id_orden);
    NEW.servicios_detalle := detalle->'servicios';
    NEW.repuestos_detalle := detalle->'repuestos';
    NEW.total :=
        (SELECT COALESCE(SUM((item->>'costo')::numeric), 0) FROM jsonb_array_elements(NEW.servicios_detalle) item) +
        (SELECT COALESCE(SUM((item->>'total')::numeric), 0) FROM jsonb_array_elements(NEW.repuestos_detalle) item);
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_capturar_detalle_factura ON facturacion;
CREATE TRIGGER trg_capturar_detalle_factura BEFORE INSERT ON facturacion
FOR EACH ROW EXECUTE FUNCTION capturar_detalle_factura();
COMMIT;

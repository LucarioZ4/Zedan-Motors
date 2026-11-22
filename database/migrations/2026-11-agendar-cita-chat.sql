CREATE OR REPLACE FUNCTION agendar_cita_chat(
    p_nombre text, p_apellido text, p_telefono text, p_correo text, p_direccion text,
    p_placa text, p_marca text, p_modelo text, p_anio integer, p_color text,
    p_fecha date, p_hora time, p_motivo text
) RETURNS TABLE (resultado text, numero_cita integer)
LANGUAGE plpgsql AS $$
DECLARE
    cliente_id integer;
    vehiculo_id integer;
    cita_id integer;
    pendiente_id integer;
BEGIN
    IF p_fecha IS NULL OR p_hora IS NULL OR p_fecha + p_hora <= now() AT TIME ZONE 'America/Bogota' THEN
        RETURN QUERY SELECT 'Elige una fecha y hora futuras.'::text, NULL::integer;
        RETURN;
    END IF;
    IF EXISTS (SELECT 1 FROM unnest(ARRAY[p_nombre,p_apellido,p_telefono,p_placa,p_marca,p_modelo,p_motivo]) campo
               WHERE nullif(trim(campo), '') IS NULL) THEN
        RETURN QUERY SELECT 'Faltan datos obligatorios.'::text, NULL::integer;
        RETURN;
    END IF;
    INSERT INTO cliente(nombre, apellido, telefono, correo, direccion)
    VALUES(trim(p_nombre), trim(p_apellido), trim(p_telefono), nullif(trim(p_correo),''), nullif(trim(p_direccion),''))
    ON CONFLICT (telefono) DO NOTHING;
    SELECT id_cliente INTO STRICT cliente_id FROM cliente
    WHERE telefono = trim(p_telefono) AND lower(trim(nombre)) = lower(trim(p_nombre))
      AND lower(trim(apellido)) = lower(trim(p_apellido));

    INSERT INTO vehiculo(placa, marca, modelo, anio, color, id_cliente)
    VALUES(upper(trim(p_placa)), trim(p_marca), trim(p_modelo), p_anio, p_color, cliente_id)
    ON CONFLICT (placa) DO NOTHING;
    SELECT id_vehiculo INTO STRICT vehiculo_id FROM vehiculo
    WHERE placa = upper(trim(p_placa)) AND id_cliente = cliente_id FOR UPDATE;

    SELECT id_estado INTO STRICT pendiente_id FROM estado WHERE nombre_estado = 'Pendiente';
    SELECT c.id_cita INTO cita_id FROM cita c LEFT JOIN estado e USING (id_estado)
    WHERE c.id_vehiculo = vehiculo_id AND c.fecha = p_fecha AND c.hora = p_hora
      AND e.nombre_estado IS DISTINCT FROM 'Cancelada' ORDER BY c.id_cita LIMIT 1;
    IF cita_id IS NOT NULL THEN
        RETURN QUERY SELECT 'Ya existe una cita para el vehículo en ese horario.'::text, cita_id;
        RETURN;
    END IF;
    INSERT INTO cita(fecha,hora,motivo,id_vehiculo,id_estado)
    VALUES(p_fecha,p_hora,p_motivo,vehiculo_id,pendiente_id) RETURNING id_cita INTO cita_id;
    RETURN QUERY SELECT 'Cita registrada.'::text, cita_id;
EXCEPTION WHEN no_data_found OR unique_violation THEN
    RETURN QUERY SELECT 'Los datos no coinciden con el registro. Contacta a recepción.'::text, NULL::integer;
END;
$$;

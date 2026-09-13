const pool = require('../../config/database');

const getByVehiculo = async (req, res) => {
    try {
        const { id } = req.params;

        const sql = `
            -- CITAS
            SELECT
                c.fecha::timestamp AS fecha,
                'Cita' AS tipo_evento,
                CONCAT('Cita agendada — ', COALESCE(c.motivo, 'Sin motivo'),
                       ' | Estado: ', e.nombre_estado) AS descripcion,
                '' AS empleado,
                1 AS orden_tipo
            FROM cita c
            INNER JOIN estado e ON c.id_estado = e.id_estado
            WHERE c.id_vehiculo = $1

            UNION ALL

            -- ÓRDENES
            SELECT
                o.fecha_inicio::timestamp AS fecha,
                'Orden' AS tipo_evento,
                CONCAT('Orden #', o.id_orden, ' iniciada',
                    CASE WHEN o.observaciones IS NOT NULL
                         THEN CONCAT(' — ', o.observaciones)
                         ELSE '' END) AS descripcion,
                COALESCE(emp.nombre || ' ' || emp.apellido, '—') AS empleado,
                2 AS orden_tipo
            FROM orden_trabajo o
            INNER JOIN cita c ON o.id_cita = c.id_cita
            LEFT  JOIN empleado emp ON o.id_empleado = emp.id_empleado
            WHERE c.id_vehiculo = $1

            UNION ALL

            -- SERVICIOS
            SELECT
                o.fecha_inicio::timestamp AS fecha,
                'Servicio' AS tipo_evento,
                CONCAT('Servicio realizado: ', s.nombre_servicio,
                       ' — $', s.costo) AS descripcion,
                COALESCE(emp.nombre || ' ' || emp.apellido, '—') AS empleado,
                3 AS orden_tipo
            FROM orden_servicio os
            INNER JOIN orden_trabajo o  ON os.id_orden    = o.id_orden
            INNER JOIN servicio s       ON os.id_servicio = s.id_servicio
            INNER JOIN cita c           ON o.id_cita      = c.id_cita
            LEFT  JOIN empleado emp     ON o.id_empleado  = emp.id_empleado
            WHERE c.id_vehiculo = $1

            UNION ALL

            -- REPUESTOS
            SELECT
                o.fecha_inicio::timestamp AS fecha,
                'Repuesto' AS tipo_evento,
                CONCAT('Repuesto usado: ', i.nombre,
                       ' (', COALESCE(i.marca, ''), ')',
                       ' x', oi.cantidad,
                       ' — $', (i.precio * oi.cantidad)) AS descripcion,
                COALESCE(emp.nombre || ' ' || emp.apellido, '—') AS empleado,
                4 AS orden_tipo
            FROM orden_inventario oi
            INNER JOIN orden_trabajo o ON oi.id_orden    = o.id_orden
            INNER JOIN inventario i    ON oi.id_repuesto = i.id_repuesto
            INNER JOIN cita c          ON o.id_cita      = c.id_cita
            LEFT  JOIN empleado emp    ON o.id_empleado  = emp.id_empleado
            WHERE c.id_vehiculo = $1

            UNION ALL

            -- FACTURAS
            SELECT
                f.fecha::timestamp AS fecha,
                'Factura' AS tipo_evento,
                CONCAT('Factura #', f.id_factura,
                       ' — Total: $', f.total,
                       ' | Método: ', f.metodo_pago) AS descripcion,
                '' AS empleado,
                5 AS orden_tipo
            FROM facturacion f
            INNER JOIN orden_trabajo o ON f.id_orden    = o.id_orden
            INNER JOIN cita c          ON o.id_cita     = c.id_cita
            WHERE c.id_vehiculo = $1

            UNION ALL

            -- MENSAJES
            SELECT
                m.fecha AS fecha,
                CONCAT('Mensaje ', m.plataforma) AS tipo_evento,
                CONCAT('[', m.tipo_mensaje, '] ', m.mensaje) AS descripcion,
                m.numero_cliente AS empleado,
                6 AS orden_tipo
            FROM mensajes_cliente m
            INNER JOIN orden_trabajo o ON m.id_orden = o.id_orden
            INNER JOIN cita c          ON o.id_cita  = c.id_cita
            WHERE c.id_vehiculo = $1

            ORDER BY fecha DESC, orden_tipo ASC
        `;

        const result = await pool.query(sql, [id]);

        const eventos = result.rows.map(row => ({
            ...row,
            color: getColor(row.tipo_evento),
            icono: getIcono(row.tipo_evento)
        }));

        res.json(eventos);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

function getColor(tipo) {
    const colores = {
        'Cita':              '#4A90D9',
        'Orden':             '#E8681A',
        'Servicio':          '#27AE60',
        'Repuesto':          '#F5A623',
        'Factura':           '#9B59B6',
        'Mensaje WhatsApp':  '#25D366',
        'Mensaje Telegram':  '#0088CC',
    };
    return colores[tipo] || '#777777';
}

function getIcono(tipo) {
    const iconos = {
        'Cita':              'bi-calendar-check',
        'Orden':             'bi-clipboard2-check',
        'Servicio':          'bi-tools',
        'Repuesto':          'bi-box-seam',
        'Factura':           'bi-receipt',
        'Mensaje WhatsApp':  'bi-whatsapp',
        'Mensaje Telegram':  'bi-telegram',
    };
    return iconos[tipo] || 'bi-circle';
}

module.exports = { getByVehiculo };
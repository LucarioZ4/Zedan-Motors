const pool = require('../../config/database');

const getAll = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                f.id_factura,
                f.fecha,
                f.total,
                f.metodo_pago,
                f.id_orden,
                cl.nombre || ' ' || cl.apellido AS cliente,
                v.placa || ' - ' || v.marca || ' ' || v.modelo AS vehiculo
            FROM facturacion f
            INNER JOIN orden_trabajo o ON f.id_orden    = o.id_orden
            INNER JOIN cita c          ON o.id_cita     = c.id_cita
            INNER JOIN vehiculo v      ON c.id_vehiculo = v.id_vehiculo
            INNER JOIN cliente cl      ON v.id_cliente  = cl.id_cliente
            ORDER BY f.fecha DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getById = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                f.id_factura, f.fecha, f.total, f.metodo_pago, f.id_orden,
                cl.nombre || ' ' || cl.apellido AS cliente,
                cl.telefono, cl.correo,
                v.placa || ' - ' || v.marca || ' ' || v.modelo AS vehiculo,
                o.observaciones,
                o.fecha_inicio, o.fecha_fin
            FROM facturacion f
            INNER JOIN orden_trabajo o ON f.id_orden    = o.id_orden
            INNER JOIN cita c          ON o.id_cita     = c.id_cita
            INNER JOIN vehiculo v      ON c.id_vehiculo = v.id_vehiculo
            INNER JOIN cliente cl      ON v.id_cliente  = cl.id_cliente
            WHERE f.id_factura = $1
        `, [req.params.id]);

        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Factura no encontrada' });

        // Traer servicios y repuestos
        const servicios = await pool.query(`
            SELECT s.nombre_servicio, s.costo
            FROM orden_servicio os
            INNER JOIN servicio s ON os.id_servicio = s.id_servicio
            WHERE os.id_orden = $1
        `, [result.rows[0].id_orden]);

        const repuestos = await pool.query(`
            SELECT i.nombre, i.marca, oi.cantidad,
                   i.precio, (i.precio * oi.cantidad) AS total
            FROM orden_inventario oi
            INNER JOIN inventario i ON oi.id_repuesto = i.id_repuesto
            WHERE oi.id_orden = $1
        `, [result.rows[0].id_orden]);

        res.json({
            ...result.rows[0],
            servicios: servicios.rows,
            repuestos: repuestos.rows
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const create = async (req, res) => {
    try {
        const { id_orden, metodo_pago } = req.body;

        if (!id_orden)
            return res.status(400).json({ error: 'Debe seleccionar una orden' });
        if (!metodo_pago)
            return res.status(400).json({ error: 'Debe seleccionar un método de pago' });

        // Calcular total desde servicios y repuestos
        const resServ = await pool.query(`
            SELECT COALESCE(SUM(s.costo), 0) AS total
            FROM orden_servicio os
            INNER JOIN servicio s ON os.id_servicio = s.id_servicio
            WHERE os.id_orden = $1
        `, [id_orden]);

        const resRep = await pool.query(`
            SELECT COALESCE(SUM(i.precio * oi.cantidad), 0) AS total
            FROM orden_inventario oi
            INNER JOIN inventario i ON oi.id_repuesto = i.id_repuesto
            WHERE oi.id_orden = $1
        `, [id_orden]);

        const total = parseFloat(resServ.rows[0].total) +
                      parseFloat(resRep.rows[0].total);

        if (total <= 0)
            return res.status(400).json({
                error: 'La orden no tiene servicios ni repuestos. Agrega items antes de facturar.'
            });

        const result = await pool.query(`
            INSERT INTO facturacion (fecha, total, metodo_pago, id_orden)
            VALUES (CURRENT_DATE, $1, $2, $3)
            RETURNING *
        `, [total, metodo_pago, id_orden]);

        res.status(201).json(result.rows[0]);

    } catch (err) {
        if (err.code === '23505')
            return res.status(400).json({ error: 'Esta orden ya tiene una factura generada' });
        res.status(500).json({ error: err.message });
    }
};

const remove = async (req, res) => {
    try {
        const result = await pool.query(
            'DELETE FROM facturacion WHERE id_factura = $1 RETURNING *',
            [req.params.id]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Factura no encontrada' });
        res.json({ mensaje: 'Factura eliminada correctamente' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getAll, getById, create, remove };
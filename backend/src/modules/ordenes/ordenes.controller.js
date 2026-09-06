const pool = require('../../config/database');

const getAll = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                o.id_orden,
                o.fecha_inicio,
                o.fecha_fin,
                o.observaciones,
                o.id_cita,
                o.id_empleado,
                c.fecha AS fecha_cita,
                cl.nombre || ' ' || cl.apellido AS cliente,
                v.placa || ' - ' || v.marca || ' ' || v.modelo AS vehiculo,
                e.nombre || ' ' || e.apellido AS empleado,
                est.nombre_estado AS estado
            FROM orden_trabajo o
            INNER JOIN cita c        ON o.id_cita      = c.id_cita
            INNER JOIN vehiculo v    ON c.id_vehiculo   = v.id_vehiculo
            INNER JOIN cliente cl    ON v.id_cliente    = cl.id_cliente
            LEFT  JOIN empleado e    ON o.id_empleado   = e.id_empleado
            LEFT  JOIN estado est    ON c.id_estado     = est.id_estado
            ORDER BY o.fecha_inicio DESC
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
                o.id_orden,
                o.fecha_inicio,
                o.fecha_fin,
                o.observaciones,
                o.id_cita,
                o.id_empleado,
                cl.nombre || ' ' || cl.apellido AS cliente,
                v.placa || ' - ' || v.marca || ' ' || v.modelo AS vehiculo,
                e.nombre || ' ' || e.apellido AS empleado,
                est.nombre_estado AS estado
            FROM orden_trabajo o
            INNER JOIN cita c        ON o.id_cita      = c.id_cita
            INNER JOIN vehiculo v    ON c.id_vehiculo   = v.id_vehiculo
            INNER JOIN cliente cl    ON v.id_cliente    = cl.id_cliente
            LEFT  JOIN empleado e    ON o.id_empleado   = e.id_empleado
            LEFT  JOIN estado est    ON c.id_estado     = est.id_estado
            WHERE o.id_orden = $1
        `, [req.params.id]);

        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Orden no encontrada' });

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const create = async (req, res) => {
    try {
        const { fecha_inicio, fecha_fin, observaciones, id_cita, id_empleado } = req.body;

        if (!fecha_inicio || !id_cita || !id_empleado)
            return res.status(400).json({
                error: 'Fecha inicio, cita y empleado son obligatorios'
            });

        const result = await pool.query(`
            INSERT INTO orden_trabajo
                (fecha_inicio, fecha_fin, observaciones, id_cita, id_empleado)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [fecha_inicio, fecha_fin || null, observaciones || null, id_cita, id_empleado]);

        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const update = async (req, res) => {
    try {
        const { fecha_inicio, fecha_fin, observaciones, id_cita, id_empleado } = req.body;

        const result = await pool.query(`
            UPDATE orden_trabajo SET
                fecha_inicio  = $1,
                fecha_fin     = $2,
                observaciones = $3,
                id_cita       = $4,
                id_empleado   = $5
            WHERE id_orden = $6
            RETURNING *
        `, [fecha_inicio, fecha_fin || null, observaciones || null,
            id_cita, id_empleado, req.params.id]);

        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Orden no encontrada' });

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const remove = async (req, res) => {
    try {
        const result = await pool.query(
            'DELETE FROM orden_trabajo WHERE id_orden = $1 RETURNING *',
            [req.params.id]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Orden no encontrada' });

        res.json({ mensaje: 'Orden eliminada correctamente' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getServicios = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT os.id_orden, os.id_servicio,
                   s.nombre_servicio, s.costo
            FROM orden_servicio os
            INNER JOIN servicio s ON os.id_servicio = s.id_servicio
            WHERE os.id_orden = $1
        `, [req.params.id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const addServicio = async (req, res) => {
    try {
        const { id_servicio } = req.body;
        if (!id_servicio)
            return res.status(400).json({ error: 'Seleccione un servicio' });

        await pool.query(`
            INSERT INTO orden_servicio (id_orden, id_servicio)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
        `, [req.params.id, id_servicio]);

        res.status(201).json({ mensaje: 'Servicio agregado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const removeServicio = async (req, res) => {
    try {
        await pool.query(
            'DELETE FROM orden_servicio WHERE id_orden=$1 AND id_servicio=$2',
            [req.params.id, req.params.sid]
        );
        res.json({ mensaje: 'Servicio eliminado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getRepuestos = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT oi.id_orden, oi.id_repuesto,
                   oi.cantidad,
                   i.nombre, i.marca, i.precio,
                   (i.precio * oi.cantidad) AS total
            FROM orden_inventario oi
            INNER JOIN inventario i ON oi.id_repuesto = i.id_repuesto
            WHERE oi.id_orden = $1
        `, [req.params.id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const addRepuesto = async (req, res) => {
    try {
        const { id_repuesto, cantidad } = req.body;
        if (!id_repuesto || !cantidad)
            return res.status(400).json({ error: 'Repuesto y cantidad son obligatorios' });

        await pool.query(`
            INSERT INTO orden_inventario (id_orden, id_repuesto, cantidad)
            VALUES ($1, $2, $3)
            ON CONFLICT (id_orden, id_repuesto)
            DO UPDATE SET cantidad = $3
        `, [req.params.id, id_repuesto, cantidad]);

        res.status(201).json({ mensaje: 'Repuesto agregado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const removeRepuesto = async (req, res) => {
    try {
        await pool.query(
            'DELETE FROM orden_inventario WHERE id_orden=$1 AND id_repuesto=$2',
            [req.params.id, req.params.rid]
        );
        res.json({ mensaje: 'Repuesto eliminado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    getAll, getById, create, update, remove,
    getServicios, addServicio, removeServicio,
    getRepuestos, addRepuesto, removeRepuesto
};
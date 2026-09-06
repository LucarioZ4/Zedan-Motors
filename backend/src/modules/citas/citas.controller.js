const pool = require('../../config/database');

const getAll = async (req, res) => {
    try {
        const { buscar } = req.query;
        let sql = `
            SELECT
                c.id_cita,
                c.fecha,
                TO_CHAR(c.hora, 'HH24:MI') AS hora,
                c.motivo,
                c.id_vehiculo,
                c.id_estado,
                cl.id_cliente,
                cl.nombre || ' ' || cl.apellido AS cliente,
                v.placa || ' - ' || v.marca || ' ' || v.modelo AS vehiculo,
                e.nombre_estado AS estado
            FROM cita c
            INNER JOIN vehiculo v  ON c.id_vehiculo = v.id_vehiculo
            INNER JOIN cliente cl  ON v.id_cliente  = cl.id_cliente
            INNER JOIN estado e    ON c.id_estado   = e.id_estado
        `;
        const params = [];

        if (buscar) {
            sql += ` WHERE UPPER(cl.nombre)  LIKE UPPER($1)
                     OR    UPPER(cl.apellido) LIKE UPPER($1)
                     OR    UPPER(v.placa)     LIKE UPPER($1)
                     OR    UPPER(c.motivo)    LIKE UPPER($1)`;
            params.push(`%${buscar}%`);
        }

        sql += ' ORDER BY c.fecha DESC, c.hora ASC';

        const result = await pool.query(sql, params);
        res.json(result.rows);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getById = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT c.id_cita, c.fecha,
                    TO_CHAR(c.hora, 'HH24:MI') AS hora,
                    c.motivo, c.id_vehiculo, c.id_estado,
                    cl.id_cliente,
                    cl.nombre || ' ' || cl.apellido AS cliente,
                    v.placa || ' - ' || v.marca || ' ' || v.modelo AS vehiculo,
                    e.nombre_estado AS estado
             FROM cita c
             INNER JOIN vehiculo v ON c.id_vehiculo = v.id_vehiculo
             INNER JOIN cliente cl ON v.id_cliente  = cl.id_cliente
             INNER JOIN estado e   ON c.id_estado   = e.id_estado
             WHERE c.id_cita = $1`,
            [req.params.id]
        );

        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Cita no encontrada' });

        res.json(result.rows[0]);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const create = async (req, res) => {
    try {
        const { fecha, hora, motivo, id_vehiculo, id_estado } = req.body;

        if (!fecha || !hora || !id_vehiculo)
            return res.status(400).json({ error: 'Fecha, hora y vehículo son obligatorios' });

        if (new Date(fecha) < new Date().setHours(0,0,0,0))
            return res.status(400).json({ error: 'No puede agendar citas en fechas pasadas' });

        const result = await pool.query(
            `INSERT INTO cita (fecha, hora, motivo, id_vehiculo, id_estado)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [fecha, hora, motivo || null, id_vehiculo, id_estado || 1]
        );

        res.status(201).json(result.rows[0]);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const update = async (req, res) => {
    try {
        const { fecha, hora, motivo, id_vehiculo, id_estado } = req.body;

        if (!fecha || !hora || !id_vehiculo)
            return res.status(400).json({ error: 'Fecha, hora y vehículo son obligatorios' });

        const result = await pool.query(
            `UPDATE cita SET
                fecha       = $1,
                hora        = $2,
                motivo      = $3,
                id_vehiculo = $4,
                id_estado   = $5
             WHERE id_cita = $6
             RETURNING *`,
            [fecha, hora, motivo || null, id_vehiculo, id_estado || 1, req.params.id]
        );

        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Cita no encontrada' });

        res.json(result.rows[0]);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const remove = async (req, res) => {
    try {
        const result = await pool.query(
            'DELETE FROM cita WHERE id_cita = $1 RETURNING *',
            [req.params.id]
        );

        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Cita no encontrada' });

        res.json({ mensaje: 'Cita eliminada correctamente' });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getAll, getById, create, update, remove };
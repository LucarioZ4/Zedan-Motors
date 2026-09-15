const pool = require('../../config/database');

const getAll = async (req, res) => {
    try {
        const { buscar } = req.query;
        let sql = `
            SELECT id_servicio, nombre_servicio, descripcion, costo
            FROM servicio
        `;
        const params = [];

        if (buscar) {
            sql += ` WHERE UPPER(nombre_servicio) LIKE UPPER($1)
                     OR    UPPER(descripcion)      LIKE UPPER($1)`;
            params.push(`%${buscar}%`);
        }

        sql += ' ORDER BY nombre_servicio';

        const result = await pool.query(sql, params);
        res.json(result.rows);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getById = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id_servicio, nombre_servicio, descripcion, costo
             FROM servicio WHERE id_servicio = $1`,
            [req.params.id]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Servicio no encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const create = async (req, res) => {
    try {
        const { nombre_servicio, descripcion, costo } = req.body;

        if (!nombre_servicio)
            return res.status(400).json({ error: 'El nombre es obligatorio' });
        if (!costo || costo <= 0)
            return res.status(400).json({ error: 'El costo debe ser mayor a cero' });

        const result = await pool.query(
            `INSERT INTO servicio (nombre_servicio, descripcion, costo)
             VALUES ($1, $2, $3) RETURNING *`,
            [nombre_servicio, descripcion || null, costo]
        );
        res.status(201).json(result.rows[0]);

    } catch (err) {
        if (err.code === '23505')
            return res.status(400).json({ error: 'Ya existe un servicio con ese nombre' });
        res.status(500).json({ error: err.message });
    }
};

const update = async (req, res) => {
    try {
        const { nombre_servicio, descripcion, costo } = req.body;

        if (!nombre_servicio)
            return res.status(400).json({ error: 'El nombre es obligatorio' });
        if (!costo || costo <= 0)
            return res.status(400).json({ error: 'El costo debe ser mayor a cero' });

        const result = await pool.query(
            `UPDATE servicio SET
                nombre_servicio = $1,
                descripcion     = $2,
                costo           = $3
             WHERE id_servicio = $4 RETURNING *`,
            [nombre_servicio, descripcion || null, costo, req.params.id]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Servicio no encontrado' });
        res.json(result.rows[0]);

    } catch (err) {
        if (err.code === '23505')
            return res.status(400).json({ error: 'Ya existe un servicio con ese nombre' });
        res.status(500).json({ error: err.message });
    }
};

const remove = async (req, res) => {
    try {
        const result = await pool.query(
            'DELETE FROM servicio WHERE id_servicio = $1 RETURNING *',
            [req.params.id]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Servicio no encontrado' });
        res.json({ mensaje: 'Servicio eliminado correctamente' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getAll, getById, create, update, remove };
const pool = require('../../config/database');

const getAll = async (req, res) => {
    try {
        const { buscar } = req.query;
        let sql = `
            SELECT v.id_vehiculo, v.placa, v.marca, v.modelo,
                   v.anio, v.color, v.id_cliente,
                   c.nombre || ' ' || c.apellido AS cliente
            FROM vehiculo v
            INNER JOIN cliente c ON v.id_cliente = c.id_cliente
        `;
        const params = [];

        if (buscar) {
            sql += ` WHERE UPPER(v.placa)   LIKE UPPER($1)
                     OR    UPPER(v.marca)   LIKE UPPER($1)
                     OR    UPPER(v.modelo)  LIKE UPPER($1)
                     OR    UPPER(c.nombre)  LIKE UPPER($1)
                     OR    UPPER(c.apellido) LIKE UPPER($1)`;
            params.push(`%${buscar}%`);
        }

        sql += ' ORDER BY v.marca, v.modelo';

        const result = await pool.query(sql, params);
        res.json(result.rows);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getById = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT v.id_vehiculo, v.placa, v.marca, v.modelo,
                    v.anio, v.color, v.id_cliente,
                    c.nombre || ' ' || c.apellido AS cliente
             FROM vehiculo v
             INNER JOIN cliente c ON v.id_cliente = c.id_cliente
             WHERE v.id_vehiculo = $1`,
            [req.params.id]
        );

        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Vehículo no encontrado' });

        res.json(result.rows[0]);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const create = async (req, res) => {
    try {
        const { placa, marca, modelo, anio, color, id_cliente } = req.body;

        if (!placa || !marca || !modelo || !id_cliente)
            return res.status(400).json({ error: 'Placa, marca, modelo y cliente son obligatorios' });

        if (anio && (anio < 1900 || anio > new Date().getFullYear() + 1))
            return res.status(400).json({ error: 'Año no válido' });

        const result = await pool.query(
            `INSERT INTO vehiculo (placa, marca, modelo, anio, color, id_cliente)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [placa.toUpperCase(), marca, modelo, anio || null, color || null, id_cliente]
        );

        res.status(201).json(result.rows[0]);

    } catch (err) {
        if (err.code === '23505')
            return res.status(400).json({ error: 'La placa ya está registrada' });
        res.status(500).json({ error: err.message });
    }
};

const update = async (req, res) => {
    try {
        const { placa, marca, modelo, anio, color, id_cliente } = req.body;

        if (!placa || !marca || !modelo || !id_cliente)
            return res.status(400).json({ error: 'Placa, marca, modelo y cliente son obligatorios' });

        const result = await pool.query(
            `UPDATE vehiculo SET
                placa      = $1,
                marca      = $2,
                modelo     = $3,
                anio       = $4,
                color      = $5,
                id_cliente = $6
             WHERE id_vehiculo = $7
             RETURNING *`,
            [placa.toUpperCase(), marca, modelo, anio || null, color || null, id_cliente, req.params.id]
        );

        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Vehículo no encontrado' });

        res.json(result.rows[0]);

    } catch (err) {
        if (err.code === '23505')
            return res.status(400).json({ error: 'La placa ya está registrada' });
        res.status(500).json({ error: err.message });
    }
};

const remove = async (req, res) => {
    try {
        const result = await pool.query(
            'DELETE FROM vehiculo WHERE id_vehiculo = $1 RETURNING *',
            [req.params.id]
        );

        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Vehículo no encontrado' });

        res.json({ mensaje: 'Vehículo eliminado correctamente' });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getAll, getById, create, update, remove };
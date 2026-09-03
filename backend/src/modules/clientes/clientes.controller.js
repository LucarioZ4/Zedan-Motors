const pool = require('../../config/database');

const getAll = async (req, res) => {
    try {
        const { buscar } = req.query;
        let sql = `
            SELECT id_cliente, nombre, apellido, telefono, correo, direccion,
                   nombre || ' ' || apellido AS nombre_completo
            FROM cliente
        `;
        const params = [];

        if (buscar) {
            sql += ` WHERE UPPER(nombre)   LIKE UPPER($1)
                     OR    UPPER(apellido) LIKE UPPER($1)
                     OR    telefono        LIKE $1`;
            params.push(`%${buscar}%`);
        }

        sql += ' ORDER BY apellido, nombre';

        const result = await pool.query(sql, params);
        res.json(result.rows);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getById = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id_cliente, nombre, apellido, telefono, correo, direccion
             FROM cliente WHERE id_cliente = $1`,
            [req.params.id]
        );

        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Cliente no encontrado' });

        res.json(result.rows[0]);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const create = async (req, res) => {
    try {
        const { nombre, apellido, telefono, correo, direccion } = req.body;

        if (!nombre || !apellido || !telefono)
            return res.status(400).json({ error: 'Nombre, apellido y teléfono son obligatorios' });

        if (telefono.length < 7)
            return res.status(400).json({ error: 'El teléfono debe tener al menos 7 dígitos' });

        if (correo && !correo.includes('@'))
            return res.status(400).json({ error: 'El correo no es válido' });

        const result = await pool.query(
            `INSERT INTO cliente (nombre, apellido, telefono, correo, direccion)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [nombre, apellido, telefono, correo || null, direccion || null]
        );

        res.status(201).json(result.rows[0]);

    } catch (err) {
        if (err.code === '23505')
            return res.status(400).json({ error: 'El teléfono o correo ya está registrado' });
        res.status(500).json({ error: err.message });
    }
};

const update = async (req, res) => {
    try {
        const { nombre, apellido, telefono, correo, direccion } = req.body;

        if (!nombre || !apellido || !telefono)
            return res.status(400).json({ error: 'Nombre, apellido y teléfono son obligatorios' });

        const result = await pool.query(
            `UPDATE cliente SET
                nombre    = $1,
                apellido  = $2,
                telefono  = $3,
                correo    = $4,
                direccion = $5
             WHERE id_cliente = $6
             RETURNING *`,
            [nombre, apellido, telefono, correo || null, direccion || null, req.params.id]
        );

        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Cliente no encontrado' });

        res.json(result.rows[0]);

    } catch (err) {
        if (err.code === '23505')
            return res.status(400).json({ error: 'El teléfono o correo ya está registrado' });
        res.status(500).json({ error: err.message });
    }
};

const remove = async (req, res) => {
    try {
        const result = await pool.query(
            'DELETE FROM cliente WHERE id_cliente = $1 RETURNING *',
            [req.params.id]
        );

        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Cliente no encontrado' });

        res.json({ mensaje: 'Cliente eliminado correctamente' });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getVehiculos = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id_vehiculo, placa, marca, modelo, anio, color
             FROM vehiculo
             WHERE id_cliente = $1
             ORDER BY marca, modelo`,
            [req.params.id]
        );
        res.json(result.rows);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getAll, getById, create, update, remove, getVehiculos };
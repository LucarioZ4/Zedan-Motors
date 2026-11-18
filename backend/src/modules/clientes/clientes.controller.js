const patronContiene = require('../../utils/patronContiene');
const pool = require('../../config/database');

const getAll = async (req, res) => {
    try {
        const { buscar } = req.query;
        let sql = `
            SELECT id_cliente, nombre, apellido, telefono, correo, direccion,
                   nombre || ' ' || apellido AS nombre_completo,
                   (SELECT COUNT(*)::int FROM vehiculo v WHERE v.id_cliente = cliente.id_cliente) AS total_vehiculos
            FROM cliente
        `;
        const params = [];

        if (typeof buscar === 'string' && buscar.trim()) {
            sql += ` WHERE UPPER(nombre)   LIKE UPPER($1)
                     OR    UPPER(apellido) LIKE UPPER($1)
                     OR    telefono        LIKE $1`;
            params.push(patronContiene(buscar));
        }

        sql += ' ORDER BY apellido, nombre';

        const result = await pool.query(sql, params);
        res.json(result.rows);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

const consultarDetalle = id => pool.query(
            `SELECT id_cliente, nombre, apellido, telefono, correo, direccion,
                    nombre || ' ' || apellido AS nombre_completo,
                    COALESCE((SELECT jsonb_agg(jsonb_build_object('id_vehiculo',v.id_vehiculo,'placa',v.placa,'marca',v.marca,'modelo',v.modelo,'anio',v.anio,'color',v.color,'id_cliente',v.id_cliente,'cliente',cliente.nombre || ' ' || cliente.apellido) ORDER BY v.marca,v.modelo,v.id_vehiculo)
                              FROM vehiculo v WHERE v.id_cliente=cliente.id_cliente),'[]') AS vehiculos
             FROM cliente WHERE id_cliente = $1`,
            [id]
        );

const getById = async (req, res) => {
    try {
        const result = await consultarDetalle(req.params.id);

        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Cliente no encontrado' });

        res.json(result.rows[0]);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

const create = async (req, res) => {
    try {
        const { nombre, apellido, telefono, correo, direccion } = req.body;

        const result = await pool.query(
            `INSERT INTO cliente (nombre, apellido, telefono, correo, direccion)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [nombre, apellido, telefono, correo || null, direccion || null]
        );

        res.status(201).json((await consultarDetalle(result.rows[0].id_cliente)).rows[0]);

    } catch (err) {
        if (err.code === '23505')
            return res.status(409).json({ error: 'El teléfono o correo ya está registrado' });
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

const update = async (req, res) => {
    try {
        const { nombre, apellido, telefono, correo, direccion } = req.body;

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

        res.json((await consultarDetalle(result.rows[0].id_cliente)).rows[0]);

    } catch (err) {
        if (err.code === '23505')
            return res.status(409).json({ error: 'El teléfono o correo ya está registrado' });
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor' });
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
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

const getVehiculos = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT v.id_vehiculo, placa, marca, modelo, anio, color, v.id_cliente, c.nombre || ' ' || c.apellido AS cliente
             FROM vehiculo v JOIN cliente c USING(id_cliente)
             WHERE v.id_cliente = $1
             ORDER BY marca, modelo`,
            [req.params.id]
        );
        res.json(result.rows);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

module.exports = { getAll, getById, create, update, remove, getVehiculos };
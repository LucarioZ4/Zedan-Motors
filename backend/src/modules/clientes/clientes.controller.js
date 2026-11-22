const patronContiene = require('../../utils/patronContiene');
const pool = require('../../config/database');
const bitacora = require('../../services/bitacora.service');

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

        const nuevo = result.rows[0];

        const idSesion = req.usuario?.id_sesion;
        const idUsuario = req.usuario?.id;
        if (idSesion && idUsuario) {
            bitacora.registrarEvento({
                idSesion,
                idUsuario,
                modulo: 'cliente',
                accion: 'crear',
                entidad: 'cliente',
                idRegistro: nuevo.id_cliente,
                descripcion: `Registró cliente ${nuevo.nombre} ${nuevo.apellido}`,
                datosAntes: null,
                datosDespues: nuevo,
                contexto: { id_cliente: nuevo.id_cliente, telefono: nuevo.telefono }
            }).catch(e => console.warn('Bitácora error:', e.message));
        }

        res.status(201).json((await consultarDetalle(nuevo.id_cliente)).rows[0]);

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
        const id = req.params.id;

        const prevRes = await pool.query('SELECT * FROM cliente WHERE id_cliente = $1', [id]);
        if (prevRes.rows.length === 0)
            return res.status(404).json({ error: 'Cliente no encontrado' });
        const anterior = prevRes.rows[0];

        const result = await pool.query(
            `UPDATE cliente SET
                nombre    = $1,
                apellido  = $2,
                telefono  = $3,
                correo    = $4,
                direccion = $5
             WHERE id_cliente = $6
             RETURNING *`,
            [nombre, apellido, telefono, correo || null, direccion || null, id]
        );

        const actualizado = result.rows[0];

        const idSesion = req.usuario?.id_sesion;
        const idUsuario = req.usuario?.id;
        if (idSesion && idUsuario) {
            bitacora.registrarEvento({
                idSesion,
                idUsuario,
                modulo: 'cliente',
                accion: 'actualizar',
                entidad: 'cliente',
                idRegistro: id,
                descripcion: `Actualizó datos de cliente ${actualizado.nombre} ${actualizado.apellido}`,
                datosAntes: anterior,
                datosDespues: actualizado,
                contexto: { id_cliente: id, telefono: actualizado.telefono }
            }).catch(e => console.warn('Bitácora error:', e.message));
        }

        res.json((await consultarDetalle(actualizado.id_cliente)).rows[0]);

    } catch (err) {
        if (err.code === '23505')
            return res.status(409).json({ error: 'El teléfono o correo ya está registrado' });
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

const remove = async (req, res) => {
    try {
        const id = req.params.id;
        const prevRes = await pool.query('SELECT * FROM cliente WHERE id_cliente = $1', [id]);
        if (prevRes.rows.length === 0)
            return res.status(404).json({ error: 'Cliente no encontrado' });
        const anterior = prevRes.rows[0];

        await pool.query(
            'DELETE FROM cliente WHERE id_cliente = $1',
            [id]
        );

        const idSesion = req.usuario?.id_sesion;
        const idUsuario = req.usuario?.id;
        if (idSesion && idUsuario) {
            bitacora.registrarEvento({
                idSesion,
                idUsuario,
                modulo: 'cliente',
                accion: 'eliminar',
                entidad: 'cliente',
                idRegistro: id,
                descripcion: `Eliminó cliente ${anterior.nombre} ${anterior.apellido} (#${id})`,
                datosAntes: anterior,
                datosDespues: null,
                contexto: { id_cliente: id }
            }).catch(e => console.warn('Bitácora error:', e.message));
        }

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
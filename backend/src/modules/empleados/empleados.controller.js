const pool = require('../../config/database');
const bitacora = require('../../services/bitacora.service');

const getCargos = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id_cargo, nombre_cargo FROM cargo ORDER BY nombre_cargo'
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

const getAll = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                e.id_empleado,
                e.nombre,
                e.apellido,
                e.nombre || ' ' || e.apellido AS nombre_completo,
                e.telefono,
                e.correo,
                e.id_cargo,
                c.nombre_cargo AS cargo
            FROM empleado e
            LEFT JOIN cargo c ON e.id_cargo = c.id_cargo
            ORDER BY e.apellido, e.nombre
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

const consultarDetalle = id => pool.query(`
            SELECT
                e.id_empleado, e.nombre, e.apellido,
                e.telefono, e.correo, e.id_cargo, e.nombre || ' ' || e.apellido AS nombre_completo,
                c.nombre_cargo AS cargo
            FROM empleado e
            LEFT JOIN cargo c ON e.id_cargo = c.id_cargo
            WHERE e.id_empleado = $1
        `, [id]);

const getById = async (req, res) => {
    try {
        const result = await consultarDetalle(req.params.id);

        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Empleado no encontrado' });

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

const create = async (req, res) => {
    try {
        const { nombre, apellido, telefono, correo, id_cargo } = req.body;

        if (!nombre || !apellido || !telefono)
            return res.status(400).json({
                error: 'Nombre, apellido y teléfono son obligatorios'
            });

        if (!id_cargo)
            return res.status(400).json({ error: 'Debe seleccionar un cargo' });

        const result = await pool.query(`
            INSERT INTO empleado (nombre, apellido, telefono, correo, id_cargo)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [nombre, apellido, telefono, correo || null, id_cargo]);

        const nuevo = result.rows[0];

        const idSesion = req.usuario?.id_sesion;
        const idUsuario = req.usuario?.id;
        if (idSesion && idUsuario) {
            bitacora.registrarEvento({
                idSesion,
                idUsuario,
                modulo: 'empleados',
                accion: 'crear',
                entidad: 'empleado',
                idRegistro: nuevo.id_empleado,
                descripcion: `Registró empleado ${nuevo.nombre} ${nuevo.apellido}`,
                datosAntes: null,
                datosDespues: nuevo,
                contexto: { id_empleado: nuevo.id_empleado, id_cargo }
            }).catch(e => console.warn('Bitácora error:', e.message));
        }

        res.status(201).json((await consultarDetalle(nuevo.id_empleado)).rows[0]);

    } catch (err) {
        if (err.code === '23503') return res.status(400).json({ error: 'La referencia indicada no existe' });
        if (err.code === '23505')
            return res.status(409).json({
                error: 'El teléfono o correo ya está registrado'
            });
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

const update = async (req, res) => {
    try {
        const { nombre, apellido, telefono, correo, id_cargo } = req.body;
        const id = req.params.id;

        if (!nombre || !apellido || !telefono)
            return res.status(400).json({
                error: 'Nombre, apellido y teléfono son obligatorios'
            });

        if (!id_cargo)
            return res.status(400).json({ error: 'Debe seleccionar un cargo' });

        const prevRes = await pool.query('SELECT * FROM empleado WHERE id_empleado = $1', [id]);
        if (prevRes.rows.length === 0)
            return res.status(404).json({ error: 'Empleado no encontrado' });
        const anterior = prevRes.rows[0];

        const result = await pool.query(`
            UPDATE empleado SET
                nombre    = $1,
                apellido  = $2,
                telefono  = $3,
                correo    = $4,
                id_cargo  = $5
            WHERE id_empleado = $6
            RETURNING *
        `, [nombre, apellido, telefono, correo || null, id_cargo, id]);

        const actualizado = result.rows[0];

        const idSesion = req.usuario?.id_sesion;
        const idUsuario = req.usuario?.id;
        if (idSesion && idUsuario) {
            bitacora.registrarEvento({
                idSesion,
                idUsuario,
                modulo: 'empleados',
                accion: 'actualizar',
                entidad: 'empleado',
                idRegistro: id,
                descripcion: `Actualizó datos de empleado ${actualizado.nombre} ${actualizado.apellido}`,
                datosAntes: anterior,
                datosDespues: actualizado,
                contexto: { id_empleado: id, id_cargo }
            }).catch(e => console.warn('Bitácora error:', e.message));
        }

        res.json((await consultarDetalle(actualizado.id_empleado)).rows[0]);

    } catch (err) {
        if (err.code === '23503') return res.status(400).json({ error: 'La referencia indicada no existe' });
        if (err.code === '23505')
            return res.status(409).json({
                error: 'El teléfono o correo ya está registrado'
            });
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

const remove = async (req, res) => {
    try {
        const id = req.params.id;
        const prevRes = await pool.query('SELECT * FROM empleado WHERE id_empleado = $1', [id]);
        if (prevRes.rows.length === 0)
            return res.status(404).json({ error: 'Empleado no encontrado' });
        const anterior = prevRes.rows[0];

        await pool.query('DELETE FROM empleado WHERE id_empleado = $1', [id]);

        const idSesion = req.usuario?.id_sesion;
        const idUsuario = req.usuario?.id;
        if (idSesion && idUsuario) {
            bitacora.registrarEvento({
                idSesion,
                idUsuario,
                modulo: 'empleados',
                accion: 'eliminar',
                entidad: 'empleado',
                idRegistro: id,
                descripcion: `Eliminó empleado ${anterior.nombre} ${anterior.apellido} (#${id})`,
                datosAntes: anterior,
                datosDespues: null,
                contexto: { id_empleado: id }
            }).catch(e => console.warn('Bitácora error:', e.message));
        }

        res.json({ mensaje: 'Empleado eliminado correctamente' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};


module.exports = { getAll, getById, create, update, remove, getCargos };
const patronContiene = require('../../utils/patronContiene');
const pool = require('../../config/database');
const bitacora = require('../../services/bitacora.service');

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
            LEFT JOIN estado e    ON c.id_estado   = e.id_estado
        `;
        const params = [];

        if (typeof buscar === 'string' && buscar.trim()) {
            sql += ` WHERE UPPER(cl.nombre)  LIKE UPPER($1)
                     OR    UPPER(cl.apellido) LIKE UPPER($1)
                     OR    UPPER(v.placa)     LIKE UPPER($1)
                     OR    UPPER(c.motivo)    LIKE UPPER($1)`;
            params.push(patronContiene(buscar));
        }

        sql += ' ORDER BY c.fecha DESC, c.hora ASC';

        const result = await pool.query(sql, params);
        res.json(result.rows);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

const consultarDetalle = id => pool.query(
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
             LEFT JOIN estado e   ON c.id_estado   = e.id_estado
             WHERE c.id_cita = $1`,
            [id]
        );

const getById = async (req, res) => {
    try {
        const result = await consultarDetalle(req.params.id);

        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Cita no encontrada' });

        res.json(result.rows[0]);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

const create = async (req, res) => {
    try {
        const { fecha, hora, motivo, id_vehiculo, id_estado } = req.body;

        const result = await pool.query(
            `INSERT INTO cita (fecha, hora, motivo, id_vehiculo, id_estado)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [fecha, hora, motivo || null, id_vehiculo, id_estado || 1]
        );

        const nueva = result.rows[0];

        const idSesion = req.usuario?.id_sesion;
        const idUsuario = req.usuario?.id;
        if (idSesion && idUsuario) {
            bitacora.registrarEvento({
                idSesion,
                idUsuario,
                modulo: 'cita',
                accion: 'crear',
                entidad: 'cita',
                idRegistro: nueva.id_cita,
                descripcion: `Agendó cita para el ${fecha} a las ${hora} (Motivo: ${motivo || 'General'})`,
                datosAntes: null,
                datosDespues: nueva,
                contexto: { id_cita: nueva.id_cita, id_vehiculo, fecha, hora }
            }).catch(e => console.warn('Bitácora error:', e.message));
        }

        res.status(201).json((await consultarDetalle(nueva.id_cita)).rows[0]);

    } catch (err) {
        if (err.code === '23503') return res.status(400).json({ error: 'La referencia indicada no existe' });
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

const update = async (req, res) => {
    try {
        const { fecha, hora, motivo, id_vehiculo, id_estado } = req.body;
        const id = req.params.id;

        const prevRes = await pool.query('SELECT * FROM cita WHERE id_cita = $1', [id]);
        if (prevRes.rows.length === 0)
            return res.status(404).json({ error: 'Cita no encontrada' });
        const anterior = prevRes.rows[0];

        const result = await pool.query(
            `UPDATE cita SET
                fecha       = $1,
                hora        = $2,
                motivo      = $3,
                id_vehiculo = $4,
                id_estado   = $5
             WHERE id_cita = $6
             RETURNING *`,
            [fecha, hora, motivo || null, id_vehiculo, id_estado || 1, id]
        );

        const actualizada = result.rows[0];

        const idSesion = req.usuario?.id_sesion;
        const idUsuario = req.usuario?.id;
        if (idSesion && idUsuario) {
            const esCambioEstado = anterior.id_estado !== actualizada.id_estado;
            bitacora.registrarEvento({
                idSesion,
                idUsuario,
                modulo: 'cita',
                accion: esCambioEstado ? 'cambiar_estado' : 'actualizar',
                entidad: 'cita',
                idRegistro: id,
                descripcion: `Actualizó cita #${id} (${actualizada.fecha} ${actualizada.hora})`,
                datosAntes: anterior,
                datosDespues: actualizada,
                contexto: { id_cita: id, id_vehiculo, fecha: actualizada.fecha }
            }).catch(e => console.warn('Bitácora error:', e.message));
        }

        res.json((await consultarDetalle(actualizada.id_cita)).rows[0]);

    } catch (err) {
        if (err.code === '23503') return res.status(400).json({ error: 'La referencia indicada no existe' });
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

const remove = async (req, res) => {
    try {
        const id = req.params.id;
        const prevRes = await pool.query('SELECT * FROM cita WHERE id_cita = $1', [id]);
        if (prevRes.rows.length === 0)
            return res.status(404).json({ error: 'Cita no encontrada' });
        const anterior = prevRes.rows[0];

        await pool.query('DELETE FROM cita WHERE id_cita = $1', [id]);

        const idSesion = req.usuario?.id_sesion;
        const idUsuario = req.usuario?.id;
        if (idSesion && idUsuario) {
            bitacora.registrarEvento({
                idSesion,
                idUsuario,
                modulo: 'cita',
                accion: 'eliminar',
                entidad: 'cita',
                idRegistro: id,
                descripcion: `Canceló / eliminó cita #${id} de fecha ${anterior.fecha}`,
                datosAntes: anterior,
                datosDespues: null,
                contexto: { id_cita: id, id_vehiculo: anterior.id_vehiculo }
            }).catch(e => console.warn('Bitácora error:', e.message));
        }

        res.json({ mensaje: 'Cita eliminada correctamente' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};



module.exports = { getAll, getById, create, update, remove };
const patronContiene = require('../../utils/patronContiene');
const pool = require('../../config/database');
const bitacora = require('../../services/bitacora.service');

const getAll = async (req, res) => {
    try {
        const { buscar } = req.query;
        let sql = `
            SELECT id_repuesto, nombre, marca, precio, stock,
                   CASE WHEN stock < 5 THEN true ELSE false END AS stock_bajo
            FROM inventario
        `;
        const params = [];

        if (typeof buscar === 'string' && buscar.trim()) {
            sql += ` WHERE UPPER(nombre) LIKE UPPER($1)
                     OR    UPPER(marca)  LIKE UPPER($1)`;
            params.push(patronContiene(buscar));
        }

        sql += ' ORDER BY nombre';

        const result = await pool.query(sql, params);
        res.json(result.rows);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

const consultarDetalle = id => pool.query(
            `SELECT id_repuesto, nombre, marca, precio, stock,
                    CASE WHEN stock < 5 THEN true ELSE false END AS stock_bajo
             FROM inventario WHERE id_repuesto = $1`,
            [id]
        );

const getById = async (req, res) => {
    try {
        const result = await consultarDetalle(req.params.id);
        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Repuesto no encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

const create = async (req, res) => {
    try {
        const { nombre, marca, precio, stock } = req.body;

        const result = await pool.query(
            `INSERT INTO inventario (nombre, marca, precio, stock)
             VALUES ($1, $2, $3, $4) RETURNING id_repuesto, nombre, marca, precio, stock`,
            [nombre, marca || null, precio, stock || 0]
        );
        const nuevo = result.rows[0];

        // Registrar en bitácora
        const idSesion = req.usuario?.id_sesion;
        const idUsuario = req.usuario?.id;
        if (idSesion && idUsuario) {
            bitacora.registrarEvento({
                idSesion,
                idUsuario,
                modulo: 'inventario',
                accion: 'crear',
                entidad: 'inventario',
                idRegistro: nuevo.id_repuesto,
                descripcion: `Creó repuesto "${nuevo.nombre}" (Stock inicial: ${nuevo.stock})`,
                datosAntes: null,
                datosDespues: nuevo,
                contexto: { id_repuesto: nuevo.id_repuesto, nombre: nuevo.nombre }
            }).catch(e => console.warn('Bitácora error:', e.message));
        }

        res.status(201).json((await consultarDetalle(nuevo.id_repuesto)).rows[0]);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

const update = async (req, res) => {
    try {
        const { nombre, marca, precio, stock } = req.body;
        const id = req.params.id;

        // Obtener estado anterior
        const prevRes = await pool.query('SELECT * FROM inventario WHERE id_repuesto = $1', [id]);
        if (prevRes.rows.length === 0)
            return res.status(404).json({ error: 'Repuesto no encontrado' });
        const anterior = prevRes.rows[0];

        const result = await pool.query(
            `UPDATE inventario SET
                nombre = $1, marca = $2,
                precio = $3, stock = $4
             WHERE id_repuesto = $5 RETURNING *`,
            [nombre, marca || null, precio, stock ?? 0, req.params.id]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Repuesto no encontrado' });
        const actualizado = result.rows[0];

        // Registrar en bitácora
        const idSesion = req.usuario?.id_sesion;
        const idUsuario = req.usuario?.id;
        if (idSesion && idUsuario) {
            bitacora.registrarEvento({
                idSesion,
                idUsuario,
                modulo: 'inventario',
                accion: 'actualizar',
                entidad: 'inventario',
                idRegistro: id,
                descripcion: `Actualizó repuesto "${actualizado.nombre}" (Stock: ${anterior.stock} -> ${actualizado.stock})`,
                datosAntes: anterior,
                datosDespues: actualizado,
                contexto: { id_repuesto: id, nombre: actualizado.nombre }
            }).catch(e => console.warn('Bitácora error:', e.message));
        }

        res.json((await consultarDetalle(actualizado.id_repuesto)).rows[0]);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

const remove = async (req, res) => {
    try {
        const id = req.params.id;
        const prevRes = await pool.query('SELECT * FROM inventario WHERE id_repuesto = $1', [id]);
        if (prevRes.rows.length === 0)
            return res.status(404).json({ error: 'Repuesto no encontrado' });
        const anterior = prevRes.rows[0];

        await pool.query(
            'DELETE FROM inventario WHERE id_repuesto = $1',
            [id]
        );

        // Registrar en bitácora
        const idSesion = req.usuario?.id_sesion;
        const idUsuario = req.usuario?.id;
        if (idSesion && idUsuario) {
            bitacora.registrarEvento({
                idSesion,
                idUsuario,
                modulo: 'inventario',
                accion: 'eliminar',
                entidad: 'inventario',
                idRegistro: id,
                descripcion: `Eliminó repuesto "${anterior.nombre}" (#${id})`,
                datosAntes: anterior,
                datosDespues: null,
                contexto: { id_repuesto: id, nombre: anterior.nombre }
            }).catch(e => console.warn('Bitácora error:', e.message));
        }

        res.json({ mensaje: 'Repuesto eliminado correctamente' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

const importar = async (req, res) => {
    const client = await pool.connect();
    try {
        const items = Array.isArray(req.body) ? req.body : req.body?.items;
        if (items?.length > 1000) return res.status(400).json({ error: 'Máximo 1000 filas por importación.' });

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'No se enviaron datos para importar' });
        }

        await client.query('BEGIN');
        const insertados = [];
        const errores = [];

        for (let i = 0; i < items.length; i++) {
            const item = items[i] || {};
            const fila = i + 1;
            const nombre = item.nombre ? String(item.nombre).trim() : '';
            const marca = item.marca ? String(item.marca).trim() : null;
            const precio = Number(item.precio);
            const stock = item.stock !== undefined && item.stock !== '' ? Number(item.stock) : 0;

            if (nombre.length > 100 || marca?.length > 50) {
                errores.push("Fila " + fila + ": Nombre o marca demasiado largos.");
                continue;
            }
            if (!nombre) {
                errores.push(`Fila ${fila}: El nombre es obligatorio.`);
                continue;
            }
            if (!Number.isFinite(precio) || precio <= 0 || precio > 99999999.99) {
                errores.push(`Fila ${fila} (${nombre}): Precio inválido (${item.precio}). Debe ser mayor a cero.`);
                continue;
            }
            if (!Number.isInteger(stock) || stock < 0 || stock > 2147483647) {
                errores.push(`Fila ${fila} (${nombre}): Stock inválido (${item.stock}). No puede ser negativo.`);
                continue;
            }

            const result = await client.query(
                `INSERT INTO inventario (nombre, marca, precio, stock)
                 VALUES ($1, $2, $3, $4) RETURNING id_repuesto, nombre, marca, precio, stock`,
                [nombre, marca, precio, stock]
            );
            insertados.push({ ...result.rows[0], stock_bajo: stock < 5 });
        }

        await client.query('COMMIT');

        res.status(201).json({
            mensaje: `Se importaron ${insertados.length} repuestos correctamente.`,
            total: insertados.length,
            errores: errores.length > 0 ? errores : undefined,
            data: insertados
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Error al importar repuestos' });
    } finally {
        client.release();
    }
};

module.exports = { getAll, getById, create, update, remove, importar };

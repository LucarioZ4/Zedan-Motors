const pool = require('../../config/database');

const getAll = async (req, res) => {
    try {
        const { buscar } = req.query;
        let sql = `
            SELECT id_repuesto, nombre, marca, precio, stock,
                   CASE WHEN stock < 5 THEN true ELSE false END AS stock_bajo
            FROM inventario
        `;
        const params = [];

        if (buscar) {
            sql += ` WHERE UPPER(nombre) LIKE UPPER($1)
                     OR    UPPER(marca)  LIKE UPPER($1)`;
            params.push(`%${buscar}%`);
        }

        sql += ' ORDER BY nombre';

        const result = await pool.query(sql, params);
        res.json(result.rows);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getById = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id_repuesto, nombre, marca, precio, stock,
                    CASE WHEN stock < 5 THEN true ELSE false END AS stock_bajo
             FROM inventario WHERE id_repuesto = $1`,
            [req.params.id]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Repuesto no encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const create = async (req, res) => {
    try {
        const { nombre, marca, precio, stock } = req.body;

        if (!nombre)
            return res.status(400).json({ error: 'El nombre es obligatorio' });
        if (!precio || precio <= 0)
            return res.status(400).json({ error: 'El precio debe ser mayor a cero' });
        if (stock < 0)
            return res.status(400).json({ error: 'El stock no puede ser negativo' });

        const result = await pool.query(
            `INSERT INTO inventario (nombre, marca, precio, stock)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [nombre, marca || null, precio, stock || 0]
        );
        res.status(201).json(result.rows[0]);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const update = async (req, res) => {
    try {
        const { nombre, marca, precio, stock } = req.body;

        if (!nombre)
            return res.status(400).json({ error: 'El nombre es obligatorio' });
        if (!precio || precio <= 0)
            return res.status(400).json({ error: 'El precio debe ser mayor a cero' });
        if (stock < 0)
            return res.status(400).json({ error: 'El stock no puede ser negativo' });

        const result = await pool.query(
            `UPDATE inventario SET
                nombre = $1, marca = $2,
                precio = $3, stock = $4
             WHERE id_repuesto = $5 RETURNING *`,
            [nombre, marca || null, precio, stock, req.params.id]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Repuesto no encontrado' });
        res.json(result.rows[0]);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const remove = async (req, res) => {
    try {
        const result = await pool.query(
            'DELETE FROM inventario WHERE id_repuesto = $1 RETURNING *',
            [req.params.id]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Repuesto no encontrado' });
        res.json({ mensaje: 'Repuesto eliminado correctamente' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const importar = async (req, res) => {
    const client = await pool.connect();
    try {
        const items = Array.isArray(req.body) ? req.body : req.body.items;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'No se enviaron datos para importar' });
        }

        await client.query('BEGIN');
        const insertados = [];
        const errores = [];

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const fila = i + 1;
            const nombre = item.nombre ? String(item.nombre).trim() : '';
            const marca = item.marca ? String(item.marca).trim() : null;
            const precio = parseFloat(item.precio);
            const stock = item.stock !== undefined && item.stock !== '' ? parseInt(item.stock) : 0;

            if (!nombre) {
                errores.push(`Fila ${fila}: El nombre es obligatorio.`);
                continue;
            }
            if (isNaN(precio) || precio <= 0) {
                errores.push(`Fila ${fila} (${nombre}): Precio inválido (${item.precio}). Debe ser mayor a cero.`);
                continue;
            }
            if (isNaN(stock) || stock < 0) {
                errores.push(`Fila ${fila} (${nombre}): Stock inválido (${item.stock}). No puede ser negativo.`);
                continue;
            }

            const result = await client.query(
                `INSERT INTO inventario (nombre, marca, precio, stock)
                 VALUES ($1, $2, $3, $4) RETURNING *`,
                [nombre, marca, precio, stock]
            );
            insertados.push(result.rows[0]);
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
        res.status(500).json({ error: 'Error al importar repuestos: ' + err.message });
    } finally {
        client.release();
    }
};

module.exports = { getAll, getById, create, update, remove, importar };
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

const importar = async (req, res) => {
    const client = await pool.connect();
    try {
        const items = Array.isArray(req.body) ? req.body : req.body.items;
        const idClienteDefecto = req.body.idClienteDefecto ? parseInt(req.body.idClienteDefecto) : null;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'No se enviaron datos para importar' });
        }

        // Cache existing clients
        const clientesRes = await client.query('SELECT id_cliente, nombre, apellido, correo FROM cliente');
        const clientesMap = new Map();
        clientesRes.rows.forEach(c => {
            clientesMap.set(String(c.id_cliente), c.id_cliente);
            if (c.correo) clientesMap.set(c.correo.toLowerCase().trim(), c.id_cliente);
            const fullName = `${c.nombre} ${c.apellido}`.toLowerCase().trim();
            clientesMap.set(fullName, c.id_cliente);
        });

        await client.query('BEGIN');
        const insertados = [];
        const errores = [];

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const fila = i + 1;
            const placa = item.placa ? String(item.placa).trim().toUpperCase() : '';
            const marca = item.marca ? String(item.marca).trim() : '';
            const modelo = item.modelo ? String(item.modelo).trim() : '';
            const anio = item.anio ? parseInt(item.anio) : null;
            const color = item.color ? String(item.color).trim() : null;

            let id_cliente = item.id_cliente ? parseInt(item.id_cliente) : null;
            if (!id_cliente && item.cliente) {
                const clienteKey = String(item.cliente).toLowerCase().trim();
                if (clientesMap.has(clienteKey)) {
                    id_cliente = clientesMap.get(clienteKey);
                }
            }
            if (!id_cliente && idClienteDefecto) {
                id_cliente = idClienteDefecto;
            }

            if (!placa) {
                errores.push(`Fila ${fila}: La placa es obligatoria.`);
                continue;
            }
            if (!marca) {
                errores.push(`Fila ${fila} (${placa}): La marca es obligatoria.`);
                continue;
            }
            if (!modelo) {
                errores.push(`Fila ${fila} (${placa}): El modelo es obligatorio.`);
                continue;
            }
            if (!id_cliente || !clientesMap.has(String(id_cliente))) {
                errores.push(`Fila ${fila} (${placa}): Debe especificar un cliente válido existente.`);
                continue;
            }
            if (anio && (anio < 1900 || anio > new Date().getFullYear() + 1)) {
                errores.push(`Fila ${fila} (${placa}): Año no válido (${item.anio}).`);
                continue;
            }

            // Check if placa already registered
            const placaExiste = await client.query('SELECT 1 FROM vehiculo WHERE placa = $1', [placa]);
            if (placaExiste.rows.length > 0) {
                errores.push(`Fila ${fila} (${placa}): La placa ya está registrada.`);
                continue;
            }

            const result = await client.query(
                `INSERT INTO vehiculo (placa, marca, modelo, anio, color, id_cliente)
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                [placa, marca, modelo, anio || null, color || null, id_cliente]
            );
            insertados.push(result.rows[0]);
        }

        await client.query('COMMIT');

        res.status(201).json({
            mensaje: `Se importaron ${insertados.length} vehículos correctamente.`,
            total: insertados.length,
            errores: errores.length > 0 ? errores : undefined,
            data: insertados
        });

    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Error al importar vehículos: ' + err.message });
    } finally {
        client.release();
    }
};

module.exports = { getAll, getById, create, update, remove, importar };
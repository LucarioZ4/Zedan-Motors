const pool = require('../../config/database');

const bloquearOrdenEditable = async (client, id) => {
    const orden = await client.query('SELECT 1 FROM orden_trabajo WHERE id_orden=$1 FOR UPDATE', [id]);
    if (!orden.rows.length) throw new ErrorNegocio(404, 'Orden no encontrada');
    const factura = await client.query('SELECT 1 FROM facturacion WHERE id_orden=$1', [id]);
    if (factura.rows.length)
        throw new ErrorNegocio(409, 'La orden ya tiene factura: no se puede modificar ni eliminar.');
};

const conOrdenEditable = (accion) => async (req, res) => {
    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');
        await bloquearOrdenEditable(client, req.params.id);
        const resultado = await accion(client, req);
        await client.query('COMMIT');
        res.status(resultado.status || 200).json(resultado.body);
    } catch (err) {
        if (client) await client.query('ROLLBACK').catch(() => {});
        res.status(err instanceof ErrorNegocio ? err.status : 500).json({ error: err.message });
    } finally {
        if (client) client.release();
    }
};


const getAll = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                o.id_orden,
                o.fecha_inicio,
                o.fecha_fin,
                o.observaciones,
                o.id_cita,
                o.id_empleado,
                c.fecha AS fecha_cita,
                cl.nombre || ' ' || cl.apellido AS cliente,
                v.placa || ' - ' || v.marca || ' ' || v.modelo AS vehiculo,
                e.nombre || ' ' || e.apellido AS empleado,
                est.nombre_estado AS estado
            FROM orden_trabajo o
            INNER JOIN cita c        ON o.id_cita      = c.id_cita
            INNER JOIN vehiculo v    ON c.id_vehiculo   = v.id_vehiculo
            INNER JOIN cliente cl    ON v.id_cliente    = cl.id_cliente
            LEFT  JOIN empleado e    ON o.id_empleado   = e.id_empleado
            LEFT  JOIN estado est    ON c.id_estado     = est.id_estado
            ORDER BY o.fecha_inicio DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getById = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                o.id_orden,
                o.fecha_inicio,
                o.fecha_fin,
                o.observaciones,
                o.id_cita,
                o.id_empleado,
                cl.nombre || ' ' || cl.apellido AS cliente,
                v.placa || ' - ' || v.marca || ' ' || v.modelo AS vehiculo,
                e.nombre || ' ' || e.apellido AS empleado,
                est.nombre_estado AS estado
            FROM orden_trabajo o
            INNER JOIN cita c        ON o.id_cita      = c.id_cita
            INNER JOIN vehiculo v    ON c.id_vehiculo   = v.id_vehiculo
            INNER JOIN cliente cl    ON v.id_cliente    = cl.id_cliente
            LEFT  JOIN empleado e    ON o.id_empleado   = e.id_empleado
            LEFT  JOIN estado est    ON c.id_estado     = est.id_estado
            WHERE o.id_orden = $1
        `, [req.params.id]);

        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Orden no encontrada' });

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const create = async (req, res) => {
    try {
        const { fecha_inicio, fecha_fin, observaciones, id_cita, id_empleado } = req.body;

        if (!fecha_inicio || !id_cita || !id_empleado)
            return res.status(400).json({
                error: 'Fecha inicio, cita y empleado son obligatorios'
            });

        const result = await pool.query(`
            INSERT INTO orden_trabajo
                (fecha_inicio, fecha_fin, observaciones, id_cita, id_empleado)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [fecha_inicio, fecha_fin || null, observaciones || null, id_cita, id_empleado]);

        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const update = conOrdenEditable(async (client, req) => {
    const { fecha_inicio, fecha_fin, observaciones, id_cita, id_empleado } = req.body;
    const result = await client.query(`
        UPDATE orden_trabajo SET fecha_inicio=$1, fecha_fin=$2, observaciones=$3,
            id_cita=$4, id_empleado=$5 WHERE id_orden=$6 RETURNING *`,
        [fecha_inicio, fecha_fin || null, observaciones || null, id_cita, id_empleado, req.params.id]);
    return { body: result.rows[0] };
});

const remove = conOrdenEditable(async (client, req) => {
    await client.query('DELETE FROM orden_trabajo WHERE id_orden=$1', [req.params.id]);
    return { body: { mensaje: 'Orden eliminada correctamente' } };
});

const getServicios = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT os.id_orden, os.id_servicio,
                   s.nombre_servicio, s.costo
            FROM orden_servicio os
            INNER JOIN servicio s ON os.id_servicio = s.id_servicio
            WHERE os.id_orden = $1
        `, [req.params.id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const addServicio = conOrdenEditable(async (client, req) => {
    if (!req.body.id_servicio) throw new ErrorNegocio(400, 'Seleccione un servicio');
    await client.query(`INSERT INTO orden_servicio (id_orden, id_servicio)
        VALUES ($1, $2) ON CONFLICT DO NOTHING`, [req.params.id, req.body.id_servicio]);
    return { status: 201, body: { mensaje: 'Servicio agregado' } };
});

const removeServicio = conOrdenEditable(async (client, req) => {
    await client.query('DELETE FROM orden_servicio WHERE id_orden=$1 AND id_servicio=$2',
        [req.params.id, req.params.sid]);
    return { body: { mensaje: 'Servicio eliminado' } };
});

const getRepuestos = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT oi.id_orden, oi.id_repuesto,
                   oi.cantidad,
                   i.nombre, i.marca, i.precio,
                   (i.precio * oi.cantidad) AS total
            FROM orden_inventario oi
            INNER JOIN inventario i ON oi.id_repuesto = i.id_repuesto
            WHERE oi.id_orden = $1
        `, [req.params.id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Error de negocio con código HTTP (permite hacer ROLLBACK y responder en un solo catch)
class ErrorNegocio extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

const addRepuesto = async (req, res) => {
    const idOrden    = Number(req.params.id);
    const idRepuesto = Number(req.body.id_repuesto);
    const cantidad   = Number(req.body.cantidad);

    if (!Number.isInteger(idRepuesto) || idRepuesto <= 0 ||
        !Number.isInteger(cantidad)   || cantidad   <= 0)
        return res.status(400).json({
            error: 'Repuesto y cantidad son obligatorios (la cantidad debe ser un entero mayor a cero)'
        });

    if (!Number.isInteger(idOrden))
        return res.status(404).json({ error: 'Orden no encontrada' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await bloquearOrdenEditable(client, idOrden);

        // FOR UPDATE bloquea la fila del repuesto hasta el COMMIT:
        // dos usuarios no pueden descontar el mismo stock al mismo tiempo.
        const rep = await client.query(
            'SELECT nombre, stock FROM inventario WHERE id_repuesto = $1 FOR UPDATE',
            [idRepuesto]
        );
        if (rep.rows.length === 0)
            throw new ErrorNegocio(404, 'Repuesto no encontrado');

        // Si el repuesto ya estaba en la orden, solo se descuenta la diferencia
        // (ej.: tenía 2 y ahora pide 5 → descuenta 3; si pide 1 → devuelve 1).
        const previo = await client.query(
            'SELECT cantidad FROM orden_inventario WHERE id_orden = $1 AND id_repuesto = $2',
            [idOrden, idRepuesto]
        );
        const cantidadPrevia = previo.rows.length ? previo.rows[0].cantidad : 0;
        const diferencia     = cantidad - cantidadPrevia;
        const { nombre, stock } = rep.rows[0];

        if (diferencia > stock)
            throw new ErrorNegocio(409,
                `Stock insuficiente para "${nombre}": máximo permitido para esta orden ` +
                `${stock + cantidadPrevia}, solicitado ${cantidad}`);

        if (diferencia !== 0)
            await client.query(
                'UPDATE inventario SET stock = stock - $1 WHERE id_repuesto = $2',
                [diferencia, idRepuesto]
            );

        await client.query(`
            INSERT INTO orden_inventario (id_orden, id_repuesto, cantidad)
            VALUES ($1, $2, $3)
            ON CONFLICT (id_orden, id_repuesto)
            DO UPDATE SET cantidad = EXCLUDED.cantidad
        `, [idOrden, idRepuesto, cantidad]);

        await client.query('COMMIT');

        res.status(201).json({
            mensaje: 'Repuesto agregado',
            stock_restante: stock - diferencia
        });

    } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        if (err instanceof ErrorNegocio)
            return res.status(err.status).json({ error: err.message });
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

const removeRepuesto = async (req, res) => {
    const idOrden    = Number(req.params.id);
    const idRepuesto = Number(req.params.rid);

    if (!Number.isInteger(idOrden) || !Number.isInteger(idRepuesto))
        return res.status(404).json({ error: 'Repuesto no encontrado en la orden' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await bloquearOrdenEditable(client, idOrden);

        // Mismo orden de bloqueo que addRepuesto (inventario → orden_inventario) para evitar deadlocks
        await client.query(
            'SELECT 1 FROM inventario WHERE id_repuesto = $1 FOR UPDATE', [idRepuesto]
        );

        const borrado = await client.query(
            `DELETE FROM orden_inventario
             WHERE id_orden = $1 AND id_repuesto = $2
             RETURNING cantidad`,
            [idOrden, idRepuesto]
        );

        // Al quitar el repuesto de la orden, las unidades vuelven al inventario
        if (borrado.rows.length > 0)
            await client.query(
                'UPDATE inventario SET stock = stock + $1 WHERE id_repuesto = $2',
                [borrado.rows[0].cantidad, idRepuesto]
            );

        await client.query('COMMIT');
        res.json({ mensaje: 'Repuesto eliminado' });

    } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        res.status(err instanceof ErrorNegocio ? err.status : 500).json({ error: err.message });
    } finally {
        client.release();
    }
};

module.exports = {
    getAll, getById, create, update, remove,
    getServicios, addServicio, removeServicio,
    getRepuestos, addRepuesto, removeRepuesto
};
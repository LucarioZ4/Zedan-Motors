const { createHash } = require('node:crypto');
const pool = require('../../config/database');
const iaService = require('./inventario.ia.service');
const bitacora = require('../../services/bitacora.service');

const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp'];
// El límite de Vercel para el cuerpo de una petición es 4.5 MB; el navegador ya reduce la foto,
// esto es solo una red de seguridad.
const MAX_BASE64 = 3_500_000;
const MAX_FILAS  = 100;

class ErrorNegocio extends Error {
    constructor(status, mensaje) {
        super(mensaje);
        this.status = status;
    }
}

const responderError = (res, err, mensajeGenerico) => {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error(err);
    return res.status(500).json({ error: mensajeGenerico });
};

// POST /api/inventario/ia/analizar
// Recibe la foto, la IA propone productos y cantidades. NO modifica el inventario:
// el usuario revisa la propuesta y luego la confirma con /ia/aplicar.
const analizar = async (req, res) => {
    try {
        const { imagen, tipo_media: tipoMedia = 'image/jpeg' } = req.body || {};

        if (!imagen || typeof imagen !== 'string')
            return res.status(400).json({ error: 'Debes enviar una imagen' });
        if (!TIPOS_IMAGEN.includes(tipoMedia))
            return res.status(400).json({ error: 'Formato de imagen no soportado (usa JPG, PNG o WEBP)' });

        const base64 = imagen.replace(/^data:[^;]+;base64,/, '').trim();
        if (!/^[A-Za-z0-9+/=\r\n]+$/.test(base64))
            return res.status(400).json({ error: 'La imagen no tiene un formato válido' });
        if (base64.length > MAX_BASE64)
            return res.status(413).json({ error: 'La imagen es demasiado grande. Usa una foto más pequeña.' });

        const catalogo = await pool.query(
            'SELECT id_repuesto, nombre, marca, stock FROM inventario ORDER BY nombre LIMIT 600'
        );

        const resultado = await iaService.analizarFoto({
            base64,
            mediaType: tipoMedia,
            catalogo: catalogo.rows,
        });

        res.json(resultado);
    } catch (err) {
        responderError(res, err, 'Error al analizar la imagen');
    }
};

// POST /api/inventario/ia/aplicar
// Aplica al inventario lo que el usuario YA revisó y confirmó, todo en una sola transacción:
// o se guardan todos los cambios o ninguno. Cada cambio queda en movimiento_inventario.
//   modo 'sumar'     -> ingreso de mercancía (suma al stock actual)
//   modo 'establecer'-> conteo físico (reemplaza el stock actual)
const aplicar = async (req, res) => {
    const { modo, items, nota } = req.body || {};

    const operacion = req.body?.id_operacion;
    if (typeof operacion !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(operacion))
        return res.status(400).json({ error: 'Se requiere un id_operacion UUID' });
    const clave = operacion.toLowerCase();

    if (!['sumar', 'establecer'].includes(modo))
        return res.status(400).json({ error: "El modo debe ser 'sumar' o 'establecer'" });
    if (!Array.isArray(items) || items.length === 0 || items.length > MAX_FILAS)
        return res.status(400).json({ error: `Envía entre 1 y ${MAX_FILAS} filas` });

    const existentes = new Map();   // id_repuesto -> cantidad total
    const nuevos = [];

    for (let i = 0; i < items.length; i++) {
        const it = items[i] || {};
        const fila = i + 1;
        const cantidad = Number(it.cantidad);

        if (it.cantidad == null || it.cantidad === '' || typeof it.cantidad === 'boolean' ||
            !Number.isInteger(cantidad) || cantidad < 0 || cantidad > 100000)
            return res.status(400).json({ error: `Fila ${fila}: la cantidad debe ser un entero entre 0 y 100000` });

        if (it.nuevo) {
            const nombre = typeof it.nuevo.nombre === 'string' ? it.nuevo.nombre.trim() : '';
            const marca  = typeof it.nuevo.marca  === 'string' ? it.nuevo.marca.trim()  : '';
            const precio = Number(it.nuevo.precio);

            if (!nombre || nombre.length > 100)
                return res.status(400).json({ error: `Fila ${fila}: el nombre del repuesto nuevo es obligatorio (máx. 100 caracteres)` });
            if (marca.length > 50)
                return res.status(400).json({ error: `Fila ${fila}: la marca es muy larga (máx. 50 caracteres)` });
            if (!Number.isFinite(precio) || precio <= 0 || precio > 99999999.99)
                return res.status(400).json({ error: `Fila ${fila} (${nombre}): el precio debe ser mayor a cero` });

            nuevos.push({ nombre, marca: marca || null, precio, cantidad });
        } else {
            const id = Number(it.id_repuesto);
            if (!Number.isInteger(id) || id <= 0)
                return res.status(400).json({ error: `Fila ${fila}: repuesto inválido` });
            // Si el mismo repuesto aparece en dos filas, se acumulan.
            existentes.set(id, (existentes.get(id) || 0) + cantidad);
        }
    }

    // En 'sumar', una cantidad 0 no cambia nada.
    if (modo === 'sumar') {
        for (const [id, cant] of existentes) if (cant === 0) existentes.delete(id);
    }

    if (existentes.size === 0 && nuevos.length === 0)
        return res.status(400).json({ error: 'No hay cambios para aplicar' });

    const notaLimpia = typeof nota === 'string' && nota.trim() ? nota.trim().slice(0, 200) : null;
    const tipoMov = modo === 'sumar' ? 'ingreso' : 'conteo';
    const idUsuario = Number.isInteger(req.usuario?.id) ? req.usuario.id : null;

    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');
        const ids = [...existentes.keys()].sort((a, b) => a - b);
        const solicitud = { modo, nota: notaLimpia, existentes: ids.map(id => [id, existentes.get(id)]), nuevos };
        await client.query('SELECT pg_advisory_xact_lock($1::int, hashtext($2))', [idUsuario, clave]);
        const previa = await client.query(
            `SELECT contexto->'respuesta' AS respuesta, contexto->'solicitud' = $3::jsonb AS coincide
             FROM bitacora_evento WHERE id_usuario=$1 AND id_registro=$2 AND accion='confirmar_ia' AND entidad='inventario'`,
            [idUsuario, clave, JSON.stringify(solicitud)]
        );
        if (previa.rowCount) {
            await client.query('ROLLBACK');
            if (!previa.rows[0].coincide)
                return res.status(409).json({ error: 'Este conteo ya se aplicó con otros datos. Inicia otro análisis.' });
            return res.json(previa.rows[0].respuesta);
        }
        const resultados = [];

        // Se bloquean en orden de id para que dos usuarios aplicando a la vez no se traben entre sí.
        for (const id of ids) {
            const fila = await client.query(
                'SELECT nombre, stock FROM inventario WHERE id_repuesto = $1 FOR UPDATE', [id]
            );
            if (fila.rows.length === 0)
                throw new ErrorNegocio(404, `El repuesto #${id} ya no existe en el inventario`);

            const { nombre, stock } = fila.rows[0];
            const cantidad = existentes.get(id);
            const stockNuevo = modo === 'sumar' ? stock + cantidad : cantidad;

            if (stockNuevo > 2_000_000_000)
                throw new ErrorNegocio(400, `El stock resultante de "${nombre}" es demasiado grande`);

            await client.query('UPDATE inventario SET stock = $1 WHERE id_repuesto = $2', [stockNuevo, id]);
            await client.query(
                `INSERT INTO movimiento_inventario
                    (id_repuesto, tipo, origen, stock_anterior, stock_nuevo, nota, id_usuario)
                 VALUES ($1, $2, 'ia', $3, $4, $5, $6)`,
                [id, tipoMov, stock, stockNuevo, notaLimpia, idUsuario]
            );
            resultados.push({
                id_repuesto: id, nombre, stock_anterior: stock, stock_nuevo: stockNuevo, creado: false,
            });
        }

        for (const n of nuevos) {
            const creado = await client.query(
                `INSERT INTO inventario (nombre, marca, precio, stock)
                 VALUES ($1, $2, $3, $4) RETURNING id_repuesto`,
                [n.nombre, n.marca, n.precio, n.cantidad]
            );
            const id = creado.rows[0].id_repuesto;
            await client.query(
                `INSERT INTO movimiento_inventario
                    (id_repuesto, tipo, origen, stock_anterior, stock_nuevo, nota, id_usuario)
                 VALUES ($1, 'ingreso', 'ia', 0, $2, $3, $4)`,
                [id, n.cantidad, notaLimpia, idUsuario]
            );
            resultados.push({
                id_repuesto: id, nombre: n.nombre, stock_anterior: 0, stock_nuevo: n.cantidad, creado: true,
            });
        }


        const nCreados = resultados.filter((r) => r.creado).length;
        const nActualizados = resultados.length - nCreados;
        const partes = [];
        if (nActualizados) partes.push(`${nActualizados} repuesto(s) actualizado(s)`);
        if (nCreados) partes.push(`${nCreados} repuesto(s) nuevo(s)`);

        const respuesta = { mensaje: `Inventario actualizado: ${partes.join(' y ')}.`, total: resultados.length, resultados };
        const idSesion = req.usuario.id_sesion || createHash('sha256')
            .update(req.headers.authorization.slice(7)).digest('hex').slice(0, 32);
        await client.query('INSERT INTO sesion_bitacora(id_sesion,id_usuario) VALUES($1,$2) ON CONFLICT (id_sesion) DO NOTHING', [idSesion, idUsuario]);
        await bitacora.registrarEvento({
            client,
            idSesion,
            idUsuario,
            modulo: 'ia',
            accion: 'confirmar_ia',
            entidad: 'inventario',
            idRegistro: clave,
            descripcion: `Confirmación IA (${modo}): ${partes.join(' y ') || 'Sin cambios numéricos'}. Nota: ${notaLimpia || 'N/A'}`,
            datosAntes: {
                items: resultados.map(r => ({ id: r.id_repuesto, nombre: r.nombre, stock: r.stock_anterior }))
            },
            datosDespues: {
                items: resultados.map(r => ({ id: r.id_repuesto, nombre: r.nombre, stock: r.stock_nuevo }))
            },
            contexto: {
                solicitud, respuesta, modo,
                total_modificados: resultados.length,
                creados: nCreados,
                actualizados: nActualizados,
                nota: notaLimpia
            }
        });
        await client.query('COMMIT');
        res.json(respuesta);
    } catch (err) {
        if (client) await client.query('ROLLBACK').catch(() => {});
        responderError(res, err, 'Error al actualizar el inventario');
    } finally {
        if (client) client.release();
    }
};

module.exports = { analizar, aplicar };

const pool = require('../../config/database');
const env = require('../../config/env');
const bitacora = require('../../services/bitacora.service');

const getAll = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                f.id_factura,
                f.fecha,
                f.total,
                f.metodo_pago,
                f.id_orden,
                COALESCE(cl.nombre || ' ' || cl.apellido, 'Sin cliente') AS cliente,
                COALESCE(cl.telefono, '') AS telefono,
                COALESCE(cl.correo, '') AS correo,
                COALESCE(v.placa || ' - ' || v.marca || ' ' || v.modelo, 'Sin vehículo') AS vehiculo
            FROM facturacion f
            LEFT JOIN orden_trabajo o ON f.id_orden = o.id_orden
            LEFT JOIN cita c          ON o.id_cita  = c.id_cita
            LEFT JOIN vehiculo v      ON c.id_vehiculo = v.id_vehiculo
            LEFT JOIN cliente cl      ON v.id_cliente  = cl.id_cliente
            ORDER BY f.id_factura DESC
        `);
        res.json(result.rows);
    } catch (err) {
        if (err.code === '42P01') {
            try {
                const alt = await pool.query(`
                    SELECT
                        f."idFactura" AS id_factura,
                        f.fecha,
                        f.total,
                        f."metodoPago" AS metodo_pago,
                        f."idOrden" AS id_orden,
                        COALESCE(cl.nombre || ' ' || cl.apellido, 'Sin cliente') AS cliente,
                        COALESCE(cl.telefono, '') AS telefono,
                        COALESCE(cl.correo, '') AS correo,
                        COALESCE(v.placa || ' - ' || v.marca || ' ' || v.modelo, 'Sin vehículo') AS vehiculo
                    FROM "Facturas" f
                    LEFT JOIN "OrdenesTrabajo" o ON f."idOrden" = o."idOrden"
                    LEFT JOIN "Citas" c          ON o."idCita"  = c."idCita"
                    LEFT JOIN "Vehiculos" v      ON c."idVehiculo" = v."idVehiculo"
                    LEFT JOIN "Clientes" cl      ON v."idCliente"  = cl."idCliente"
                    ORDER BY f."idFactura" DESC
                `);
                return res.json(alt.rows);
            } catch (altErr) {
                console.error('Error en fallback Facturas:', altErr);
            }
        }
        console.error('Error en getAll facturacion:', err);
        res.status(500).json({ error: `Error en BD: ${err.message}` });
    }
};

const getById = async (req, res) => {
    try {
        let result;
        try {
            result = await pool.query(`
                SELECT
                    f.id_factura, f.fecha, f.total, f.metodo_pago, f.id_orden,
                    f.servicios_detalle, f.repuestos_detalle,
                    COALESCE(cl.nombre || ' ' || cl.apellido, 'Sin cliente') AS cliente,
                    COALESCE(cl.telefono, '') AS telefono, COALESCE(cl.correo, '') AS correo,
                    COALESCE(v.placa || ' - ' || v.marca || ' ' || v.modelo, 'Sin vehículo') AS vehiculo,
                    o.observaciones,
                    o.fecha_inicio, o.fecha_fin
                FROM facturacion f
                LEFT JOIN orden_trabajo o ON f.id_orden    = o.id_orden
                LEFT JOIN cita c          ON o.id_cita     = c.id_cita
                LEFT JOIN vehiculo v      ON c.id_vehiculo = v.id_vehiculo
                LEFT JOIN cliente cl      ON v.id_cliente  = cl.id_cliente
                WHERE f.id_factura = $1
            `, [req.params.id]);
        } catch (err) {
            if (err.code === '42P01') {
                result = await pool.query(`
                    SELECT
                        f."idFactura" AS id_factura, f.fecha, f.total, f."metodoPago" AS metodo_pago, f."idOrden" AS id_orden,
                        '[]'::jsonb AS servicios_detalle, '[]'::jsonb AS repuestos_detalle,
                        COALESCE(cl.nombre || ' ' || cl.apellido, 'Sin cliente') AS cliente,
                        COALESCE(cl.telefono, '') AS telefono, COALESCE(cl.correo, '') AS correo,
                        COALESCE(v.placa || ' - ' || v.marca || ' ' || v.modelo, 'Sin vehículo') AS vehiculo,
                        o.observaciones,
                        o."fechaInicio" AS fecha_inicio, o."fechaFin" AS fecha_fin
                    FROM "Facturas" f
                    LEFT JOIN "OrdenesTrabajo" o ON f."idOrden" = o."idOrden"
                    LEFT JOIN "Citas" c          ON o."idCita"  = c."idCita"
                    LEFT JOIN "Vehiculos" v      ON c."idVehiculo" = v."idVehiculo"
                    LEFT JOIN "Clientes" cl      ON v."idCliente"  = cl."idCliente"
                    WHERE f."idFactura" = $1
                `, [req.params.id]);
            } else {
                throw err;
            }
        }

        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Factura no encontrada' });

        const { servicios_detalle, repuestos_detalle, ...factura } = result.rows[0];
        res.json({ ...factura, servicios: servicios_detalle, repuestos: repuestos_detalle });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message || 'Error interno del servidor' });
    }
};

const create = async (req, res) => {
    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');
        const { id_orden, metodo_pago } = req.body;

        const orden = await client.query('SELECT 1 FROM orden_trabajo WHERE id_orden=$1 FOR UPDATE', [id_orden]);
        if (!orden.rows.length) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Orden no encontrada' });
        }
        const existente = await client.query('SELECT 1 FROM facturacion WHERE id_orden=$1', [id_orden]);
        if (existente.rows.length) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'Esta orden ya tiene una factura generada' });
        }

        // Calcular total desde servicios y repuestos
        const resServ = await client.query(`
            SELECT COALESCE(SUM(s.costo), 0) AS total
            FROM orden_servicio os
            INNER JOIN servicio s ON os.id_servicio = s.id_servicio
            WHERE os.id_orden = $1
        `, [id_orden]);

        const resRep = await client.query(`
            SELECT COALESCE(SUM(i.precio * oi.cantidad), 0) AS total
            FROM orden_inventario oi
            INNER JOIN inventario i ON oi.id_repuesto = i.id_repuesto
            WHERE oi.id_orden = $1
        `, [id_orden]);

        const total = parseFloat(resServ.rows[0].total) +
                      parseFloat(resRep.rows[0].total);

        if (total <= 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: 'La orden no tiene servicios ni repuestos. Agrega items antes de facturar.'
            });
        }

        const result = await client.query(`
            INSERT INTO facturacion (fecha, total, metodo_pago, id_orden)
            VALUES ((CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')::date, $1, $2, $3)
            RETURNING id_factura, fecha, total, metodo_pago, id_orden
        `, [total, metodo_pago, id_orden]);

        let factura = result.rows[0];
        await client.query('COMMIT');
        client.release();
        client = null;

        // Registrar en bitácora
        const idSesion = req.usuario?.id_sesion;
        const idUsuario = req.usuario?.id;
        if (idSesion && idUsuario) {
            bitacora.registrarEvento({
                idSesion,
                idUsuario,
                modulo: 'facturacion',
                accion: 'crear',
                entidad: 'facturacion',
                idRegistro: factura.id_factura,
                descripcion: `Generó factura #${factura.id_factura} por $${total} (Método: ${metodo_pago})`,
                datosAntes: null,
                datosDespues: factura,
                contexto: { id_factura: factura.id_factura, id_orden, total, metodo_pago }
            }).catch(e => console.warn('Bitácora error:', e.message));
        }

        // Integración con Factus (Mock)
        try {
            const factusService = require('./factus.service');
            // Preparamos los datos básicos para Factus (Estructura de ejemplo)
            const datosFactus = {
                referencia: factura.id_factura.toString(),
                fecha: factura.fecha.slice(0, 10),
                total: Number(factura.total),
                metodo_pago: metodo_pago
            };
            
            const respuestaFactus = await factusService.emitirFactura(datosFactus);
            
            // Adjuntamos la respuesta de Factus a la respuesta del servidor
            factura.factus = respuestaFactus.data;
        } catch (factusError) {
            console.error('Error enviando a Factus, pero la factura se guardó localmente:', factusError);
            factura.factusError = 'No se pudo emitir la factura electrónica';
        }

        res.status(201).json(factura);

    } catch (err) {
        if (client) await client.query('ROLLBACK').catch(() => {});
        if (err.code === '23505')
            return res.status(409).json({ error: 'Esta orden ya tiene una factura generada' });
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (client) client.release();
    }
};

const remove = async (req, res) => {
    try {
        const result = await pool.query(
            'DELETE FROM facturacion WHERE id_factura = $1 RETURNING id_factura, fecha, total, metodo_pago, id_orden',
            [req.params.id]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Factura no encontrada' });
        res.json({ mensaje: 'Factura eliminada correctamente' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

const update = async (req, res, next) => {
    try {
        const result = await pool.query('UPDATE facturacion SET metodo_pago=$1 WHERE id_factura=$2', [req.body.metodo_pago, req.params.id]);
        if (!result.rowCount) return res.status(404).json({ error: 'Factura no encontrada' });
        res.json({ mensaje: 'Factura actualizada' });
    } catch (err) {
        next(err);
    }
};

const enviarCorreo = async (req, res) => {
    try {
        const idFactura = req.params.id;
        const result = await pool.query(`
            SELECT
                f.id_factura, f.fecha, f.total, f.metodo_pago, f.id_orden,
                f.servicios_detalle, f.repuestos_detalle,
                cl.nombre || ' ' || cl.apellido AS cliente,
                cl.telefono, cl.correo,
                v.placa || ' - ' || v.marca || ' ' || v.modelo AS vehiculo,
                o.observaciones,
                o.fecha_inicio, o.fecha_fin
            FROM facturacion f
            LEFT JOIN orden_trabajo o ON f.id_orden    = o.id_orden
            LEFT JOIN cita c          ON o.id_cita     = c.id_cita
            LEFT JOIN vehiculo v      ON c.id_vehiculo = v.id_vehiculo
            LEFT JOIN cliente cl      ON v.id_cliente  = cl.id_cliente
            WHERE f.id_factura = $1
        `, [idFactura]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Factura no encontrada' });
        }

        const { servicios_detalle, repuestos_detalle, ...facturaHeader } = result.rows[0];
        const factura = {
            ...facturaHeader,
            servicios: servicios_detalle || [],
            repuestos: repuestos_detalle || []
        };

        const correoDestino = req.body?.correo?.trim() || factura.correo?.trim();
        if (!correoDestino) {
            return res.status(400).json({
                error: 'El cliente no tiene un correo registrado. Proporciona una dirección de correo válida para el envío.'
            });
        }

        // Generar comprobante PDF con pdfkit
        const pdfService = require('../../services/pdf.service');
        const emailService = require('../../services/email.service');
        const pdfBuffer = await pdfService.generarFacturaPdf(factura);

        // Enviar por correo con Nodemailer + Gmail
        const info = await emailService.enviarFacturaPorCorreo({
            para: correoDestino,
            factura,
            pdfBuffer
        });

        // Intentar registrar fecha/estado de envío si existen las columnas
        try {
            await pool.query(`
                UPDATE facturacion
                SET correo_enviado = true, fecha_envio_correo = NOW()
                WHERE id_factura = $1
            `, [idFactura]);
        } catch (dbErr) {
            // No bloqueante si las columnas no están migradas en DB local
        }

        // Registrar evento en bitácora de auditoría
        const idSesion = req.usuario?.id_sesion;
        const idUsuario = req.usuario?.id;
        if (idSesion && idUsuario) {
            bitacora.registrarEvento({
                idSesion,
                idUsuario,
                modulo: 'facturacion',
                accion: 'actualizar',
                entidad: 'facturacion',
                idRegistro: factura.id_factura,
                descripcion: `Envió factura #${factura.id_factura} por correo a ${correoDestino}`,
                datosAntes: null,
                datosDespues: { correo: correoDestino },
                contexto: { id_factura: factura.id_factura, correo: correoDestino, messageId: info.messageId }
            }).catch(e => console.warn('Bitácora error:', e.message));
        }

        res.json({
            ok: true,
            mensaje: `Factura enviada exitosamente a ${correoDestino}`,
            correo: correoDestino,
            messageId: info.messageId
        });
    } catch (err) {
        console.error('Error al enviar factura por correo:', err);
        res.status(500).json({ error: err.message || 'Error al enviar la factura por correo' });
    }
};

const descargarPdf = async (req, res) => {
    try {
        const idFactura = req.params.id;
        const result = await pool.query(`
            SELECT
                f.id_factura, f.fecha, f.total, f.metodo_pago, f.id_orden,
                f.servicios_detalle, f.repuestos_detalle,
                cl.nombre || ' ' || cl.apellido AS cliente,
                cl.telefono, cl.correo,
                v.placa || ' - ' || v.marca || ' ' || v.modelo AS vehiculo
            FROM facturacion f
            LEFT JOIN orden_trabajo o ON f.id_orden    = o.id_orden
            LEFT JOIN cita c          ON o.id_cita     = c.id_cita
            LEFT JOIN vehiculo v      ON c.id_vehiculo = v.id_vehiculo
            LEFT JOIN cliente cl      ON v.id_cliente  = cl.id_cliente
            WHERE f.id_factura = $1
        `, [idFactura]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Factura no encontrada' });
        }

        const { servicios_detalle, repuestos_detalle, ...facturaHeader } = result.rows[0];
        const factura = {
            ...facturaHeader,
            servicios: servicios_detalle || [],
            repuestos: repuestos_detalle || []
        };

        const pdfService = require('../../services/pdf.service');
        const pdfBuffer = await pdfService.generarFacturaPdf(factura);
        const filename = `Factura_FE-${String(factura.id_factura).padStart(6, '0')}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        res.send(pdfBuffer);
    } catch (err) {
        console.error('Error generando PDF:', err);
        res.status(500).json({ error: err.message || 'Error al generar el PDF' });
    }
};

const normalizarChatId = (telefonoRaw) => {
    if (!telefonoRaw) return { error: 'El cliente no tiene un teléfono registrado' };

    // Quitar todo lo que no sea dígito
    let clean = String(telefonoRaw).replace(/\D/g, '');

    // Si empieza por "00", quitar ese prefijo
    clean = clean.replace(/^00+/, '');

    // Si tiene 10 dígitos, anteponer 57
    if (clean.length === 10) {
        clean = `57${clean}`;
    } else if (clean.length === 12 && clean.startsWith('57')) {
        // dejarlo igual
    } else {
        return { error: 'El teléfono del cliente no tiene un formato válido (ej: 3101234567)' };
    }

    return { chatId: `${clean}@c.us` };
};

const enviarWhatsApp = async (req, res) => {
    try {
        const idFactura = req.params.id;
        const result = await pool.query(`
            SELECT
                f.id_factura, f.fecha, f.total, f.metodo_pago, f.id_orden,
                f.servicios_detalle, f.repuestos_detalle,
                cl.nombre, cl.apellido, cl.telefono, cl.correo,
                cl.nombre || ' ' || cl.apellido AS cliente,
                v.placa || ' - ' || v.marca || ' ' || v.modelo AS vehiculo,
                o.observaciones,
                o.fecha_inicio, o.fecha_fin
            FROM facturacion f
            LEFT JOIN orden_trabajo o ON f.id_orden    = o.id_orden
            LEFT JOIN cita c          ON o.id_cita     = c.id_cita
            LEFT JOIN vehiculo v      ON c.id_vehiculo = v.id_vehiculo
            LEFT JOIN cliente cl      ON v.id_cliente  = cl.id_cliente
            WHERE f.id_factura = $1
        `, [idFactura]);

        if (result.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Factura no encontrada' });
        }

        const { servicios_detalle, repuestos_detalle, ...facturaHeader } = result.rows[0];
        const factura = {
            ...facturaHeader,
            servicios: servicios_detalle || [],
            repuestos: repuestos_detalle || []
        };

        if (!factura.telefono || !String(factura.telefono).trim()) {
            return res.status(400).json({ ok: false, error: 'El cliente no tiene un teléfono registrado' });
        }

        const { chatId, error: errorChatId } = normalizarChatId(factura.telefono);
        if (errorChatId) {
            return res.status(400).json({ ok: false, error: errorChatId });
        }

        const webhookUrl = env.n8n?.webhookUrl || process.env.N8N_WEBHOOK_URL;
        if (!webhookUrl) {
            return res.status(502).json({
                ok: false,
                error: 'La URL del webhook de n8n no está configurada (N8N_WEBHOOK_URL)'
            });
        }

        const numFactura = `FE-${String(factura.id_factura).padStart(4, '0')}`;
        const fileName = `Factura_${numFactura}.pdf`;
        const nombreCliente = (factura.nombre || factura.cliente || 'Cliente').trim();
        const caption = `Hola ${nombreCliente}, adjunto tu factura ${numFactura} de Zedan Motors.`;

        // Generar Buffer del PDF con pdfkit tal como está
        const pdfService = require('../../services/pdf.service');
        const pdfBuffer = await pdfService.generarFacturaPdf(factura);
        const pdfBase64 = pdfBuffer.toString('base64');

        const headers = {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
        };
        const webhookToken = env.n8n?.webhookToken || process.env.N8N_WEBHOOK_TOKEN;
        if (webhookToken) {
            headers['x-api-key'] = webhookToken;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        let n8nResponse;
        try {
            n8nResponse = await fetch(webhookUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    chatId,
                    fileName,
                    caption,
                    pdfBase64
                }),
                signal: controller.signal
            });
        } catch (fetchErr) {
            clearTimeout(timeoutId);
            if (fetchErr.name === 'AbortError' || fetchErr.code === 'ABORT_ERR') {
                return res.status(504).json({
                    ok: false,
                    error: 'Tiempo de espera agotado al conectar con el servicio de WhatsApp (n8n no respondió en 60 segundos)'
                });
            }
            return res.status(504).json({
                ok: false,
                error: 'No se pudo conectar con el servicio de WhatsApp (n8n no alcanzable o fuera de línea)'
            });
        }
        clearTimeout(timeoutId);

        let n8nData = {};
        try {
            n8nData = await n8nResponse.json();
        } catch {
            // Respuesta no JSON
        }

        if (n8nResponse.ok) {
            // Registrar en bitácora de auditoría
            const idSesion = req.usuario?.id_sesion;
            const idUsuario = req.usuario?.id;
            if (idSesion && idUsuario) {
                bitacora.registrarEvento({
                    idSesion,
                    idUsuario,
                    modulo: 'facturacion',
                    accion: 'actualizar',
                    entidad: 'facturacion',
                    idRegistro: factura.id_factura,
                    descripcion: `Envió factura #${factura.id_factura} (${numFactura}) por WhatsApp a ${chatId}`,
                    datosAntes: null,
                    datosDespues: { chatId, fileName },
                    contexto: { id_factura: factura.id_factura, chatId, fileName }
                }).catch(e => console.warn('Bitácora error:', e.message));
            }

            return res.status(200).json({
                ok: true,
                mensaje: `Factura ${numFactura} enviada por WhatsApp exitosamente a ${nombreCliente}`
            });
        }

        // Log de diagnóstico (sin secretos ni pdfBase64)
        console.error(`[WhatsApp] n8n respondió con status ${n8nResponse.status}:`, JSON.stringify({
            error: n8nData.error,
            message: n8nData.message,
            details: n8nData.details,
            success: n8nData.success
        }));

        if (n8nResponse.status === 400) {
            const detalle = Array.isArray(n8nData.details)
                ? n8nData.details.join('. ')
                : (n8nData.error || 'Datos inválidos para el webhook de WhatsApp');
            return res.status(502).json({
                ok: false,
                error: `Error de validación en n8n: ${detalle}`
            });
        }

        return res.status(502).json({
            ok: false,
            error: n8nData.error || `No se pudo enviar el PDF por WhatsApp (n8n respondió con status ${n8nResponse.status})`
        });

    } catch (err) {
        console.error('Error enviando factura por WhatsApp:', err.message);
        return res.status(500).json({ ok: false, error: err.message || 'Error interno al procesar el envío por WhatsApp' });
    }
};

module.exports = { update, getAll, getById, create, remove, enviarCorreo, descargarPdf, enviarWhatsApp };
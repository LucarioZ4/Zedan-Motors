const pool = require('../../config/database');
const bitacora = require('../../services/bitacora.service');
const factusService = require('./factus.service');
const pdfService = require('../../services/pdf.service');
const emailService = require('../../services/email.service');

const getAll = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                f.id_factura,
                f.fecha,
                f.total,
                f.metodo_pago,
                f.id_orden,
                cl.nombre || ' ' || cl.apellido AS cliente,
                cl.telefono,
                cl.correo,
                v.placa || ' - ' || v.marca || ' ' || v.modelo AS vehiculo
            FROM facturacion f
            INNER JOIN orden_trabajo o ON f.id_orden    = o.id_orden
            LEFT JOIN cita c          ON o.id_cita     = c.id_cita
            LEFT JOIN vehiculo v      ON c.id_vehiculo = v.id_vehiculo
            LEFT JOIN cliente cl      ON v.id_cliente  = cl.id_cliente
            ORDER BY f.fecha DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

const getById = async (req, res) => {
    try {
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
            INNER JOIN orden_trabajo o ON f.id_orden    = o.id_orden
            LEFT JOIN cita c          ON o.id_cita     = c.id_cita
            LEFT JOIN vehiculo v      ON c.id_vehiculo = v.id_vehiculo
            LEFT JOIN cliente cl      ON v.id_cliente  = cl.id_cliente
            WHERE f.id_factura = $1
        `, [req.params.id]);

        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Factura no encontrada' });

        const { servicios_detalle, repuestos_detalle, ...factura } = result.rows[0];
        res.json({ ...factura, servicios: servicios_detalle, repuestos: repuestos_detalle });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor' });
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
            INNER JOIN orden_trabajo o ON f.id_orden    = o.id_orden
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
            INNER JOIN orden_trabajo o ON f.id_orden    = o.id_orden
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

module.exports = { update, getAll, getById, create, remove, enviarCorreo, descargarPdf };
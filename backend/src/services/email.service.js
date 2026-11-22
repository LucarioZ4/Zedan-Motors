const env = require('../config/env');

/**
 * Crea y valida el transportador de correo con Gmail.
 */
const crearTransportador = () => {
    const _nmMod = require('nodemailer');
    function resolveNm(m) {
        if (m && typeof m.createTransport === 'function') return m;
        if (m && m.default && typeof m.default.createTransport === 'function') return m.default;
        if (m && m.default && m.default.default && typeof m.default.default.createTransport === 'function') return m.default.default;
        return m;
    }
    const nodemailer = resolveNm(_nmMod);
    const user = (env.email?.user || process.env.EMAIL_USER || process.env.GMAIL_USER || '').trim();
    const pass = (env.email?.pass || process.env.EMAIL_PASS || process.env.GMAIL_PASS || process.env.GMAIL_APP_PASSWORD || '').trim();

    if (!user || !pass) {
        throw new Error(
            'Credenciales de correo no configuradas. Por favor define EMAIL_USER y EMAIL_PASS (contraseña de aplicación de Gmail) en backend/.env'
        );
    }

    return {
        transporter: nodemailer.createTransport({
            service: 'gmail',
            auth: { user, pass }
        }),
        user
    };
};

/**
 * Envía una factura adjunta en PDF por correo electrónico vía Gmail (Nodemailer).
 * @param {Object} param0
 * @param {string} param0.para Correo del destinatario.
 * @param {Object} param0.factura Datos de la factura.
 * @param {Buffer} param0.pdfBuffer Buffer del PDF generado.
 * @param {string} [param0.nombreArchivo] Nombre del archivo adjunto.
 * @returns {Promise<Object>} Resultado del envío de Nodemailer.
 */
const enviarFacturaPorCorreo = async ({ para, factura, pdfBuffer, nombreArchivo }) => {
    if (!para || !para.trim()) {
        throw new Error('Debe especificarse un correo electrónico destinatario válido.');
    }

    const { transporter, user } = crearTransportador();
    const numFactura = `FE-${String(factura.id_factura || 0).padStart(6, '0')}`;
    const totalFormateado = `$${parseFloat(factura.total || 0).toLocaleString('es-CO')}`;
    const filename = nombreArchivo || `Factura_${numFactura}.pdf`;
    const clienteNombre = factura.cliente || 'Estimado cliente';
    const fechaEmision = factura.fecha ? new Date(factura.fecha).toLocaleDateString('es-CO') : '—';

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .header { background: #1e3a8a; padding: 28px 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px; }
        .header p { margin: 6px 0 0; font-size: 13px; color: #93c5fd; }
        .content { padding: 28px 24px; }
        .greeting { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
        .details-card { background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; padding: 18px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
        .detail-row:last-child { margin-bottom: 0; }
        .detail-label { color: #64748b; font-weight: 500; }
        .detail-value { font-weight: 600; color: #0f172a; }
        .total-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px 18px; text-align: center; margin-top: 16px; }
        .total-label { font-size: 12px; font-weight: 600; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.5px; }
        .total-amount { font-size: 22px; font-weight: 800; color: #1e3a8a; margin-top: 2px; }
        .notice { font-size: 13.5px; color: #475569; line-height: 1.5; margin-top: 20px; text-align: center; }
        .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 24px; text-align: center; font-size: 12px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>ZEDAN MOTOR'S</h1>
          <p>Taller Automotriz Especializado</p>
        </div>
        <div class="content">
          <div class="greeting">Hola ${clienteNombre},</div>
          <p style="font-size: 14px; color: #475569; line-height: 1.5; margin: 0 0 16px;">
            Le hacemos entrega de su comprobante de facturación correspondiente a los servicios realizados a su vehículo en <strong>Zedan Motor's</strong>.
          </p>

          <div class="details-card">
            <div class="detail-row">
              <span class="detail-label">Comprobante:</span>
              <span class="detail-value">#${numFactura}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Vehículo:</span>
              <span class="detail-value">${factura.vehiculo || 'No registrado'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Fecha de emisión:</span>
              <span class="detail-value">${fechaEmision}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Método de pago:</span>
              <span class="detail-value">${factura.metodo_pago || 'Efectivo'}</span>
            </div>
            
            <div class="total-box">
              <div class="total-label">Total Facturado</div>
              <div class="total-amount">${totalFormateado}</div>
            </div>
          </div>

          <p class="notice">
            📎 Encontrará el comprobante oficial detallado adjunto en este correo en formato <strong>PDF</strong>.
          </p>
        </div>
        <div class="footer">
          <p style="margin: 0 0 4px;">Gracias por confiar en Zedan Motor's — Pasión por la precisión mecánica.</p>
          <p style="margin: 0;">Calle Falsa 123 • Tel: (57) 318 6950825</p>
        </div>
      </div>
    </body>
    </html>
    `;

    return await transporter.sendMail({
        from: `"Zedan Motor's" <${user}>`,
        to: para.trim(),
        subject: `Factura #${numFactura} - Zedan Motor's`,
        text: `Estimado(a) ${clienteNombre},\n\nLe adjuntamos su factura #${numFactura} por un total de ${totalFormateado}.\n\nGracias por confiar en Zedan Motor's.`,
        html: htmlContent,
        attachments: [
            {
                filename,
                content: pdfBuffer,
                contentType: 'application/pdf'
            }
        ]
    });
};

module.exports = {
    enviarFacturaPorCorreo
};

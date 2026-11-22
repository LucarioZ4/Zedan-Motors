/**
 * Genera un buffer PDF profesional con el comprobante de la factura.
 * @param {Object} factura Datos de la factura con servicios y repuestos.
 * @returns {Promise<Buffer>}
 */
const generarFacturaPdf = (factura) => {
    return new Promise((resolve, reject) => {
        try {
            const PDFDocument = require('pdfkit');
            const doc = new PDFDocument({ margin: 40, size: 'A4' });
            const buffers = [];

            doc.on('data', chunk => buffers.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', err => reject(err));

            const totalNum = parseFloat(factura.total || 0);
            const servicios = factura.servicios || [];
            const repuestos = factura.repuestos || [];
            const numFactura = `FE-${String(factura.id_factura || 0).padStart(6, '0')}`;
            const fechaStr = factura.fecha ? new Date(factura.fecha).toLocaleDateString('es-CO') : '—';

            // ── Encabezado de la Empresa (Izquierda) ──
            doc.font('Helvetica-Bold').fontSize(20).fillColor('#1e3a8a').text("ZEDAN MOTOR'S", 40, 40);
            doc.font('Helvetica').fontSize(9).fillColor('#64748b');
            doc.text('NIT: 900.123.456-7', 40, 66);
            doc.text('Calle Falsa 123, Ciudad', 40, 78);
            doc.text('Tel. (57)-318 6950825 • contacto@zedanmotors.com', 40, 90);

            // ── Badge de Factura (Derecha) ──
            doc.roundedRect(340, 36, 215, 68, 6).fillAndStroke('#eff6ff', '#bfdbfe');
            doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1e3a8a').text('FACTURA ELECTRÓNICA DE VENTA', 345, 45, { width: 205, align: 'center' });
            doc.fontSize(15).text(`#${numFactura}`, 345, 59, { width: 205, align: 'center' });
            doc.font('Helvetica').fontSize(9).fillColor('#64748b').text(`Emisión: ${fechaStr}`, 345, 80, { width: 205, align: 'center' });

            // ── Línea divisoria principal ──
            doc.moveTo(40, 116).lineTo(555, 116).lineWidth(2).strokeColor('#1e3a8a').stroke();

            // ── Tarjeta de Información Cliente y Vehículo ──
            doc.roundedRect(40, 126, 515, 68, 6).fillAndStroke('#f8fafc', '#e2e8f0');
            
            // Columna 1
            doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#475569').text('Cliente:', 52, 136, { continued: true });
            doc.font('Helvetica').fillColor('#0f172a').text(` ${factura.cliente || 'Consumidor final'}`);

            doc.font('Helvetica-Bold').fillColor('#475569').text('Teléfono:', 52, 154, { continued: true });
            doc.font('Helvetica').fillColor('#0f172a').text(` ${factura.telefono || 'No registrado'}`);

            doc.font('Helvetica-Bold').fillColor('#475569').text('Correo:', 52, 172, { continued: true });
            doc.font('Helvetica').fillColor('#0f172a').text(` ${factura.correo || 'No registrado'}`);

            // Columna 2
            doc.font('Helvetica-Bold').fillColor('#475569').text('Vehículo:', 310, 136, { continued: true });
            doc.font('Helvetica').fillColor('#0f172a').text(` ${factura.vehiculo || 'No registrado'}`);

            doc.font('Helvetica-Bold').fillColor('#475569').text('Método de Pago:', 310, 154, { continued: true });
            doc.font('Helvetica').fillColor('#0f172a').text(` ${factura.metodo_pago || 'Efectivo'}`);

            doc.font('Helvetica-Bold').fillColor('#475569').text('Orden de Trabajo:', 310, 172, { continued: true });
            doc.font('Helvetica').fillColor('#0f172a').text(` #${factura.id_orden || '—'}`);

            // ── Tabla de Items ──
            let currentY = 208;

            // Encabezado de la tabla
            doc.rect(40, currentY, 515, 22).fill('#1e3a8a');
            doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#ffffff');
            doc.text('DESCRIPCIÓN', 50, currentY + 6, { width: 240 });
            doc.text('TIPO', 300, currentY + 6, { width: 70 });
            doc.text('CANT.', 380, currentY + 6, { width: 50, align: 'center' });
            doc.text('TOTAL', 445, currentY + 6, { width: 100, align: 'right' });
            currentY += 22;

            // Filas
            const items = [
                ...servicios.map(s => ({
                    descripcion: s.nombre_servicio || 'Servicio mecánico',
                    tipo: 'Servicio',
                    cantidad: 1,
                    total: parseFloat(s.costo || 0)
                })),
                ...repuestos.map(r => ({
                    descripcion: `${r.nombre || 'Repuesto'}${r.marca ? ` (${r.marca})` : ''}`,
                    tipo: 'Repuesto',
                    cantidad: r.cantidad || 1,
                    total: parseFloat(r.total || 0)
                }))
            ];

            if (items.length === 0) {
                doc.rect(40, currentY, 515, 24).fill('#ffffff');
                doc.font('Helvetica').fontSize(9).fillColor('#64748b').text('Factura general de servicio', 50, currentY + 7);
                doc.text('Servicio', 300, currentY + 7);
                doc.text('1', 380, currentY + 7, { width: 50, align: 'center' });
                doc.text(`$${totalNum.toLocaleString('es-CO')}`, 445, currentY + 7, { width: 100, align: 'right' });
                doc.moveTo(40, currentY + 24).lineTo(555, currentY + 24).lineWidth(0.5).strokeColor('#e2e8f0').stroke();
                currentY += 24;
            } else {
                items.forEach((item, index) => {
                    const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
                    doc.rect(40, currentY, 515, 24).fill(rowBg);

                    doc.font('Helvetica').fontSize(8.5).fillColor('#1e293b');
                    doc.text(item.descripcion, 50, currentY + 7, { width: 240, height: 14, ellipsis: true });
                    doc.text(item.tipo, 300, currentY + 7);
                    doc.text(String(item.cantidad), 380, currentY + 7, { width: 50, align: 'center' });
                    doc.font('Helvetica-Bold').text(`$${item.total.toLocaleString('es-CO')}`, 445, currentY + 7, { width: 100, align: 'right' });

                    doc.moveTo(40, currentY + 24).lineTo(555, currentY + 24).lineWidth(0.5).strokeColor('#e2e8f0').stroke();
                    currentY += 24;
                });
            }

            // ── Caja de Totales ──
            currentY += 12;
            doc.roundedRect(325, currentY, 230, 42, 6).fillAndStroke('#eff6ff', '#1e3a8a');
            doc.font('Helvetica-Bold').fontSize(10).fillColor('#1e3a8a').text('TOTAL FACTURADO:', 338, currentY + 14);
            doc.fontSize(14).text(`$${totalNum.toLocaleString('es-CO')}`, 430, currentY + 12, { width: 115, align: 'right' });

            // ── Pie de Página ──
            const footerY = 770;
            doc.moveTo(40, footerY).lineTo(555, footerY).lineWidth(0.5).strokeColor('#e2e8f0').stroke();
            doc.font('Helvetica').fontSize(8.5).fillColor('#94a3b8');
            doc.text("Gracias por confiar en Zedan Motor's — Comprobante oficial de venta", 40, footerY + 10, { width: 515, align: 'center' });
            doc.fontSize(7.5).fillColor('#cbd5e1');
            doc.text('Este documento sirve como soporte oficial de cobro y garantía de servicio técnico.', 40, footerY + 24, { width: 515, align: 'center' });

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
};

module.exports = {
    generarFacturaPdf
};

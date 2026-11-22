/**
 * Genera un buffer PDF profesional con el comprobante de la factura.
 * Usa pdf-lib (puro JS, sin dependencias ESM nativas) para compatibilidad con Vercel serverless.
 * @param {Object} factura Datos de la factura con servicios y repuestos.
 * @returns {Promise<Buffer>}
 */
const generarFacturaPdf = async (factura) => {
    const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

    const totalNum = parseFloat(factura.total || 0);
    const servicios = Array.isArray(factura.servicios) ? factura.servicios : [];
    const repuestos = Array.isArray(factura.repuestos) ? factura.repuestos : [];
    const numFactura = `FE-${String(factura.id_factura || 0).padStart(6, '0')}`;
    const fechaStr = factura.fecha
        ? new Date(factura.fecha).toLocaleDateString('es-CO')
        : '-';

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const { width, height } = page.getSize();

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontReg  = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Colores
    const azulOscuro = rgb(0.118, 0.227, 0.541); // #1e3a8a
    const azulClaro  = rgb(0.937, 0.969, 1.0);    // #eff6ff
    const grisClaro  = rgb(0.973, 0.980, 0.988);  // #f8fafc
    const grisBorde  = rgb(0.886, 0.910, 0.941);  // #e2e8f0
    const grisTexto  = rgb(0.392, 0.455, 0.545);  // #64748b
    const negro      = rgb(0.059, 0.090, 0.122);  // #0f172a
    const blanco     = rgb(1, 1, 1);

    const drawRect = (x, y, w, h, fillColor, strokeColor) => {
        const opts = { x, y, width: w, height: h, color: fillColor };
        if (strokeColor) { opts.borderColor = strokeColor; opts.borderWidth = 1; }
        page.drawRectangle(opts);
    };
    const drawText = (text, x, y, size, color, font) => {
        page.drawText(String(text ?? ''), { x, y, size, color, font: font || fontReg, maxWidth: width - x - 20 });
    };

    // ── Encabezado empresa (izquierda) ──
    drawText("ZEDAN MOTOR'S", 40, height - 55, 20, azulOscuro, fontBold);
    drawText('NIT: 900.123.456-7',          40, height - 72,  9, grisTexto);
    drawText('Calle Falsa 123, Ciudad',      40, height - 84,  9, grisTexto);
    drawText('Tel. (57)-318 6950825',        40, height - 96,  9, grisTexto);

    // ── Badge Factura (derecha) ──
    drawRect(340, height - 112, 215, 72, azulClaro, grisBorde);
    drawText('FACTURA ELECTRONICA DE VENTA', 348, height - 56,  7.5, azulOscuro, fontBold);
    drawText(`#${numFactura}`,               368, height - 72, 14,   azulOscuro, fontBold);
    drawText(`Emision: ${fechaStr}`,         370, height - 92,  9,   grisTexto);

    // ── Línea divisoria ──
    page.drawLine({ start: { x: 40, y: height - 118 }, end: { x: 555, y: height - 118 }, thickness: 2, color: azulOscuro });

    // ── Tarjeta cliente/vehículo ──
    drawRect(40, height - 194, 515, 68, grisClaro, grisBorde);
    // Col 1
    drawText('Cliente:',   52, height - 140, 9, grisTexto, fontBold);
    drawText(factura.cliente || 'Consumidor final', 100, height - 140, 9, negro);
    drawText('Telefono:',  52, height - 157, 9, grisTexto, fontBold);
    drawText(factura.telefono || 'No registrado',   102, height - 157, 9, negro);
    drawText('Correo:',    52, height - 174, 9, grisTexto, fontBold);
    drawText(factura.correo || 'No registrado',      96, height - 174, 9, negro);
    // Col 2
    drawText('Vehiculo:',         310, height - 140, 9, grisTexto, fontBold);
    drawText(factura.vehiculo || 'No registrado',    360, height - 140, 9, negro);
    drawText('Metodo de Pago:',   310, height - 157, 9, grisTexto, fontBold);
    drawText(factura.metodo_pago || 'Efectivo',      390, height - 157, 9, negro);
    drawText('Orden de Trabajo:', 310, height - 174, 9, grisTexto, fontBold);
    drawText(`#${factura.id_orden || '-'}`,          395, height - 174, 9, negro);

    // ── Tabla de items ──
    let currentY = height - 215;

    // Encabezado tabla
    drawRect(40, currentY - 2, 515, 22, azulOscuro, null);
    drawText('DESCRIPCION', 50,  currentY + 6, 8, blanco, fontBold);
    drawText('TIPO',       295,  currentY + 6, 8, blanco, fontBold);
    drawText('CANT.',      380,  currentY + 6, 8, blanco, fontBold);
    drawText('TOTAL',      460,  currentY + 6, 8, blanco, fontBold);
    currentY -= 22;

    const items = [
        ...servicios.map(s => ({
            descripcion: s.nombre_servicio || 'Servicio mecanico',
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
        drawRect(40, currentY - 2, 515, 24, blanco, null);
        drawText('Factura general de servicio', 50, currentY + 7, 9, grisTexto);
        drawText('Servicio', 295, currentY + 7, 9, grisTexto);
        drawText('1',        380, currentY + 7, 9, grisTexto);
        drawText(`$${totalNum.toLocaleString('es-CO')}`, 460, currentY + 7, 9, negro, fontBold);
        page.drawLine({ start: { x: 40, y: currentY - 2 }, end: { x: 555, y: currentY - 2 }, thickness: 0.5, color: grisBorde });
        currentY -= 24;
    } else {
        items.forEach((item, index) => {
            const rowBg = index % 2 === 0 ? blanco : grisClaro;
            drawRect(40, currentY - 2, 515, 24, rowBg, null);
            const desc = item.descripcion.length > 38 ? item.descripcion.substring(0, 36) + '..' : item.descripcion;
            drawText(desc,                             50,  currentY + 7, 8.5, negro);
            drawText(item.tipo,                       295,  currentY + 7, 8.5, negro);
            drawText(String(item.cantidad),           380,  currentY + 7, 8.5, negro);
            drawText(`$${item.total.toLocaleString('es-CO')}`, 460, currentY + 7, 8.5, negro, fontBold);
            page.drawLine({ start: { x: 40, y: currentY - 2 }, end: { x: 555, y: currentY - 2 }, thickness: 0.5, color: grisBorde });
            currentY -= 24;
        });
    }

    // ── Caja Total ──
    currentY -= 12;
    drawRect(325, currentY - 2, 230, 42, azulClaro, azulOscuro);
    drawText('TOTAL FACTURADO:', 338, currentY + 22, 9,  azulOscuro, fontBold);
    drawText(`$${totalNum.toLocaleString('es-CO')}`, 395, currentY + 8, 13, azulOscuro, fontBold);

    // ── Pie de página ──
    const footerY = 30;
    page.drawLine({ start: { x: 40, y: footerY + 20 }, end: { x: 555, y: footerY + 20 }, thickness: 0.5, color: grisBorde });
    drawText("Gracias por confiar en Zedan Motor's - Comprobante oficial de venta", 60, footerY + 8,  8, grisTexto);
    drawText('Este documento sirve como soporte oficial de cobro y garantia de servicio tecnico.', 55, footerY - 4, 7.5, rgb(0.796, 0.835, 0.882));

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
};

module.exports = {
    generarFacturaPdf
};

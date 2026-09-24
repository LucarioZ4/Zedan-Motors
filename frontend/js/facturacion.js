// ═══════════════════════════════════════
// ZEDAN MOTOR'S — Facturación
// ═══════════════════════════════════════

let facturaIdEliminar = null;
let todasFacturas     = [];
let modalFactura, modalDetalle, modalEliminar;

document.addEventListener('DOMContentLoaded', () => {
    modalFactura  = new bootstrap.Modal(document.getElementById('modalFactura'));
    modalDetalle  = new bootstrap.Modal(document.getElementById('modalDetalle'));
    modalEliminar = new bootstrap.Modal(document.getElementById('modalEliminar'));
    cargarFacturas();
    cargarOrdenesSinFactura();
});

// ── Cargar facturas ──
async function cargarFacturas() {
    try {
        const res  = await fetch(`${API_URL}/api/facturacion`, { headers: getHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        todasFacturas = data;
        actualizarStats(data);
        renderTabla(data);

    } catch (err) {
        mostrarToast('Error al cargar facturas: ' + err.message, 'error');
    }
}

// ── Cargar órdenes sin factura ──
async function cargarOrdenesSinFactura() {
    try {
        const resOrd  = await fetch(`${API_URL}/api/ordenes`, { headers: getHeaders() });
        const ordenes = await resOrd.json();
        const resFact = await fetch(`${API_URL}/api/facturacion`, { headers: getHeaders() });
        const facturas = await resFact.json();

        const idsFacturadas = facturas.map(f => f.id_orden);
        const sinFactura    = ordenes.filter(o => !idsFacturadas.includes(o.id_orden));

        const sel = document.getElementById('fOrden');
        sel.innerHTML = '<option value="">Seleccionar orden...</option>';
        sinFactura.forEach(o => {
            sel.innerHTML += `
                <option value="${o.id_orden}">
                    #${o.id_orden} — ${o.cliente} | ${o.vehiculo}
                </option>`;
        });

    } catch (err) {
        console.error('Error cargando órdenes:', err);
    }
}

// ── Calcular total preview ──
async function calcularTotal() {
    const idOrden = document.getElementById('fOrden').value;
    const preview = document.getElementById('previewTotal');

    if (!idOrden) { preview.style.display = 'none'; return; }

    try {
        const [resS, resR] = await Promise.all([
            fetch(`${API_URL}/api/ordenes/${idOrden}/servicios`, { headers: getHeaders() }),
            fetch(`${API_URL}/api/ordenes/${idOrden}/repuestos`, { headers: getHeaders() })
        ]);

        const servicios = await resS.json();
        const repuestos = await resR.json();

        const totalServ = (servicios || []).reduce((s, x) => s + (parseFloat(x.costo) || 0), 0);
        const totalRep  = (repuestos || []).reduce((s, x) => s + (parseFloat(x.total) || 0), 0);
        const total     = totalServ + totalRep;

        document.getElementById('prevServicios').textContent =
            `$${totalServ.toLocaleString('es-CO')}`;
        document.getElementById('prevRepuestos').textContent =
            `$${totalRep.toLocaleString('es-CO')}`;
        document.getElementById('prevTotal').textContent =
            `$${total.toLocaleString('es-CO')}`;

        preview.style.display = 'block';

    } catch (err) {
        console.error('Error calculando total:', err);
    }
}

// ── Stats ──
function actualizarStats(facturas) {
    document.getElementById('totalFacturas').textContent = facturas.length;
    const total = facturas.reduce((s, f) => s + parseFloat(f.total), 0);
    document.getElementById('totalMonto').textContent =
        `$${total.toLocaleString('es-CO')}`;
}

// ── Filtrar ──
function filtrarFacturas() {
    const buscar = document.getElementById('inputBuscar').value.toLowerCase();
    const lista  = todasFacturas.filter(f =>
        f.cliente.toLowerCase().includes(buscar) ||
        f.vehiculo.toLowerCase().includes(buscar) ||
        f.id_factura.toString().includes(buscar)
    );
    actualizarStats(lista);
    renderTabla(lista);
}

// ── Renderizar tabla ──
function renderTabla(facturas) {
    const tbody = document.getElementById('tablaFacturas');

    if (!facturas || facturas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4" style="color:#555">
                    No se encontraron facturas
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = facturas.map(f => `
        <tr>
            <td>
                <span style="color:var(--primary);font-weight:700">
                    #${f.id_factura}
                </span>
            </td>
            <td>${formatearFecha(f.fecha)}</td>
            <td>${f.cliente}</td>
            <td style="color:var(--text-secondary)">${f.vehiculo}</td>
            <td>
                <span class="metodo-badge">
                    <i class="bi bi-${getIconMetodo(f.metodo_pago)}"></i>
                    ${f.metodo_pago}
                </span>
            </td>
            <td>
                <span style="font-weight:700;color:var(--success);font-size:14px">
                    $${parseFloat(f.total).toLocaleString('es-CO')}
                </span>
            </td>
            <td>
                <div class="d-flex gap-2">
                    <button class="btn-accion ver"
                            onclick="verDetalle(${f.id_factura})"
                            title="Ver detalle">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn-accion dian"
                            onclick="descargarFacturaPDF(${f.id_factura})"
                            title="Generar PDF local">
                        <i class="bi bi-file-earmark-pdf"></i>
                    </button>
                    <button class="btn-accion eliminar"
                            onclick="abrirModalEliminar(${f.id_factura})"
                            title="Eliminar">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function getIconMetodo(metodo) {
    const icons = {
        'Efectivo':      'cash-coin',
        'Tarjeta':       'credit-card',
        'Transferencia': 'bank',
    };
    return icons[metodo] || 'cash-coin';
}

// ── Modal nueva factura ──
function abrirModalNuevo() {
    document.getElementById('fOrden').value      = '';
    document.getElementById('fMetodoPago').value = '';
    document.getElementById('previewTotal').style.display = 'none';
    ocultarErrorModal();
    cargarOrdenesSinFactura();
    modalFactura.show();
}

// ── Generar factura ──
async function generarFactura() {
    const body = {
        id_orden:    document.getElementById('fOrden').value,
        metodo_pago: document.getElementById('fMetodoPago').value,
    };

    if (!body.id_orden) {
        mostrarErrorModal('Debe seleccionar una orden.');
        return;
    }
    if (!body.metodo_pago) {
        mostrarErrorModal('Debe seleccionar un método de pago.');
        return;
    }

    try {
        const res  = await fetch(`${API_URL}/api/facturacion`, {
            method:  'POST',
            headers: getHeaders(),
            body:    JSON.stringify(body)
        });
        const data = await res.json();
        if (!res.ok) { mostrarErrorModal(data.error); return; }

        modalFactura.hide();
        cargarFacturas();
        mostrarToast('Factura generada correctamente', 'success');

    } catch (err) {
        mostrarErrorModal('Error: ' + err.message);
    }
}

// ── Ver detalle ──
async function verDetalle(id, silent = false) {
    try {
        const res  = await fetch(`${API_URL}/api/facturacion/${id}`, { headers: getHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        document.getElementById('detalleTitulo').textContent = `Factura #${data.id_factura}`;

        const serviciosSeguros = data.servicios || [];
        const repuestosSeguros = data.repuestos || [];

        document.getElementById('detalleBody').innerHTML = `
            <div class="factura-detalle">

                <div class="factura-header">
                    <div>
                        <div style="font-size:11px;color:var(--text-muted)">CLIENTE</div>
                        <div style="font-weight:600;color:var(--text-primary)">
                            ${data.cliente || 'Desconocido'}
                        </div>
                        <div style="font-size:12px;color:var(--text-secondary)">
                            ${data.telefono || ''}
                        </div>
                    </div>
                    <div style="text-align:right">
                        <div style="font-size:11px;color:var(--text-muted)">FECHA</div>
                        <div style="font-weight:600;color:var(--text-primary)">
                            ${data.fecha ? formatearFecha(data.fecha) : ''}
                        </div>
                        <span class="metodo-badge mt-1">
                            ${data.metodo_pago || ''}
                        </span>
                    </div>
                </div>

                <div style="font-size:12px;color:var(--text-secondary);margin-bottom:16px">
                    <i class="bi bi-car-front"></i> ${data.vehiculo || ''}
                </div>

                ${serviciosSeguros.length > 0 ? `
                <div class="factura-seccion">
                    <div class="factura-seccion-title">Servicios</div>
                    ${serviciosSeguros.map(s => `
                        <div class="factura-item">
                            <span>${s.nombre_servicio || 'Servicio'}</span>
                            <span>$${(parseFloat(s.costo) || 0).toLocaleString('es-CO')}</span>
                        </div>`).join('')}
                </div>` : ''}

                ${repuestosSeguros.length > 0 ? `
                <div class="factura-seccion">
                    <div class="factura-seccion-title">Repuestos</div>
                    ${repuestosSeguros.map(r => `
                        <div class="factura-item">
                            <span>${r.nombre || 'Repuesto'} (${r.marca || ''}) x${r.cantidad || 1}</span>
                            <span>$${(parseFloat(r.total) || 0).toLocaleString('es-CO')}</span>
                        </div>`).join('')}
                </div>` : ''}

                <div class="factura-total">
                    <span>TOTAL</span>
                    <span>$${(parseFloat(data.total) || 0).toLocaleString('es-CO')}</span>
                </div>
            </div>`;

        // Botón de PDF en el footer del modal (PDF local mientras no haya cuenta real de Factus)
        const footer = document.querySelector('#modalDetalle .modal-footer');

        footer.innerHTML = `
            <button class="btn-primary-custom me-auto" onclick="descargarFacturaPDF(${data.id_factura})" style="background-color: #2196F3; border-color: #2196F3;">
                <i class="bi bi-file-earmark-pdf-fill"></i> Descargar PDF
            </button>
            <button class="btn-secondary-custom" data-bs-dismiss="modal">Cerrar</button>
        `;

        if (!silent) {
            modalDetalle.show();
        }

    } catch (err) {
        mostrarToast('Error: ' + err.message, 'error');
    }
}

// ── Modal eliminar ──
function abrirModalEliminar(id) {
    facturaIdEliminar = id;
    document.getElementById('nombreEliminar').textContent = `#${id}`;
    modalEliminar.show();
}

async function confirmarEliminar() {
    try {
        const res  = await fetch(
            `${API_URL}/api/facturacion/${facturaIdEliminar}`,
            { method: 'DELETE', headers: getHeaders() }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        modalEliminar.hide();
        cargarFacturas();
        mostrarToast('Factura eliminada correctamente', 'success');

    } catch (err) {
        mostrarToast('Error: ' + err.message, 'error');
    }
}

// ── Helpers ──
function mostrarErrorModal(msg) {
    document.getElementById('modalError').style.display  = 'flex';
    document.getElementById('modalErrorMsg').textContent = msg;
}

function ocultarErrorModal() {
    document.getElementById('modalError').style.display = 'none';
}

// ═══════════════════════════════════════════════════════════════
// Factura PDF — plantilla A4
// ═══════════════════════════════════════════════════════════════

const FACTURA_EMPRESA = {
    nombre:    "Zedan Motor's",
    nit:       '900.123.456-7',
    direccion: 'Calle Falsa 123, Ciudad',
    contacto:  'Tel. (601) 000 0000'
};

// 0 = los precios ya incluyen IVA o no se discrimina. Usa 0.19 para sumar IVA aparte.
const FACTURA_IVA = 0;

const fEsc    = v => String(v ?? '').replace(/[&<>"']/g,
                  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fMoneda = n => `$${(parseFloat(n) || 0).toLocaleString('es-CO')}`;

async function descargarFacturaPDF(idFactura) {
    mostrarToast('Generando comprobante localmente...', 'success');

    try {
        const res  = await fetch(`${API_URL}/api/facturacion/${idFactura}`, { headers: getHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        const servicios = data.servicios || [];
        const repuestos = data.repuestos || [];
        const logoUrl   = window.location.origin + '/assets/icons/Logo.png';

        // ── Ítems unificados ──
        const items = [
            ...servicios.map(s => ({
                codigo: `SRV-${String(s.id_servicio || '').padStart(3, '0')}`,
                nombre: s.nombre_servicio || 'Servicio',
                tipo:   'Servicio',
                cant:   1,
                unit:   parseFloat(s.costo) || 0,
                sub:    parseFloat(s.costo) || 0
            })),
            ...repuestos.map(r => ({
                codigo: `REP-${String(r.id_repuesto || '').padStart(3, '0')}`,
                nombre: `${r.nombre || 'Repuesto'}${r.marca ? ' (' + r.marca + ')' : ''}`,
                tipo:   'Repuesto',
                cant:   r.cantidad || 1,
                unit:   parseFloat(r.precio) || 0,
                sub:    parseFloat(r.total)  || 0
            }))
        ];

        const subtotal = items.reduce((s, i) => s + i.sub, 0);
        const iva      = subtotal * FACTURA_IVA;
        const total    = subtotal + iva;
        const ivaTxt   = Math.round(FACTURA_IVA * 100);
        const numero   = `FE-${String(data.id_factura).padStart(6, '0')}`;

        const filas = items.map(i => `
            <tr>
                <td class="cod">${fEsc(i.codigo)}</td>
                <td>${fEsc(i.nombre)}<small>${i.tipo}</small></td>
                <td class="c">${fEsc(i.cant)}</td>
                <td class="r">${fMoneda(i.unit)}</td>
                <td class="r">${ivaTxt}%</td>
                <td class="r">${fMoneda(i.sub)}</td>
            </tr>`).join('');

        // QR y CUFE reales cuando Factus los devuelva (data.qr_url / data.cufe)
        const qrHtml = data.qr_url
            ? `<img src="${fEsc(data.qr_url)}" alt="QR DIAN" style="width:100%;height:100%;object-fit:contain">`
            : 'QR DIAN';
        const cufe = data.cufe || '0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d';

        const template = document.createElement('div');
        template.innerHTML = `
        <style>
            .zm-fac { width:794px; min-height:1120px; padding:48px 44px 40px; box-sizing:border-box;
                      display:flex; flex-direction:column; background:#fff; color:#1F2937;
                      font-family:'Inter','Roboto','Helvetica Neue',Arial,sans-serif; font-size:13px; line-height:1.45; }
            .zm-fac * { box-sizing:border-box; }
            .zm-head { display:flex; justify-content:space-between; align-items:flex-start; gap:24px;
                       padding-bottom:18px; border-bottom:2px solid #1E3A8A; }
            .zm-head img { height:64px; max-width:180px; object-fit:contain; }
            .zm-emp { text-align:right; }
            .zm-emp h1 { margin:0; font-size:20px; color:#1E3A8A; }
            .zm-emp p  { margin:0; font-size:12px; color:#6B7280; }
            .zm-num { display:inline-block; margin-top:10px; padding:8px 14px; background:#EEF2FB; border-radius:6px; text-align:right; }
            .zm-num span   { display:block; font-size:11px; color:#6B7280; }
            .zm-num strong { font-size:18px; color:#1E3A8A; }
            .zm-cli { margin:20px 0 14px; padding:14px 16px; background:#F8FAFC; border:1px solid #E5E7EB;
                      border-left:4px solid #1E3A8A; border-radius:6px; }
            .zm-cli h2 { margin:0 0 8px; font-size:13px; color:#1E3A8A; }
            .zm-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px 24px; font-size:12.5px; }
            .zm-grid .full { grid-column:1 / -1; }
            .zm-grid b { color:#6B7280; font-weight:600; }
            .zm-emi { display:flex; gap:28px; margin-bottom:16px; font-size:12px; color:#6B7280; }
            .zm-emi b { color:#1F2937; }
            .zm-items { width:100%; border-collapse:collapse; font-size:12.5px; }
            .zm-items th { background:#1E3A8A; color:#fff; padding:9px 10px; text-align:left; font-size:12px; }
            .zm-items td { padding:9px 10px; border-bottom:1px solid #E5E7EB; vertical-align:top; }
            .zm-items small { display:block; color:#6B7280; font-size:11px; }
            .zm-items .cod { color:#6B7280; white-space:nowrap; }
            .zm-items .c { text-align:center; }
            .zm-items .r { text-align:right; white-space:nowrap; }
            .zm-items th.c { text-align:center; } .zm-items th.r { text-align:right; }
            .zm-items tr { page-break-inside:avoid; }
            .zm-pie { margin-top:auto; padding-top:24px; }
            .zm-pie-body { display:flex; justify-content:space-between; gap:24px; padding:16px 0;
                           border-top:1px solid #E5E7EB; border-bottom:1px solid #E5E7EB; }
            .zm-legal { width:58%; display:flex; gap:14px; align-items:flex-start; }
            .zm-qr { flex:0 0 96px; width:96px; height:96px; border:1px dashed #9CA3AF; border-radius:6px; background:#F8FAFC;
                     display:flex; align-items:center; justify-content:center; font-size:10.5px; color:#6B7280; text-align:center; }
            .zm-cufe { font-size:10px; color:#6B7280; line-height:1.5; }
            .zm-cufe code { display:block; margin:2px 0 8px; font-family:'Roboto Mono',Menlo,Consolas,monospace;
                            font-size:9.5px; color:#1F2937; word-break:break-all; }
            .zm-tot { width:38%; }
            .zm-tot table { width:100%; border-collapse:collapse; font-size:13px; }
            .zm-tot td { padding:5px 0; } .zm-tot td:last-child { text-align:right; }
            .zm-tot .lbl { color:#6B7280; }
            .zm-tot .fin td { padding-top:10px; border-top:2px solid #1E3A8A; font-size:17px; font-weight:700; color:#1E3A8A; }
            .zm-firmas { display:flex; gap:40px; padding:34px 8px 8px; }
            .zm-firma { flex:1; text-align:center; font-size:11px; color:#6B7280; border-top:1px solid #9CA3AF; padding-top:6px; }
            .zm-nota { text-align:center; font-size:10px; color:#6B7280; padding-top:8px; }
        </style>

        <div class="zm-fac">
            <div class="zm-head">
                <img src="${logoUrl}" alt="Logo">
                <div class="zm-emp">
                    <h1>${fEsc(FACTURA_EMPRESA.nombre)}</h1>
                    <p>NIT: ${fEsc(FACTURA_EMPRESA.nit)}</p>
                    <p>${fEsc(FACTURA_EMPRESA.direccion)}</p>
                    <p>${fEsc(FACTURA_EMPRESA.contacto)}</p>
                    <div class="zm-num"><span>Factura electrónica de venta</span><strong>${numero}</strong></div>
                </div>
            </div>

            <div class="zm-cli">
                <h2>Datos del cliente</h2>
                <div class="zm-grid">
                    <div><b>Nombre:</b> ${fEsc(data.cliente || 'Consumidor final')}</div>
                    <div><b>NIT/CC:</b> ${fEsc(data.documento || '222222222222')}</div>
                    <div><b>Teléfono:</b> ${fEsc(data.telefono || 'No registrado')}</div>
                    <div><b>Correo:</b> ${fEsc(data.correo || data.email || 'No registrado')}</div>
                    <div class="full"><b>Dirección:</b> ${fEsc(data.direccion || 'No registrada')}</div>
                    <div class="full"><b>Vehículo:</b> ${fEsc(data.vehiculo || 'No registrado')}</div>
                </div>
            </div>

            <div class="zm-emi">
                <span><b>Fecha de emisión:</b> ${data.fecha ? formatearFecha(data.fecha) : ''}</span>
                <span><b>Método de pago:</b> ${fEsc(data.metodo_pago || 'N/A')}</span>
            </div>

            <table class="zm-items">
                <thead>
                    <tr>
                        <th>Código</th><th>Descripción</th><th class="c">Cant.</th>
                        <th class="r">Precio unit.</th><th class="r">Impuesto</th><th class="r">Subtotal</th>
                    </tr>
                </thead>
                <tbody>${filas}</tbody>
            </table>

            <div class="zm-pie">
                <div class="zm-pie-body">
                    <div class="zm-legal">
                        <div class="zm-qr">${qrHtml}</div>
                        <div class="zm-cufe">
                            <strong style="color:#1F2937">CUFE</strong>
                            <code>${fEsc(cufe)}</code>
                            Representación gráfica de la factura electrónica de venta.<br>
                            Generado internamente por el sistema (Factus simulado).
                        </div>
                    </div>
                    <div class="zm-tot">
                        <table>
                            <tr><td class="lbl">Subtotal</td><td>${fMoneda(subtotal)}</td></tr>
                            <tr><td class="lbl">IVA (${ivaTxt}%)</td><td>${fMoneda(iva)}</td></tr>
                            <tr class="fin"><td>Total a pagar</td><td>${fMoneda(total)}</td></tr>
                        </table>
                    </div>
                </div>
                <div class="zm-firmas">
                    <div class="zm-firma">Firma y sello del emisor</div>
                    <div class="zm-firma">Firma del cliente (recibido a conformidad)</div>
                </div>
                <div class="zm-nota">Esta factura se asimila en sus efectos legales a una letra de cambio (Art. 774 C.Co.).</div>
            </div>
        </div>`;

        // margin 0: el padding ya lo da la plantilla; 1120px < 1123px (A4) evita una hoja en blanco
        const opt = {
            margin:      0,
            filename:    `Factura_${idFactura}.pdf`,
            image:       { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak:   { mode: ['css', 'legacy'], avoid: 'tr' }
        };

        html2pdf().set(opt).from(template).save()
            .then(() => mostrarToast('Factura PDF descargada', 'success'))
            .catch(err => mostrarToast('Error generando PDF: ' + err, 'error'));

    } catch (err) {
        mostrarToast('Error obteniendo datos: ' + err.message, 'error');
    }
}
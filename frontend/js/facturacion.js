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

        const totalServ = servicios.reduce((s, x) => s + parseFloat(x.costo), 0);
        const totalRep  = repuestos.reduce((s, x) => s + parseFloat(x.total), 0);
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
async function verDetalle(id) {
    try {
        const res  = await fetch(`${API_URL}/api/facturacion/${id}`, { headers: getHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        document.getElementById('detalleTitulo').textContent = `Factura #${data.id_factura}`;

        const totalServ = data.servicios.reduce((s, x) => s + parseFloat(x.costo), 0);
        const totalRep  = data.repuestos.reduce((s, x) => s + parseFloat(x.total), 0);

        document.getElementById('detalleBody').innerHTML = `
            <div class="factura-detalle">

                <div class="factura-header">
                    <div>
                        <div style="font-size:11px;color:var(--text-muted)">CLIENTE</div>
                        <div style="font-weight:600;color:var(--text-primary)">
                            ${data.cliente}
                        </div>
                        <div style="font-size:12px;color:var(--text-secondary)">
                            ${data.telefono || ''}
                        </div>
                    </div>
                    <div style="text-align:right">
                        <div style="font-size:11px;color:var(--text-muted)">FECHA</div>
                        <div style="font-weight:600;color:var(--text-primary)">
                            ${formatearFecha(data.fecha)}
                        </div>
                        <span class="metodo-badge mt-1">
                            ${data.metodo_pago}
                        </span>
                    </div>
                </div>

                <div style="font-size:12px;color:var(--text-secondary);margin-bottom:16px">
                    <i class="bi bi-car-front"></i> ${data.vehiculo}
                </div>

                ${data.servicios.length > 0 ? `
                <div class="factura-seccion">
                    <div class="factura-seccion-title">Servicios</div>
                    ${data.servicios.map(s => `
                        <div class="factura-item">
                            <span>${s.nombre_servicio}</span>
                            <span>$${parseFloat(s.costo).toLocaleString('es-CO')}</span>
                        </div>`).join('')}
                </div>` : ''}

                ${data.repuestos.length > 0 ? `
                <div class="factura-seccion">
                    <div class="factura-seccion-title">Repuestos</div>
                    ${data.repuestos.map(r => `
                        <div class="factura-item">
                            <span>${r.nombre} (${r.marca}) x${r.cantidad}</span>
                            <span>$${parseFloat(r.total).toLocaleString('es-CO')}</span>
                        </div>`).join('')}
                </div>` : ''}

                <div class="factura-total">
                    <span>TOTAL</span>
                    <span>$${parseFloat(data.total).toLocaleString('es-CO')}</span>
                </div>
            </div>`;

        modalDetalle.show();

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
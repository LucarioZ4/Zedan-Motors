// ═══════════════════════════════════════
// ZEDAN MOTOR'S — Inventario
// ═══════════════════════════════════════

let repuestoIdEditar   = null;
let repuestoIdEliminar = null;
let todosRepuestos     = [];
let modalRepuesto, modalEliminar;

document.addEventListener('DOMContentLoaded', () => {
    modalRepuesto = new bootstrap.Modal(document.getElementById('modalRepuesto'));
    modalEliminar = new bootstrap.Modal(document.getElementById('modalEliminar'));
    cargarInventario();
});

// ── Cargar inventario ──
async function cargarInventario(buscar = '') {
    try {
        const url = buscar
            ? `${API_URL}/api/inventario?buscar=${encodeURIComponent(buscar)}`
            : `${API_URL}/api/inventario`;

        const res  = await fetch(url, { headers: getHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        todosRepuestos = data;
        aplicarFiltros();
        verificarStockBajo(data);

    } catch (err) {
        mostrarToast('Error al cargar inventario: ' + err.message, 'error');
    }
}

// ── Aplicar filtros ──
function aplicarFiltros() {
    const filtro = document.getElementById('filtroStock').value;
    let lista    = [...todosRepuestos];

    if (filtro === 'bajo') lista = lista.filter(r => r.stock_bajo);
    if (filtro === 'ok')   lista = lista.filter(r => !r.stock_bajo);

    document.getElementById('totalRepuestos').textContent = lista.length;
    renderTabla(lista);
}

// ── Alerta stock bajo ──
function verificarStockBajo(data) {
    const bajos  = data.filter(r => r.stock_bajo);
    const alerta = document.getElementById('alertaStock');
    if (bajos.length > 0) {
        document.getElementById('alertaStockMsg').textContent =
            `⚠ ${bajos.length} repuesto(s) con stock bajo: ${bajos.map(r => r.nombre).join(', ')}`;
        alerta.style.display = 'flex';
    } else {
        alerta.style.display = 'none';
    }
}

// ── Renderizar tabla ──
function renderTabla(repuestos) {
    const tbody = document.getElementById('tablaInventario');

    if (!repuestos || repuestos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4" style="color:#555">
                    No se encontraron repuestos
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = repuestos.map(r => {
        const pct   = Math.min((r.stock / 20) * 100, 100);
        const color = r.stock_bajo ? '#E74C3C' : '#27AE60';

        return `
        <tr>
            <td>
                <div style="font-weight:500;color:var(--text-primary)">
                    ${r.nombre}
                </div>
                <div style="font-size:11px;color:var(--text-muted)">
                    ID #${r.id_repuesto}
                </div>
            </td>
            <td style="color:var(--text-secondary)">
                ${r.marca || '—'}
            </td>
            <td>
                <span style="color:var(--primary);font-weight:600">
                    $${parseFloat(r.precio).toLocaleString('es-CO')}
                </span>
            </td>
            <td>
                <div class="d-flex align-items-center gap-2">
                    <div class="stock-bar">
                        <div class="stock-bar-fill"
                             style="width:${pct}%;background:${color}"></div>
                    </div>
                    <span style="font-weight:600;color:${color}">${r.stock}</span>
                </div>
            </td>
            <td>
                ${r.stock_bajo
                    ? '<span class="badge-custom badge-stock-bajo">Stock bajo</span>'
                    : '<span class="badge-custom badge-stock-ok">Normal</span>'
                }
            </td>
            <td>
                <div class="d-flex gap-2">
                    <button class="btn-accion editar"
                            onclick="abrirModalEditar(${r.id_repuesto})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn-accion eliminar"
                            onclick="abrirModalEliminar(${r.id_repuesto}, '${r.nombre}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

// ── Buscar ──
let timerBuscar;
function buscarRepuestos() {
    clearTimeout(timerBuscar);
    timerBuscar = setTimeout(() => {
        cargarInventario(document.getElementById('inputBuscar').value);
    }, 400);
}

// ── Modal nuevo ──
function abrirModalNuevo() {
    repuestoIdEditar = null;
    document.getElementById('modalTitulo').textContent = 'Nuevo repuesto';
    limpiarModal();
    modalRepuesto.show();
}

// ── Modal editar ──
async function abrirModalEditar(id) {
    try {
        const res  = await fetch(`${API_URL}/api/inventario/${id}`, { headers: getHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        repuestoIdEditar = id;
        document.getElementById('modalTitulo').textContent = 'Editar repuesto';
        document.getElementById('fNombre').value = data.nombre;
        document.getElementById('fMarca').value  = data.marca  || '';
        document.getElementById('fPrecio').value = data.precio;
        document.getElementById('fStock').value  = data.stock;
        ocultarErrorModal();
        modalRepuesto.show();

    } catch (err) {
        mostrarToast('Error: ' + err.message, 'error');
    }
}

// ── Guardar ──
async function guardarRepuesto() {
    const body = {
        nombre: document.getElementById('fNombre').value.trim(),
        marca:  document.getElementById('fMarca').value.trim(),
        precio: parseFloat(document.getElementById('fPrecio').value),
        stock:  parseInt(document.getElementById('fStock').value) || 0,
    };

    if (!body.nombre) {
        mostrarErrorModal('El nombre es obligatorio.');
        return;
    }
    if (!body.precio || body.precio <= 0) {
        mostrarErrorModal('El precio debe ser mayor a cero.');
        return;
    }

    try {
        const url    = repuestoIdEditar
            ? `${API_URL}/api/inventario/${repuestoIdEditar}`
            : `${API_URL}/api/inventario`;
        const method = repuestoIdEditar ? 'PUT' : 'POST';

        const res  = await fetch(url, {
            method,
            headers: getHeaders(),
            body:    JSON.stringify(body)
        });
        const data = await res.json();
        if (!res.ok) { mostrarErrorModal(data.error); return; }

        modalRepuesto.hide();
        cargarInventario();
        mostrarToast(
            repuestoIdEditar ? 'Repuesto actualizado' : 'Repuesto registrado',
            'success'
        );

    } catch (err) {
        mostrarErrorModal('Error: ' + err.message);
    }
}

// ── Modal eliminar ──
function abrirModalEliminar(id, nombre) {
    repuestoIdEliminar = id;
    document.getElementById('nombreEliminar').textContent = nombre;
    modalEliminar.show();
}

async function confirmarEliminar() {
    try {
        const res  = await fetch(
            `${API_URL}/api/inventario/${repuestoIdEliminar}`,
            { method: 'DELETE', headers: getHeaders() }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        modalEliminar.hide();
        cargarInventario();
        mostrarToast('Repuesto eliminado correctamente', 'success');

    } catch (err) {
        mostrarToast('Error: ' + err.message, 'error');
    }
}

// ── Helpers ──
function limpiarModal() {
    ['fNombre','fMarca','fPrecio','fStock']
        .forEach(id => document.getElementById(id).value = '');
    ocultarErrorModal();
}

function mostrarErrorModal(msg) {
    document.getElementById('modalError').style.display  = 'flex';
    document.getElementById('modalErrorMsg').textContent = msg;
}

function ocultarErrorModal() {
    document.getElementById('modalError').style.display = 'none';
}
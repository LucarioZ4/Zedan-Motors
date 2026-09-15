// ═══════════════════════════════════════
// ZEDAN MOTOR'S — Servicios
// ═══════════════════════════════════════

let servicioIdEditar   = null;
let servicioIdEliminar = null;
let modalServicio, modalEliminar;

document.addEventListener('DOMContentLoaded', () => {
    modalServicio = new bootstrap.Modal(document.getElementById('modalServicio'));
    modalEliminar = new bootstrap.Modal(document.getElementById('modalEliminar'));
    cargarServicios();
});

// ── Cargar servicios ──
async function cargarServicios(buscar = '') {
    try {
        const url = buscar
            ? `${API_URL}/api/servicios?buscar=${encodeURIComponent(buscar)}`
            : `${API_URL}/api/servicios`;

        const res  = await fetch(url, { headers: getHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        document.getElementById('totalServicios').textContent = data.length;
        renderGrid(data);

    } catch (err) {
        mostrarToast('Error al cargar servicios: ' + err.message, 'error');
    }
}

// ── Renderizar grid de cards ──
function renderGrid(servicios) {
    const grid = document.getElementById('gridServicios');

    if (!servicios || servicios.length === 0) {
        grid.innerHTML = `
            <div class="col-12 text-center py-5" style="color:#555">
                <i class="bi bi-tools"
                   style="font-size:48px;display:block;margin-bottom:16px"></i>
                No se encontraron servicios
            </div>`;
        return;
    }

    grid.innerHTML = servicios.map(s => `
        <div class="col-md-4 col-lg-3">
            <div class="servicio-card">
                <div class="servicio-icon">
                    <i class="bi bi-tools"></i>
                </div>
                <div class="servicio-nombre">${s.nombre_servicio}</div>
                <div class="servicio-desc">
                    ${s.descripcion || '<span style="color:#444">Sin descripción</span>'}
                </div>
                <div class="servicio-costo">
                    $${parseFloat(s.costo).toLocaleString('es-CO')}
                </div>
                <div class="servicio-acciones">
                    <button class="btn-accion editar"
                            onclick="abrirModalEditar(${s.id_servicio})">
                        <i class="bi bi-pencil"></i> Editar
                    </button>
                    <button class="btn-accion eliminar"
                            onclick="abrirModalEliminar(${s.id_servicio},
                            '${s.nombre_servicio}')">
                        <i class="bi bi-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// ── Buscar ──
let timerBuscar;
function buscarServicios() {
    clearTimeout(timerBuscar);
    timerBuscar = setTimeout(() => {
        cargarServicios(document.getElementById('inputBuscar').value);
    }, 400);
}

// ── Modal nuevo ──
function abrirModalNuevo() {
    servicioIdEditar = null;
    document.getElementById('modalTitulo').textContent = 'Nuevo servicio';
    limpiarModal();
    modalServicio.show();
}

// ── Modal editar ──
async function abrirModalEditar(id) {
    try {
        const res  = await fetch(`${API_URL}/api/servicios/${id}`,
            { headers: getHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        servicioIdEditar = id;
        document.getElementById('modalTitulo').textContent  = 'Editar servicio';
        document.getElementById('fNombre').value      = data.nombre_servicio;
        document.getElementById('fDescripcion').value = data.descripcion || '';
        document.getElementById('fCosto').value       = data.costo;
        ocultarErrorModal();
        modalServicio.show();

    } catch (err) {
        mostrarToast('Error: ' + err.message, 'error');
    }
}

// ── Guardar ──
async function guardarServicio() {
    const body = {
        nombre_servicio: document.getElementById('fNombre').value.trim(),
        descripcion:     document.getElementById('fDescripcion').value.trim(),
        costo:           parseFloat(document.getElementById('fCosto').value),
    };

    if (!body.nombre_servicio) {
        mostrarErrorModal('El nombre es obligatorio.');
        return;
    }
    if (!body.costo || body.costo <= 0) {
        mostrarErrorModal('El costo debe ser mayor a cero.');
        return;
    }

    try {
        const url    = servicioIdEditar
            ? `${API_URL}/api/servicios/${servicioIdEditar}`
            : `${API_URL}/api/servicios`;
        const method = servicioIdEditar ? 'PUT' : 'POST';

        const res  = await fetch(url, {
            method,
            headers: getHeaders(),
            body:    JSON.stringify(body)
        });
        const data = await res.json();
        if (!res.ok) { mostrarErrorModal(data.error); return; }

        modalServicio.hide();
        cargarServicios();
        mostrarToast(
            servicioIdEditar ? 'Servicio actualizado' : 'Servicio registrado',
            'success'
        );

    } catch (err) {
        mostrarErrorModal('Error: ' + err.message);
    }
}

// ── Modal eliminar ──
function abrirModalEliminar(id, nombre) {
    servicioIdEliminar = id;
    document.getElementById('nombreEliminar').textContent = nombre;
    modalEliminar.show();
}

async function confirmarEliminar() {
    try {
        const res  = await fetch(
            `${API_URL}/api/servicios/${servicioIdEliminar}`,
            { method: 'DELETE', headers: getHeaders() }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        modalEliminar.hide();
        cargarServicios();
        mostrarToast('Servicio eliminado correctamente', 'success');

    } catch (err) {
        mostrarToast('Error: ' + err.message, 'error');
    }
}

// ── Helpers ──
function limpiarModal() {
    document.getElementById('fNombre').value      = '';
    document.getElementById('fDescripcion').value = '';
    document.getElementById('fCosto').value       = '';
    ocultarErrorModal();
}

function mostrarErrorModal(msg) {
    document.getElementById('modalError').style.display  = 'flex';
    document.getElementById('modalErrorMsg').textContent = msg;
}

function ocultarErrorModal() {
    document.getElementById('modalError').style.display = 'none';
}
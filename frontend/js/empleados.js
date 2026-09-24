// ═══════════════════════════════════════
// ZEDAN MOTOR'S — Empleados
// ═══════════════════════════════════════

let empleadoIdEditar   = null;
let empleadoIdEliminar = null;
let todosEmpleados     = [];
let modalEmpleado, modalEliminar;

document.addEventListener('DOMContentLoaded', () => {
    modalEmpleado = new bootstrap.Modal(document.getElementById('modalEmpleado'));
    modalEliminar = new bootstrap.Modal(document.getElementById('modalEliminar'));
    cargarEmpleados();
    cargarCargos();
});

// ── Cargar empleados ──
async function cargarEmpleados(buscar = '') {
    try {
        const res  = await fetch(`${API_URL}/api/empleados`, { headers: getHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        todosEmpleados = data;

        const filtrados = buscar
            ? data.filter(e =>
                e.nombre.toUpperCase().includes(buscar.toUpperCase()) ||
                e.apellido.toUpperCase().includes(buscar.toUpperCase()) ||
                (e.cargo && e.cargo.toUpperCase().includes(buscar.toUpperCase())))
            : data;

        document.getElementById('totalEmpleados').textContent = filtrados.length;
        renderTabla(filtrados);

    } catch (err) {
        mostrarToast('Error al cargar empleados: ' + err.message, 'error');
    }
}

// ── Cargar cargos ──
async function cargarCargos() {
    try {
        const res  = await fetch(`${API_URL}/api/estados`, { headers: getHeaders() });

        // Usamos endpoint propio para cargos
        const resCargos = await fetch(`${API_URL}/api/cargos`, { headers: getHeaders() });
        const cargos    = await resCargos.json();

        const sel = document.getElementById('fCargo');
        sel.innerHTML = '<option value="">Seleccionar cargo...</option>';
        cargos.forEach(c => {
            sel.innerHTML +=
                `<option value="${c.id_cargo}">${c.nombre_cargo}</option>`;
        });
    } catch (err) {
        console.error('Error cargando cargos:', err);
    }
}

// ── Renderizar tabla ──
function renderTabla(empleados) {
    const tbody = document.getElementById('tablaEmpleados');

    if (!empleados || empleados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4" style="color:#555">
                    No se encontraron empleados
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = empleados.map(e => `
        <tr>
            <td>
                <div class="d-flex align-items-center gap-2">
                    <div class="empleado-avatar">
                        ${e.nombre[0]}${e.apellido[0]}
                    </div>
                    <div>
                        <div style="font-weight:500;color:var(--text-primary)">
                            ${e.nombre} ${e.apellido}
                        </div>
                        <div style="font-size:11px;color:var(--text-muted)">
                            ID #${e.id_empleado}
                        </div>
                    </div>
                </div>
            </td>
            <td>
                <i class="bi bi-telephone"
                   style="color:var(--primary);margin-right:6px"></i>
                ${e.telefono}
            </td>
            <td style="color:var(--text-secondary)">
                ${e.correo || '<span style="color:#444">—</span>'}
            </td>
            <td>
                <span class="cargo-badge">${e.cargo || '—'}</span>
            </td>
            <td>
                <div class="d-flex gap-2">
                    <button class="btn-accion editar"
                            onclick="abrirModalEditar(${e.id_empleado})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn-accion eliminar"
                            onclick="abrirModalEliminar(${e.id_empleado},
                            '${e.nombre} ${e.apellido}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// ── Buscar ──
let timerBuscar;
function buscarEmpleados() {
    clearTimeout(timerBuscar);
    timerBuscar = setTimeout(() => {
        cargarEmpleados(document.getElementById('inputBuscar').value);
    }, 400);
}

// ── Modal nuevo ──
function abrirModalNuevo() {
    empleadoIdEditar = null;
    document.getElementById('modalTitulo').textContent = 'Nuevo empleado';
    limpiarModal();
    modalEmpleado.show();
}

// ── Modal editar ──
async function abrirModalEditar(id) {
    try {
        const res  = await fetch(`${API_URL}/api/empleados/${id}`,
            { headers: getHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        empleadoIdEditar = id;
        document.getElementById('modalTitulo').textContent = 'Editar empleado';
        document.getElementById('fNombre').value   = data.nombre;
        document.getElementById('fApellido').value = data.apellido;
        document.getElementById('fTelefono').value = data.telefono;
        document.getElementById('fCorreo').value   = data.correo   || '';
        document.getElementById('fCargo').value    = data.id_cargo || '';
        ocultarErrorModal();
        modalEmpleado.show();

    } catch (err) {
        mostrarToast('Error: ' + err.message, 'error');
    }
}

// ── Guardar ──
async function guardarEmpleado() {
    const body = {
        nombre:   document.getElementById('fNombre').value.trim(),
        apellido: document.getElementById('fApellido').value.trim(),
        telefono: document.getElementById('fTelefono').value.trim(),
        correo:   document.getElementById('fCorreo').value.trim(),
        id_cargo: document.getElementById('fCargo').value,
    };

    if (!body.nombre || !body.apellido || !body.telefono) {
        mostrarErrorModal('Nombre, apellido y teléfono son obligatorios.');
        return;
    }
    if (!body.id_cargo) {
        mostrarErrorModal('Debe seleccionar un cargo.');
        return;
    }

    try {
        const url    = empleadoIdEditar
            ? `${API_URL}/api/empleados/${empleadoIdEditar}`
            : `${API_URL}/api/empleados`;
        const method = empleadoIdEditar ? 'PUT' : 'POST';

        const res  = await fetch(url, {
            method,
            headers: getHeaders(),
            body:    JSON.stringify(body)
        });
        const data = await res.json();
        if (!res.ok) { mostrarErrorModal(data.error); return; }

        modalEmpleado.hide();
        cargarEmpleados();
        mostrarToast(
            empleadoIdEditar ? 'Empleado actualizado' : 'Empleado registrado',
            'success'
        );

    } catch (err) {
        mostrarErrorModal('Error: ' + err.message);
    }
}

// ── Modal eliminar ──
function abrirModalEliminar(id, nombre) {
    empleadoIdEliminar = id;
    document.getElementById('nombreEliminar').textContent = nombre;
    modalEliminar.show();
}

async function confirmarEliminar() {
    try {
        const res  = await fetch(
            `${API_URL}/api/empleados/${empleadoIdEliminar}`,
            { method: 'DELETE', headers: getHeaders() }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        modalEliminar.hide();
        cargarEmpleados();
        mostrarToast('Empleado eliminado correctamente', 'success');

    } catch (err) {
        mostrarToast('Error: ' + err.message, 'error');
    }
}

// ── Helpers ──
function limpiarModal() {
    ['fNombre','fApellido','fTelefono','fCorreo']
        .forEach(id => document.getElementById(id).value = '');
    document.getElementById('fCargo').value = '';
    ocultarErrorModal();
}

function mostrarErrorModal(msg) {
    document.getElementById('modalError').style.display  = 'flex';
    document.getElementById('modalErrorMsg').textContent = msg;
}

function ocultarErrorModal() {
    document.getElementById('modalError').style.display = 'none';
}
// ═══════════════════════════════════════
// ZEDAN MOTOR'S — Clientes
// ═══════════════════════════════════════

let clienteIdEditar = null;
let clienteIdEliminar = null;
let modalCliente, modalEliminar;

document.addEventListener('DOMContentLoaded', () => {
    modalCliente  = new bootstrap.Modal(document.getElementById('modalCliente'));
    modalEliminar = new bootstrap.Modal(document.getElementById('modalEliminar'));
    cargarClientes();
});

// ── Cargar clientes ──
async function cargarClientes(buscar = '') {
    try {
        const url = buscar
            ? `${API_URL}/api/clientes?buscar=${encodeURIComponent(buscar)}`
            : `${API_URL}/api/clientes`;

        const res  = await fetch(url, { headers: getHeaders() });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error);

        document.getElementById('totalClientes').textContent = data.length;
        renderTabla(data);

    } catch (err) {
        mostrarToast('Error al cargar clientes: ' + err.message, 'error');
    }
}

// ── Renderizar tabla ──
function renderTabla(clientes) {
    const tbody = document.getElementById('tablaClientes');

    if (!clientes || clientes.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4" style="color:#555">
                    No se encontraron clientes
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = clientes.map(c => `
        <tr>
            <td>
                <div class="d-flex align-items-center gap-2">
                    <div class="cliente-avatar">
                        ${c.nombre[0]}${c.apellido[0]}
                    </div>
                    <div>
                        <div style="font-weight:500;color:var(--text-primary)">
                            ${c.nombre} ${c.apellido}
                        </div>
                        <div style="font-size:11px;color:var(--text-muted)">
                            ID #${c.id_cliente}
                        </div>
                    </div>
                </div>
            </td>
            <td>${c.nombre}</td>
            <td>
                <i class="bi bi-telephone" style="color:var(--primary);margin-right:6px"></i>
                ${c.telefono}
            </td>
            <td style="color:var(--text-secondary)">
                ${c.correo || '<span style="color:#444">—</span>'}
            </td>
            <td style="color:var(--text-secondary)">
                ${c.direccion || '<span style="color:#444">—</span>'}
            </td>
            <td>
                <div class="d-flex gap-2">
                    <button class="btn-accion editar"
                            onclick="abrirModalEditar(${c.id_cliente})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn-accion eliminar"
                            onclick="abrirModalEliminar(${c.id_cliente}, '${c.nombre} ${c.apellido}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// ── Buscar ──
let timerBuscar;
function buscarClientes() {
    clearTimeout(timerBuscar);
    timerBuscar = setTimeout(() => {
        cargarClientes(document.getElementById('inputBuscar').value);
    }, 400);
}

// ── Abrir modal nuevo ──
function abrirModalNuevo() {
    clienteIdEditar = null;
    document.getElementById('modalTitulo').textContent = 'Nuevo cliente';
    limpiarModal();
    modalCliente.show();
}

// ── Abrir modal editar ──
async function abrirModalEditar(id) {
    try {
        const res  = await fetch(`${API_URL}/api/clientes/${id}`, { headers: getHeaders() });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error);

        clienteIdEditar = id;
        document.getElementById('modalTitulo').textContent = 'Editar cliente';
        document.getElementById('fNombre').value    = data.nombre;
        document.getElementById('fApellido').value  = data.apellido;
        document.getElementById('fTelefono').value  = data.telefono;
        document.getElementById('fCorreo').value    = data.correo    || '';
        document.getElementById('fDireccion').value = data.direccion || '';
        ocultarErrorModal();
        modalCliente.show();

    } catch (err) {
        mostrarToast('Error: ' + err.message, 'error');
    }
}

// ── Guardar ──
async function guardarCliente() {
    const body = {
        nombre:    document.getElementById('fNombre').value.trim(),
        apellido:  document.getElementById('fApellido').value.trim(),
        telefono:  document.getElementById('fTelefono').value.trim(),
        correo:    document.getElementById('fCorreo').value.trim(),
        direccion: document.getElementById('fDireccion').value.trim(),
    };

    if (!body.nombre || !body.apellido || !body.telefono) {
        mostrarErrorModal('Nombre, apellido y teléfono son obligatorios.');
        return;
    }

    try {
        const url    = clienteIdEditar
            ? `${API_URL}/api/clientes/${clienteIdEditar}`
            : `${API_URL}/api/clientes`;
        const method = clienteIdEditar ? 'PUT' : 'POST';

        const res  = await fetch(url, {
            method,
            headers: getHeaders(),
            body:    JSON.stringify(body)
        });
        const data = await res.json();

        if (!res.ok) {
            mostrarErrorModal(data.error);
            return;
        }

        modalCliente.hide();
        cargarClientes();
        mostrarToast(
            clienteIdEditar ? 'Cliente actualizado' : 'Cliente registrado',
            'success'
        );

    } catch (err) {
        mostrarErrorModal('Error al guardar: ' + err.message);
    }
}

// ── Abrir modal eliminar ──
function abrirModalEliminar(id, nombre) {
    clienteIdEliminar = id;
    document.getElementById('nombreEliminar').textContent = nombre;
    modalEliminar.show();
}

// ── Confirmar eliminar ──
async function confirmarEliminar() {
    try {
        const res = await fetch(
            `${API_URL}/api/clientes/${clienteIdEliminar}`,
            { method: 'DELETE', headers: getHeaders() }
        );
        const data = await res.json();

        if (!res.ok) throw new Error(data.error);

        modalEliminar.hide();
        cargarClientes();
        mostrarToast('Cliente eliminado correctamente', 'success');

    } catch (err) {
        mostrarToast('Error: ' + err.message, 'error');
    }
}

// ── Helpers modal ──
function limpiarModal() {
    ['fNombre','fApellido','fTelefono','fCorreo','fDireccion']
        .forEach(id => document.getElementById(id).value = '');
    ocultarErrorModal();
}

function mostrarErrorModal(msg) {
    document.getElementById('modalError').style.display    = 'flex';
    document.getElementById('modalErrorMsg').textContent   = msg;
}

function ocultarErrorModal() {
    document.getElementById('modalError').style.display = 'none';
}
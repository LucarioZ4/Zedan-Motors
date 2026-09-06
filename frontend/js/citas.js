// ═══════════════════════════════════════
// ZEDAN MOTOR'S — Citas
// ═══════════════════════════════════════

let citaIdEditar   = null;
let citaIdEliminar = null;
let modalCita, modalEliminar;

document.addEventListener('DOMContentLoaded', () => {
    modalCita     = new bootstrap.Modal(document.getElementById('modalCita'));
    modalEliminar = new bootstrap.Modal(document.getElementById('modalEliminar'));
    cargarCitas();
    cargarClientes();

    // Fecha mínima hoy
    document.getElementById('fFecha').min =
        new Date().toISOString().split('T')[0];
});

// ── Cargar citas ──
async function cargarCitas(buscar = '') {
    try {
        const url = buscar
            ? `${API_URL}/api/citas?buscar=${encodeURIComponent(buscar)}`
            : `${API_URL}/api/citas`;

        const res  = await fetch(url, { headers: getHeaders() });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error);

        // Filtro por estado si está seleccionado
        const filtroEstado = document.getElementById('filtroEstado').value;
        const filtradas    = filtroEstado
            ? data.filter(c => c.id_estado == filtroEstado)
            : data;

        document.getElementById('totalCitas').textContent = filtradas.length;
        renderTabla(filtradas);

    } catch (err) {
        mostrarToast('Error al cargar citas: ' + err.message, 'error');
    }
}

// ── Cargar clientes ──
async function cargarClientes() {
    try {
        const res  = await fetch(`${API_URL}/api/clientes`, { headers: getHeaders() });
        const data = await res.json();
        const sel  = document.getElementById('fCliente');
        sel.innerHTML = '<option value="">Seleccionar cliente...</option>';
        data.forEach(c => {
            sel.innerHTML +=
                `<option value="${c.id_cliente}">${c.nombre} ${c.apellido}</option>`;
        });
    } catch (err) {
        console.error('Error cargando clientes:', err);
    }
}

// ── Cargar vehículos por cliente ──
async function cargarVehiculosCliente() {
    const idCliente = document.getElementById('fCliente').value;
    const sel       = document.getElementById('fVehiculo');
    sel.innerHTML   = '<option value="">Seleccionar vehículo...</option>';

    if (!idCliente) return;

    try {
        const res  = await fetch(
            `${API_URL}/api/clientes/${idCliente}/vehiculos`,
            { headers: getHeaders() }
        );
        const data = await res.json();
        data.forEach(v => {
            sel.innerHTML +=
                `<option value="${v.id_vehiculo}">${v.placa} - ${v.marca} ${v.modelo}</option>`;
        });
    } catch (err) {
        console.error('Error cargando vehículos:', err);
    }
}

// ── Renderizar tabla ──
function renderTabla(citas) {
    const tbody = document.getElementById('tablaCitas');

    if (!citas || citas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4" style="color:#555">
                    No se encontraron citas
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = citas.map(c => `
        <tr>
            <td>
                <div style="font-weight:500;color:var(--text-primary)">
                    ${formatearFecha(c.fecha)}
                </div>
            </td>
            <td>
                <span style="color:var(--primary);font-weight:600">
                    ${c.hora}
                </span>
            </td>
            <td>${c.cliente}</td>
            <td style="color:var(--text-secondary)">${c.vehiculo}</td>
            <td style="color:var(--text-secondary)">
                ${c.motivo || '<span style="color:#444">—</span>'}
            </td>
            <td>${getBadgeEstado(c.estado)}</td>
            <td>
                <div class="d-flex gap-2">
                    <button class="btn-accion editar"
                            onclick="abrirModalEditar(${c.id_cita})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn-accion eliminar"
                            onclick="abrirModalEliminar(${c.id_cita}, '${c.cliente}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// ── Badge estado ──
function getBadgeEstado(estado) {
    const clases = {
        'Pendiente':  'badge-pendiente',
        'Confirmada': 'badge-confirmada',
        'En proceso': 'badge-proceso',
        'Completada': 'badge-completada',
        'Cancelada':  'badge-cancelada',
    };
    return `<span class="badge-custom ${clases[estado] || 'badge-pendiente'}">${estado}</span>`;
}

// ── Buscar ──
let timerBuscar;
function buscarCitas() {
    clearTimeout(timerBuscar);
    timerBuscar = setTimeout(() => {
        cargarCitas(document.getElementById('inputBuscar').value);
    }, 400);
}

// ── Modal nuevo ──
function abrirModalNuevo() {
    citaIdEditar = null;
    document.getElementById('modalTitulo').textContent = 'Nueva cita';
    limpiarModal();
    modalCita.show();
}

// ── Modal editar ──
async function abrirModalEditar(id) {
    try {
        const res  = await fetch(`${API_URL}/api/citas/${id}`, { headers: getHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        citaIdEditar = id;
        document.getElementById('modalTitulo').textContent = 'Editar cita';

        // Cargar cliente y vehículo
        document.getElementById('fCliente').value = data.id_cliente;
        await cargarVehiculosCliente();
        document.getElementById('fVehiculo').value = data.id_vehiculo;
        document.getElementById('fFecha').value    = data.fecha.split('T')[0];
        document.getElementById('fHora').value     = data.hora;
        document.getElementById('fEstado').value   = data.id_estado;
        document.getElementById('fMotivo').value   = data.motivo || '';

        ocultarErrorModal();
        modalCita.show();

    } catch (err) {
        mostrarToast('Error: ' + err.message, 'error');
    }
}

// ── Guardar ──
async function guardarCita() {
    const body = {
        fecha:       document.getElementById('fFecha').value,
        hora:        document.getElementById('fHora').value,
        motivo:      document.getElementById('fMotivo').value.trim(),
        id_vehiculo: document.getElementById('fVehiculo').value,
        id_estado:   document.getElementById('fEstado').value,
    };

    if (!body.fecha || !body.hora || !body.id_vehiculo) {
        mostrarErrorModal('Fecha, hora y vehículo son obligatorios.');
        return;
    }

    try {
        const url    = citaIdEditar
            ? `${API_URL}/api/citas/${citaIdEditar}`
            : `${API_URL}/api/citas`;
        const method = citaIdEditar ? 'PUT' : 'POST';

        const res  = await fetch(url, {
            method,
            headers: getHeaders(),
            body:    JSON.stringify(body)
        });
        const data = await res.json();

        if (!res.ok) { mostrarErrorModal(data.error); return; }

        modalCita.hide();
        cargarCitas();
        mostrarToast(
            citaIdEditar ? 'Cita actualizada' : 'Cita registrada',
            'success'
        );

    } catch (err) {
        mostrarErrorModal('Error: ' + err.message);
    }
}

// ── Modal eliminar ──
function abrirModalEliminar(id, nombre) {
    citaIdEliminar = id;
    document.getElementById('nombreEliminar').textContent = nombre;
    modalEliminar.show();
}

async function confirmarEliminar() {
    try {
        const res  = await fetch(
            `${API_URL}/api/citas/${citaIdEliminar}`,
            { method: 'DELETE', headers: getHeaders() }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        modalEliminar.hide();
        cargarCitas();
        mostrarToast('Cita eliminada correctamente', 'success');

    } catch (err) {
        mostrarToast('Error: ' + err.message, 'error');
    }
}

// ── Helpers ──
function limpiarModal() {
    document.getElementById('fCliente').value  = '';
    document.getElementById('fVehiculo').innerHTML =
        '<option value="">Seleccionar vehículo...</option>';
    document.getElementById('fFecha').value    = '';
    document.getElementById('fHora').value     = '';
    document.getElementById('fEstado').value   = '1';
    document.getElementById('fMotivo').value   = '';
    ocultarErrorModal();
}

function mostrarErrorModal(msg) {
    document.getElementById('modalError').style.display  = 'flex';
    document.getElementById('modalErrorMsg').textContent = msg;
}

function ocultarErrorModal() {
    document.getElementById('modalError').style.display = 'none';
}
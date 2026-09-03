// ═══════════════════════════════════════
// ZEDAN MOTOR'S — Vehículos
// ═══════════════════════════════════════

let vehiculoIdEditar   = null;
let vehiculoIdEliminar = null;
let modalVehiculo, modalEliminar;

document.addEventListener('DOMContentLoaded', () => {
    modalVehiculo  = new bootstrap.Modal(document.getElementById('modalVehiculo'));
    modalEliminar  = new bootstrap.Modal(document.getElementById('modalEliminar'));
    cargarVehiculos();
    cargarClientes();
});

// ── Cargar vehículos ──
async function cargarVehiculos(buscar = '') {
    try {
        const url = buscar
            ? `${API_URL}/api/vehiculos?buscar=${encodeURIComponent(buscar)}`
            : `${API_URL}/api/vehiculos`;

        const res  = await fetch(url, { headers: getHeaders() });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error);

        document.getElementById('totalVehiculos').textContent = data.length;
        renderTabla(data);

    } catch (err) {
        mostrarToast('Error al cargar vehículos: ' + err.message, 'error');
    }
}

// ── Cargar clientes para el select ──
async function cargarClientes() {
    try {
        const res  = await fetch(`${API_URL}/api/clientes`, { headers: getHeaders() });
        const data = await res.json();

        const select = document.getElementById('fCliente');
        select.innerHTML = '<option value="">Seleccionar cliente...</option>';
        data.forEach(c => {
            select.innerHTML += `
                <option value="${c.id_cliente}">
                    ${c.nombre} ${c.apellido}
                </option>`;
        });

    } catch (err) {
        console.error('Error cargando clientes:', err);
    }
}

// ── Renderizar tabla ──
function renderTabla(vehiculos) {
    const tbody = document.getElementById('tablaVehiculos');

    if (!vehiculos || vehiculos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4" style="color:#555">
                    No se encontraron vehículos
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = vehiculos.map(v => `
        <tr>
            <td>
                <div class="d-flex align-items-center gap-2">
                    <div class="vehiculo-icon">
                        <i class="bi bi-car-front-fill"></i>
                    </div>
                    <div>
                        <div style="font-weight:500;color:var(--text-primary)">
                            ${v.marca} ${v.modelo}
                        </div>
                        <div style="font-size:11px;color:var(--text-muted)">
                            ID #${v.id_vehiculo}
                        </div>
                    </div>
                </div>
            </td>
            <td>
                <span style="background:rgba(232,104,26,0.1);color:var(--primary);
                             padding:3px 10px;border-radius:6px;font-weight:600;
                             font-size:12px">
                    ${v.placa}
                </span>
            </td>
            <td style="color:var(--text-secondary)">${v.anio || '—'}</td>
            <td>
                <span class="color-dot"></span>
                ${v.color || '—'}
            </td>
            <td>
                <div style="font-size:13px;color:var(--text-primary)">
                    ${v.cliente}
                </div>
            </td>
            <td>
                <div class="d-flex gap-2">
                    <button class="btn-accion editar"
                            onclick="abrirModalEditar(${v.id_vehiculo})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn-accion eliminar"
                            onclick="abrirModalEliminar(${v.id_vehiculo},
                            '${v.marca} ${v.modelo} - ${v.placa}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// ── Buscar ──
let timerBuscar;
function buscarVehiculos() {
    clearTimeout(timerBuscar);
    timerBuscar = setTimeout(() => {
        cargarVehiculos(document.getElementById('inputBuscar').value);
    }, 400);
}

// ── Modal nuevo ──
function abrirModalNuevo() {
    vehiculoIdEditar = null;
    document.getElementById('modalTitulo').textContent = 'Nuevo vehículo';
    limpiarModal();
    modalVehiculo.show();
}

// ── Modal editar ──
async function abrirModalEditar(id) {
    try {
        const res  = await fetch(`${API_URL}/api/vehiculos/${id}`, { headers: getHeaders() });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error);

        vehiculoIdEditar = id;
        document.getElementById('modalTitulo').textContent = 'Editar vehículo';
        document.getElementById('fPlaca').value   = data.placa;
        document.getElementById('fMarca').value   = data.marca;
        document.getElementById('fModelo').value  = data.modelo;
        document.getElementById('fAnio').value    = data.anio   || '';
        document.getElementById('fColor').value   = data.color  || '';
        document.getElementById('fCliente').value = data.id_cliente;
        ocultarErrorModal();
        modalVehiculo.show();

    } catch (err) {
        mostrarToast('Error: ' + err.message, 'error');
    }
}

// ── Guardar ──
async function guardarVehiculo() {
    const body = {
        placa:      document.getElementById('fPlaca').value.trim().toUpperCase(),
        marca:      document.getElementById('fMarca').value.trim(),
        modelo:     document.getElementById('fModelo').value.trim(),
        anio:       document.getElementById('fAnio').value || null,
        color:      document.getElementById('fColor').value.trim(),
        id_cliente: document.getElementById('fCliente').value,
    };

    if (!body.placa || !body.marca || !body.modelo || !body.id_cliente) {
        mostrarErrorModal('Placa, marca, modelo y cliente son obligatorios.');
        return;
    }

    try {
        const url    = vehiculoIdEditar
            ? `${API_URL}/api/vehiculos/${vehiculoIdEditar}`
            : `${API_URL}/api/vehiculos`;
        const method = vehiculoIdEditar ? 'PUT' : 'POST';

        const res  = await fetch(url, {
            method,
            headers: getHeaders(),
            body:    JSON.stringify(body)
        });
        const data = await res.json();

        if (!res.ok) { mostrarErrorModal(data.error); return; }

        modalVehiculo.hide();
        cargarVehiculos();
        mostrarToast(
            vehiculoIdEditar ? 'Vehículo actualizado' : 'Vehículo registrado',
            'success'
        );

    } catch (err) {
        mostrarErrorModal('Error: ' + err.message);
    }
}

// ── Modal eliminar ──
function abrirModalEliminar(id, nombre) {
    vehiculoIdEliminar = id;
    document.getElementById('nombreEliminar').textContent = nombre;
    modalEliminar.show();
}

async function confirmarEliminar() {
    try {
        const res = await fetch(
            `${API_URL}/api/vehiculos/${vehiculoIdEliminar}`,
            { method: 'DELETE', headers: getHeaders() }
        );
        const data = await res.json();

        if (!res.ok) throw new Error(data.error);

        modalEliminar.hide();
        cargarVehiculos();
        mostrarToast('Vehículo eliminado correctamente', 'success');

    } catch (err) {
        mostrarToast('Error: ' + err.message, 'error');
    }
}

// ── Helpers ──
function limpiarModal() {
    ['fPlaca','fMarca','fModelo','fAnio','fColor'].forEach(id => {
        document.getElementById(id).value = '';
    });
    document.getElementById('fCliente').value = '';
    ocultarErrorModal();
}

function mostrarErrorModal(msg) {
    document.getElementById('modalError').style.display  = 'flex';
    document.getElementById('modalErrorMsg').textContent = msg;
}

function ocultarErrorModal() {
    document.getElementById('modalError').style.display = 'none';
}
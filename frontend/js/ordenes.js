// ═══════════════════════════════════════
// ZEDAN MOTOR'S — Órdenes
// ═══════════════════════════════════════

let ordenIdEditar   = null;
let ordenIdEliminar = null;
let modalOrden, modalEliminar;

document.addEventListener('DOMContentLoaded', () => {
    modalOrden    = new bootstrap.Modal(document.getElementById('modalOrden'));
    modalEliminar = new bootstrap.Modal(document.getElementById('modalEliminar'));
    cargarOrdenes();
    cargarCombos();
});

// ── Cargar órdenes ──
async function cargarOrdenes() {
    try {
        const res  = await fetch(`${API_URL}/api/ordenes`, { headers: getHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        document.getElementById('totalOrdenes').textContent = data.length;
        renderTabla(data);
    } catch (err) {
        mostrarToast('Error al cargar órdenes: ' + err.message, 'error');
    }
}

// ── Cargar combos ──
async function cargarCombos() {
    try {
        // Citas pendientes/confirmadas
        const resCitas = await fetch(`${API_URL}/api/citas`, { headers: getHeaders() });
        const citas    = await resCitas.json();
        const sel      = document.getElementById('fCita');
        sel.innerHTML  = '<option value="">Seleccionar cita...</option>';
        citas.filter(c => c.id_estado <= 2).forEach(c => {
            sel.innerHTML +=
                `<option value="${c.id_cita}">
                    #${c.id_cita} — ${c.cliente} | ${formatearFecha(c.fecha)} ${c.hora}
                </option>`;
        });

        // Empleados
        const resEmp  = await fetch(`${API_URL}/api/empleados`, { headers: getHeaders() });
        const emps    = await resEmp.json();
        const selEmp  = document.getElementById('fEmpleado');
        selEmp.innerHTML = '<option value="">Seleccionar empleado...</option>';
        emps.forEach(e => {
            selEmp.innerHTML +=
                `<option value="${e.id_empleado}">${e.nombre_completo} — ${e.cargo}</option>`;
        });

        // Servicios
        const resSrv  = await fetch(`${API_URL}/api/servicios`, { headers: getHeaders() });
        const srvs    = await resSrv.json();
        const selSrv  = document.getElementById('selServicio');
        selSrv.innerHTML = '<option value="">Seleccionar servicio...</option>';
        srvs.forEach(s => {
            selSrv.innerHTML +=
                `<option value="${s.id_servicio}" data-costo="${s.costo}">
                    ${s.nombre_servicio} — $${s.costo}
                </option>`;
        });

        // Repuestos
        const resRep  = await fetch(`${API_URL}/api/inventario`, { headers: getHeaders() });
        const reps    = await resRep.json();
        const selRep  = document.getElementById('selRepuesto');
        selRep.innerHTML = '<option value="">Seleccionar repuesto...</option>';
        reps.forEach(r => {
            selRep.innerHTML +=
                `<option value="${r.id_repuesto}" data-precio="${r.precio}">
                    ${r.nombre} (${r.marca}) — Stock: ${r.stock}
                </option>`;
        });

    } catch (err) {
        console.error('Error cargando combos:', err);
    }
}

// ── Renderizar tabla ──
function renderTabla(ordenes) {
    const tbody = document.getElementById('tablaOrdenes');

    if (!ordenes || ordenes.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4" style="color:#555">
                    No se encontraron órdenes
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = ordenes.map(o => `
        <tr>
            <td>
                <span style="color:var(--primary);font-weight:700">#${o.id_orden}</span>
            </td>
            <td>${o.cliente}</td>
            <td style="color:var(--text-secondary)">${o.vehiculo}</td>
            <td>${o.empleado || '—'}</td>
            <td>${formatearFecha(o.fecha_inicio)}</td>
            <td>${getBadgeEstado(o.estado)}</td>
            <td>
                <div class="d-flex gap-2">
                    <button class="btn-accion editar"
                            onclick="abrirModalEditar(${o.id_orden})"
                            title="Editar">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn-accion eliminar"
                            onclick="abrirModalEliminar(${o.id_orden}, '#${o.id_orden}')"
                            title="Eliminar">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function getBadgeEstado(estado) {
    const clases = {
        'Pendiente':  'badge-pendiente',
        'Confirmada': 'badge-confirmada',
        'En proceso': 'badge-proceso',
        'Completada': 'badge-completada',
        'Cancelada':  'badge-cancelada',
    };
    return `<span class="badge-custom ${clases[estado] || 'badge-pendiente'}">${estado || '—'}</span>`;
}

// ── Modal nuevo ──
function abrirModalNuevo() {
    ordenIdEditar = null;
    document.getElementById('modalTitulo').textContent = 'Nueva orden';
    document.getElementById('seccionDetalle').style.display = 'none';
    document.getElementById('btnGuardar').style.display     = 'inline-flex';
    limpiarModal();
    modalOrden.show();
}

// ── Modal editar ──
async function abrirModalEditar(id) {
    try {
        const res  = await fetch(`${API_URL}/api/ordenes/${id}`, { headers: getHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        ordenIdEditar = id;
        document.getElementById('modalTitulo').textContent      = `Orden #${id}`;
        document.getElementById('seccionDetalle').style.display = 'block';
        document.getElementById('fCita').value         = data.id_cita;
        document.getElementById('fEmpleado').value     = data.id_empleado;
        document.getElementById('fFechaInicio').value  = data.fecha_inicio?.split('T')[0] || '';
        document.getElementById('fFechaFin').value     = data.fecha_fin?.split('T')[0]    || '';
        document.getElementById('fObservaciones').value = data.observaciones || '';

        await cargarDetalleOrden(id);
        ocultarErrorModal();
        modalOrden.show();

    } catch (err) {
        mostrarToast('Error: ' + err.message, 'error');
    }
}

// ── Cargar detalle ──
async function cargarDetalleOrden(id) {
    try {
        const [resS, resR] = await Promise.all([
            fetch(`${API_URL}/api/ordenes/${id}/servicios`, { headers: getHeaders() }),
            fetch(`${API_URL}/api/ordenes/${id}/repuestos`, { headers: getHeaders() })
        ]);

        const servicios = await resS.json();
        const repuestos = await resR.json();

        // Render servicios
        const divS = document.getElementById('listaServicios');
        divS.innerHTML = servicios.length === 0
            ? '<p style="color:#555;font-size:12px;padding:8px">Sin servicios</p>'
            : servicios.map(s => `
                <div class="detalle-item">
                    <span>${s.nombre_servicio}</span>
                    <div class="d-flex align-items-center gap-2">
                        <span class="precio">$${s.costo}</span>
                        <button class="btn-quitar"
                                onclick="quitarServicio(${s.id_servicio})">
                            <i class="bi bi-x"></i>
                        </button>
                    </div>
                </div>`).join('');

        // Render repuestos
        const divR = document.getElementById('listaRepuestos');
        divR.innerHTML = repuestos.length === 0
            ? '<p style="color:#555;font-size:12px;padding:8px">Sin repuestos</p>'
            : repuestos.map(r => `
                <div class="detalle-item">
                    <span>${r.nombre} x${r.cantidad}</span>
                    <div class="d-flex align-items-center gap-2">
                        <span class="precio">$${r.total}</span>
                        <button class="btn-quitar"
                                onclick="quitarRepuesto(${r.id_repuesto})">
                            <i class="bi bi-x"></i>
                        </button>
                    </div>
                </div>`).join('');

    } catch (err) {
        console.error('Error cargando detalle:', err);
    }
}

// ── Guardar orden ──
async function guardarOrden() {
    const body = {
        fecha_inicio:  document.getElementById('fFechaInicio').value,
        fecha_fin:     document.getElementById('fFechaFin').value    || null,
        observaciones: document.getElementById('fObservaciones').value.trim(),
        id_cita:       document.getElementById('fCita').value,
        id_empleado:   document.getElementById('fEmpleado').value,
    };

    if (!body.fecha_inicio || !body.id_cita || !body.id_empleado) {
        mostrarErrorModal('Fecha inicio, cita y empleado son obligatorios.');
        return;
    }

    try {
        const url    = ordenIdEditar
            ? `${API_URL}/api/ordenes/${ordenIdEditar}`
            : `${API_URL}/api/ordenes`;
        const method = ordenIdEditar ? 'PUT' : 'POST';

        const res  = await fetch(url, {
            method,
            headers: getHeaders(),
            body:    JSON.stringify(body)
        });
        const data = await res.json();
        if (!res.ok) { mostrarErrorModal(data.error); return; }

        if (!ordenIdEditar) {
            // Nueva orden — mostrar sección de detalle
            ordenIdEditar = data.id_orden;
            document.getElementById('modalTitulo').textContent      = `Orden #${data.id_orden}`;
            document.getElementById('seccionDetalle').style.display = 'block';
            mostrarToast('Orden creada. Ahora agrega servicios y repuestos.', 'success');
        } else {
            modalOrden.hide();
            mostrarToast('Orden actualizada', 'success');
        }

        cargarOrdenes();

    } catch (err) {
        mostrarErrorModal('Error: ' + err.message);
    }
}

// ── Agregar servicio ──
async function agregarServicio() {
    const sel = document.getElementById('selServicio');
    if (!sel.value) { mostrarToast('Selecciona un servicio', 'warning'); return; }

    try {
        const res = await fetch(`${API_URL}/api/ordenes/${ordenIdEditar}/servicios`, {
            method:  'POST',
            headers: getHeaders(),
            body:    JSON.stringify({ id_servicio: sel.value })
        });
        if (!res.ok) throw new Error((await res.json()).error);
        sel.value = '';
        await cargarDetalleOrden(ordenIdEditar);
        mostrarToast('Servicio agregado', 'success');
    } catch (err) {
        mostrarToast('Error: ' + err.message, 'error');
    }
}

// ── Quitar servicio ──
async function quitarServicio(idServicio) {
    try {
        await fetch(`${API_URL}/api/ordenes/${ordenIdEditar}/servicios/${idServicio}`, {
            method:  'DELETE',
            headers: getHeaders()
        });
        await cargarDetalleOrden(ordenIdEditar);
        mostrarToast('Servicio eliminado', 'success');
    } catch (err) {
        mostrarToast('Error: ' + err.message, 'error');
    }
}

// ── Agregar repuesto ──
async function agregarRepuesto() {
    const sel      = document.getElementById('selRepuesto');
    const cantidad = document.getElementById('cantRepuesto').value;
    if (!sel.value) { mostrarToast('Selecciona un repuesto', 'warning'); return; }

    try {
        const res = await fetch(`${API_URL}/api/ordenes/${ordenIdEditar}/repuestos`, {
            method:  'POST',
            headers: getHeaders(),
            body:    JSON.stringify({ id_repuesto: sel.value, cantidad: parseInt(cantidad) })
        });
        if (!res.ok) throw new Error((await res.json()).error);
        sel.value = '';
        document.getElementById('cantRepuesto').value = 1;
        await cargarDetalleOrden(ordenIdEditar);
        mostrarToast('Repuesto agregado', 'success');
    } catch (err) {
        mostrarToast('Error: ' + err.message, 'error');
    }
}

// ── Quitar repuesto ──
async function quitarRepuesto(idRepuesto) {
    try {
        await fetch(`${API_URL}/api/ordenes/${ordenIdEditar}/repuestos/${idRepuesto}`, {
            method:  'DELETE',
            headers: getHeaders()
        });
        await cargarDetalleOrden(ordenIdEditar);
        mostrarToast('Repuesto eliminado', 'success');
    } catch (err) {
        mostrarToast('Error: ' + err.message, 'error');
    }
}

// ── Modal eliminar ──
function abrirModalEliminar(id, nombre) {
    ordenIdEliminar = id;
    document.getElementById('nombreEliminar').textContent = nombre;
    modalEliminar.show();
}

async function confirmarEliminar() {
    try {
        const res  = await fetch(`${API_URL}/api/ordenes/${ordenIdEliminar}`,
            { method: 'DELETE', headers: getHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        modalEliminar.hide();
        cargarOrdenes();
        mostrarToast('Orden eliminada', 'success');
    } catch (err) {
        mostrarToast('Error: ' + err.message, 'error');
    }
}

// ── Helpers ──
function limpiarModal() {
    ['fCita','fEmpleado','fFechaInicio','fFechaFin','fObservaciones']
        .forEach(id => document.getElementById(id).value = '');
    document.getElementById('listaServicios').innerHTML = '';
    document.getElementById('listaRepuestos').innerHTML = '';
    ocultarErrorModal();
}

function mostrarErrorModal(msg) {
    document.getElementById('modalError').style.display  = 'flex';
    document.getElementById('modalErrorMsg').textContent = msg;
}

function ocultarErrorModal() {
    document.getElementById('modalError').style.display = 'none';
}
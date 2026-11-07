// ═══════════════════════════════════════
// ZEDAN MOTOR'S — Citas (con FullCalendar)
// ═══════════════════════════════════════

let citaIdEditar   = null;
let citaIdEliminar = null;
let modalCita, modalEliminar;
let calendarInstance = null;
let todasLasCitas = [];
let fechaSeleccionada = new Date().toISOString().split('T')[0];

document.addEventListener('DOMContentLoaded', () => {
    modalCita     = new bootstrap.Modal(document.getElementById('modalCita'));
    modalEliminar = new bootstrap.Modal(document.getElementById('modalEliminar'));

    iniciarCalendario();
    cargarCitas();
    cargarClientes();

    // Fecha mínima hoy
    const inputFecha = document.getElementById('fFecha');
    if (inputFecha) {
        inputFecha.min = new Date().toISOString().split('T')[0];
    }
});

// ── Inicializar FullCalendar ──
function iniciarCalendario() {
    const calendarEl = document.getElementById('fullcalendarContainer');
    if (!calendarEl || typeof FullCalendar === 'undefined') return;

    calendarInstance = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        initialDate: fechaSeleccionada,
        locale: 'es',
        contentHeight: 340,
        fixedWeekCount: false,
        showNonCurrentDates: true,
        headerToolbar: {
            left: 'prev',
            center: 'title',
            right: 'next'
        },
        buttonText: { today: 'Hoy' },
        dateClick: function(info) {
            seleccionarFecha(info.dateStr);
        },
        dayCellClassNames: function(arg) {
            const dStr = normalizarFecha(arg.date);
            const classes = [];
            if (dStr === fechaSeleccionada) classes.push('fc-day-active-selected');
            if (contarCitasPorFecha(dStr) > 0) classes.push('fc-day-has-citas');
            return classes;
        },
        dayCellContent: function(arg) {
            const dStr = normalizarFecha(arg.date);
            const count = contarCitasPorFecha(dStr);
            const numText = arg.dayNumberText.replace(/[^0-9]/g, '');
            let badgeHtml = '';
            if (count > 0) {
                badgeHtml = `<span class="fc-citas-indicator" title="${count} cita(s)">${count}</span>`;
            }
            return {
                html: `<div class="fc-custom-cell"><span class="fc-custom-day-num">${numText}</span>${badgeHtml}</div>`
            };
        }
    });

    calendarInstance.render();
}

function normalizarFecha(fecha) {
    if (!fecha) return '';
    if (typeof fecha === 'string') {
        return fecha.includes('T') ? fecha.split('T')[0] : fecha.slice(0, 10);
    }
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function contarCitasPorFecha(fechaStr) {
    return todasLasCitas.filter(c => normalizarFecha(c.fecha) === fechaStr).length;
}

function seleccionarFecha(fechaStr) {
    fechaSeleccionada = fechaStr;
    if (calendarInstance) {
        calendarInstance.render(); // Refresca clases activas
    }
    actualizarHeaderDia();
    filtrarCitasDia();
}

function irAHoyCalendario() {
    const hoy = new Date().toISOString().split('T')[0];
    if (calendarInstance) {
        calendarInstance.today();
    }
    seleccionarFecha(hoy);
}

function formatearFechaLarga(fechaStr) {
    if (!fechaStr) return '';
    const partes = fechaStr.split('-');
    if (partes.length !== 3) return fechaStr;
    const [y, m, d] = partes.map(Number);
    const date = new Date(y, m - 1, d);
    const opciones = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const str = date.toLocaleDateString('es-ES', opciones);
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function actualizarHeaderDia() {
    const tituloEl = document.getElementById('tituloDiaSeleccionado');
    if (tituloEl) {
        tituloEl.textContent = formatearFechaLarga(fechaSeleccionada);
    }
    const btnTexto = document.getElementById('btnAgregarCitaDiaTexto');
    if (btnTexto) {
        const diaNum = fechaSeleccionada.split('-')[2] || '';
        btnTexto.textContent = `+ Agregar cita (${diaNum})`;
    }
}

// ── Alternar entre Vista Calendario y Tabla ──
function cambiarVista(vista) {
    const seccionCal   = document.getElementById('seccionVistaCalendario');
    const seccionTabla = document.getElementById('seccionVistaTabla');
    const btnCal       = document.getElementById('btnVistaCalendario');
    const btnTabla     = document.getElementById('btnVistaTabla');

    if (vista === 'calendario') {
        seccionCal.style.display = 'grid';
        seccionTabla.style.display = 'none';
        btnCal.classList.add('active');
        btnTabla.classList.remove('active');
        if (calendarInstance) calendarInstance.updateSize();
    } else {
        seccionCal.style.display = 'none';
        seccionTabla.style.display = 'flex';
        btnCal.classList.remove('active');
        btnTabla.classList.add('active');
    }
}

// ── Cargar citas ──
async function cargarCitas(buscar = '') {
    try {
        const url = buscar
            ? `${API_URL}/api/citas?buscar=${encodeURIComponent(buscar)}`
            : `${API_URL}/api/citas`;

        const res  = await fetch(url, { headers: getHeaders() });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error);

        todasLasCitas = data || [];

        // Filtro por estado para tabla general
        const filtroEstado = document.getElementById('filtroEstado').value;
        const filtradas    = filtroEstado
            ? todasLasCitas.filter(c => c.id_estado == filtroEstado)
            : todasLasCitas;

        document.getElementById('totalCitas').textContent = filtradas.length;
        renderTabla(filtradas);

        // Actualizar agenda diaria y estadísticas
        actualizarEstadisticas();
        actualizarHeaderDia();
        filtrarCitasDia();

        if (calendarInstance) {
            calendarInstance.render();
        }

    } catch (err) {
        mostrarToast('Error al cargar citas: ' + err.message, 'error');
    }
}

// ── Filtrar y renderizar agenda del día ──
function filtrarCitasDia() {
    const filtroEstado = document.getElementById('filtroEstadoDia')?.value || '';
    const buscarTexto  = (document.getElementById('inputBuscarDia')?.value || '').toLowerCase().trim();

    let citasDelDia = todasLasCitas.filter(c => normalizarFecha(c.fecha) === fechaSeleccionada);

    if (filtroEstado) {
        citasDelDia = citasDelDia.filter(c => String(c.id_estado) === String(filtroEstado));
    }

    if (buscarTexto) {
        citasDelDia = citasDelDia.filter(c => {
            const nom = (c.cliente || '').toLowerCase();
            const veh = (c.vehiculo || '').toLowerCase();
            const mot = (c.motivo || '').toLowerCase();
            return nom.includes(buscarTexto) || veh.includes(buscarTexto) || mot.includes(buscarTexto);
        });
    }

    // Ordenar por hora
    citasDelDia.sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));

    const contadorEl = document.getElementById('contadorCitasDia');
    if (contadorEl) contadorEl.textContent = citasDelDia.length;

    renderAgendaDia(citasDelDia);
}

function renderAgendaDia(citas) {
    const tbody = document.getElementById('tablaAgendaDia');
    if (!tbody) return;

    if (!citas || citas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="day-agenda-empty py-5">
                    <div class="empty-icon-wrap mb-2">
                        <i class="bi bi-calendar-check" style="font-size:26px"></i>
                    </div>
                    <div style="font-weight:700;color:#1e3a8a">No hay citas registradas para este día</div>
                    <p style="color:#64748b;font-size:13px;margin:4px 0 14px">
                        No se encontraron citas agendadas para el <strong>${formatearFechaLarga(fechaSeleccionada)}</strong>.
                    </p>
                    <button type="button" class="btn-primary-custom" onclick="abrirModalNuevo('${fechaSeleccionada}')">
                        <i class="bi bi-plus-lg"></i> Agendar primera cita
                    </button>
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = citas.map((c, idx) => `
        <tr class="agenda-row">
            <td>
                <div class="turno-hora-box">
                    <span class="turno-num">#${idx + 1}</span>
                    <div class="turno-hora-text">
                        <i class="bi bi-clock"></i>
                        <span>${c.hora || '--:--'}</span>
                    </div>
                </div>
            </td>
            <td>
                <div class="agenda-cliente-info">
                    <div class="agenda-cliente-name">
                        <i class="bi bi-person-fill"></i>
                        <span>${escapeHtml(c.cliente)}</span>
                    </div>
                    <div class="agenda-vehiculo-badge">
                        <i class="bi bi-car-front-fill"></i>
                        <span>${escapeHtml(c.vehiculo)}</span>
                    </div>
                </div>
            </td>
            <td>
                <div class="agenda-motivo-text">
                    ${c.motivo
                        ? `<i class="bi bi-wrench"></i><span>${escapeHtml(c.motivo)}</span>`
                        : `<span style="color:#94a3b8">—</span>`}
                </div>
            </td>
            <td>${badgeEstado(c.estado)}</td>
            <td style="text-align: center">
                <div class="d-flex justify-content-center gap-2">
                    <button class="btn-accion editar" title="Editar" onclick="abrirModalEditar(${c.id_cita})">
                        <i class="bi bi-pencil-fill"></i>
                    </button>
                    <button class="btn-accion eliminar" title="Eliminar" onclick="abrirModalEliminar(${c.id_cita}, '${escapeHtml(c.cliente)}')">
                        <i class="bi bi-trash-fill"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function actualizarEstadisticas() {
    const hoyStr = new Date().toISOString().split('T')[0];
    const citasHoy = todasLasCitas.filter(c => normalizarFecha(c.fecha) === hoyStr).length;
    const citasDia = todasLasCitas.filter(c => normalizarFecha(c.fecha) === fechaSeleccionada).length;
    const pendientes = todasLasCitas.filter(c => String(c.id_estado) === '1').length;

    const elHoy = document.getElementById('statCitasHoy');
    const elDia = document.getElementById('statCitasDia');
    const elPen = document.getElementById('statCitasPendientes');

    if (elHoy) elHoy.textContent = citasHoy;
    if (elDia) elDia.textContent = citasDia;
    if (elPen) elPen.textContent = pendientes;
}

// ── Cargar clientes ──
async function cargarClientes() {
    try {
        const res  = await fetch(`${API_URL}/api/clientes`, { headers: getHeaders() });
        const data = await res.json();
        const sel  = document.getElementById('fCliente');
        if (!sel) return;
        sel.innerHTML = '<option value="">Seleccionar cliente...</option>';
        data.forEach(c => {
            sel.innerHTML +=
                `<option value="${c.id_cliente}">${escapeHtml(c.nombre)} ${escapeHtml(c.apellido)}</option>`;
        });
    } catch (err) {
        console.error('Error cargando clientes:', err);
    }
}

// ── Cargar vehículos por cliente ──
async function cargarVehiculosCliente(idVehiculoSeleccionar = null) {
    const idCliente = document.getElementById('fCliente').value;
    const sel       = document.getElementById('fVehiculo');
    if (!sel) return;
    sel.innerHTML   = '<option value="">Seleccionar vehículo...</option>';

    if (!idCliente) return;

    try {
        const res  = await fetch(
            `${API_URL}/api/clientes/${idCliente}/vehiculos`,
            { headers: getHeaders() }
        );
        const data = await res.json();
        data.forEach(v => {
            const selected = v.id_vehiculo == idVehiculoSeleccionar ? 'selected' : '';
            sel.innerHTML +=
                `<option value="${v.id_vehiculo}" ${selected}>${escapeHtml(v.placa)} - ${escapeHtml(v.marca)} ${escapeHtml(v.modelo)}</option>`;
        });
    } catch (err) {
        console.error('Error cargando vehículos:', err);
    }
}

// ── Renderizar tabla general ──
function renderTabla(citas) {
    const tbody = document.getElementById('tablaCitas');
    if (!tbody) return;

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
            <td style="font-weight:600; color:#1e3a8a">${formatearFecha(c.fecha)}</td>
            <td><strong style="color:#2563eb">${c.hora || '--:--'}</strong></td>
            <td><strong>${escapeHtml(c.cliente)}</strong></td>
            <td style="color:var(--text-secondary)">${escapeHtml(c.vehiculo)}</td>
            <td style="color:var(--text-secondary)">${escapeHtml(c.motivo || '—')}</td>
            <td>${badgeEstado(c.estado)}</td>
            <td>
                <button class="btn-accion editar" title="Editar"
                        onclick="abrirModalEditar(${c.id_cita})">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn-accion eliminar" title="Eliminar"
                        onclick="abrirModalEliminar(${c.id_cita}, '${escapeHtml(c.cliente)}')">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// ── Buscar / filtrar general ──
let timeoutBuscar;
function buscarCitas() {
    clearTimeout(timeoutBuscar);
    timeoutBuscar = setTimeout(() => {
        cargarCitas(document.getElementById('inputBuscar').value);
    }, 300);
}

// ── Modal Nuevo ──
function abrirModalNuevo(fechaPrevia = null) {
    citaIdEditar = null;
    document.getElementById('modalTitulo').textContent = 'Nueva cita';
    limpiarFormulario();
    document.getElementById('fFecha').value = fechaPrevia || fechaSeleccionada || new Date().toISOString().split('T')[0];
    document.getElementById('fHora').value = '08:30';
    document.getElementById('modalError').style.display = 'none';
    modalCita.show();
}

// ── Modal Editar ──
async function abrirModalEditar(id) {
    try {
        const res  = await fetch(`${API_URL}/api/citas/${id}`, { headers: getHeaders() });
        const cita = await res.json();
        if (!res.ok) throw new Error(cita.error);

        citaIdEditar = id;
        document.getElementById('modalTitulo').textContent = 'Editar cita';
        document.getElementById('modalError').style.display = 'none';

        document.getElementById('fCliente').value = cita.id_cliente;
        await cargarVehiculosCliente(cita.id_vehiculo);

        document.getElementById('fFecha').value  = normalizarFecha(cita.fecha);
        document.getElementById('fHora').value   = cita.hora;
        document.getElementById('fEstado').value = cita.id_estado;
        document.getElementById('fMotivo').value = cita.motivo || '';

        modalCita.show();

    } catch (err) {
        mostrarToast('Error al cargar cita: ' + err.message, 'error');
    }
}

// ── Guardar cita ──
async function guardarCita() {
    const errorDiv = document.getElementById('modalError');
    const errorMsg = document.getElementById('modalErrorMsg');
    errorDiv.style.display = 'none';

    const id_vehiculo = document.getElementById('fVehiculo').value;
    const fecha       = document.getElementById('fFecha').value;
    const hora        = document.getElementById('fHora').value;
    const id_estado   = document.getElementById('fEstado').value;
    const motivo      = document.getElementById('fMotivo').value.trim();

    if (!id_vehiculo || !fecha || !hora) {
        errorMsg.textContent  = 'Vehículo, fecha y hora son obligatorios';
        errorDiv.style.display = 'flex';
        return;
    }

    const payload = { id_vehiculo, fecha, hora, id_estado, motivo };

    try {
        const url    = citaIdEditar
            ? `${API_URL}/api/citas/${citaIdEditar}`
            : `${API_URL}/api/citas`;
        const method = citaIdEditar ? 'PUT' : 'POST';

        const res  = await fetch(url, {
            method,
            headers: getHeaders(),
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        modalCita.hide();
        mostrarToast(
            citaIdEditar ? 'Cita actualizada con éxito' : 'Cita creada con éxito',
            'success'
        );
        fechaSeleccionada = fecha;
        cargarCitas();

    } catch (err) {
        errorMsg.textContent  = err.message;
        errorDiv.style.display = 'flex';
    }
}

// ── Modal Eliminar ──
function abrirModalEliminar(id, cliente) {
    citaIdEliminar = id;
    document.getElementById('nombreEliminar').textContent = cliente;
    modalEliminar.show();
}

async function confirmarEliminar() {
    try {
        const res  = await fetch(`${API_URL}/api/citas/${citaIdEliminar}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        modalEliminar.hide();
        mostrarToast('Cita eliminada con éxito', 'success');
        cargarCitas();

    } catch (err) {
        mostrarToast('Error al eliminar: ' + err.message, 'error');
    }
}

// ── Helpers ──
function limpiarFormulario() {
    document.getElementById('fCliente').value  = '';
    document.getElementById('fVehiculo').innerHTML =
        '<option value="">Seleccionar vehículo...</option>';
    document.getElementById('fFecha').value   = '';
    document.getElementById('fHora').value    = '';
    document.getElementById('fEstado').value  = '1';
    document.getElementById('fMotivo').value  = '';
}

function formatearFecha(f) {
    if (!f) return '—';
    const d = new Date(f);
    return d.toLocaleDateString('es-CO', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });
}

function badgeEstado(estado) {
    const mapa = {
        'Pendiente':  'badge-pendiente',
        'Confirmada': 'badge-confirmada',
        'En proceso': 'badge-proceso',
        'Completada': 'badge-completada',
        'Cancelada':  'badge-cancelada'
    };
    const cls = mapa[estado] || 'badge-pendiente';
    return `<span class="badge-custom ${cls}">${escapeHtml(estado || 'Pendiente')}</span>`;
}

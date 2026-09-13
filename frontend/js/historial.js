// ═══════════════════════════════════════
// ZEDAN MOTOR'S — Historial
// ═══════════════════════════════════════

let todosEventos   = [];
let vehiculoActual = null;

document.addEventListener('DOMContentLoaded', () => {
    cargarClientes();
});

// ── Cargar clientes ──
async function cargarClientes() {
    try {
        const res  = await fetch(`${API_URL}/api/clientes`, { headers: getHeaders() });
        const data = await res.json();
        const sel  = document.getElementById('selCliente');
        sel.innerHTML = '<option value="">Seleccionar cliente...</option>';
        data.forEach(c => {
            sel.innerHTML +=
                `<option value="${c.id_cliente}">${c.nombre} ${c.apellido}</option>`;
        });
    } catch (err) {
        mostrarToast('Error al cargar clientes', 'error');
    }
}

// ── Cargar vehículos por cliente ──
async function cargarVehiculosCliente() {
    const idCliente = document.getElementById('selCliente').value;
    const sel       = document.getElementById('selVehiculo');
    sel.innerHTML   = '<option value="">Seleccionar vehículo...</option>';

    document.getElementById('infoVehiculo').style.display = 'none';
    document.getElementById('timeline').innerHTML = `
        <div class="timeline-vacio">
            <i class="bi bi-car-front"
               style="font-size:48px;color:#333;display:block;margin-bottom:16px"></i>
            Selecciona un vehículo para ver su historial
        </div>`;

    if (!idCliente) return;

    try {
        const res  = await fetch(
            `${API_URL}/api/clientes/${idCliente}/vehiculos`,
            { headers: getHeaders() }
        );
        const data = await res.json();
        data.forEach(v => {
            sel.innerHTML +=
                `<option value="${v.id_vehiculo}"
                         data-nombre="${v.marca} ${v.modelo}"
                         data-placa="${v.placa}">
                    ${v.placa} — ${v.marca} ${v.modelo}
                </option>`;
        });
    } catch (err) {
        mostrarToast('Error cargando vehículos', 'error');
    }
}

// ── Cargar historial ──
async function cargarHistorial() {
    const sel     = document.getElementById('selVehiculo');
    const idVeh   = sel.value;
    const opt     = sel.options[sel.selectedIndex];

    if (!idVeh) {
        document.getElementById('infoVehiculo').style.display = 'none';
        return;
    }

    // Info del vehículo
    vehiculoActual = {
        id:     idVeh,
        nombre: opt.dataset.nombre,
        placa:  opt.dataset.placa
    };

    document.getElementById('infoNombre').textContent  = vehiculoActual.nombre;
    document.getElementById('infoPlaca').textContent   = vehiculoActual.placa;
    document.getElementById('infoVehiculo').style.display = 'block';
    document.getElementById('timelineTitle').textContent  =
        `${vehiculoActual.nombre} — ${vehiculoActual.placa}`;

    try {
        const res  = await fetch(
            `${API_URL}/api/historial/vehiculo/${idVeh}`,
            { headers: getHeaders() }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        todosEventos = data;
        actualizarStats(data);
        renderTimeline(data);

    } catch (err) {
        mostrarToast('Error al cargar historial: ' + err.message, 'error');
    }
}

// ── Stats ──
function actualizarStats(eventos) {
    document.getElementById('statEventos').textContent =
        eventos.length;
    document.getElementById('statServicios').textContent =
        eventos.filter(e => e.tipo_evento === 'Servicio').length;
    document.getElementById('statFacturas').textContent =
        eventos.filter(e => e.tipo_evento === 'Factura').length;
    document.getElementById('statCitas').textContent =
        eventos.filter(e => e.tipo_evento === 'Cita').length;
}

// ── Filtrar ──
function filtrarTimeline() {
    const filtro = document.getElementById('filtroTipo').value;
    const lista  = filtro
        ? todosEventos.filter(e => e.tipo_evento.includes(filtro))
        : todosEventos;
    renderTimeline(lista);
}

// ── Render timeline ──
function renderTimeline(eventos) {
    const div = document.getElementById('timeline');

    if (!eventos || eventos.length === 0) {
        div.innerHTML = `
            <div class="timeline-vacio">
                <i class="bi bi-inbox"
                   style="font-size:48px;color:#333;
                          display:block;margin-bottom:16px"></i>
                Sin eventos registrados para este vehículo
            </div>`;
        return;
    }

    let html     = '';
    let mesActual = '';

    eventos.forEach((ev, idx) => {
        const fecha = new Date(ev.fecha);
        const mes   = fecha.toLocaleDateString('es-ES', {
            month: 'long', year: 'numeric'
        }).toUpperCase();

        if (mes !== mesActual) {
            mesActual = mes;
            html += `
                <div class="timeline-mes">
                    <span class="timeline-mes-label">${mes}</span>
                    <div class="timeline-mes-line"></div>
                </div>`;
        }

        const esUltimo = idx === eventos.length - 1;

        html += `
            <div class="timeline-evento">
                <div class="timeline-evento-left">
                    <div class="timeline-icono"
                         style="background:${ev.color}20;
                                color:${ev.color};
                                border-color:${ev.color}60">
                        <i class="bi ${ev.icono}"></i>
                    </div>
                    ${!esUltimo ? '<div class="timeline-linea"></div>' : ''}
                </div>
                <div class="timeline-card">
                    <div class="timeline-card-header">
                        <span class="timeline-badge"
                              style="background:${ev.color}20;color:${ev.color}">
                            ${ev.tipo_evento.toUpperCase()}
                        </span>
                        <span class="timeline-fecha">
                            ${fecha.toLocaleDateString('es-ES', {
                                day:  '2-digit',
                                month: 'short',
                                year: 'numeric'
                            })}
                            ${fecha.toLocaleTimeString('es-ES', {
                                hour:   '2-digit',
                                minute: '2-digit'
                            })}
                        </span>
                    </div>
                    <div class="timeline-desc">${ev.descripcion}</div>
                    ${ev.empleado ? `
                    <div class="timeline-empleado">
                        <i class="bi bi-person"></i>
                        ${ev.empleado}
                    </div>` : ''}
                </div>
            </div>`;
    });

    div.innerHTML = html;
}
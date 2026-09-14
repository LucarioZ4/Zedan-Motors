// ═══════════════════════════════════════
// ZEDAN MOTOR'S — Dashboard JS
// ═══════════════════════════════════════

async function cargarKPIs() {
    try {
        const response = await fetch(`${API_URL}/api/dashboard/kpis`, {
            headers: getHeaders()
        });

        if (!response.ok) throw new Error('Error al cargar KPIs');

        const data = await response.json();

        document.getElementById('kpiClientes').textContent  = data.clientes ?? 0;
        document.getElementById('kpiVehiculos').textContent = data.vehiculos ?? 0;
        document.getElementById('kpiCitas').textContent     = data.citasHoy ?? 0;
        document.getElementById('kpiOrdenes').textContent   = data.ordenes ?? 0;
        document.getElementById('kpiEmpleados').textContent = data.empleados ?? 0;
        document.getElementById('kpiStock').textContent     = data.stockBajo ?? 0;
        document.getElementById('kpiFacturas').textContent  = data.facturas ?? 0;

    } catch (err) {
        console.error('Error KPIs:', err);
        mostrarToast('Error al cargar los KPIs', 'error');
    }
}

async function cargarCitasHoy() {
    try {
        const response = await fetch(`${API_URL}/api/dashboard/citas-hoy`, {
            headers: getHeaders()
        });

        if (!response.ok) throw new Error('Error al cargar citas');

        const citas = await response.json();
        const tbody = document.getElementById('bodyCitasHoy');
        const badge = document.getElementById('badgeCitasHoy');

        if (badge) {
            if (citas && citas.length > 0) {
                badge.textContent = `${citas.length} programada${citas.length > 1 ? 's' : ''}`;
                badge.style.display = 'inline-flex';
            } else {
                badge.textContent = 'Al día';
                badge.style.display = 'inline-flex';
            }
        }

        if (!citas || citas.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="p-0">
                        <div class="citas-empty-state">
                            <div class="citas-empty-icon">
                                <i class="bi bi-calendar2-check"></i>
                            </div>
                            <div class="citas-empty-title">Agenda al día</div>
                            <p class="citas-empty-desc">No hay citas pendientes programadas para hoy.</p>
                        </div>
                    </td>
                </tr>`;
            return;
        }

        tbody.innerHTML = citas.map(c => `
            <tr>
                <td>
                    <span class="time-pill">
                        <i class="bi bi-clock"></i> ${c.hora}
                    </span>
                </td>
                <td>
                    <strong style="color:var(--text-primary);font-weight:600">${c.cliente}</strong>
                </td>
                <td>
                    <span style="color:var(--text-secondary)">
                        <i class="bi bi-car-front text-muted me-1"></i>${c.vehiculo}
                    </span>
                </td>
                <td>${getBadgeEstado(c.estado)}</td>
            </tr>
        `).join('');

    } catch (err) {
        console.error('Error citas:', err);
    }
}

function getBadgeEstado(estado) {
    const clases = {
        'Pendiente':  'badge-pendiente',
        'Confirmada': 'badge-confirmada',
        'En proceso': 'badge-proceso',
        'Completada': 'badge-completada',
        'Cancelada':  'badge-cancelada',
    };
    const clase = clases[estado] || 'badge-pendiente';
    return `<span class="badge-custom ${clase}">${estado}</span>`;
}

document.addEventListener('DOMContentLoaded', () => {
    cargarKPIs();
    cargarCitasHoy();
});
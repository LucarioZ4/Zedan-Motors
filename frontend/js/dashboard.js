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

        document.getElementById('kpiClientes').textContent  = data.clientes;
        document.getElementById('kpiVehiculos').textContent = data.vehiculos;
        document.getElementById('kpiCitas').textContent     = data.citasHoy;
        document.getElementById('kpiOrdenes').textContent   = data.ordenes;
        document.getElementById('kpiEmpleados').textContent = data.empleados;
        document.getElementById('kpiStock').textContent     = data.stockBajo;
        document.getElementById('kpiFacturas').textContent  = data.facturas;

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

        if (!citas || citas.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center py-4" style="color:#555">
                        Sin citas para hoy
                    </td>
                </tr>`;
            return;
        }

        tbody.innerHTML = citas.map(c => `
            <tr>
                <td>
                    <span style="color:var(--primary);font-weight:600">
                        ${c.hora}
                    </span>
                </td>
                <td>${c.cliente}</td>
                <td style="color:var(--text-secondary)">${c.vehiculo}</td>
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
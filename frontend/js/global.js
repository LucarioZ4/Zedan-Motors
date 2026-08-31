// ═══════════════════════════════════════
// ZEDAN MOTOR'S — Global JS
// ═══════════════════════════════════════

const API_URL = 'http://localhost:3000';

// ── Headers con token ──
function getHeaders() {
    const token = sessionStorage.getItem('token');
    return {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// ── Verificar sesión ──
function verificarSesion() {
    const token = sessionStorage.getItem('token');
    if (!token) {
        window.location.href = '../login.html';
        return false;
    }
    return true;
}

// ── Cargar datos de sesión en sidebar ──
function cargarSesion() {
    const usuario = sessionStorage.getItem('usuario');
    const rol     = sessionStorage.getItem('rol');

    const elNombre = document.getElementById('sidebarUsuario');
    const elRol    = document.getElementById('sidebarRol');
    const elAvatar = document.getElementById('sidebarAvatar');

    if (elNombre) elNombre.textContent = usuario || 'Usuario';
    if (elRol)    elRol.textContent    = rol     || 'Sin rol';
    if (elAvatar) elAvatar.textContent = (usuario || 'U')[0].toUpperCase();
}

// ── Logout ──
function logout() {
    if (confirm('¿Cerrar sesión?')) {
        sessionStorage.clear();
        window.location.href = '../login.html';
    }
}

// ── Fecha actual ──
function cargarFecha() {
    const el = document.getElementById('topbarFecha');
    if (!el) return;
    const ahora = new Date();
    el.textContent = ahora.toLocaleDateString('es-ES', {
        weekday: 'long',
        day:     'numeric',
        month:   'long',
        year:    'numeric'
    });
}

// ── Toast ──
function mostrarToast(mensaje, tipo = 'success') {
    const colores = {
        success: '#27AE60',
        error:   '#E74C3C',
        warning: '#F5A623',
        info:    '#4A90D9'
    };

    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: #1a1a1a;
        border: 1px solid ${colores[tipo]};
        border-left: 4px solid ${colores[tipo]};
        color: #e0e0e0;
        padding: 14px 20px;
        border-radius: 8px;
        font-size: 13px;
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.4);
        max-width: 320px;
    `;
    toast.innerHTML = `<span style="color:${colores[tipo]}">●</span> ${mensaje}`;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity    = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ── Formatear moneda ──
function formatearMoneda(valor) {
    return new Intl.NumberFormat('es-CO', {
        style:    'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(valor);
}

// ── Formatear fecha ──
function formatearFecha(fecha) {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleDateString('es-ES', {
        day:   '2-digit',
        month: '2-digit',
        year:  'numeric'
    });
}

// ── Init global ──
document.addEventListener('DOMContentLoaded', () => {
    verificarSesion();
    cargarSesion();
    cargarFecha();
});
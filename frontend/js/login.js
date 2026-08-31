// ═══════════════════════════════════════
// ZEDAN MOTOR'S — Login
// ═══════════════════════════════════════

const API_URL = 'http://localhost:3000';

function togglePassword() {
    const input = document.getElementById('password');
    const icon  = document.getElementById('eyeIcon');
    if (input.type === 'password') {
        input.type     = 'text';
        icon.className = 'bi bi-eye-slash';
    } else {
        input.type     = 'password';
        icon.className = 'bi bi-eye';
    }
}

function mostrarError(mensaje) {
    const box = document.getElementById('errorBox');
    const msg = document.getElementById('errorMsg');
    msg.textContent   = mensaje;
    box.style.display = 'flex';
}

function ocultarError() {
    document.getElementById('errorBox').style.display = 'none';
}

async function handleLogin(e) {
    e.preventDefault();

    const usuario  = document.getElementById('usuario').value.trim();
    const password = document.getElementById('password').value;
    const btnLogin = document.getElementById('btnLogin');

    if (!usuario || !password) {
        mostrarError('Completa todos los campos.');
        return;
    }

    btnLogin.disabled     = true;
    btnLogin.textContent  = 'Verificando...';

    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ usuario, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Guardar token y datos de sesión
            sessionStorage.setItem('token',   data.token);
            sessionStorage.setItem('usuario', data.usuario.usuario);
            sessionStorage.setItem('rol',     data.usuario.rol);
            sessionStorage.setItem('nombre',  data.usuario.nombre);

            window.location.href = 'pages/dashboard.html';
        } else {
            mostrarError(data.error || 'Credenciales incorrectas.');
            btnLogin.disabled    = false;
            btnLogin.textContent = 'INGRESAR';
        }

    } catch (err) {
        mostrarError('No se pudo conectar al servidor.');
        btnLogin.disabled    = false;
        btnLogin.textContent = 'INGRESAR';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('usuario').addEventListener('input', ocultarError);
    document.getElementById('password').addEventListener('input', ocultarError);

    if (sessionStorage.getItem('token')) {
        window.location.href = 'pages/dashboard.html';
    }
});
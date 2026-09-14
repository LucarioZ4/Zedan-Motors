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
    msg.textContent = mensaje;
    box.style.display = 'flex';
}

function ocultarError() {
    const box = document.getElementById('errorBox');
    box.style.display = 'none';
}

function setLoading(loading) {
    const btn     = document.getElementById('btnLogin');
    const text    = document.getElementById('btnText');
    const spinner = document.getElementById('btnSpinner');
    btn.disabled      = loading;
    text.textContent  = loading ? 'Verificando...' : 'INGRESAR';
    spinner.style.display = loading ? 'inline-flex' : 'none';
}

async function handleLogin(e) {
    e.preventDefault();

    const usuario  = document.getElementById('usuario').value.trim();
    const password = document.getElementById('password').value;

    if (!usuario || !password) {
        mostrarError('Completa todos los campos.');
        return;
    }

    setLoading(true);
    ocultarError();

    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ usuario, password })
        });

        const data = await response.json();

        if (response.ok) {
            sessionStorage.setItem('token',   data.token);
            sessionStorage.setItem('usuario', data.usuario.usuario);
            sessionStorage.setItem('rol',     data.usuario.rol);
            sessionStorage.setItem('nombre',  data.usuario.nombre);
            window.location.href = 'pages/dashboard.html';
        } else {
            mostrarError(data.error || 'Credenciales incorrectas.');
            setLoading(false);
        }

    } catch (err) {
        mostrarError('No se pudo conectar al servidor.');
        setLoading(false);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('usuario').addEventListener('input', ocultarError);
    document.getElementById('password').addEventListener('input', ocultarError);

    if (sessionStorage.getItem('token')) {
        window.location.href = 'pages/dashboard.html';
    }
});
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import ZedanLogo from '../../components/common/ZedanLogo';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const togglePassword = () => {
    setShowPassword(!showPassword);
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!usuario.trim() || !password) {
      setErrorMsg('Completa todos los campos.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const response = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ usuario: usuario.trim(), password })
      });

      const data = await response.json();

      if (response.ok) {
        sessionStorage.setItem('token', data.token);
        sessionStorage.setItem('usuario', data.usuario?.usuario || usuario);
        sessionStorage.setItem('rol', data.usuario?.rol || 'Administrador');
        sessionStorage.setItem('nombre', data.usuario?.nombre || usuario);
        navigate('/dashboard');
      } else {
        setErrorMsg(data.error || 'Credenciales incorrectas.');
      }
    } catch (err) {
      console.error('Error login:', err);
      setErrorMsg('No se pudo conectar al servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page-root">
      {/* ═══════════════════════════════════════ */}
      {/* ═══   PANEL IZQUIERDO — FORMULARIO  ═══ */}
      {/* ═══════════════════════════════════════ */}
      <div className="panel-login">

        {/* Logo oficial ensamblado */}
        <div style={{ marginBottom: '36px', display: 'flex', justifyContent: 'center' }}>
          <ZedanLogo variant="login-header" width={220} />
        </div>

        {/* Título */}
        <h1 className="login-title">Iniciar sesión</h1>
        <p className="login-sub">Ingresa tus credenciales para continuar</p>

        {/* Formulario */}
        <form onSubmit={handleLogin} autoComplete="off">

          {/* Usuario */}
          <div className="field-group">
            <label className="field-label" htmlFor="usuario">Usuario</label>
            <div className="input-wrap">
              <span className="input-icon">
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/>
                </svg>
              </span>
              <input
                type="text"
                id="usuario"
                className="field-input"
                placeholder="Ingresa tu usuario"
                value={usuario}
                onChange={(e) => {
                  setUsuario(e.target.value);
                  setErrorMsg('');
                }}
              />
            </div>
          </div>

          {/* Contraseña */}
          <div className="field-group">
            <label className="field-label" htmlFor="password">Contraseña</label>
            <div className="input-wrap">
              <span className="input-icon">
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path d="M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z"/>
                </svg>
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                className="field-input"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg('');
                }}
              />
              <button
                type="button"
                className="eye-btn"
                onClick={togglePassword}
                aria-label="Mostrar/ocultar contraseña"
              >
                <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
              </button>
            </div>
          </div>

          {/* Error */}
          {errorMsg && (
            <div className="error-box">
              <i className="bi bi-exclamation-triangle-fill"></i>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Botón */}
          <button type="submit" className="btn-login" disabled={isLoading}>
            <span>{isLoading ? 'Verificando...' : 'INGRESAR'}</span>
            {isLoading && (
              <span className="btn-spinner">
                <i className="bi bi-arrow-repeat spin"></i>
              </span>
            )}
          </button>

        </form>

        <div className="version-text">v2.4.1 — © 2025 Zedan Motor's</div>
      </div>

      {/* ═══════════════════════════════════════ */}
      {/* ═══   PANEL DERECHO — DECORATIVO    ═══ */}
      {/* ═══════════════════════════════════════ */}
      <div className="panel-deco">

        {/* Imagen de fondo */}
        <img src="/assets/icons/fondo derecho.png" alt="" className="deco-bg-img" />

        {/* Overlay degradado azul */}
        <div className="deco-overlay"></div>

        {/* Separador izquierdo */}
        <div className="deco-separator"></div>

        {/* Contenido central */}
        <div className="deco-content">

          {/* Logo insignia grande */}
          <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'center' }}>
            <ZedanLogo variant="hero" width={420} />
          </div>

          <div className="deco-tagline" style={{ fontSize: '15px', color: '#cbd5e1', marginBottom: '28px' }}>
            Taller Automotriz de Alto Rendimiento
          </div>

          {/* Features */}
          <div className="features-list">
            <div className="feature-item">
              <div className="feature-check"><i className="bi bi-check-lg"></i></div>
              <span>Gestión de clientes y vehículos</span>
            </div>
            <div className="feature-item">
              <div className="feature-check"><i className="bi bi-check-lg"></i></div>
              <span>Control de órdenes y citas</span>
            </div>
            <div className="feature-item">
              <div className="feature-check"><i className="bi bi-check-lg"></i></div>
              <span>Inventario y facturación integrada</span>
            </div>
            <div className="feature-item">
              <div className="feature-check"><i className="bi bi-check-lg"></i></div>
              <span>Historial completo por vehículo</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

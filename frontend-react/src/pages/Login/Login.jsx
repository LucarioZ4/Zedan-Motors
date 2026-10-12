import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!usuario.trim() || !password) {
      setErrorMsg('Por favor, ingresa tu usuario y contraseña.');
      return;
    }

    setErrorMsg('');
    setIsLoading(true);

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
        setErrorMsg(data.error || 'Credenciales incorrectas');
      }
    } catch (err) {
      console.error('Error login:', err);
      setErrorMsg('No se pudo conectar con el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="panel-login">
        <div className="brand-wrap">
          <div className="logo-img-wrap">
            <img src="/assets/icons/Logo.png" alt="Zedan Motor's" className="brand-logo" />
          </div>
          <div>
            <div className="brand-name">Zedan Motor's</div>
            <div className="brand-sub">Taller Automotriz</div>
          </div>
        </div>

        <h1 className="login-title">Iniciar sesión</h1>
        <p className="login-sub">Ingresa tus credenciales para continuar</p>

        <form onSubmit={handleLogin} autoComplete="off">
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

          <div className="field-group">
            <label className="field-label" htmlFor="password">Contraseña</label>
            <div className="input-wrap">
              <span className="input-icon">
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path d="M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z"/>
                </svg>
              </span>
              <input 
                type={showPassword ? "text" : "password"} 
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
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
              >
                <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="error-box">
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10,0 0,0 2,12A10,10,0 0,0 12,22A10,10,0 0,0 22,12A10,10,0 0,0 12,2Z"/>
              </svg>
              <span>{errorMsg}</span>
            </div>
          )}

          <button type="submit" className="btn-submit" disabled={isLoading}>
            {isLoading ? (
              <span className="spinner-text">
                <span className="spinner"></span> Verificando...
              </span>
            ) : (
              'Ingresar al Sistema'
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>© {new Date().getFullYear()} Zedan Motor's. Todos los derechos reservados.</p>
        </div>
      </div>

      <div className="panel-promo">
        <div className="promo-overlay"></div>
        <div className="promo-content">
          <span className="promo-tag">Software de Gestión Automotriz</span>
          <h2 className="promo-title">Todo el control de tu taller en un solo lugar.</h2>
          <p className="promo-desc">
            Gestiona citas, órdenes de trabajo, inventario y facturación de forma ágil y centralizada.
          </p>
        </div>
      </div>
    </div>
  );
}

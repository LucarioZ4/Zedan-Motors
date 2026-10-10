import { useState } from 'react';
import './App.css';

function App() {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    
    if (!usuario || !password) {
      setErrorMsg('Por favor, ingresa tu usuario y contraseña.');
      return;
    }

    setErrorMsg('');
    setIsLoading(true);
    
    // Simulando una llamada al servidor
    setTimeout(() => {
      setIsLoading(false);
      alert(`Intentando iniciar sesión con: ${usuario}`);
    }, 1000);
  };

  const togglePassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <>
      {/* ═══════════════════════════════════════ */}
      {/* ═══   PANEL IZQUIERDO — FORMULARIO  ═══ */}
      {/* ═══════════════════════════════════════ */}
      <div className="panel-login">

          {/* Logo + Marca */}
          <div className="brand-wrap">
              <div className="logo-img-wrap">
                  <img src="/assets/icons/Logo.png" alt="Zedan Motor's" className="brand-logo" />
              </div>
              <div>
                  <div className="brand-name">Zedan Motor's</div>
                  <div className="brand-sub">Taller Automotriz</div>
              </div>
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
                        onChange={(e) => setUsuario(e.target.value)}
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
                        type={showPassword ? "text" : "password"} 
                        id="password" 
                        className="field-input"
                        placeholder="Contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button type="button" className="eye-btn" onClick={togglePassword}>
                          <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                      </button>
                  </div>
              </div>

              {/* Error */}
              {errorMsg && (
                <div className="error-box visible">
                    <i className="bi bi-exclamation-triangle-fill"></i>
                    <span>{errorMsg}</span>
                </div>
              )}

              {/* Botón */}
              <button type="submit" className="btn-login" disabled={isLoading}>
                  {!isLoading ? (
                    <span>INGRESAR</span>
                  ) : (
                    <span className="btn-spinner">
                        <i className="bi bi-arrow-repeat spin"></i>
                    </span>
                  )}
              </button>

          </form>

          <div className="version-text">v2.4.1 — © 2026 Zedan Motor's</div>
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

              {/* Logo grande */}
              <div className="deco-logo-wrap">
                  <img src="/assets/icons/Logo.png" alt="Zedan Motor's" className="deco-logo" />
              </div>

              {/* Nombre */}
              <div className="deco-brand">Zedan Motor's</div>
              <div className="deco-divider"></div>
              <div className="deco-tagline">Taller Automotriz de Alto Rendimiento</div>

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
    </>
  );
}

export default App;

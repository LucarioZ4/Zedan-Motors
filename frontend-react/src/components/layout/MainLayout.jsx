import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import './MainLayout.css';

const routeTitles = {
  '/dashboard': 'Dashboard',
  '/clientes': 'Gestión de Clientes',
  '/vehiculos': 'Flota de Vehículos',
  '/empleados': 'Equipo & Empleados',
  '/servicios': 'Catálogo de Servicios',
  '/citas': 'Agenda de Citas',
  '/ordenes': 'Órdenes de Trabajo',
  '/inventario': 'Control de Inventario',
  '/facturacion': 'Facturación & Pagos',
  '/historial': 'Historial del Vehículo',
  '/mensajes': 'Mensajes & Notificaciones'
};

const MOBILE_QUERY = '(max-width: 900px)';

export default function MainLayout() {
  const location = useLocation();

  // En escritorio inicia abierto; en celular inicia oculto
  const [sidebarOpen, setSidebarOpen] = useState(
    () => !window.matchMedia(MOBILE_QUERY).matches
  );

  // Al cambiar el tamaño de pantalla, ajusta el estado por defecto
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = (e) => setSidebarOpen(!e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const currentTitle = routeTitles[location.pathname] || 'Zedan Motor\'s';

  const hoyTexto = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className={`layout-root ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div
        className="sidebar-overlay"
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />
      <div className="layout-main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="btn-menu-toggle"
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label={sidebarOpen ? 'Ocultar menú' : 'Mostrar menú'}
              aria-expanded={sidebarOpen}
            >
              <Menu size={22} />
            </button>
            <div>
              <div className="topbar-title">{currentTitle}</div>
              <div className="topbar-sub">{hoyTexto}</div>
            </div>
          </div>
          <div className="topbar-status">
            <span className="badge-status-active">
              <span className="pulse-dot"></span>
              Sistema activo
            </span>
          </div>
        </header>
        <main className="layout-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
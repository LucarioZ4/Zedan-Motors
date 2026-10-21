import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
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

export default function MainLayout() {
  const location = useLocation();
  const currentTitle = routeTitles[location.pathname] || 'Zedan Motor\'s';

  const hoyTexto = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="layout-root">
      <Sidebar />
      <div className="layout-main">
        <header className="topbar">
          <div>
            <div className="topbar-title">{currentTitle}</div>
            <div className="topbar-sub">{hoyTexto}</div>
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

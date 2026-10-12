import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import './MainLayout.css';

export default function MainLayout() {
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
            <div className="topbar-title">Dashboard</div>
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

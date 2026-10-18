import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import ZedanLogo from '../common/ZedanLogo';
import './Sidebar.css';

const navItems = [
  { section: 'Principal', items: [
    { label: 'Dashboard', path: '/dashboard', icon: 'bi-grid-1x2-fill' }
  ]},
  { section: 'Gestión', items: [
    { label: 'Clientes', path: '/clientes', icon: 'bi-people-fill' },
    { label: 'Vehículos', path: '/vehiculos', icon: 'bi-car-front-fill' },
    { label: 'Empleados', path: '/empleados', icon: 'bi-person-badge-fill' },
    { label: 'Servicios', path: '/servicios', icon: 'bi-tools' }
  ]},
  { section: 'Operaciones', items: [
    { label: 'Citas', path: '/citas', icon: 'bi-calendar-check-fill' },
    { label: 'Órdenes', path: '/ordenes', icon: 'bi-clipboard2-check-fill' },
    { label: 'Inventario', path: '/inventario', icon: 'bi-box-seam-fill' },
    { label: 'Facturación', path: '/facturacion', icon: 'bi-receipt-cutoff' },
    { label: 'Historial', path: '/historial', icon: 'bi-clock-history' }
  ]}
];

export default function Sidebar() {
  const navigate = useNavigate();
  const usuario = sessionStorage.getItem('usuario') || 'Usuario';
  const rol = sessionStorage.getItem('rol') || 'Administrador';
  const inicial = usuario.charAt(0).toUpperCase();

  const handleLogout = () => {
    if (window.confirm('¿Deseas cerrar sesión?')) {
      sessionStorage.clear();
      navigate('/login');
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo" onClick={() => navigate('/dashboard')} title="Ir al Dashboard">
        <ZedanLogo variant="sidebar" />
      </div>

      <nav className="sidebar-nav">
        {navItems.map((group, gIdx) => (
          <div key={gIdx} className="nav-group">
            <div className="nav-section-label">{group.section}</div>
            {group.items.map((item, idx) => (
              <NavLink
                key={idx}
                to={item.path}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <i className={`bi ${item.icon}`}></i>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">{inicial}</div>
          <div className="user-meta">
            <div className="user-name">{usuario}</div>
            <div className="user-role">{rol}</div>
          </div>
        </div>
        <button className="btn-logout" onClick={handleLogout} title="Cerrar sesión">
          <i className="bi bi-box-arrow-right"></i>
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}

import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Car,
  UserCheck,
  Wrench,
  CalendarCheck,
  ClipboardList,
  ClipboardCheck,
  Package,
  Receipt,
  History,
  MessageSquare,
  ShieldCheck,
  LogOut,
  X
} from 'lucide-react';
import ZedanLogo from '../common/ZedanLogo';
import './Sidebar.css';

const navItems = [
  {
    section: 'Principal', items: [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard }
    ]
  },
  {
    section: 'Gestión', items: [
      { label: 'Clientes', path: '/clientes', icon: Users },
      { label: 'Vehículos', path: '/vehiculos', icon: Car },
      { label: 'Diagnósticos', path: '/diagnosticos', icon: ClipboardCheck },
      { label: 'Empleados', path: '/empleados', icon: UserCheck },
      { label: 'Servicios', path: '/servicios', icon: Wrench }
    ]
  },
  {
    section: 'Operaciones', items: [
      { label: 'Citas', path: '/citas', icon: CalendarCheck },
      { label: 'Órdenes', path: '/ordenes', icon: ClipboardList },
      { label: 'Inventario', path: '/inventario', icon: Package },
      { label: 'Facturación', path: '/facturacion', icon: Receipt },
      { label: 'Historial', path: '/historial', icon: History },
      { label: 'Mensajes', path: '/mensajes', icon: MessageSquare },
      { label: 'Bitácora', path: '/bitacora', icon: ShieldCheck }
    ]
  }
];

export default function Sidebar({ isOpen = true, onClose = () => {} }) {
  const navigate = useNavigate();
  const usuario = sessionStorage.getItem('usuario') || 'Usuario';
  const rol = sessionStorage.getItem('rol') || 'Sin rol asignado';
  const inicial = usuario.charAt(0).toUpperCase();

  // En celular, al elegir una opción el menú se esconde solo
  const handleNavClick = () => {
    if (window.matchMedia('(max-width: 900px)').matches) onClose();
  };

  const handleLogout = async () => {
    if (window.confirm('¿Deseas cerrar sesión?')) {
      try {
        const token = sessionStorage.getItem('token');
        if (token) {
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
          const response = await fetch(`${API_URL}/api/auth/logout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
          if (!response.ok) {
            console.warn('No se pudo registrar el cierre de sesión:', response.status);
          }
        }
      } catch (err) {
        console.warn('No se pudo registrar el cierre de sesión:', err);
      }
      sessionStorage.clear();
      navigate('/login');
    }
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <button
        type="button"
        className="sidebar-close"
        onClick={onClose}
        aria-label="Cerrar menú"
      >
        <X size={20} />
      </button>

      <div className="sidebar-logo" onClick={() => navigate('/dashboard')} title="Ir al Dashboard">
        <ZedanLogo variant="sidebar" />
      </div>

      <nav className="sidebar-nav">
        {navItems.map((group, gIdx) => (
          <div key={gIdx} className="nav-group">
            <div className="nav-section-label">{group.section}</div>
            {group.items.map((item, idx) => {
              const IconComponent = item.icon;
              return (
                <NavLink
                  key={idx}
                  to={item.path}
                  onClick={handleNavClick}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <IconComponent size={18} className="nav-icon" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
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
          <LogOut size={16} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
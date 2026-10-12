import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardKPIs, getCitasHoy } from '../../services/dashboardService';
import './Dashboard.css';

export default function Dashboard() {
  const [kpis, setKpis] = useState({
    clientes: 0,
    vehiculos: 0,
    citasHoy: 0,
    ordenes: 0,
    empleados: 0,
    stockBajo: 0,
    facturas: 0
  });
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setError(null);
      const [kpisData, citasData] = await Promise.all([
        getDashboardKPIs(),
        getCitasHoy()
      ]);
      setKpis({
        clientes: kpisData.clientes ?? 0,
        vehiculos: kpisData.vehiculos ?? 0,
        citasHoy: kpisData.citasHoy ?? 0,
        ordenes: kpisData.ordenes ?? 0,
        empleados: kpisData.empleados ?? 0,
        stockBajo: kpisData.stockBajo ?? 0,
        facturas: kpisData.facturas ?? 0
      });
      setCitas(citasData || []);
    } catch (err) {
      console.error('Error al cargar datos del dashboard:', err);
      setError('No se pudo conectar con el servidor o cargar las métricas.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getBadgeEstado = (estado) => {
    const clases = {
      'Pendiente': 'badge-warning',
      'Confirmada': 'badge-primary',
      'En proceso': 'badge-info',
      'Completada': 'badge-success',
      'Cancelada': 'badge-danger'
    };
    const clase = clases[estado] || 'badge-default';
    return <span className={`status-pill ${clase}`}>{estado}</span>;
  };

  return (
    <div className="dashboard-container">
      {/* ── Banner Hero ── */}
      <section className="dashboard-hero">
        <div className="hero-left">
          <div className="hero-badge-wrap">
            <h2 className="hero-greeting">Panel de Control Operativo</h2>
            <span className="hero-pill">
              <span className="pulse-dot"></span> Taller en Operación
            </span>
          </div>
          <p className="hero-subtitle">
            Métricas en tiempo real, gestión de flota vehicular y citas de Zedan Motor's
          </p>
        </div>

        <div className="hero-actions">
          <button 
            className="btn-refresh" 
            onClick={handleRefresh} 
            disabled={refreshing}
            title="Actualizar datos"
          >
            <i className={`bi bi-arrow-clockwise ${refreshing ? 'spinning' : ''}`}></i>
            <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
          </button>
          <Link to="/citas" className="btn-hero-primary">
            <i className="bi bi-calendar-plus"></i>
            <span>Nueva Cita</span>
          </Link>
        </div>
      </section>

      {error && (
        <div className="dashboard-alert-error">
          <i className="bi bi-exclamation-triangle-fill"></i>
          <span>{error}</span>
          <button onClick={fetchData} className="alert-retry-btn">Reintentar</button>
        </div>
      )}

      {/* ── Métricas Principales (Fila 1) ── */}
      <div className="kpi-grid-4">
        <div className="card-kpi kpi-orange">
          <div className="kpi-header">
            <span className="kpi-title">Clientes</span>
            <div className="kpi-icon"><i className="bi bi-people-fill"></i></div>
          </div>
          <div className="kpi-value">{loading ? '...' : kpis.clientes}</div>
          <div className="kpi-footer text-success">
            <i className="bi bi-arrow-up-short"></i> Registrados en total
          </div>
        </div>

        <div className="card-kpi kpi-blue">
          <div className="kpi-header">
            <span className="kpi-title">Vehículos</span>
            <div className="kpi-icon"><i className="bi bi-car-front-fill"></i></div>
          </div>
          <div className="kpi-value">{loading ? '...' : kpis.vehiculos}</div>
          <div className="kpi-footer text-muted">
            <i className="bi bi-check2"></i> Flota registrada
          </div>
        </div>

        <div className="card-kpi kpi-green">
          <div className="kpi-header">
            <span className="kpi-title">Citas hoy</span>
            <div className="kpi-icon"><i className="bi bi-calendar-check-fill"></i></div>
          </div>
          <div className="kpi-value">{loading ? '...' : kpis.citasHoy}</div>
          <div className="kpi-footer text-warning">
            <i className="bi bi-clock"></i> Programadas hoy
          </div>
        </div>

        <div className="card-kpi kpi-amber">
          <div className="kpi-header">
            <span className="kpi-title">Órdenes activas</span>
            <div className="kpi-icon"><i className="bi bi-clipboard2-check-fill"></i></div>
          </div>
          <div className="kpi-value">{loading ? '...' : kpis.ordenes}</div>
          <div className="kpi-footer text-warning">
            <i className="bi bi-gear-wide-connected"></i> En proceso
          </div>
        </div>
      </div>

      {/* ── Métricas Secundarias (Fila 2) ── */}
      <div className="kpi-grid-3">
        <div className="card-kpi kpi-purple">
          <div className="kpi-header">
            <span className="kpi-title">Empleados</span>
            <div className="kpi-icon"><i className="bi bi-person-badge-fill"></i></div>
          </div>
          <div className="kpi-value">{loading ? '...' : kpis.empleados}</div>
          <div className="kpi-footer text-muted">
            <i className="bi bi-shield-check"></i> Equipo técnico activo
          </div>
        </div>

        <div className="card-kpi kpi-red">
          <div className="kpi-header">
            <span className="kpi-title">Stock bajo</span>
            <div className="kpi-icon"><i className="bi bi-exclamation-triangle-fill"></i></div>
          </div>
          <div className="kpi-value">{loading ? '...' : kpis.stockBajo}</div>
          <div className="kpi-footer text-danger">
            <i className="bi bi-box-seam"></i> Repuestos críticos
          </div>
        </div>

        <div className="card-kpi kpi-emerald">
          <div className="kpi-header">
            <span className="kpi-title">Facturas este mes</span>
            <div className="kpi-icon"><i className="bi bi-receipt-cutoff"></i></div>
          </div>
          <div className="kpi-value">{loading ? '...' : kpis.facturas}</div>
          <div className="kpi-footer text-success">
            <i className="bi bi-arrow-up-short"></i> Emitidas este mes
          </div>
        </div>
      </div>

      {/* ── Atajos y Citas de Hoy ── */}
      <div className="dashboard-content-split">
        {/* Accesos Rápidos */}
        <div className="panel-card quick-access-panel">
          <div className="panel-header">
            <div className="panel-title">
              <i className="bi bi-lightning-charge-fill text-primary"></i>
              <h3>Acceso rápido</h3>
            </div>
            <span className="panel-tag">Atajos directos</span>
          </div>

          <div className="quick-grid">
            <Link to="/clientes" className="quick-item">
              <div className="quick-icon-box orange">
                <i className="bi bi-people-fill"></i>
              </div>
              <div className="quick-texts">
                <span className="quick-name">Clientes</span>
                <span className="quick-hint">Administrar <i className="bi bi-chevron-right"></i></span>
              </div>
            </Link>

            <Link to="/citas" className="quick-item">
              <div className="quick-icon-box green">
                <i className="bi bi-calendar-check-fill"></i>
              </div>
              <div className="quick-texts">
                <span className="quick-name">Citas</span>
                <span className="quick-hint">Gestionar <i className="bi bi-chevron-right"></i></span>
              </div>
            </Link>

            <Link to="/ordenes" className="quick-item">
              <div className="quick-icon-box amber">
                <i className="bi bi-clipboard2-check-fill"></i>
              </div>
              <div className="quick-texts">
                <span className="quick-name">Órdenes</span>
                <span className="quick-hint">Seguimiento <i className="bi bi-chevron-right"></i></span>
              </div>
            </Link>

            <Link to="/inventario" className="quick-item">
              <div className="quick-icon-box blue">
                <i className="bi bi-box-seam-fill"></i>
              </div>
              <div className="quick-texts">
                <span className="quick-name">Inventario</span>
                <span className="quick-hint">Control de stock <i className="bi bi-chevron-right"></i></span>
              </div>
            </Link>
          </div>
        </div>

        {/* Tabla Citas de Hoy */}
        <div className="panel-card appointments-panel">
          <div className="panel-header">
            <div className="panel-title">
              <i className="bi bi-calendar-event-fill text-primary"></i>
              <h3>Citas de hoy</h3>
              <span className="badge-citas-counter">
                {citas.length > 0 ? `${citas.length} programadas` : 'Al día'}
              </span>
            </div>
            <Link to="/citas" className="link-see-all">
              Ver todas <i className="bi bi-arrow-right"></i>
            </Link>
          </div>

          <div className="table-responsive">
            <table className="table-citas">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Cliente</th>
                  <th>Vehículo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="4" className="empty-table-cell">
                      <div className="empty-box">
                        <i className="bi bi-arrow-clockwise spinning"></i>
                        <p>Cargando citas de hoy...</p>
                      </div>
                    </td>
                  </tr>
                ) : citas.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="empty-table-cell">
                      <div className="empty-box">
                        <div className="empty-icon-circle">
                          <i className="bi bi-calendar2-check"></i>
                        </div>
                        <h4>Agenda al día</h4>
                        <p>No hay citas pendientes programadas para hoy.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  citas.map((cita, idx) => (
                    <tr key={idx}>
                      <td>
                        <span className="time-pill">
                          <i className="bi bi-clock"></i> {cita.hora || '--:--'}
                        </span>
                      </td>
                      <td className="font-semibold">{cita.cliente}</td>
                      <td>
                        <span className="vehicle-info">
                          <i className="bi bi-car-front"></i> {cita.vehiculo}
                        </span>
                      </td>
                      <td>{getBadgeEstado(cita.estado)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

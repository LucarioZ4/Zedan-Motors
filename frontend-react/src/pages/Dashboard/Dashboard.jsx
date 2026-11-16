import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  RotateCw,
  CalendarPlus,
  AlertTriangle,
  CalendarCheck,
  ClipboardList,
  Receipt,
  Boxes,
  Calendar,
  ArrowRight,
  Clock,
  Car,
  DollarSign,
  TrendingUp,
  Wrench,
  PieChart as PieIcon,
  BarChart3,
  PackageX
} from 'lucide-react';
import {
  getDashboardKPIs,
  getCitasHoy,
  getGraficas
} from '../../services/dashboardService';
import './Dashboard.css';

/* ── Helpers ── */
const fmtCOP = (n) =>
  `$${Number(n || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;

const fmtCompacto = (n) =>
  new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

// '2026-06' -> 'Jun'
const nombreMes = (periodo) => {
  const [anio, mes] = periodo.split('-').map(Number);
  const txt = new Date(anio, mes - 1, 1)
    .toLocaleDateString('es-CO', { month: 'short' })
    .replace('.', '');
  return txt.charAt(0).toUpperCase() + txt.slice(1);
};

const recortar = (txt, max = 28) =>
  txt && txt.length > max ? `${txt.slice(0, max - 1)}…` : txt;

const COLORES_ESTADO = {
  Pendiente: '#f59e0b',
  Confirmada: '#3b82f6',
  'En proceso': '#0ea5e9',
  Completada: '#22c55e',
  Cancelada: '#ef4444'
};

const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
  fontSize: 12.5
};

function EmptyChart({ texto }) {
  return (
    <div className="chart-empty">
      <BarChart3 size={28} />
      <p>{texto}</p>
    </div>
  );
}

function LoadingChart() {
  return (
    <div className="chart-empty">
      <RotateCw size={24} className="spinning" />
    </div>
  );
}

export default function Dashboard() {
  const [kpis, setKpis] = useState({
    citasHoy: 0,
    ordenes: 0,
    stockBajo: 0,
    facturas: 0
  });
  const [graficas, setGraficas] = useState({
    ingresos: [],
    citasPorEstado: [],
    topServicios: [],
    stockCritico: []
  });
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setError(null);
      const [kpisData, citasData, graficasData] = await Promise.all([
        getDashboardKPIs(),
        getCitasHoy(),
        getGraficas()
      ]);
      setKpis({
        citasHoy: kpisData.citasHoy ?? 0,
        ordenes: kpisData.ordenes ?? 0,
        stockBajo: kpisData.stockBajo ?? 0,
        facturas: kpisData.facturas ?? 0
      });
      setCitas(citasData || []);
      setGraficas({
        ingresos: graficasData.ingresos || [],
        citasPorEstado: graficasData.citasPorEstado || [],
        topServicios: graficasData.topServicios || [],
        stockCritico: graficasData.stockCritico || []
      });
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

  /* ── Datos derivados para las gráficas ── */
  const datosIngresos = graficas.ingresos.map((i) => ({
    mes: nombreMes(i.periodo),
    total: i.total
  }));
  const hayIngresos = datosIngresos.some((i) => i.total > 0);
  const ingresosMes = datosIngresos.length
    ? datosIngresos[datosIngresos.length - 1].total
    : 0;

  const totalCitas = graficas.citasPorEstado.reduce((acc, e) => acc + e.total, 0);
  const datosEstados = graficas.citasPorEstado.filter((e) => e.total > 0);

  const datosServicios = graficas.topServicios.map((s) => ({
    nombre: recortar(s.nombre),
    total: s.total
  }));

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
            <RotateCw size={15} className={refreshing ? 'spinning' : ''} />
            <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
          </button>
          <Link to="/citas" className="btn-hero-primary">
            <CalendarPlus size={16} />
            <span>Nueva Cita</span>
          </Link>
        </div>
      </section>

      {error && (
        <div className="dashboard-alert-error">
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button onClick={fetchData} className="alert-retry-btn">Reintentar</button>
        </div>
      )}

      {/* ── KPIs ── */}
      <div className="kpi-grid-4">
        <div className="card-kpi kpi-emerald">
          <div className="kpi-header">
            <span className="kpi-title">Ingresos del mes</span>
            <div className="kpi-icon"><DollarSign size={20} /></div>
          </div>
          <div className="kpi-value kpi-value-money">
            {loading ? '...' : fmtCOP(ingresosMes)}
          </div>
          <div className="kpi-footer text-success">
            <Receipt size={14} /> {kpis.facturas} facturas emitidas
          </div>
        </div>

        <div className="card-kpi kpi-green">
          <div className="kpi-header">
            <span className="kpi-title">Citas hoy</span>
            <div className="kpi-icon"><CalendarCheck size={20} /></div>
          </div>
          <div className="kpi-value">{loading ? '...' : kpis.citasHoy}</div>
          <div className="kpi-footer text-warning">
            <Clock size={14} /> Programadas hoy
          </div>
        </div>

        <div className="card-kpi kpi-amber">
          <div className="kpi-header">
            <span className="kpi-title">Órdenes activas</span>
            <div className="kpi-icon"><ClipboardList size={20} /></div>
          </div>
          <div className="kpi-value">{loading ? '...' : kpis.ordenes}</div>
          <div className="kpi-footer text-warning">
            <Wrench size={14} /> En proceso
          </div>
        </div>

        <div className="card-kpi kpi-red">
          <div className="kpi-header">
            <span className="kpi-title">Stock bajo</span>
            <div className="kpi-icon"><AlertTriangle size={20} /></div>
          </div>
          <div className="kpi-value">{loading ? '...' : kpis.stockBajo}</div>
          <div className="kpi-footer text-danger">
            <Boxes size={14} /> Repuestos críticos
          </div>
        </div>
      </div>

      {/* ── Fila 1: Ingresos + Citas por estado ── */}
      <div className="charts-row charts-row-main">
        <div className="panel-card">
          <div className="panel-header">
            <div className="panel-title">
              <TrendingUp size={18} className="text-primary" />
              <h3>Ingresos de los últimos 6 meses</h3>
            </div>
            <span className="panel-tag">COP</span>
          </div>

          <div className="chart-box">
            {loading ? (
              <LoadingChart />
            ) : !hayIngresos ? (
              <EmptyChart texto="Aún no hay facturas registradas" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={datosIngresos} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="mes"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <YAxis
                    width={48}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickFormatter={fmtCompacto}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v) => [fmtCOP(v), 'Ingresos']}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#1e3a8a"
                    strokeWidth={2.5}
                    fill="url(#gradIngresos)"
                    dot={{ r: 3.5, fill: '#1e3a8a', strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="panel-card">
          <div className="panel-header">
            <div className="panel-title">
              <PieIcon size={18} className="text-primary" />
              <h3>Citas por estado</h3>
            </div>
            <span className="panel-tag">{totalCitas} en total</span>
          </div>

          {loading ? (
            <div className="chart-box"><LoadingChart /></div>
          ) : totalCitas === 0 ? (
            <div className="chart-box"><EmptyChart texto="Aún no hay citas registradas" /></div>
          ) : (
            <>
              <div className="chart-box chart-box-donut">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={datosEstados}
                      dataKey="total"
                      nameKey="estado"
                      innerRadius="62%"
                      outerRadius="90%"
                      paddingAngle={3}
                      stroke="none"
                    >
                      {datosEstados.map((e) => (
                        <Cell key={e.estado} fill={COLORES_ESTADO[e.estado] || '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="donut-center">
                  <strong>{totalCitas}</strong>
                  <span>citas</span>
                </div>
              </div>

              <ul className="donut-legend">
                {graficas.citasPorEstado.map((e) => (
                  <li key={e.estado}>
                    <span
                      className="legend-dot"
                      style={{ background: COLORES_ESTADO[e.estado] || '#94a3b8' }}
                    />
                    <span className="legend-name">{e.estado}</span>
                    <span className="legend-value">{e.total}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {/* ── Fila 2: Top servicios + Stock crítico ── */}
      <div className="charts-row charts-row-secondary">
        <div className="panel-card">
          <div className="panel-header">
            <div className="panel-title">
              <Wrench size={18} className="text-primary" />
              <h3>Servicios más solicitados</h3>
            </div>
            <span className="panel-tag">Top 5</span>
          </div>

          <div className="chart-box">
            {loading ? (
              <LoadingChart />
            ) : datosServicios.length === 0 ? (
              <EmptyChart texto="Aún no hay servicios en órdenes de trabajo" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={datosServicios}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="nombre"
                    width={140}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#334155', fontSize: 12 }}
                  />
                  <Tooltip
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={tooltipStyle}
                    formatter={(v) => [v, 'Veces solicitado']}
                  />
                  <Bar dataKey="total" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="panel-card">
          <div className="panel-header">
            <div className="panel-title">
              <Boxes size={18} className="text-primary" />
              <h3>Stock crítico</h3>
            </div>
            <Link to="/inventario" className="link-see-all">
              Ver inventario <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div className="chart-box"><LoadingChart /></div>
          ) : graficas.stockCritico.length === 0 ? (
            <div className="chart-box">
              <div className="chart-empty">
                <PackageX size={28} />
                <p>Todo el inventario está por encima del mínimo</p>
              </div>
            </div>
          ) : (
            <ul className="dash-stock-list">
              {graficas.stockCritico.map((r, idx) => {
                const pct = Math.min((r.stock / 5) * 100, 100);
                const agotado = r.stock === 0;
                return (
                  <li key={idx} className="dash-stock-item">
                    <div className="dash-stock-top">
                      <div className="dash-stock-name">
                        {r.nombre}
                        {r.marca && <span className="dash-stock-brand">{r.marca}</span>}
                      </div>
                      <span className={`dash-stock-count ${agotado ? 'agotado' : ''}`}>
                        {agotado ? 'Agotado' : `${r.stock} ${r.stock === 1 ? 'unidad' : 'unidades'}`}
                      </span>
                    </div>
                    <div className="dash-stock-bar">
                      <div
                        className={`dash-stock-bar-fill ${r.stock <= 2 ? 'danger' : 'warn'}`}
                        style={{ width: `${Math.max(pct, 4)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ── Citas de hoy ── */}
      <div className="panel-card appointments-panel">
        <div className="panel-header">
          <div className="panel-title">
            <Calendar size={18} className="text-primary" />
            <h3>Citas de hoy</h3>
            <span className="badge-citas-counter">
              {citas.length > 0 ? `${citas.length} programadas` : 'Al día'}
            </span>
          </div>
          <Link to="/citas" className="link-see-all">
            Ver todas <ArrowRight size={14} />
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
                      <RotateCw size={24} className="spinning" />
                      <p>Cargando citas de hoy...</p>
                    </div>
                  </td>
                </tr>
              ) : citas.length === 0 ? (
                <tr>
                  <td colSpan="4" className="empty-table-cell">
                    <div className="empty-box">
                      <div className="empty-icon-circle">
                        <CalendarCheck size={24} />
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
                        <Clock size={12} /> {cita.hora || '--:--'}
                      </span>
                    </td>
                    <td className="font-semibold">{cita.cliente}</td>
                    <td>
                      <span className="vehicle-info">
                        <Car size={13} /> {cita.vehiculo}
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
  );
}
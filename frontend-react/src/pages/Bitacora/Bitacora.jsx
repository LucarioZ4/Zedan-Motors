import { useState, useEffect } from 'react';
import {
  History,
  Activity,
  RefreshCw
} from 'lucide-react';
import { bitacoraService } from '../../services/bitacoraService';
import './Bitacora.css';

export default function Bitacora() {
  const [tab, setTab] = useState('activa'); // 'activa' o 'todas'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sesión activa del usuario actual
  const [sesionActiva, setSesionActiva] = useState(null);
  const [eventosActiva, setEventosActiva] = useState([]);

  // Historial de todas las sesiones (vista administrativa)
  const [sesiones, setSesiones] = useState([]);
  const [sesionSeleccionada, setSesionSeleccionada] = useState(null);
  const [eventosSeleccionada, setEventosSeleccionada] = useState([]);
  const [cargandoTimeline, setCargandoTimeline] = useState(false);

  const cargarSesionActiva = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await bitacoraService.getSesionActiva();
      setSesionActiva(data.sesion);
      setEventosActiva(data.eventos || []);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error al cargar bitácora activa');
    } finally {
      setLoading(false);
    }
  };

  const cargarTodasSesiones = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await bitacoraService.getSesiones({ limit: 40 });
      setSesiones(data || []);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error al consultar sesiones');
    } finally {
      setLoading(false);
    }
  };

  const seleccionarSesion = async (idSesion) => {
    try {
      setCargandoTimeline(true);
      const data = await bitacoraService.getTimelineSesion(idSesion);
      setSesionSeleccionada(data.sesion);
      setEventosSeleccionada(data.eventos || []);
    } catch (err) {
      alert('Error cargando el detalle de la sesión: ' + err.message);
    } finally {
      setCargandoTimeline(false);
    }
  };

  const cambiarTab = (nuevaTab) => {
    if (nuevaTab === tab) return;
    setLoading(true);
    setError(null);
    setTab(nuevaTab);
  };

  useEffect(() => {
    let activa = true;

    const cargar = async () => {
      try {
        const data = tab === 'activa'
          ? await bitacoraService.getSesionActiva()
          : await bitacoraService.getSesiones({ limit: 40 });

        if (!activa) return;
        setError(null);
        if (tab === 'activa') {
          setSesionActiva(data.sesion);
          setEventosActiva(data.eventos || []);
        } else {
          setSesiones(data || []);
        }
      } catch (err) {
        if (!activa) return;
        console.error(err);
        setError(err.message || (tab === 'activa'
          ? 'Error al cargar bitácora activa'
          : 'Error al consultar sesiones'));
      } finally {
        if (activa) setLoading(false);
      }
    };

    cargar();
    return () => {
      activa = false;
    };
  }, [tab]);

  const renderTimeline = (eventos) => {
    if (!eventos || eventos.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
          <Activity size={32} style={{ marginBottom: '8px', opacity: 0.6 }} />
          <p>No se han registrado eventos o cambios en esta sesión todavía.</p>
        </div>
      );
    }

    return (
      <div className="timeline-list">
        {eventos.map((ev) => (
          <div key={ev.id_evento} className="timeline-item">
            <div className="timeline-node" />
            <div className="timeline-header">
              <span className="badge-tag badge-modulo">{ev.modulo}</span>
              <span className="badge-tag badge-accion">{ev.accion}</span>
              <span style={{ fontWeight: 600, color: '#334155', fontSize: '0.85rem' }}>
                {ev.entidad} {ev.id_registro ? `#${ev.id_registro}` : ''}
              </span>
              <span className="timeline-timestamp">
                {new Date(ev.creado_en).toLocaleTimeString()} ({new Date(ev.creado_en).toLocaleDateString()})
              </span>
            </div>

            <div className="timeline-desc">{ev.descripcion}</div>

            {/* Diffs Antes vs Después */}
            {(ev.datos_antes || ev.datos_despues) && (
              <div className="diff-box">
                <div className="diff-title">
                  🔍 Comparativa de Cambios {ev.campos_modificados?.length ? `(${ev.campos_modificados.join(', ')})` : ''}
                </div>
                <div className="diff-grid">
                  <div className="diff-pane antes">
                    <div className="diff-pane-label">Antes del Cambio</div>
                    <pre className="diff-json">
                      {ev.datos_antes ? JSON.stringify(ev.datos_antes, null, 2) : '(No existía / Creación)'}
                    </pre>
                  </div>
                  <div className="diff-pane despues">
                    <div className="diff-pane-label">Después del Cambio</div>
                    <pre className="diff-json">
                      {ev.datos_despues ? JSON.stringify(ev.datos_despues, null, 2) : '(Registro eliminado)'}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bitacora-container">
      <div className="bitacora-header">
        <h1 className="bitacora-title">
          <History size={28} color="#2563eb" />
          Bitácora y Auditoría por Sesión
        </h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="bitacora-tabs">
            <button
              className={`bitacora-tab ${tab === 'activa' ? 'active' : ''}`}
              onClick={() => cambiarTab('activa')}
            >
              Mi Sesión Actual
            </button>
            <button
              className={`bitacora-tab ${tab === 'todas' ? 'active' : ''}`}
              onClick={() => cambiarTab('todas')}
            >
              Histórico de Sesiones
            </button>
          </div>
          <button
            onClick={() => tab === 'activa' ? cargarSesionActiva() : cargarTodasSesiones()}
            style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '8px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Refrescar"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '14px', borderRadius: '8px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          Cargando eventos de bitácora...
        </div>
      ) : tab === 'activa' ? (
        <div className="bitacora-card">
          {sesionActiva && (
            <div className="sesion-banner">
              <div className="sesion-stat-item">
                <span className="sesion-stat-label">Usuario</span>
                <span className="sesion-stat-value">{sesionActiva.nombre_usuario} ({sesionActiva.rol || 'Rol'})</span>
              </div>
              <div className="sesion-stat-item">
                <span className="sesion-stat-label">Estado</span>
                <span className="sesion-stat-value">
                  <span className={`badge-estado ${sesionActiva.estado}`}>{sesionActiva.estado}</span>
                </span>
              </div>
              <div className="sesion-stat-item">
                <span className="sesion-stat-label">Inicio de Sesión</span>
                <span className="sesion-stat-value">{new Date(sesionActiva.inicio_en).toLocaleTimeString()}</span>
              </div>
              <div className="sesion-stat-item">
                <span className="sesion-stat-label">Total Acciones</span>
                <span className="sesion-stat-value">{eventosActiva.length} registradas</span>
              </div>
            </div>
          )}

          <h3 style={{ marginBottom: '18px', color: '#1e293b', fontSize: '1.1rem' }}>
            Línea de Tiempo de Cambios Realizados
          </h3>
          {renderTimeline(eventosActiva)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: sesionSeleccionada ? '1fr 1fr' : '1fr', gap: '20px' }}>
          <div className="bitacora-card">
            <h3 style={{ marginBottom: '14px', color: '#1e293b' }}>Sesiones de Usuarios Registradas</h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="table-sesiones">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Estado</th>
                    <th>Inicio</th>
                    <th>Acciones</th>
                    <th>Opciones</th>
                  </tr>
                </thead>
                <tbody>
                  {sesiones.map((s) => (
                    <tr key={s.id_sesion}>
                      <td>
                        <strong>{s.nombre_usuario}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.empleado_nombre || s.nombre_completo}</div>
                      </td>
                      <td>
                        <span className={`badge-estado ${s.estado}`}>{s.estado}</span>
                      </td>
                      <td>{new Date(s.inicio_en).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                      <td>
                        <span style={{ fontWeight: 700, color: '#2563eb' }}>{s.total_acciones}</span>
                      </td>
                      <td>
                        <button
                          className="btn-inspeccionar"
                          onClick={() => seleccionarSesion(s.id_sesion)}
                        >
                          Ver timeline
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {sesionSeleccionada && (
            <div className="bitacora-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, color: '#1e293b' }}>
                  Detalle: {sesionSeleccionada.nombre_usuario}
                </h3>
                <button
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
                  onClick={() => setSesionSeleccionada(null)}
                >
                  ✕ Cerrar
                </button>
              </div>

              {cargandoTimeline ? (
                <p>Cargando detalle...</p>
              ) : (
                renderTimeline(eventosSeleccionada)
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

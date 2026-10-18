import React, { useEffect, useState } from 'react';
import { getHistorialVehiculo } from '../../services/historialService';
import { getClientes } from '../../services/clientesService';
import { getVehiculosPorCliente } from '../../services/citasService';
import './Historial.css';

export default function Historial() {
  const [clientes, setClientes] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [selectedCliente, setSelectedCliente] = useState('');
  const [selectedVehiculo, setSelectedVehiculo] = useState('');
  const [vehiculoActual, setVehiculoActual] = useState(null);

  const [todosEventos, setTodosEventos] = useState([]);
  const [eventosFiltrados, setEventosFiltrados] = useState([]);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [loading, setLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  };

  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const data = await getClientes();
        setClientes(data || []);
      } catch (err) {
        console.error('Error cargando clientes:', err);
        showToast('Error al cargar clientes', 'error');
      }
    };
    fetchClientes();
  }, []);

  const handleClienteChange = async (idCliente) => {
    setSelectedCliente(idCliente);
    setSelectedVehiculo('');
    setVehiculoActual(null);
    setTodosEventos([]);
    setEventosFiltrados([]);
    setVehiculos([]);

    if (!idCliente) return;

    try {
      const data = await getVehiculosPorCliente(idCliente);
      setVehiculos(data || []);
    } catch (err) {
      console.error('Error cargando vehículos:', err);
      showToast('Error cargando vehículos', 'error');
    }
  };

  const handleVehiculoChange = async (idVeh) => {
    setSelectedVehiculo(idVeh);
    if (!idVeh) {
      setVehiculoActual(null);
      setTodosEventos([]);
      setEventosFiltrados([]);
      return;
    }

    const vObj = vehiculos.find((v) => String(v.id_vehiculo) === String(idVeh));
    if (vObj) {
      setVehiculoActual({
        id: vObj.id_vehiculo,
        nombre: `${vObj.marca} ${vObj.modelo}`,
        placa: vObj.placa
      });
    }

    try {
      setLoading(true);
      const data = await getHistorialVehiculo(idVeh);
      setTodosEventos(data || []);
      aplicarFiltro(data || [], filtroTipo);
    } catch (err) {
      console.error('Error al cargar historial:', err);
      showToast(err.message || 'Error al cargar historial', 'error');
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltro = (lista, tipo) => {
    const filtrados = tipo
      ? lista.filter((e) => e.tipo_evento?.toLowerCase().includes(tipo.toLowerCase()))
      : lista;
    setEventosFiltrados(filtrados);
  };

  const handleFiltroChange = (tipo) => {
    setFiltroTipo(tipo);
    aplicarFiltro(todosEventos, tipo);
  };

  // Contadores
  const statServicios = todosEventos.filter((e) => e.tipo_evento === 'Servicio').length;
  const statFacturas = todosEventos.filter((e) => e.tipo_evento === 'Factura').length;
  const statCitas = todosEventos.filter((e) => e.tipo_evento === 'Cita').length;

  return (
    <div className="historial-container">
      {/* Toast Flotante */}
      {toast && (
        <div className={`toast-floating ${toast.type}`}>
          <i
            className={`bi ${toast.type === 'success'
                ? 'bi-check-circle-fill'
                : 'bi-exclamation-triangle-fill'
              }`}
          ></i>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header superior */}
      <div className="historial-header">
        <div className="historial-header-info">
          <h2>Historial del Vehículo</h2>
          <p>Línea de tiempo de mantenimientos, servicios y facturas por vehículo.</p>
        </div>
      </div>

      {/* Selector y controles */}
      <div className="historial-grid">
        {/* Panel lateral: Selección de vehículo y estadísticas */}
        <div className="card-custom selector-panel">
          <div className="selector-titulo">
            <i className="bi bi-car-front-fill text-primary"></i>
            <span>Seleccionar vehículo</span>
          </div>

          <div className="form-group-custom">
            <label className="field-label">Cliente</label>
            <select
              className="field-input"
              value={selectedCliente}
              onChange={(e) => handleClienteChange(e.target.value)}
            >
              <option value="">Seleccionar cliente...</option>
              {clientes.map((c) => (
                <option key={c.id_cliente} value={c.id_cliente}>
                  {c.nombre} {c.apellido}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group-custom">
            <label className="field-label">Vehículo</label>
            <select
              className="field-input"
              value={selectedVehiculo}
              onChange={(e) => handleVehiculoChange(e.target.value)}
              disabled={!selectedCliente}
            >
              <option value="">Seleccionar vehículo...</option>
              {vehiculos.map((v) => (
                <option key={v.id_vehiculo} value={v.id_vehiculo}>
                  {v.placa} — {v.marca} {v.modelo}
                </option>
              ))}
            </select>
          </div>

          {vehiculoActual && (
            <div className="vehiculo-card">
              <div className="vehiculo-card-icon">
                <i className="bi bi-car-front"></i>
              </div>
              <div>
                <div className="vehiculo-card-nombre">{vehiculoActual.nombre}</div>
                <div className="vehiculo-card-placa">{vehiculoActual.placa}</div>
              </div>
            </div>
          )}

          {/* Mini Estadísticas */}
          {vehiculoActual && (
            <div className="mini-stats-grid">
              <div className="mini-stat">
                <div className="mini-stat-val">{todosEventos.length}</div>
                <div className="mini-stat-label">Total eventos</div>
              </div>
              <div className="mini-stat">
                <div className="mini-stat-val">{statServicios}</div>
                <div className="mini-stat-label">Servicios</div>
              </div>
              <div className="mini-stat">
                <div className="mini-stat-val">{statFacturas}</div>
                <div className="mini-stat-label">Facturas</div>
              </div>
              <div className="mini-stat">
                <div className="mini-stat-val">{statCitas}</div>
                <div className="mini-stat-label">Citas</div>
              </div>
            </div>
          )}
        </div>

        {/* Panel principal: Línea de tiempo */}
        <div className="card-custom timeline-panel">
          <div className="timeline-header-row">
            <div>
              <h3 className="timeline-main-title">
                {vehiculoActual
                  ? `${vehiculoActual.nombre} — ${vehiculoActual.placa}`
                  : 'Línea de tiempo'}
              </h3>
              <p className="timeline-sub-title">
                Registro histórico cronológico de intervenciones
              </p>
            </div>
            {vehiculoActual && (
              <select
                className="filtro-select-sm"
                value={filtroTipo}
                onChange={(e) => handleFiltroChange(e.target.value)}
              >
                <option value="">Todos los eventos</option>
                <option value="servicio">Servicios</option>
                <option value="factura">Facturas</option>
                <option value="cita">Citas</option>
              </select>
            )}
          </div>

          {loading ? (
            <div className="timeline-vacio">
              <i className="bi bi-arrow-clockwise spinning loading-icon"></i>
              <p>Cargando historial del vehículo...</p>
            </div>
          ) : !vehiculoActual ? (
            <div className="timeline-vacio">
              <i className="bi bi-car-front empty-icon"></i>
              <p>Selecciona un cliente y un vehículo para ver su historial completo</p>
            </div>
          ) : eventosFiltrados.length === 0 ? (
            <div className="timeline-vacio">
              <i className="bi bi-inbox empty-icon"></i>
              <p>Sin eventos registrados para este vehículo</p>
            </div>
          ) : (
            <div className="timeline-body">
              {(() => {
                let mesActual = '';
                return eventosFiltrados.map((ev, idx) => {
                  const fecha = new Date(ev.fecha);
                  const mes = fecha
                    .toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
                    .toUpperCase();
                  const showMes = mes !== mesActual;
                  if (showMes) mesActual = mes;

                  const color = ev.color || '#3b82f6';
                  const icono = ev.icono || 'bi-wrench';
                  const esUltimo = idx === eventosFiltrados.length - 1;

                  return (
                    <React.Fragment key={idx}>
                      {showMes && (
                        <div className="timeline-mes">
                          <span className="timeline-mes-label">{mes}</span>
                          <div className="timeline-mes-line"></div>
                        </div>
                      )}
                      <div className="timeline-evento">
                        <div className="timeline-evento-left">
                          <div
                            className="timeline-icono"
                            style={{
                              background: `${color}18`,
                              color: color,
                              borderColor: `${color}40`
                            }}
                          >
                            <i className={`bi ${icono}`}></i>
                          </div>
                          {!esUltimo && <div className="timeline-linea"></div>}
                        </div>
                        <div className="timeline-card">
                          <div className="timeline-card-header">
                            <span
                              className="timeline-badge"
                              style={{
                                background: `${color}18`,
                                color: color,
                                border: `1px solid ${color}30`
                              }}
                            >
                              {(ev.tipo_evento || 'EVENTO').toUpperCase()}
                            </span>
                            <span className="timeline-fecha">
                              {fecha.toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}{' '}
                              {fecha.toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <div className="timeline-desc">{ev.descripcion}</div>
                          {ev.empleado && (
                            <div className="timeline-empleado">
                              <i className="bi bi-person"></i>
                              <span>Atendido por: {ev.empleado}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                });
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

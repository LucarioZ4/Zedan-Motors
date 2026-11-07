import React, { useEffect, useState, useRef, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import {
  Calendar,
  CalendarDays,
  CalendarPlus,
  CalendarCheck,
  Clock,
  History,
  Plus,
  PlusCircle,
  Search,
  Table2,
  Users,
  User,
  Car,
  Wrench,
  Pencil,
  Trash2,
  Info,
  X,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Check
} from 'lucide-react';
import {
  getCitas,
  getCitaById,
  createCita,
  updateCita,
  deleteCita,
  getVehiculosPorCliente
} from '../../services/citasService';
import { getClientes } from '../../services/clientesService';
import './Citas.css';

const ESTADOS = [
  { id: '1', nombre: 'Pendiente' },
  { id: '2', nombre: 'Confirmada' },
  { id: '3', nombre: 'En proceso' },
  { id: '4', nombre: 'Completada' },
  { id: '5', nombre: 'Cancelada' }
];

const emptyForm = {
  id_cita: null,
  fecha: '',
  hora: '',
  motivo: '',
  id_vehiculo: '',
  id_cliente: '',
  id_estado: '1'
};

// Formatea fecha a YYYY-MM-DD local
const normalizarFecha = (fecha) => {
  if (!fecha) return '';
  if (typeof fecha === 'string') {
    return fecha.includes('T') ? fecha.split('T')[0] : fecha.slice(0, 10);
  }
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getHoyFecha = () => {
  const hoy = new Date();
  const y = hoy.getFullYear();
  const m = String(hoy.getMonth() + 1).padStart(2, '0');
  const d = String(hoy.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatearFechaLarga = (fechaStr) => {
  if (!fechaStr) return '';
  const partes = fechaStr.split('-');
  if (partes.length !== 3) return fechaStr;
  const [y, m, d] = partes.map(Number);
  const date = new Date(y, m - 1, d);
  const opciones = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  const str = date.toLocaleDateString('es-ES', opciones);
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export default function Citas() {
  const [citas, setCitas] = useState([]);
  const [todasCitas, setTodasCitas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  // Vista activa: 'calendario' (estilo dividido de la foto) o 'tabla' (tabla general completa)
  const [vistaModo, setVistaModo] = useState('calendario');

  // Fecha seleccionada en el calendario (por defecto hoy)
  const [fechaSeleccionada, setFechaSeleccionada] = useState(getHoyFecha());

  // Estados Modal Formulario
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [citaActual, setCitaActual] = useState(emptyForm);
  const [modalError, setModalError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Estados Modal Eliminar
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [citaToDelete, setCitaToDelete] = useState(null);

  // Toast y Referencias
  const [toast, setToast] = useState(null);
  const timerBuscar = useRef(null);
  const calendarRef = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  };

  const fetchData = async (buscar = '') => {
    try {
      setLoading(true);
      const [citasData, clientesData] = await Promise.all([
        getCitas(buscar),
        getClientes()
      ]);
      setTodasCitas(citasData || []);
      setClientes(clientesData || []);
    } catch (err) {
      console.error('Error al cargar datos de citas:', err);
      showToast(err.message || 'Error al cargar citas', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtrado general de citas
  useEffect(() => {
    const filtradas = filtroEstado
      ? todasCitas.filter((c) => String(c.id_estado) === String(filtroEstado))
      : todasCitas;
    setCitas(filtradas);
  }, [filtroEstado, todasCitas]);

  // Agrupación de citas por fecha para el calendario
  const citasPorFecha = useMemo(() => {
    const map = {};
    todasCitas.forEach((c) => {
      const f = normalizarFecha(c.fecha);
      if (f) {
        if (!map[f]) map[f] = [];
        map[f].push(c);
      }
    });
    return map;
  }, [todasCitas]);

  // Eventos para FullCalendar
  const calendarEvents = useMemo(() => {
    return todasCitas.map((c) => {
      const fecha = normalizarFecha(c.fecha);
      const hora = c.hora || '08:00';
      return {
        id: String(c.id_cita),
        title: `${c.hora || ''} ${c.cliente || 'Cita'}`,
        start: `${fecha}T${hora}:00`,
        allDay: false,
        extendedProps: c
      };
    });
  }, [todasCitas]);

  // Citas del día seleccionado con filtros aplicados (búsqueda y estado)
  const citasDelDia = useMemo(() => {
    let list = citasPorFecha[fechaSeleccionada] || [];

    if (filtroEstado) {
      list = list.filter((c) => String(c.id_estado) === String(filtroEstado));
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter((c) => {
        const clienteNom = (c.cliente || '').toLowerCase();
        const vehiculoTxt = (c.vehiculo || '').toLowerCase();
        const motivoTxt = (c.motivo || '').toLowerCase();
        return clienteNom.includes(q) || vehiculoTxt.includes(q) || motivoTxt.includes(q);
      });
    }

    // Ordenar por hora ascendente
    return [...list].sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
  }, [citasPorFecha, fechaSeleccionada, filtroEstado, searchTerm]);

  // Estadísticas del mes / taller
  const statsResumen = useMemo(() => {
    const hoyStr = getHoyFecha();
    const hoyCitas = citasPorFecha[hoyStr]?.length || 0;
    const diaSeleccionadoCitas = citasPorFecha[fechaSeleccionada]?.length || 0;
    const pendientes = todasCitas.filter((c) => String(c.id_estado) === '1').length;
    return { hoyCitas, diaSeleccionadoCitas, pendientes, total: todasCitas.length };
  }, [citasPorFecha, fechaSeleccionada, todasCitas]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);

    if (vistaModo === 'tabla') {
      if (timerBuscar.current) clearTimeout(timerBuscar.current);
      timerBuscar.current = setTimeout(async () => {
        try {
          const data = await getCitas(val);
          setTodasCitas(data || []);
        } catch (err) {
          console.error('Error filtrando citas:', err);
        }
      }, 400);
    }
  };

  const handleClienteChange = async (idCliente) => {
    setCitaActual((prev) => ({ ...prev, id_cliente: idCliente, id_vehiculo: '' }));
    setVehiculos([]);
    if (!idCliente) return;
    try {
      const data = await getVehiculosPorCliente(idCliente);
      setVehiculos(data || []);
    } catch (err) {
      console.error('Error cargando vehículos:', err);
    }
  };

  // Abrir Modal Crear (pre-seleccionando fecha)
  const handleOpenCreate = (fechaInicial = null) => {
    const fechaParaCita = fechaInicial || fechaSeleccionada || getHoyFecha();
    setCitaActual({
      ...emptyForm,
      fecha: fechaParaCita,
      hora: '08:30'
    });
    setVehiculos([]);
    setModalError('');
    setModalMode('create');
    setIsModalOpen(true);
  };

  // Abrir Modal Editar
  const handleOpenEdit = async (id) => {
    try {
      const data = await getCitaById(id);
      setCitaActual({
        id_cita: data.id_cita,
        fecha: data.fecha ? normalizarFecha(data.fecha) : '',
        hora: data.hora || '',
        motivo: data.motivo || '',
        id_vehiculo: data.id_vehiculo || '',
        id_cliente: data.id_cliente || '',
        id_estado: String(data.id_estado || '1')
      });
      if (data.id_cliente) {
        const vehs = await getVehiculosPorCliente(data.id_cliente);
        setVehiculos(vehs || []);
      }
      setModalError('');
      setModalMode('edit');
      setIsModalOpen(true);
    } catch (err) {
      showToast(err.message || 'Error al cargar cita', 'error');
    }
  };

  // Guardar Cita
  const handleSaveCita = async (e) => {
    e.preventDefault();
    if (!citaActual.fecha || !citaActual.hora || !citaActual.id_vehiculo) {
      setModalError('Fecha, hora y vehículo son obligatorios.');
      return;
    }

    setIsSaving(true);
    setModalError('');

    try {
      const payload = {
        fecha: citaActual.fecha,
        hora: citaActual.hora,
        motivo: (citaActual.motivo || '').trim(),
        id_vehiculo: citaActual.id_vehiculo,
        id_estado: citaActual.id_estado
      };

      if (modalMode === 'edit') {
        await updateCita(citaActual.id_cita, payload);
        showToast('Cita actualizada correctamente', 'success');
      } else {
        await createCita(payload);
        showToast('Cita agendada con éxito', 'success');
      }

      setFechaSeleccionada(citaActual.fecha);
      setIsModalOpen(false);
      await fetchData(searchTerm);
    } catch (err) {
      setModalError(err.message || 'Error al guardar cita');
    } finally {
      setIsSaving(false);
    }
  };

  // Modal Eliminar
  const handleOpenDelete = (cita) => {
    setCitaToDelete(cita);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!citaToDelete) return;
    try {
      await deleteCita(citaToDelete.id_cita);
      setIsDeleteModalOpen(false);
      setCitaToDelete(null);
      showToast('Cita eliminada correctamente', 'success');
      fetchData(searchTerm);
    } catch (err) {
      showToast(err.message || 'Error al eliminar cita', 'error');
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return '';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getBadgeEstado = (estado) => {
    const clases = {
      Pendiente: 'badge-pendiente',
      Confirmada: 'badge-confirmada',
      'En proceso': 'badge-proceso',
      Completada: 'badge-completada',
      Cancelada: 'badge-cancelada'
    };
    return (
      <span className={`badge-custom ${clases[estado] || 'badge-pendiente'}`}>
        {estado}
      </span>
    );
  };

  // Click en día del calendario
  const handleDateClick = (arg) => {
    setFechaSeleccionada(arg.dateStr);
  };

  // Ir a fecha de hoy en el calendario
  const handleIrAHoy = () => {
    const hoy = getHoyFecha();
    setFechaSeleccionada(hoy);
    if (calendarRef.current) {
      const api = calendarRef.current.getApi();
      api.today();
    }
  };

  return (
    <div className="citas-container">
      {/* Toast Flotante */}
      {toast && (
        <div className={`toast-floating ${toast.type}`}>
          {toast.type === 'success' ? (
            <CheckCircle2 size={18} className="toast-icon" />
          ) : (
            <AlertTriangle size={18} className="toast-icon" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header superior principal */}
      <div className="citas-header">
        <div className="citas-header-info">
          <div className="citas-header-title-row">
            <span className="citas-badge-tag">Módulo Operativo</span>
            <h2>Agenda y Calendario de Citas</h2>
          </div>
          <p>Supervisa los clientes y vehículos agendados por día o programa nuevas citas en el taller.</p>
        </div>

        <div className="citas-header-actions">
          {/* Selector de Vista: Calendario Dividido vs Tabla General */}
          <div className="vista-toggle-group">
            <button
              type="button"
              className={`btn-toggle-vista ${vistaModo === 'calendario' ? 'active' : ''}`}
              onClick={() => setVistaModo('calendario')}
              title="Vista calendario interactivo con agenda del día"
            >
              <CalendarDays size={16} />
              <span>Vista Calendario</span>
            </button>
            <button
              type="button"
              className={`btn-toggle-vista ${vistaModo === 'tabla' ? 'active' : ''}`}
              onClick={() => setVistaModo('tabla')}
              title="Vista listado general en tabla"
            >
              <Table2 size={16} />
              <span>Listado General</span>
            </button>
          </div>

          <button className="btn-primary-custom" onClick={() => handleOpenCreate(fechaSeleccionada)}>
            <Plus size={17} />
            <span>Nueva cita</span>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          VISTA 1: CALENDARIO INTERACTIVO DIVIDIDO (ESTILO DE LA FOTO)
         ══════════════════════════════════════════════════════════════ */}
      {vistaModo === 'calendario' && (
        <div className="citas-split-layout">
          {/* PANEL IZQUIERDO: CALENDARIO FULLCALENDAR */}
          <aside className="citas-calendar-sidebar">
            <div className="calendar-card">
              <div className="calendar-card-header">
                <div className="calendar-card-title">
                  <Calendar size={17} />
                  <span>Calendario de Citas</span>
                </div>
                <button
                  type="button"
                  className="btn-hoy-pill"
                  onClick={handleIrAHoy}
                  title="Ir al día actual"
                >
                  <History size={14} /> Hoy
                </button>
              </div>

              {/* Contenedor del componente FullCalendar */}
              <div className="fullcalendar-wrapper">
                <FullCalendar
                  ref={calendarRef}
                  plugins={[dayGridPlugin, interactionPlugin]}
                  initialView="dayGridMonth"
                  initialDate={fechaSeleccionada}
                  locales={[esLocale]}
                  locale="es"
                  contentHeight={340}
                  fixedWeekCount={false}
                  showNonCurrentDates={true}
                  headerToolbar={{
                    left: 'prev',
                    center: 'title',
                    right: 'next'
                  }}
                  buttonText={{
                    today: 'Hoy'
                  }}
                  dateClick={handleDateClick}
                  events={calendarEvents}
                  eventDisplay="none"
                  dayCellClassNames={(arg) => {
                    const dStr = normalizarFecha(arg.date);
                    const classes = [];
                    if (dStr === fechaSeleccionada) classes.push('fc-day-active-selected');
                    if (citasPorFecha[dStr]?.length > 0) classes.push('fc-day-has-citas');
                    return classes;
                  }}
                  dayCellContent={(arg) => {
                    const dStr = normalizarFecha(arg.date);
                    const count = citasPorFecha[dStr]?.length || 0;
                    return (
                      <div className="fc-custom-cell">
                        <span className="fc-custom-day-num">
                          {arg.dayNumberText.replace(/[^0-9]/g, '')}
                        </span>
                        {count > 0 && (
                          <span
                            className="fc-citas-indicator"
                            title={`${count} cita(s) agendada(s)`}
                          >
                            {count}
                          </span>
                        )}
                      </div>
                    );
                  }}
                />
              </div>

              {/* Botón rápido "+ Agregar cita" bajo el calendario (Estilo Foto) */}
              <button
                type="button"
                className="btn-agregar-cita-dia"
                onClick={() => handleOpenCreate(fechaSeleccionada)}
              >
                <PlusCircle size={16} />
                <span>+ Agregar cita ({fechaSeleccionada.split('-')[2] || 'Día'})</span>
              </button>

              {/* Resumen rápido de métricas */}
              <div className="calendar-stats-box">
                <div className="cal-stat-item">
                  <span className="cal-stat-num">{statsResumen.diaSeleccionadoCitas}</span>
                  <span className="cal-stat-label">Citas este día</span>
                </div>
                <div className="cal-stat-divider"></div>
                <div className="cal-stat-item">
                  <span className="cal-stat-num">{statsResumen.hoyCitas}</span>
                  <span className="cal-stat-label">Citas hoy</span>
                </div>
                <div className="cal-stat-divider"></div>
                <div className="cal-stat-item">
                  <span className="cal-stat-num">{statsResumen.pendientes}</span>
                  <span className="cal-stat-label">Pendientes</span>
                </div>
              </div>
            </div>
          </aside>

          {/* PANEL DERECHO: CLIENTES Y CITAS DEL DÍA SELECCIONADO */}
          <main className="citas-day-main">
            {/* Header del Día Seleccionado con Filtros (Estilo Foto) */}
            <div className="day-agenda-header-card">
              <div className="day-agenda-top">
                <div className="day-agenda-date-info">
                  <span className="day-agenda-tag">Agenda Diaria</span>
                  <h3 className="day-agenda-title">
                    {formatearFechaLarga(fechaSeleccionada)}
                  </h3>
                </div>

                <div className="day-agenda-filters">
                  {/* Selector de Estado */}
                  <select
                    className="filtro-select-compact"
                    value={filtroEstado}
                    onChange={(e) => setFiltroEstado(e.target.value)}
                  >
                    <option value="">TODOS LOS ESTADOS</option>
                    {ESTADOS.map((es) => (
                      <option key={es.id} value={es.id}>
                        {es.nombre.toUpperCase()}
                      </option>
                    ))}
                  </select>

                  {/* Buscador de Paciente / Cliente */}
                  <div className="search-bar-compact">
                    <Search size={15} />
                    <input
                      type="text"
                      placeholder="Buscar cliente, vehículo o motivo..."
                      value={searchTerm}
                      onChange={handleSearchChange}
                    />
                  </div>
                </div>
              </div>

              {/* Barra verde / banner contador (Exacto como en la foto) */}
              <div className="day-count-banner">
                <Users size={16} />
                <span>
                  Cantidad de clientes / citas encontrados:{' '}
                  <strong>{citasDelDia.length}</strong>
                </span>
              </div>
            </div>

            {/* Listado / Tabla de Citas del Día */}
            <div className="day-agenda-content-card">
              {loading ? (
                <div className="day-agenda-empty">
                  <div className="spinner-border text-primary" role="status"></div>
                  <p>Cargando citas del taller...</p>
                </div>
              ) : citasDelDia.length === 0 ? (
                <div className="day-agenda-empty">
                  <div className="empty-icon-wrap">
                    <CalendarCheck size={28} />
                  </div>
                  <h4>No hay citas registradas para este día</h4>
                  <p>
                    No se encontraron clientes agendados para el{' '}
                    <strong>{formatearFechaLarga(fechaSeleccionada)}</strong>.
                  </p>
                  <button
                    type="button"
                    className="btn-primary-custom btn-empty-cta"
                    onClick={() => handleOpenCreate(fechaSeleccionada)}
                  >
                    <Plus size={16} />
                    <span>Agendar primera cita para este día</span>
                  </button>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table-agenda-custom">
                    <thead>
                      <tr>
                        <th style={{ width: '110px' }}>TURNO / HORA</th>
                        <th>CLIENTE Y VEHÍCULO</th>
                        <th>MOTIVO DEL SERVICIO</th>
                        <th style={{ width: '130px' }}>ESTADO</th>
                        <th style={{ width: '100px', textAlign: 'center' }}>ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {citasDelDia.map((c, index) => (
                        <tr key={c.id_cita} className="agenda-row">
                          {/* Turno / Hora */}
                          <td>
                            <div className="turno-hora-box">
                              <span className="turno-num">#{index + 1}</span>
                              <div className="turno-hora-text">
                                <Clock size={13} />
                                <span>{c.hora || '--:--'}</span>
                              </div>
                            </div>
                          </td>

                          {/* Cliente y Vehículo */}
                          <td>
                            <div className="agenda-cliente-info">
                              <div className="agenda-cliente-name">
                                <User size={14} />
                                <span>{c.cliente}</span>
                              </div>
                              <div className="agenda-vehiculo-badge">
                                <Car size={13} />
                                <span>{c.vehiculo}</span>
                              </div>
                            </div>
                          </td>

                          {/* Motivo */}
                          <td>
                            <div className="agenda-motivo-text">
                              {c.motivo ? (
                                <>
                                  <Wrench size={13} />
                                  <span>{c.motivo}</span>
                                </>
                              ) : (
                                <span className="td-dash">Consulta / Mantenimiento general</span>
                              )}
                            </div>
                          </td>

                          {/* Estado */}
                          <td>{getBadgeEstado(c.estado)}</td>

                          {/* Acciones */}
                          <td>
                            <div className="d-flex justify-content-center gap-2">
                              <button
                                className="btn-accion editar"
                                title="Editar Cita"
                                onClick={() => handleOpenEdit(c.id_cita)}
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                className="btn-accion eliminar"
                                title="Eliminar Cita"
                                onClick={() => handleOpenDelete(c)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Botón flotante inferior "Agendar" (Como en la foto) */}
              <div className="day-agenda-footer">
                <div className="agenda-footer-tip">
                  <Info size={15} />
                  <span>Haz clic sobre cualquier fecha en el calendario izquierdo para ver o agregar citas en ese día.</span>
                </div>
                <button
                  type="button"
                  className="btn-agendar-cta-green"
                  onClick={() => handleOpenCreate(fechaSeleccionada)}
                >
                  <CalendarPlus size={17} />
                  <span>Agendar Cita</span>
                </button>
              </div>
            </div>
          </main>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          VISTA 2: LISTADO GENERAL EN TABLA COMPLETA
         ══════════════════════════════════════════════════════════════ */}
      {vistaModo === 'tabla' && (
        <div className="citas-tabla-completa-wrap">
          {/* Barra de búsqueda, filtro y contador */}
          <div className="citas-actions-row">
            <div className="search-bar">
              <Search size={16} />
              <input
                type="text"
                placeholder="Buscar por cliente, vehículo o motivo..."
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </div>
            <select
              className="filtro-select"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
            >
              <option value="">Todos los estados</option>
              {ESTADOS.map((es) => (
                <option key={es.id} value={es.id}>
                  {es.nombre}
                </option>
              ))}
            </select>
            <div className="stat-pill">
              <span>{citas.length}</span> citas totales
            </div>
          </div>

          {/* Tabla General de Citas */}
          <div className="card-custom">
            <div className="table-responsive">
              <table className="table-custom">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Hora</th>
                    <th>Cliente</th>
                    <th>Vehículo</th>
                    <th>Motivo</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="table-empty">
                        Cargando citas...
                      </td>
                    </tr>
                  ) : citas.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="table-empty">
                        No se encontraron citas
                      </td>
                    </tr>
                  ) : (
                    citas.map((c) => (
                      <tr key={c.id_cita}>
                        <td>
                          <div className="td-primary">{formatearFecha(c.fecha)}</div>
                        </td>
                        <td>
                          <span className="td-hora">{c.hora}</span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{c.cliente}</div>
                        </td>
                        <td className="td-muted">{c.vehiculo}</td>
                        <td className="td-muted">
                          {c.motivo || <span className="td-dash">—</span>}
                        </td>
                        <td>{getBadgeEstado(c.estado)}</td>
                        <td>
                          <div className="d-flex gap-2">
                            <button
                              className="btn-accion editar"
                              title="Editar"
                              onClick={() => handleOpenEdit(c.id_cita)}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              className="btn-accion eliminar"
                              title="Eliminar"
                              onClick={() => handleOpenDelete(c)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Nuevo / Editar Cita ── */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => !isSaving && setIsModalOpen(false)}>
          <div className="modal-dialog-custom" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom">
              <div className="modal-header-title-box">
                {modalMode === 'edit' ? <Pencil size={18} /> : <CalendarPlus size={18} />}
                <h5 className="modal-title-custom">
                  {modalMode === 'edit' ? 'Editar cita' : 'Agendar nueva cita'}
                </h5>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => !isSaving && setIsModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCita}>
              <div className="modal-body-custom">
                {modalError && (
                  <div className="alert-modal-error">
                    <AlertCircle size={16} />
                    <span>{modalError}</span>
                  </div>
                )}

                <div className="form-grid">
                  <div className="form-group-full">
                    <label className="field-label">Cliente *</label>
                    <select
                      className="field-input"
                      value={citaActual.id_cliente}
                      onChange={(e) => handleClienteChange(e.target.value)}
                      required
                    >
                      <option value="">Seleccionar cliente...</option>
                      {clientes.map((cl) => (
                        <option key={cl.id_cliente} value={cl.id_cliente}>
                          {cl.nombre} {cl.apellido} {cl.telefono ? `(${cl.telefono})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group-full">
                    <label className="field-label">Vehículo del Cliente *</label>
                    <select
                      className="field-input"
                      value={citaActual.id_vehiculo}
                      onChange={(e) =>
                        setCitaActual((prev) => ({ ...prev, id_vehiculo: e.target.value }))
                      }
                      required
                      disabled={!citaActual.id_cliente}
                    >
                      <option value="">
                        {!citaActual.id_cliente
                          ? 'Primero selecciona un cliente'
                          : vehiculos.length === 0
                          ? 'Este cliente no tiene vehículos registrados'
                          : 'Seleccionar vehículo...'}
                      </option>
                      {vehiculos.map((v) => (
                        <option key={v.id_vehiculo} value={v.id_vehiculo}>
                          {v.placa} — {v.marca} {v.modelo} {v.color ? `(${v.color})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="field-label">Fecha de la Cita *</label>
                    <input
                      id="fFecha"
                      type="date"
                      className="field-input"
                      value={citaActual.fecha}
                      onChange={(e) =>
                        setCitaActual((prev) => ({ ...prev, fecha: e.target.value }))
                      }
                      required
                    />
                  </div>

                  <div>
                    <label className="field-label">Hora *</label>
                    <input
                      type="time"
                      className="field-input"
                      value={citaActual.hora}
                      onChange={(e) =>
                        setCitaActual((prev) => ({ ...prev, hora: e.target.value }))
                      }
                      required
                    />
                  </div>

                  <div className="form-group-full">
                    <label className="field-label">Estado</label>
                    <select
                      className="field-input"
                      value={citaActual.id_estado}
                      onChange={(e) =>
                        setCitaActual((prev) => ({ ...prev, id_estado: e.target.value }))
                      }
                    >
                      {ESTADOS.map((es) => (
                        <option key={es.id} value={es.id}>
                          {es.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group-full">
                    <label className="field-label">Motivo o Servicio Requerido</label>
                    <textarea
                      className="field-input"
                      placeholder="Ej: Cambio de aceite y filtros, revisión de frenos, alineación..."
                      rows="3"
                      value={citaActual.motivo}
                      onChange={(e) =>
                        setCitaActual((prev) => ({ ...prev, motivo: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer-custom">
                <button
                  type="button"
                  className="btn-secondary-custom"
                  disabled={isSaving}
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary-custom" disabled={isSaving}>
                  <Check size={17} />
                  <span>{isSaving ? 'Guardando...' : 'Guardar Cita'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Confirmar Eliminar ── */}
      {isDeleteModalOpen && citaToDelete && (
        <div className="modal-overlay" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="modal-dialog-custom modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom">
              <h5 className="modal-title-custom">Confirmar eliminación</h5>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body-custom" style={{ textAlign: 'center', padding: '24px 20px' }}>
              <AlertTriangle
                size={40}
                color="#ef4444"
                style={{
                  marginBottom: '12px',
                  display: 'inline-block'
                }}
              />
              <p style={{ color: '#475569', fontSize: '14px', margin: 0 }}>
                ¿Eliminar la cita de{' '}
                <strong style={{ color: '#1e293b' }}>{citaToDelete.cliente}</strong>?
                <br />
                <span style={{ fontSize: '12.5px', color: '#94a3b8' }}>
                  Vehículo: {citaToDelete.vehiculo}
                </span>
              </p>
            </div>
            <div className="modal-footer-custom">
              <button
                type="button"
                className="btn-secondary-custom"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                Cancelar
              </button>
              <button type="button" className="btn-danger-custom" onClick={handleConfirmDelete}>
                <Trash2 size={16} />
                <span>Eliminar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

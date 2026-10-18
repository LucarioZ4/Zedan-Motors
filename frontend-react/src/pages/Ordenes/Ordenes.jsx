import React, { useEffect, useState, useRef } from 'react';
import {
  getOrdenes,
  getOrdenById,
  createOrden,
  updateOrden,
  deleteOrden,
  getServiciosOrden,
  getRepuestosOrden,
  addServicioOrden,
  removeServicioOrden,
  addRepuestoOrden,
  removeRepuestoOrden
} from '../../services/ordenesService';
import { getCitas } from '../../services/citasService';
import { getEmpleados } from '../../services/empleadosService';
import { getServicios } from '../../services/serviciosService';
import { getInventario } from '../../services/inventarioService';
import './Ordenes.css';

const emptyForm = {
  id_orden: null,
  fecha_inicio: '',
  fecha_fin: '',
  observaciones: '',
  id_cita: '',
  id_empleado: ''
};

export default function Ordenes() {
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Combos
  const [citas, setCitas] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [serviciosCatalogo, setServiciosCatalogo] = useState([]);
  const [repuestosCatalogo, setRepuestosCatalogo] = useState([]);

  // Modal Formulario Principal (Crear/Editar)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [ordenActual, setOrdenActual] = useState(emptyForm);
  const [modalError, setModalError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Detalle de la orden activa (Servicios y Repuestos asignados)
  const [serviciosAsignados, setServiciosAsignados] = useState([]);
  const [repuestosAsignados, setRepuestosAsignados] = useState([]);
  const [selectedServicioId, setSelectedServicioId] = useState('');
  const [selectedRepuestoId, setSelectedRepuestoId] = useState('');
  const [cantidadRepuesto, setCantidadRepuesto] = useState(1);

  // Modal Eliminar
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [ordenToDelete, setOrdenToDelete] = useState(null);

  // Toast
  const [toast, setToast] = useState(null);
  const timerBuscar = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getOrdenes();
      setOrdenes(data || []);
    } catch (err) {
      console.error('Error al cargar órdenes:', err);
      showToast(err.message || 'Error al cargar órdenes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const cargarCombos = async () => {
    try {
      const [citasData, empsData, srvsData, repsData] = await Promise.all([
        getCitas(),
        getEmpleados(),
        getServicios(),
        getInventario()
      ]);
      setCitas(citasData || []);
      setEmpleados(empsData || []);
      setServiciosCatalogo(srvsData || []);
      setRepuestosCatalogo(repsData || []);
    } catch (err) {
      console.error('Error cargando combos:', err);
    }
  };

  useEffect(() => {
    fetchData();
    cargarCombos();
  }, []);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);

    if (timerBuscar.current) clearTimeout(timerBuscar.current);
    timerBuscar.current = setTimeout(async () => {
      try {
        const data = await getOrdenes();
        if (!val.trim()) {
          setOrdenes(data || []);
          return;
        }
        const term = val.toLowerCase();
        const filtradas = (data || []).filter(
          (o) =>
            o.cliente?.toLowerCase().includes(term) ||
            o.vehiculo?.toLowerCase().includes(term) ||
            o.empleado?.toLowerCase().includes(term) ||
            String(o.id_orden).includes(term)
        );
        setOrdenes(filtradas);
      } catch (err) {
        console.error('Error filtrando órdenes:', err);
      }
    }, 350);
  };

  // Cargar Detalle de la Orden
  const cargarDetalleOrden = async (idOrden) => {
    try {
      const [srvs, reps] = await Promise.all([
        getServiciosOrden(idOrden),
        getRepuestosOrden(idOrden)
      ]);
      setServiciosAsignados(srvs || []);
      setRepuestosAsignados(reps || []);
    } catch (err) {
      console.error('Error cargando detalle:', err);
    }
  };

  // Modal Crear
  const handleOpenCreate = () => {
    setOrdenActual(emptyForm);
    setServiciosAsignados([]);
    setRepuestosAsignados([]);
    setSelectedServicioId('');
    setSelectedRepuestoId('');
    setCantidadRepuesto(1);
    setModalError('');
    setModalMode('create');
    setIsModalOpen(true);
  };

  // Modal Editar
  const handleOpenEdit = async (id) => {
    try {
      const data = await getOrdenById(id);
      setOrdenActual({
        id_orden: data.id_orden,
        fecha_inicio: data.fecha_inicio ? data.fecha_inicio.split('T')[0] : '',
        fecha_fin: data.fecha_fin ? data.fecha_fin.split('T')[0] : '',
        observaciones: data.observaciones || '',
        id_cita: data.id_cita || '',
        id_empleado: data.id_empleado || ''
      });
      setSelectedServicioId('');
      setSelectedRepuestoId('');
      setCantidadRepuesto(1);
      setModalError('');
      setModalMode('edit');
      await cargarDetalleOrden(id);
      setIsModalOpen(true);
    } catch (err) {
      showToast(err.message || 'Error al cargar orden', 'error');
    }
  };

  // Guardar Orden Principal
  const handleSaveOrden = async (e) => {
    e.preventDefault();
    if (!ordenActual.fecha_inicio || !ordenActual.id_cita || !ordenActual.id_empleado) {
      setModalError('Fecha de inicio, cita y empleado asignado son obligatorios.');
      return;
    }

    setIsSaving(true);
    setModalError('');

    try {
      const payload = {
        fecha_inicio: ordenActual.fecha_inicio,
        fecha_fin: ordenActual.fecha_fin || null,
        observaciones: ordenActual.observaciones.trim(),
        id_cita: ordenActual.id_cita,
        id_empleado: ordenActual.id_empleado
      };

      if (modalMode === 'edit') {
        await updateOrden(ordenActual.id_orden, payload);
        showToast('Orden actualizada correctamente', 'success');
        setIsModalOpen(false);
      } else {
        const nueva = await createOrden(payload);
        showToast('Orden creada. Ahora agrega servicios y repuestos.', 'success');
        setOrdenActual((prev) => ({ ...prev, id_orden: nueva.id_orden }));
        setModalMode('edit');
        await cargarDetalleOrden(nueva.id_orden);
      }

      fetchData();
    } catch (err) {
      setModalError(err.message || 'Error al guardar orden');
    } finally {
      setIsSaving(false);
    }
  };

  // Agregar Servicio a la Orden
  const handleAddServicio = async () => {
    if (!selectedServicioId) {
      showToast('Selecciona un servicio para agregar', 'error');
      return;
    }
    try {
      await addServicioOrden(ordenActual.id_orden, selectedServicioId);
      setSelectedServicioId('');
      await cargarDetalleOrden(ordenActual.id_orden);
      showToast('Servicio agregado a la orden', 'success');
    } catch (err) {
      showToast(err.message || 'Error al agregar servicio', 'error');
    }
  };

  // Quitar Servicio
  const handleRemoveServicio = async (idServicio) => {
    try {
      await removeServicioOrden(ordenActual.id_orden, idServicio);
      await cargarDetalleOrden(ordenActual.id_orden);
      showToast('Servicio removido', 'success');
    } catch (err) {
      showToast(err.message || 'Error al remover servicio', 'error');
    }
  };

  // Agregar Repuesto
  const handleAddRepuesto = async () => {
    if (!selectedRepuestoId) {
      showToast('Selecciona un repuesto para agregar', 'error');
      return;
    }
    const cant = parseInt(cantidadRepuesto) || 1;
    try {
      await addRepuestoOrden(ordenActual.id_orden, selectedRepuestoId, cant);
      setSelectedRepuestoId('');
      setCantidadRepuesto(1);
      await cargarDetalleOrden(ordenActual.id_orden);
      const reps = await getInventario();
      setRepuestosCatalogo(reps || []);
      showToast('Repuesto agregado a la orden', 'success');
    } catch (err) {
      showToast(err.message || 'Error al agregar repuesto', 'error');
    }
  };

  // Quitar Repuesto
  const handleRemoveRepuesto = async (idRepuesto) => {
    try {
      await removeRepuestoOrden(ordenActual.id_orden, idRepuesto);
      await cargarDetalleOrden(ordenActual.id_orden);
      const reps = await getInventario();
      setRepuestosCatalogo(reps || []);
      showToast('Repuesto removido', 'success');
    } catch (err) {
      showToast(err.message || 'Error al remover repuesto', 'error');
    }
  };

  // Modal Eliminar
  const handleOpenDelete = (orden) => {
    setOrdenToDelete(orden);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!ordenToDelete) return;
    try {
      await deleteOrden(ordenToDelete.id_orden);
      setIsDeleteModalOpen(false);
      setOrdenToDelete(null);
      showToast('Orden eliminada correctamente', 'success');
      fetchData();
    } catch (err) {
      showToast(err.message || 'Error al eliminar orden', 'error');
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return '—';
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
        {estado || 'Pendiente'}
      </span>
    );
  };

  // Citas elegibles (pendientes o confirmadas, o la actual de la orden)
  const citasDisponibles = citas.filter(
    (c) => c.id_estado <= 2 || String(c.id_cita) === String(ordenActual.id_cita)
  );

  return (
    <div className="ordenes-container">
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
      <div className="ordenes-header">
        <div className="ordenes-header-info">
          <h2>Órdenes de Trabajo</h2>
          <p>Gestión de órdenes activas, mano de obra y repuestos utilizados.</p>
        </div>
        <button className="btn-primary-custom" onClick={handleOpenCreate}>
          <i className="bi bi-plus-lg"></i>
          <span>Nueva orden</span>
        </button>
      </div>

      {/* Barra de búsqueda y contador */}
      <div className="ordenes-actions-row">
        <div className="search-bar">
          <i className="bi bi-search"></i>
          <input
            type="text"
            placeholder="Buscar por orden, cliente, vehículo o técnico..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
        <div className="stat-pill">
          <span>{ordenes.length}</span> órdenes
        </div>
      </div>

      {/* Tabla de Órdenes */}
      <div className="card-custom">
        <div className="table-responsive">
          <table className="table-custom">
            <thead>
              <tr>
                <th>Orden</th>
                <th>Cliente</th>
                <th>Vehículo</th>
                <th>Mecánico</th>
                <th>Fecha Inicio</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="table-empty">
                    Cargando órdenes de trabajo...
                  </td>
                </tr>
              ) : ordenes.length === 0 ? (
                <tr>
                  <td colSpan="7" className="table-empty">
                    No se encontraron órdenes registradas.
                  </td>
                </tr>
              ) : (
                ordenes.map((o) => (
                  <tr key={o.id_orden}>
                    <td>
                      <span className="td-orden-id">#{o.id_orden}</span>
                    </td>
                    <td>
                      <div className="td-primary">{o.cliente}</div>
                    </td>
                    <td className="td-muted">{o.vehiculo}</td>
                    <td>{o.empleado || <span className="td-dash">—</span>}</td>
                    <td>{formatearFecha(o.fecha_inicio)}</td>
                    <td>{getBadgeEstado(o.estado)}</td>
                    <td>
                      <div className="d-flex gap-2">
                        <button
                          className="btn-accion editar"
                          title="Editar / Gestionar orden"
                          onClick={() => handleOpenEdit(o.id_orden)}
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button
                          className="btn-accion eliminar"
                          title="Eliminar orden"
                          onClick={() => handleOpenDelete(o)}
                        >
                          <i className="bi bi-trash"></i>
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

      {/* ── Modal Nuevo / Editar Orden ── */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => !isSaving && setIsModalOpen(false)}>
          <div className="modal-dialog-custom modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom">
              <h5 className="modal-title-custom">
                {modalMode === 'edit'
                  ? `Orden de Trabajo #${ordenActual.id_orden}`
                  : 'Nueva orden de trabajo'}
              </h5>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => !isSaving && setIsModalOpen(false)}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <form onSubmit={handleSaveOrden}>
              <div className="modal-body-custom">
                {modalError && (
                  <div className="alert-modal-error">
                    <i className="bi bi-exclamation-circle-fill"></i>
                    <span>{modalError}</span>
                  </div>
                )}

                <div className="form-grid">
                  <div className="form-group-full">
                    <label className="field-label">Cita asociada *</label>
                    <select
                      className="field-input"
                      value={ordenActual.id_cita}
                      onChange={(e) =>
                        setOrdenActual((prev) => ({ ...prev, id_cita: e.target.value }))
                      }
                      required
                      disabled={modalMode === 'edit'}
                    >
                      <option value="">Seleccionar cita...</option>
                      {citasDisponibles.map((c) => (
                        <option key={c.id_cita} value={c.id_cita}>
                          #{c.id_cita} — {c.cliente} | {c.vehiculo} ({formatearFecha(c.fecha)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group-full">
                    <label className="field-label">Mecánico asignado *</label>
                    <select
                      className="field-input"
                      value={ordenActual.id_empleado}
                      onChange={(e) =>
                        setOrdenActual((prev) => ({ ...prev, id_empleado: e.target.value }))
                      }
                      required
                    >
                      <option value="">Seleccionar empleado...</option>
                      {empleados.map((emp) => (
                        <option key={emp.id_empleado} value={emp.id_empleado}>
                          {emp.nombre} {emp.apellido} — {emp.cargo || 'Técnico'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="field-label">Fecha de inicio *</label>
                    <input
                      type="date"
                      className="field-input"
                      value={ordenActual.fecha_inicio}
                      onChange={(e) =>
                        setOrdenActual((prev) => ({ ...prev, fecha_inicio: e.target.value }))
                      }
                      required
                    />
                  </div>

                  <div>
                    <label className="field-label">Fecha estimada fin</label>
                    <input
                      type="date"
                      className="field-input"
                      value={ordenActual.fecha_fin}
                      onChange={(e) =>
                        setOrdenActual((prev) => ({ ...prev, fecha_fin: e.target.value }))
                      }
                    />
                  </div>

                  <div className="form-group-full">
                    <label className="field-label">Observaciones</label>
                    <textarea
                      className="field-input"
                      rows="2"
                      placeholder="Diagnóstico inicial, notas adicionales..."
                      value={ordenActual.observaciones}
                      onChange={(e) =>
                        setOrdenActual((prev) => ({ ...prev, observaciones: e.target.value }))
                      }
                    />
                  </div>
                </div>

                {/* ── Sección de Detalle: Servicios y Repuestos (sólo editable tras crear) ── */}
                {modalMode === 'edit' && ordenActual.id_orden && (
                  <div className="orden-detalle-section">
                    <h4 className="detalle-heading">
                      <i className="bi bi-tools text-primary me-2"></i>
                      Servicios y Repuestos de la Orden
                    </h4>

                    {/* Columnas: Servicios a la izquierda, Repuestos a la derecha */}
                    <div className="orden-detalle-grid">
                      {/* Servicios */}
                      <div className="detalle-col">
                        <div className="seccion-titulo">
                          <i className="bi bi-wrench"></i> Servicios aplicados
                        </div>
                        <div className="detalle-input-row">
                          <select
                            className="field-input"
                            value={selectedServicioId}
                            onChange={(e) => setSelectedServicioId(e.target.value)}
                          >
                            <option value="">Seleccionar servicio...</option>
                            {serviciosCatalogo.map((s) => (
                              <option key={s.id_servicio} value={s.id_servicio}>
                                {s.nombre_servicio} (${parseFloat(s.costo).toLocaleString('es-CO')})
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="btn-add-detalle"
                            onClick={handleAddServicio}
                          >
                            <i className="bi bi-plus"></i>
                          </button>
                        </div>

                        <div className="lista-detalle">
                          {serviciosAsignados.length === 0 ? (
                            <div className="lista-vacia">Sin servicios asignados</div>
                          ) : (
                            serviciosAsignados.map((s) => (
                              <div key={s.id_servicio} className="detalle-item">
                                <div>
                                  <div className="item-name">{s.nombre_servicio}</div>
                                  <div className="item-sub">
                                    ${parseFloat(s.costo).toLocaleString('es-CO')}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  className="btn-quitar"
                                  onClick={() => handleRemoveServicio(s.id_servicio)}
                                >
                                  <i className="bi bi-x"></i>
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Repuestos */}
                      <div className="detalle-col">
                        <div className="seccion-titulo">
                          <i className="bi bi-gear"></i> Repuestos utilizados
                        </div>
                        <div className="detalle-input-row">
                          <select
                            className="field-input"
                            value={selectedRepuestoId}
                            onChange={(e) => setSelectedRepuestoId(e.target.value)}
                          >
                            <option value="">Seleccionar repuesto...</option>
                            {repuestosCatalogo.map((r) => (
                              <option key={r.id_repuesto} value={r.id_repuesto}>
                                {r.nombre} (Stock: {r.stock})
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min="1"
                            className="field-input cant-input"
                            value={cantidadRepuesto}
                            onChange={(e) => setCantidadRepuesto(e.target.value)}
                          />
                          <button
                            type="button"
                            className="btn-add-detalle"
                            onClick={handleAddRepuesto}
                          >
                            <i className="bi bi-plus"></i>
                          </button>
                        </div>

                        <div className="lista-detalle">
                          {repuestosAsignados.length === 0 ? (
                            <div className="lista-vacia">Sin repuestos asignados</div>
                          ) : (
                            repuestosAsignados.map((r) => (
                              <div key={r.id_repuesto} className="detalle-item">
                                <div>
                                  <div className="item-name">
                                    {r.nombre} x{r.cantidad}
                                  </div>
                                  <div className="item-sub">
                                    ${parseFloat(r.total).toLocaleString('es-CO')}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  className="btn-quitar"
                                  onClick={() => handleRemoveRepuesto(r.id_repuesto)}
                                >
                                  <i className="bi bi-x"></i>
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer-custom">
                <button
                  type="button"
                  className="btn-secondary-custom"
                  disabled={isSaving}
                  onClick={() => setIsModalOpen(false)}
                >
                  {modalMode === 'edit' ? 'Cerrar' : 'Cancelar'}
                </button>
                <button type="submit" className="btn-primary-custom" disabled={isSaving}>
                  <i className="bi bi-check-lg"></i>
                  <span>
                    {isSaving
                      ? 'Guardando...'
                      : modalMode === 'edit'
                        ? 'Guardar cambios'
                        : 'Crear orden'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Confirmar Eliminar ── */}
      {isDeleteModalOpen && ordenToDelete && (
        <div className="modal-overlay" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="modal-dialog-custom modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom">
              <h5 className="modal-title-custom">Confirmar eliminación</h5>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="modal-body-custom" style={{ textAlign: 'center', padding: '24px 20px' }}>
              <i
                className="bi bi-exclamation-triangle-fill"
                style={{
                  fontSize: '38px',
                  color: '#ef4444',
                  marginBottom: '12px',
                  display: 'inline-block'
                }}
              ></i>
              <p style={{ color: '#475569', fontSize: '14px', margin: 0 }}>
                ¿Eliminar la orden de trabajo{' '}
                <strong style={{ color: '#1e293b' }}>#{ordenToDelete.id_orden}</strong>?
                <br />
                <span style={{ fontSize: '12.5px', color: '#94a3b8' }}>
                  Esta acción no se puede deshacer.
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
                <i className="bi bi-trash"></i>
                <span>Eliminar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

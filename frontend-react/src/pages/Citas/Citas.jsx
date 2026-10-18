import React, { useEffect, useState, useRef } from 'react';
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

export default function Citas() {
  const [citas, setCitas] = useState([]);
  const [todasCitas, setTodasCitas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  // Estados Modal Formulario
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [citaActual, setCitaActual] = useState(emptyForm);
  const [modalError, setModalError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Estados Modal Eliminar
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [citaToDelete, setCitaToDelete] = useState(null);

  // Toast
  const [toast, setToast] = useState(null);
  const timerBuscar = useRef(null);

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
    const inputFecha = document.getElementById('fFecha');
    if (inputFecha) inputFecha.min = new Date().toISOString().split('T')[0];
  }, []);

  useEffect(() => {
    const filtradas = filtroEstado
      ? todasCitas.filter((c) => c.id_estado == filtroEstado)
      : todasCitas;
    setCitas(filtradas);
  }, [filtroEstado, todasCitas]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);

    if (timerBuscar.current) clearTimeout(timerBuscar.current);
    timerBuscar.current = setTimeout(async () => {
      try {
        const data = await getCitas(val);
        setTodasCitas(data || []);
      } catch (err) {
        console.error('Error filtrando citas:', err);
      }
    }, 400);
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

  // Abrir Modal Crear
  const handleOpenCreate = () => {
    setCitaActual(emptyForm);
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
        fecha: data.fecha ? data.fecha.split('T')[0] : '',
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
        motivo: citaActual.motivo.trim(),
        id_vehiculo: citaActual.id_vehiculo,
        id_estado: citaActual.id_estado
      };

      if (modalMode === 'edit') {
        await updateCita(citaActual.id_cita, payload);
        showToast('Cita actualizada correctamente', 'success');
      } else {
        await createCita(payload);
        showToast('Cita registrada con éxito', 'success');
      }

      setIsModalOpen(false);
      fetchData(searchTerm);
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

  return (
    <div className="citas-container">
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
      <div className="citas-header">
        <div className="citas-header-info">
          <h2>Gestión de Citas</h2>
          <p>Administra las citas programadas con los clientes.</p>
        </div>
        <button className="btn-primary-custom" onClick={handleOpenCreate}>
          <i className="bi bi-plus-lg"></i>
          <span>Nueva cita</span>
        </button>
      </div>

      {/* Barra de búsqueda, filtro y contador */}
      <div className="citas-actions-row">
        <div className="search-bar">
          <i className="bi bi-search"></i>
          <input
            type="text"
            placeholder="Buscar por cliente o vehículo..."
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
          <span>{citas.length}</span> citas
        </div>
      </div>

      {/* Tabla de Citas */}
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
                    <td>{c.cliente}</td>
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
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button
                          className="btn-accion eliminar"
                          title="Eliminar"
                          onClick={() => handleOpenDelete(c)}
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

      {/* ── Modal Nuevo / Editar Cita ── */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => !isSaving && setIsModalOpen(false)}>
          <div className="modal-dialog-custom" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom">
              <h5 className="modal-title-custom">
                {modalMode === 'edit' ? 'Editar cita' : 'Nueva cita'}
              </h5>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => !isSaving && setIsModalOpen(false)}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <form onSubmit={handleSaveCita}>
              <div className="modal-body-custom">
                {modalError && (
                  <div className="alert-modal-error">
                    <i className="bi bi-exclamation-circle-fill"></i>
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
                          {cl.nombre} {cl.apellido}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group-full">
                    <label className="field-label">Vehículo *</label>
                    <select
                      className="field-input"
                      value={citaActual.id_vehiculo}
                      onChange={(e) =>
                        setCitaActual((prev) => ({ ...prev, id_vehiculo: e.target.value }))
                      }
                      required
                      disabled={!citaActual.id_cliente}
                    >
                      <option value="">Seleccionar vehículo...</option>
                      {vehiculos.map((v) => (
                        <option key={v.id_vehiculo} value={v.id_vehiculo}>
                          {v.placa} — {v.marca} {v.modelo}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="field-label">Fecha *</label>
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
                    <label className="field-label">Motivo</label>
                    <textarea
                      className="field-input"
                      placeholder="Motivo de la cita..."
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
                  <i className="bi bi-check-lg"></i>
                  <span>{isSaving ? 'Guardando...' : 'Guardar'}</span>
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
                ¿Eliminar la cita de{' '}
                <strong style={{ color: '#1e293b' }}>{citaToDelete.cliente}</strong>?
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

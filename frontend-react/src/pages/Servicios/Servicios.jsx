import React, { useEffect, useState, useRef } from 'react';
import {
  Wrench,
  Plus,
  Search,
  RotateCw,
  Pencil,
  Trash2,
  X,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Check
} from 'lucide-react';
import {
  getServicios,
  createServicio,
  updateServicio,
  deleteServicio
} from '../../services/serviciosService';
import './Servicios.css';

export default function Servicios() {
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados Modal Formulario (Crear / Editar)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [servicioActual, setServicioActual] = useState({
    id_servicio: null,
    nombre_servicio: '',
    descripcion: '',
    costo: ''
  });
  const [modalError, setModalError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Estados Modal Eliminar
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [servicioToDelete, setServicioToDelete] = useState(null);

  // Toast
  const [toast, setToast] = useState(null);
  const timerBuscar = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  };

  const fetchServicios = async (buscar = '') => {
    try {
      setLoading(true);
      const data = await getServicios(buscar);
      setServicios(data || []);
    } catch (err) {
      console.error('Error al cargar servicios:', err);
      showToast(err.message || 'Error al cargar servicios', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServicios();
  }, []);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);

    if (timerBuscar.current) clearTimeout(timerBuscar.current);
    timerBuscar.current = setTimeout(() => {
      fetchServicios(val);
    }, 400);
  };

  // Abrir Modal Crear
  const handleOpenCreate = () => {
    setServicioActual({
      id_servicio: null,
      nombre_servicio: '',
      descripcion: '',
      costo: ''
    });
    setModalError('');
    setModalMode('create');
    setIsModalOpen(true);
  };

  // Abrir Modal Editar
  const handleOpenEdit = (servicio) => {
    setServicioActual({
      id_servicio: servicio.id_servicio,
      nombre_servicio: servicio.nombre_servicio || '',
      descripcion: servicio.descripcion || '',
      costo: servicio.costo || ''
    });
    setModalError('');
    setModalMode('edit');
    setIsModalOpen(true);
  };

  // Guardar (Crear o Editar)
  const handleSaveServicio = async (e) => {
    e.preventDefault();
    if (!servicioActual.nombre_servicio.trim() || !servicioActual.costo) {
      setModalError('Nombre y costo son obligatorios.');
      return;
    }

    setIsSaving(true);
    setModalError('');

    try {
      const payload = {
        nombre_servicio: servicioActual.nombre_servicio.trim(),
        descripcion: servicioActual.descripcion.trim(),
        costo: parseFloat(servicioActual.costo)
      };

      if (modalMode === 'edit') {
        await updateServicio(servicioActual.id_servicio, payload);
        showToast('Servicio actualizado correctamente', 'success');
      } else {
        await createServicio(payload);
        showToast('Servicio creado con éxito', 'success');
      }

      setIsModalOpen(false);
      fetchServicios(searchTerm);
    } catch (err) {
      setModalError(err.message || 'Error al guardar servicio');
    } finally {
      setIsSaving(false);
    }
  };

  // Modal Eliminar
  const handleOpenDelete = (servicio) => {
    setServicioToDelete(servicio);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!servicioToDelete) return;
    try {
      await deleteServicio(servicioToDelete.id_servicio);
      setIsDeleteModalOpen(false);
      setServicioToDelete(null);
      showToast('Servicio eliminado correctamente', 'success');
      fetchServicios(searchTerm);
    } catch (err) {
      showToast(err.message || 'Error al eliminar servicio', 'error');
    }
  };

  return (
    <div className="servicios-container">
      {/* Toast Flotante */}
      {toast && (
        <div className={`toast-floating ${toast.type}`}>
          {toast.type === 'success' ? (
            <CheckCircle2 size={18} />
          ) : (
            <AlertTriangle size={18} />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header superior */}
      <div className="servicios-header">
        <div className="servicios-header-info">
          <h2>Catálogo de Servicios</h2>
          <p>Gestiona los servicios y tarifas ofrecidas a tus clientes.</p>
        </div>
        <button className="btn-primary-custom" onClick={handleOpenCreate}>
          <Plus size={16} />
          <span>Nuevo servicio</span>
        </button>
      </div>

      {/* Barra de búsqueda y contador */}
      <div className="servicios-actions-row">
        <div className="search-bar">
          <Search size={16} />
          <input
            type="text"
            placeholder="Buscar por nombre o descripción..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
        <div className="stat-pill">
          <span>{servicios.length}</span> servicios
        </div>
      </div>

      {/* Grid de Servicios */}
      <div className="servicios-grid">
        {loading ? (
          <div className="servicios-empty">
            <RotateCw size={32} className="spinning" />
            <h4>Cargando catálogo...</h4>
            <p>Consultando los servicios registrados en el taller.</p>
          </div>
        ) : servicios.length === 0 ? (
          <div className="servicios-empty">
            <Wrench size={36} />
            <h4>No se encontraron servicios</h4>
            <p>No hay servicios que coincidan con la búsqueda.</p>
          </div>
        ) : (
          servicios.map((s) => (
            <div key={s.id_servicio} className="servicio-card">
              <div className="servicio-icon">
                <Wrench size={22} />
              </div>
              <div className="servicio-nombre">{s.nombre_servicio}</div>
              <div className="servicio-desc">
                {s.descripcion || <span style={{ color: '#94a3b8' }}>Sin descripción detallada</span>}
              </div>
              <div className="servicio-costo">
                <span className="currency">$</span>
                {parseFloat(s.costo).toLocaleString('es-CO', { minimumFractionDigits: 2 })}
              </div>
              <div className="servicio-acciones">
                <button
                  type="button"
                  className="btn-accion-card editar"
                  onClick={() => handleOpenEdit(s)}
                >
                  <Pencil size={13} /> <span>Editar</span>
                </button>
                <button
                  type="button"
                  className="btn-accion-card eliminar"
                  onClick={() => handleOpenDelete(s)}
                >
                  <Trash2 size={13} /> <span>Eliminar</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Modal Nuevo / Editar Servicio ── */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => !isSaving && setIsModalOpen(false)}>
          <div className="modal-dialog-custom" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom">
              <h5 className="modal-title-custom">
                {modalMode === 'edit' ? 'Editar servicio' : 'Nuevo servicio'}
              </h5>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => !isSaving && setIsModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveServicio}>
              <div className="modal-body-custom">
                {modalError && (
                  <div className="alert-modal-error">
                    <AlertCircle size={16} />
                    <span>{modalError}</span>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label className="field-label">Nombre del servicio *</label>
                    <input
                      type="text"
                      className="field-input"
                      placeholder="Ej: Cambio de aceite y filtro"
                      value={servicioActual.nombre_servicio}
                      onChange={(e) => setServicioActual({ ...servicioActual, nombre_servicio: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="field-label">Descripción</label>
                    <textarea
                      className="field-input"
                      rows="3"
                      placeholder="Describe qué incluye el servicio..."
                      value={servicioActual.descripcion}
                      onChange={(e) => setServicioActual({ ...servicioActual, descripcion: e.target.value })}
                    ></textarea>
                  </div>

                  <div>
                    <label className="field-label">Costo ($) *</label>
                    <input
                      type="number"
                      className="field-input"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      value={servicioActual.costo}
                      onChange={(e) => setServicioActual({ ...servicioActual, costo: e.target.value })}
                      required
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
                  <Check size={16} />
                  <span>{isSaving ? 'Guardando...' : 'Guardar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Confirmar Eliminar ── */}
      {isDeleteModalOpen && servicioToDelete && (
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
                style={{ marginBottom: '12px', display: 'inline-block' }}
              />
              <p style={{ color: '#475569', fontSize: '14px', margin: 0 }}>
                ¿Eliminar el servicio <strong style={{ color: '#1e293b' }}>{servicioToDelete.nombre_servicio}</strong>?
                <br />
                <span style={{ fontSize: '12.5px', color: '#94a3b8' }}>Esta acción no se puede deshacer.</span>
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

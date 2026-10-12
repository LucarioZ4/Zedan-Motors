import React, { useEffect, useState, useRef } from 'react';
import {
  getEmpleados,
  createEmpleado,
  updateEmpleado,
  deleteEmpleado,
  getCargos
} from '../../services/empleadosService';
import './Empleados.css';

export default function Empleados() {
  const [empleados, setEmpleados] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados Modal Formulario (Crear / Editar)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [empleadoActual, setEmpleadoActual] = useState({
    id_empleado: null,
    nombre: '',
    apellido: '',
    telefono: '',
    correo: '',
    id_cargo: ''
  });
  const [modalError, setModalError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Estados Modal Eliminar
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [empleadoToDelete, setEmpleadoToDelete] = useState(null);

  // Toast
  const [toast, setToast] = useState(null);
  const timerBuscar = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3200);
  };

  const fetchData = async (buscar = '') => {
    try {
      setLoading(true);
      const [empData, cargosData] = await Promise.all([
        getEmpleados(buscar),
        getCargos()
      ]);
      setEmpleados(empData || []);
      setCargos(cargosData || []);
    } catch (err) {
      console.error('Error al cargar datos de empleados:', err);
      showToast(err.message || 'Error al cargar empleados', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);

    if (timerBuscar.current) clearTimeout(timerBuscar.current);
    timerBuscar.current = setTimeout(async () => {
      try {
        const data = await getEmpleados(val);
        setEmpleados(data || []);
      } catch (err) {
        console.error('Error filtrando empleados:', err);
      }
    }, 400);
  };

  // Abrir Modal Crear
  const handleOpenCreate = () => {
    setEmpleadoActual({
      id_empleado: null,
      nombre: '',
      apellido: '',
      telefono: '',
      correo: '',
      id_cargo: ''
    });
    setModalError('');
    setModalMode('create');
    setIsModalOpen(true);
  };

  // Abrir Modal Editar
  const handleOpenEdit = (emp) => {
    setEmpleadoActual({
      id_empleado: emp.id_empleado,
      nombre: emp.nombre || '',
      apellido: emp.apellido || '',
      telefono: emp.telefono || '',
      correo: emp.correo || '',
      id_cargo: emp.id_cargo || ''
    });
    setModalError('');
    setModalMode('edit');
    setIsModalOpen(true);
  };

  // Guardar Empleado
  const handleSaveEmpleado = async (e) => {
    e.preventDefault();
    if (!empleadoActual.nombre.trim() || !empleadoActual.apellido.trim() || !empleadoActual.telefono.trim()) {
      setModalError('Nombre, apellido y teléfono son obligatorios.');
      return;
    }
    if (!empleadoActual.id_cargo) {
      setModalError('Debe seleccionar un cargo.');
      return;
    }

    setIsSaving(true);
    setModalError('');

    try {
      const payload = {
        nombre: empleadoActual.nombre.trim(),
        apellido: empleadoActual.apellido.trim(),
        telefono: empleadoActual.telefono.trim(),
        correo: empleadoActual.correo.trim(),
        id_cargo: empleadoActual.id_cargo
      };

      if (modalMode === 'edit') {
        await updateEmpleado(empleadoActual.id_empleado, payload);
        showToast('Empleado actualizado correctamente', 'success');
      } else {
        await createEmpleado(payload);
        showToast('Empleado registrado con éxito', 'success');
      }

      setIsModalOpen(false);
      fetchData(searchTerm);
    } catch (err) {
      setModalError(err.message || 'Error al guardar empleado');
    } finally {
      setIsSaving(false);
    }
  };

  // Modal Eliminar
  const handleOpenDelete = (emp) => {
    setEmpleadoToDelete(emp);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!empleadoToDelete) return;
    try {
      await deleteEmpleado(empleadoToDelete.id_empleado);
      setIsDeleteModalOpen(false);
      setEmpleadoToDelete(null);
      showToast('Empleado eliminado correctamente', 'success');
      fetchData(searchTerm);
    } catch (err) {
      showToast(err.message || 'Error al eliminar empleado', 'error');
    }
  };

  return (
    <div className="empleados-container">
      {/* Toast Flotante */}
      {toast && (
        <div className={`toast-floating ${toast.type}`}>
          <i className={`bi ${toast.type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'}`}></i>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header superior */}
      <div className="empleados-header">
        <div className="empleados-header-info">
          <h2>Gestión de Empleados</h2>
          <p>Administra el equipo técnico y administrativo del taller.</p>
        </div>
        <button className="btn-primary-custom" onClick={handleOpenCreate}>
          <i className="bi bi-plus-lg"></i>
          <span>Nuevo empleado</span>
        </button>
      </div>

      {/* Barra de búsqueda y contador */}
      <div className="empleados-actions-row">
        <div className="search-bar">
          <i className="bi bi-search"></i>
          <input
            type="text"
            placeholder="Buscar por nombre o cargo..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
        <div className="stat-pill">
          <span>{empleados.length}</span> empleados
        </div>
      </div>

      {/* Tabla de Empleados */}
      <div className="card-custom">
        <div className="table-responsive">
          <table className="table-custom">
            <thead>
              <tr>
                <th>Empleado</th>
                <th>Teléfono</th>
                <th>Correo</th>
                <th>Cargo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                    <i className="bi bi-arrow-clockwise spinning me-2"></i> Cargando equipo de empleados...
                  </td>
                </tr>
              ) : empleados.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                    No se encontraron empleados registrados.
                  </td>
                </tr>
              ) : (
                empleados.map((e) => {
                  const iniciales = `${e.nombre?.[0] || ''}${e.apellido?.[0] || ''}`.toUpperCase();
                  return (
                    <tr key={e.id_empleado}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="empleado-avatar">{iniciales || 'EM'}</div>
                          <div>
                            <div className="empleado-title">{e.nombre} {e.apellido}</div>
                            <div className="empleado-sub">ID #{e.id_empleado}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <i className="bi bi-telephone text-primary" style={{ color: '#3b82f6' }}></i>
                          {e.telefono}
                        </span>
                      </td>
                      <td style={{ color: '#64748b' }}>
                        {e.correo || <span style={{ color: '#94a3b8' }}>—</span>}
                      </td>
                      <td>
                        <span className="cargo-badge">{e.cargo || 'Sin cargo'}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="btn-accion editar"
                            title="Editar empleado"
                            onClick={() => handleOpenEdit(e)}
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            className="btn-accion eliminar"
                            title="Eliminar empleado"
                            onClick={() => handleOpenDelete(e)}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal Nuevo / Editar Empleado ── */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => !isSaving && setIsModalOpen(false)}>
          <div className="modal-dialog-custom" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom">
              <h5 className="modal-title-custom">
                {modalMode === 'edit' ? 'Editar empleado' : 'Nuevo empleado'}
              </h5>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => !isSaving && setIsModalOpen(false)}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <form onSubmit={handleSaveEmpleado}>
              <div className="modal-body-custom">
                {modalError && (
                  <div className="alert-modal-error">
                    <i className="bi bi-exclamation-circle-fill"></i>
                    <span>{modalError}</span>
                  </div>
                )}

                <div className="form-grid">
                  <div>
                    <label className="field-label">Nombre *</label>
                    <input
                      type="text"
                      className="field-input"
                      placeholder="Nombre"
                      value={empleadoActual.nombre}
                      onChange={(e) => setEmpleadoActual({ ...empleadoActual, nombre: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="field-label">Apellido *</label>
                    <input
                      type="text"
                      className="field-input"
                      placeholder="Apellido"
                      value={empleadoActual.apellido}
                      onChange={(e) => setEmpleadoActual({ ...empleadoActual, apellido: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="field-label">Teléfono *</label>
                    <input
                      type="text"
                      className="field-input"
                      placeholder="Teléfono"
                      value={empleadoActual.telefono}
                      onChange={(e) => setEmpleadoActual({ ...empleadoActual, telefono: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="field-label">Correo</label>
                    <input
                      type="email"
                      className="field-input"
                      placeholder="correo@ejemplo.com"
                      value={empleadoActual.correo}
                      onChange={(e) => setEmpleadoActual({ ...empleadoActual, correo: e.target.value })}
                    />
                  </div>
                  <div className="form-group-full">
                    <label className="field-label">Cargo *</label>
                    <select
                      className="field-input"
                      value={empleadoActual.id_cargo}
                      onChange={(e) => setEmpleadoActual({ ...empleadoActual, id_cargo: e.target.value })}
                      required
                    >
                      <option value="">Seleccionar cargo...</option>
                      {cargos.map((c) => (
                        <option key={c.id_cargo} value={c.id_cargo}>
                          {c.nombre_cargo}
                        </option>
                      ))}
                    </select>
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
      {isDeleteModalOpen && empleadoToDelete && (
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
                style={{ fontSize: '38px', color: '#ef4444', marginBottom: '12px', display: 'inline-block' }}
              ></i>
              <p style={{ color: '#475569', fontSize: '14px', margin: 0 }}>
                ¿Eliminar al empleado <strong style={{ color: '#1e293b' }}>{empleadoToDelete.nombre} {empleadoToDelete.apellido}</strong>?
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

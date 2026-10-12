import React, { useEffect, useState, useRef } from 'react';
import {
  getClientes,
  createCliente,
  updateCliente,
  deleteCliente
} from '../../services/clientesService';
import './Clientes.css';

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados de Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [clienteActual, setClienteActual] = useState({
    id_cliente: null,
    nombre: '',
    apellido: '',
    telefono: '',
    correo: '',
    direccion: ''
  });
  const [modalError, setModalError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Modal Eliminar
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [clienteToDelete, setClienteToDelete] = useState(null);

  // Toast
  const [toast, setToast] = useState(null);
  const timerBuscar = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3200);
  };

  const fetchClientes = async (buscar = '') => {
    try {
      setLoading(true);
      const data = await getClientes(buscar);
      setClientes(data || []);
    } catch (err) {
      console.error('Error al cargar clientes:', err);
      showToast(err.message || 'Error al cargar clientes', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);

    if (timerBuscar.current) clearTimeout(timerBuscar.current);
    timerBuscar.current = setTimeout(() => {
      fetchClientes(val);
    }, 400);
  };

  // Abrir modal nuevo
  const handleOpenCreate = () => {
    setClienteActual({
      id_cliente: null,
      nombre: '',
      apellido: '',
      telefono: '',
      correo: '',
      direccion: ''
    });
    setModalError('');
    setModalMode('create');
    setIsModalOpen(true);
  };

  // Abrir modal editar
  const handleOpenEdit = (cliente) => {
    setClienteActual({
      id_cliente: cliente.id_cliente,
      nombre: cliente.nombre || '',
      apellido: cliente.apellido || '',
      telefono: cliente.telefono || '',
      correo: cliente.correo || '',
      direccion: cliente.direccion || ''
    });
    setModalError('');
    setModalMode('edit');
    setIsModalOpen(true);
  };

  // Guardar (Crear o Editar)
  const handleSaveCliente = async (e) => {
    e.preventDefault();
    if (!clienteActual.nombre.trim() || !clienteActual.apellido.trim() || !clienteActual.telefono.trim()) {
      setModalError('Nombre, apellido y teléfono son obligatorios.');
      return;
    }

    setIsSaving(true);
    setModalError('');

    try {
      const payload = {
        nombre: clienteActual.nombre.trim(),
        apellido: clienteActual.apellido.trim(),
        telefono: clienteActual.telefono.trim(),
        correo: clienteActual.correo.trim(),
        direccion: clienteActual.direccion.trim()
      };

      if (modalMode === 'edit') {
        await updateCliente(clienteActual.id_cliente, payload);
        showToast('Cliente actualizado correctamente', 'success');
      } else {
        await createCliente(payload);
        showToast('Cliente registrado con éxito', 'success');
      }

      setIsModalOpen(false);
      fetchClientes(searchTerm);
    } catch (err) {
      setModalError(err.message || 'Error al guardar cliente');
    } finally {
      setIsSaving(false);
    }
  };

  // Abrir modal eliminar
  const handleOpenDelete = (cliente) => {
    setClienteToDelete(cliente);
    setIsDeleteModalOpen(true);
  };

  // Confirmar eliminación
  const handleConfirmDelete = async () => {
    if (!clienteToDelete) return;
    try {
      await deleteCliente(clienteToDelete.id_cliente);
      setIsDeleteModalOpen(false);
      setClienteToDelete(null);
      showToast('Cliente eliminado correctamente', 'success');
      fetchClientes(searchTerm);
    } catch (err) {
      showToast(err.message || 'Error al eliminar cliente', 'error');
    }
  };

  return (
    <div className="clientes-container">
      {/* Toast flotante */}
      {toast && (
        <div className={`toast-floating ${toast.type}`}>
          <i className={`bi ${toast.type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'}`}></i>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header superior del módulo */}
      <div className="clientes-header">
        <div className="clientes-header-info">
          <h2>Gestión de Clientes</h2>
          <p>Administra los clientes registrados y su información de contacto.</p>
        </div>
        <button className="btn-primary-custom" onClick={handleOpenCreate}>
          <i className="bi bi-plus-lg"></i>
          <span>Nuevo cliente</span>
        </button>
      </div>

      {/* Barra de búsqueda y contador */}
      <div className="clientes-actions-row">
        <div className="search-bar">
          <i className="bi bi-search"></i>
          <input
            type="text"
            placeholder="Buscar por nombre, apellido o teléfono..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
        <div className="stat-pill">
          <span>{clientes.length}</span> clientes
        </div>
      </div>

      {/* Tabla de Clientes */}
      <div className="card-custom">
        <div className="table-responsive">
          <table className="table-custom">
            <thead>
              <tr>
                <th>#</th>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Correo</th>
                <th>Dirección</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-4" style={{ color: '#94a3b8', textAlign: 'center' }}>
                    <i className="bi bi-arrow-clockwise spinning me-2"></i> Cargando clientes...
                  </td>
                </tr>
              ) : clientes.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b' }}>
                    No se encontraron clientes registrados.
                  </td>
                </tr>
              ) : (
                clientes.map((c) => {
                  const iniciales = `${c.nombre?.[0] || ''}${c.apellido?.[0] || ''}`.toUpperCase();
                  return (
                    <tr key={c.id_cliente}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="cliente-avatar">{iniciales || 'CL'}</div>
                          <div>
                            <div className="cliente-nombre-title">
                              {c.nombre} {c.apellido}
                            </div>
                            <div className="cliente-id-sub">ID #{c.id_cliente}</div>
                          </div>
                        </div>
                      </td>
                      <td>{c.nombre}</td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <i className="bi bi-telephone text-primary" style={{ color: '#3b82f6' }}></i>
                          {c.telefono}
                        </span>
                      </td>
                      <td>{c.correo || <span style={{ color: '#94a3b8' }}>—</span>}</td>
                      <td>{c.direccion || <span style={{ color: '#94a3b8' }}>—</span>}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="btn-accion editar"
                            title="Editar cliente"
                            onClick={() => handleOpenEdit(c)}
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            className="btn-accion eliminar"
                            title="Eliminar cliente"
                            onClick={() => handleOpenDelete(c)}
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

      {/* Modal Crear / Editar */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => !isSaving && setIsModalOpen(false)}>
          <div className="modal-dialog-custom" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom">
              <h5 className="modal-title-custom">
                {modalMode === 'edit' ? 'Editar cliente' : 'Nuevo cliente'}
              </h5>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => !isSaving && setIsModalOpen(false)}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <form onSubmit={handleSaveCliente}>
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
                      value={clienteActual.nombre}
                      onChange={(e) => setClienteActual({ ...clienteActual, nombre: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="field-label">Apellido *</label>
                    <input
                      type="text"
                      className="field-input"
                      placeholder="Apellido"
                      value={clienteActual.apellido}
                      onChange={(e) => setClienteActual({ ...clienteActual, apellido: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="field-label">Teléfono *</label>
                    <input
                      type="text"
                      className="field-input"
                      placeholder="Teléfono"
                      value={clienteActual.telefono}
                      onChange={(e) => setClienteActual({ ...clienteActual, telefono: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="field-label">Correo</label>
                    <input
                      type="email"
                      className="field-input"
                      placeholder="correo@ejemplo.com"
                      value={clienteActual.correo}
                      onChange={(e) => setClienteActual({ ...clienteActual, correo: e.target.value })}
                    />
                  </div>
                  <div className="form-group-full">
                    <label className="field-label">Dirección</label>
                    <input
                      type="text"
                      className="field-input"
                      placeholder="Dirección completa"
                      value={clienteActual.direccion}
                      onChange={(e) => setClienteActual({ ...clienteActual, direccion: e.target.value })}
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

      {/* Modal Confirmar Eliminar */}
      {isDeleteModalOpen && clienteToDelete && (
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
                ¿Eliminar a <strong style={{ color: '#1e293b' }}>{clienteToDelete.nombre} {clienteToDelete.apellido}</strong>?
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

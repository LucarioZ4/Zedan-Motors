import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardCheck,
  Plus,
  Search,
  RotateCw,
  Eye,
  Pencil,
  Trash2,
  Send,
  Fuel,
  Car,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  X,
  FileImage,
  User
} from 'lucide-react';
import { getDiagnosticos, eliminarDiagnostico } from '../../services/diagnosticoService';
import './Diagnosticos.css';

export default function Diagnosticos() {
  const [diagnosticos, setDiagnosticos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [toast, setToast] = useState(null);

  // Modal para confirmar eliminación
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [diagnosticoToDelete, setDiagnosticoToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const navigate = useNavigate();
  const timerBuscar = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  };

  const fetchDiagnosticos = async (params = {}) => {
    try {
      setLoading(true);
      const query = {};
      if (params.vehiculo) query.vehiculo = params.vehiculo;
      if (params.estado) query.estado = params.estado;
      const data = await getDiagnosticos(query);
      setDiagnosticos(data || []);
    } catch (err) {
      console.error('Error al cargar diagnósticos:', err);
      showToast(err.message || 'Error al cargar diagnósticos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnosticos({ estado: filtroEstado });
  }, [filtroEstado]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);

    if (timerBuscar.current) clearTimeout(timerBuscar.current);
    timerBuscar.current = setTimeout(() => {
      fetchDiagnosticos({ vehiculo: val, estado: filtroEstado });
    }, 400);
  };

  const handleOpenDelete = (diagnostico) => {
    setDiagnosticoToDelete(diagnostico);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!diagnosticoToDelete) return;
    try {
      setIsDeleting(true);
      await eliminarDiagnostico(diagnosticoToDelete.id_diagnostico);
      setDiagnosticos((prev) =>
        prev.filter((d) => d.id_diagnostico !== diagnosticoToDelete.id_diagnostico)
      );
      showToast('Diagnóstico y archivos asociados eliminados correctamente', 'success');
      setIsDeleteModalOpen(false);
    } catch (err) {
      showToast(err.message || 'Error al eliminar diagnóstico', 'error');
    } finally {
      setIsDeleting(false);
      setDiagnosticoToDelete(null);
    }
  };

  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return '—';
    const fecha = new Date(fechaStr);
    return fecha.toLocaleString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getWhatsAppLink = (d) => {
    if (!d.cliente_telefono) return null;
    const cleanPhone = d.cliente_telefono.replace(/[^0-9]/g, '');
    const urlDetalle = `${window.location.origin}/diagnosticos/${d.id_diagnostico}`;
    const texto = `Hola ${d.cliente || ''}! Le saludamos desde Zedan Motors.\nLe compartimos el diagnóstico inicial de su vehículo ${d.placa} (${d.marca} ${d.modelo}):\n${urlDetalle}`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(texto)}`;
  };

  return (
    <div className="diagnosticos-container">
      {/* ── Encabezado Principal ── */}
      <div className="diagnosticos-header">
        <div className="diagnosticos-header-info">
          <h2>
            <ClipboardCheck size={24} className="text-primary" />
            Diagnóstico y Recepción
          </h2>
          <p>
            Registro de ingreso de vehículos, revisión de accesorios, nivel de gasolina y evidencias fotográficas/videos.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/diagnosticos/nuevo')}
          className="btn-primary-custom"
        >
          <Plus size={18} />
          Nuevo Diagnóstico
        </button>
      </div>

      {/* ── Barra de Búsqueda, Filtros y Conteo ── */}
      <div className="diagnosticos-filters-bar">
        <div className="filters-group-left">
          <div className="search-bar">
            <Search size={16} />
            <input
              type="text"
              placeholder="Buscar por placa, marca, modelo o cliente..."
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>

          <select
            className="filter-select"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="En proceso">En proceso</option>
            <option value="Finalizado">Finalizado</option>
          </select>

          <button
            type="button"
            className="btn-secondary-custom"
            onClick={() => fetchDiagnosticos({ vehiculo: searchTerm, estado: filtroEstado })}
            title="Refrescar lista"
          >
            <RotateCw size={15} />
          </button>
        </div>

        <div className="stat-pill">
          <span>Total:</span>
          <strong>{diagnosticos.length}</strong>
          <span>registros</span>
        </div>
      </div>

      {/* ── Tabla Principal ── */}
      <div className="card-custom">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            <RotateCw size={28} className="spin" style={{ marginBottom: '8px' }} />
            <p>Cargando registros de diagnóstico...</p>
          </div>
        ) : diagnosticos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            <ClipboardCheck size={40} style={{ color: '#cbd5e1', marginBottom: '10px' }} />
            <p style={{ fontWeight: 600, fontSize: '15px', color: '#334155' }}>
              No se encontraron diagnósticos
            </p>
            <p style={{ fontSize: '13px' }}>
              Registra el primer diagnóstico al momento en que un vehículo ingrese al taller.
            </p>
            <button
              type="button"
              onClick={() => navigate('/diagnosticos/nuevo')}
              className="btn-primary-custom"
              style={{ marginTop: '16px' }}
            >
              <Plus size={16} />
              Crear Diagnóstico
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table-custom">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>#</th>
                  <th>Vehículo</th>
                  <th>Cliente</th>
                  <th>Fecha Ingreso</th>
                  <th>Kilometraje / Gasolina</th>
                  <th>Evidencias</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {diagnosticos.map((d) => {
                  const wsLink = getWhatsAppLink(d);
                  return (
                    <tr key={d.id_diagnostico}>
                      <td style={{ fontWeight: 700, color: '#94a3b8' }}>
                        #{d.id_diagnostico}
                      </td>
                      <td>
                        <div className="vehiculo-info-cell">
                          <div>
                            <span className="placa-badge">{d.placa || 'SIN PLACA'}</span>
                          </div>
                          <span className="vehiculo-marca-modelo">
                            {d.marca} {d.modelo} {d.color ? `(${d.color})` : ''}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: 600, color: '#1e293b' }}>
                            {d.cliente || 'No especificado'}
                          </span>
                          {d.cliente_telefono && (
                            <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                              Tel: {d.cliente_telefono}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
                          <Clock size={14} style={{ color: '#94a3b8' }} />
                          <span>{formatearFecha(d.fecha_ingreso)}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontWeight: 600, color: '#0f172a' }}>
                            {Number(d.kilometraje || 0).toLocaleString()} km
                          </span>
                          <span className={`badge-gasolina ${d.nivel_gasolina === 'Reserva' ? 'reserva' : d.nivel_gasolina === 'Lleno' ? 'lleno' : ''}`}>
                            <Fuel size={12} />
                            {d.nivel_gasolina}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '12px' }}>
                          <span style={{ color: '#1e3a8a', fontWeight: 500 }}>
                            ✓ {d.total_accesorios || 0} accesorios
                          </span>
                          <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <FileImage size={12} />
                            {d.total_archivos || 0} fotos/videos
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge-status ${d.estado === 'Finalizado' ? 'finalizado' : 'proceso'}`}>
                          {d.estado === 'Finalizado' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                          {d.estado}
                        </span>
                      </td>
                      <td className="acciones-td" style={{ textAlign: 'right' }}>
                        <div className="acciones-flex">
                          <button
                            type="button"
                            onClick={() => navigate(`/diagnosticos/${d.id_diagnostico}`)}
                            className="btn-accion ver"
                            title="Ver detalle del diagnóstico"
                          >
                            <Eye size={15} />
                            <span>Ver</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/diagnosticos/editar/${d.id_diagnostico}`)}
                            className="btn-accion editar"
                            title="Editar diagnóstico"
                          >
                            <Pencil size={15} />
                          </button>
                          {wsLink && (
                            <a
                              href={wsLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-accion whatsapp"
                              title="Enviar por WhatsApp"
                            >
                              <Send size={14} />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(d)}
                            className="btn-accion eliminar"
                            title="Eliminar diagnóstico"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal Confirmar Eliminación ── */}
      {isDeleteModalOpen && diagnosticoToDelete && (
        <div className="modal-overlay" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="modal-dialog-custom modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom">
              <h3 className="modal-title-custom" style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={20} />
                Eliminar Diagnóstico
              </h3>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body-custom">
              <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#334155' }}>
                ¿Estás seguro de que deseas eliminar el diagnóstico{' '}
                <strong>#{diagnosticoToDelete.id_diagnostico}</strong> del vehículo{' '}
                <strong>{diagnosticoToDelete.placa}</strong>?
              </p>
              <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', padding: '12px', fontSize: '12.5px', color: '#991b1b' }}>
                <AlertCircle size={15} style={{ display: 'inline', marginRight: '6px', verticalAlign: '-2px' }} />
                Esta acción eliminará permanentemente la revisión de accesorios y todos los archivos de fotos y videos almacenados.
              </div>
            </div>
            <div className="modal-footer-custom">
              <button
                type="button"
                className="btn-secondary-custom"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-danger-custom"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Eliminando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast de Notificación ── */}
      {toast && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

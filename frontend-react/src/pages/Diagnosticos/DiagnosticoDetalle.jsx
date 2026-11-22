import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Send,
  Car,
  User,
  Clock,
  Gauge,
  Fuel,
  CheckSquare,
  Camera,
  Video,
  FileImage,
  AlertTriangle,
  RotateCw,
  CheckCircle2,
  X,
  ExternalLink,
  MessageCircle
} from 'lucide-react';
import {
  getDiagnostico,
  eliminarDiagnostico,
  eliminarArchivo
} from '../../services/diagnosticoService';
import './Diagnosticos.css';

export default function DiagnosticoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [diagnostico, setDiagnostico] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  // Modal para eliminar diagnóstico
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal para visualización ampliada de imagen
  const [previewMedia, setPreviewMedia] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  };

  const fetchDetalle = async () => {
    try {
      setLoading(true);
      const data = await getDiagnostico(id);
      setDiagnostico(data);
    } catch (err) {
      console.error('Error cargando detalle:', err);
      setError(err.message || 'Error al cargar el diagnóstico.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetalle();
  }, [id]);

  const handleDeleteDiagnostico = async () => {
    try {
      setIsDeleting(true);
      await eliminarDiagnostico(id);
      navigate('/diagnosticos');
    } catch (err) {
      showToast(err.message || 'Error al eliminar diagnóstico', 'error');
      setIsDeleting(false);
    }
  };

  const handleDeleteArchivo = async (archivo) => {
    if (!window.confirm(`¿Eliminar ${archivo.nombre_original}?`)) return;
    try {
      await eliminarArchivo(id, archivo.id_archivo);
      setDiagnostico((prev) => ({
        ...prev,
        archivos: prev.archivos.filter((a) => a.id_archivo !== archivo.id_archivo)
      }));
      showToast('Archivo eliminado correctamente', 'success');
    } catch (err) {
      showToast(err.message || 'Error al eliminar archivo', 'error');
    }
  };

  /**
   * Construye el enlace de WhatsApp pre-llenado (wa.me)
   * 
   * NOTA IMPORTANTE:
   * La API estándar de enlaces directos `https://wa.me/` NO permite adjuntar archivos binarios (fotos o videos)
   * directamente en el mensaje por restricciones del protocolo web de WhatsApp. Por ello, se generan y adjuntan
   * los enlaces URL seguros de las evidencias para que el cliente pueda abrirlas directamente.
   * 
   * INTEGRACIÓN FUTURA:
   * Si en el futuro se desea el envío automático desatendido y adjuntos directos, este método puede integrarse
   * con la API de WhatsApp Cloud / Business API o Twilio Messaging API enviando mensajes multimedia mediante:
   * POST https://graph.facebook.com/v17.0/{PHONE_NUMBER_ID}/messages
   * { "type": "image", "image": { "link": archivo.url } }
   */
  const generarWhatsAppUrl = () => {
    if (!diagnostico) return '#';

    const telefonoRaw = diagnostico.cliente_telefono || diagnostico.telefono || '';
    // Asegurar formato internacional (código de país, Colombia +57 por defecto si tiene 10 dígitos)
    let telefono = telefonoRaw.replace(/[^0-9]/g, '');
    if (telefono.length === 10 && !telefono.startsWith('57')) {
      telefono = `57${telefono}`;
    }

    const clienteNombre = diagnostico.cliente || diagnostico.cliente_nombre || 'Estimado cliente';
    const placa = diagnostico.placa || 'Vehículo';
    const vehiculoDesc = `${diagnostico.marca || ''} ${diagnostico.modelo || ''}`.trim();
    const fecha = diagnostico.fecha_ingreso
      ? new Date(diagnostico.fecha_ingreso).toLocaleString('es-CO', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : '';

    let mensaje = `🚗 *ZEDAN MOTORS — REPORTE DE INGRESO Y DIAGNÓSTICO*\n\n`;
    mensaje += `Hola *${clienteNombre}*, le confirmamos la recepción de su vehículo en nuestro taller.\n\n`;
    mensaje += `📌 *Vehículo:* ${placa} ${vehiculoDesc ? `(${vehiculoDesc})` : ''}\n`;
    mensaje += `📅 *Fecha de Ingreso:* ${fecha}\n`;
    mensaje += `⏱ *Kilometraje:* ${Number(diagnostico.kilometraje || 0).toLocaleString()} km\n`;
    mensaje += `⛽ *Combustible:* ${diagnostico.nivel_gasolina}\n`;
    mensaje += `🚦 *Estado:* ${diagnostico.estado}\n`;

    if (diagnostico.observaciones) {
      mensaje += `\n📝 *Observaciones Iniciales:*\n${diagnostico.observaciones}\n`;
    }

    // Enlaces de fotos y videos
    if (diagnostico.archivos && diagnostico.archivos.length > 0) {
      mensaje += `\n📷 *Fotos y Videos de Evidencia de Recepción:*\n`;
      diagnostico.archivos.forEach((arc, i) => {
        const link = arc.url || arc.ruta;
        const desc = arc.descripcion ? ` (${arc.descripcion})` : '';
        mensaje += `${i + 1}. ${arc.tipo === 'video' ? '🎥 Video' : '📸 Foto'}${desc}: ${link}\n`;
      });
    }

    mensaje += `\nCualquier consulta estamos atentos a este chat. ¡Gracias por confiar en Zedan Motors! 🔧`;

    return `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
  };

  const formatoMb = (bytes) => `${(Number(bytes || 0) / (1024 * 1024)).toFixed(1)} MB`;

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: 'var(--muted, #64748b)' }}>
        <RotateCw size={30} className="spin" style={{ marginBottom: '10px' }} />
        <p>Cargando información del diagnóstico...</p>
      </div>
    );
  }

  if (error || !diagnostico) {
    return (
      <div className="diagnosticos-container">
        <div style={{ background: 'var(--error-bg, #fef2f2)', border: '1px solid #fee2e2', borderRadius: '12px', padding: '24px', textAlign: 'center', color: 'var(--error, #b91c1c)' }}>
          <AlertTriangle size={32} style={{ marginBottom: '8px' }} />
          <h3>Error al cargar el diagnóstico</h3>
          <p>{error || 'El diagnóstico solicitado no existe.'}</p>
          <button
            type="button"
            onClick={() => navigate('/diagnosticos')}
            className="btn-secondary-custom"
            style={{ marginTop: '14px' }}
          >
            <ArrowLeft size={16} />
            Volver a Diagnósticos
          </button>
        </div>
      </div>
    );
  }

  const wsLink = generarWhatsAppUrl();

  return (
    <div className="diagnosticos-container">
      {/* ── Barra Superior de Acciones ── */}
      <div className="detalle-topbar">
        <button
          type="button"
          onClick={() => navigate('/diagnosticos')}
          className="btn-secondary-custom"
        >
          <ArrowLeft size={16} />
          <span>Volver a la Lista</span>
        </button>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <a
            href={wsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-whatsapp-custom"
            title="Enviar reporte completo con enlaces al cliente por WhatsApp"
          >
            <Send size={16} />
            <span>Enviar por WhatsApp</span>
          </a>

          <button
            type="button"
            onClick={() => navigate(`/diagnosticos/editar/${id}`)}
            className="btn-secondary-custom"
          >
            <Pencil size={16} />
            <span>Editar</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="btn-danger-custom"
          >
            <Trash2 size={16} />
            <span>Eliminar</span>
          </button>
        </div>
      </div>

      {/* ── Tarjeta Hero con Información del Vehículo y Recepción ── */}
      <div className="detalle-hero-card">
        <div className="hero-vehiculo-info">
          <h3>
            <span className="placa-badge" style={{ fontSize: '18px', padding: '5px 12px' }}>
              {diagnostico.placa}
            </span>
            <span>
              {diagnostico.marca} {diagnostico.modelo} {diagnostico.anio ? `• ${diagnostico.anio}` : ''}
            </span>
          </h3>
          <p>
            Color: <strong>{diagnostico.color || 'No especificado'}</strong> • Propietario:{' '}
            <strong>{diagnostico.cliente || 'No especificado'}</strong>{' '}
            {diagnostico.cliente_telefono && `(Tel: ${diagnostico.cliente_telefono})`}
          </p>
        </div>

        <div className="hero-stats-grid">
          <div className="hero-stat-item">
            <span className="hero-stat-label">Fecha Ingreso</span>
            <span className="hero-stat-value" style={{ fontSize: '13px' }}>
              {new Date(diagnostico.fecha_ingreso).toLocaleDateString('es-CO', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              })}
            </span>
          </div>
          <div className="hero-stat-item">
            <span className="hero-stat-label">Kilometraje</span>
            <span className="hero-stat-value">
              {Number(diagnostico.kilometraje || 0).toLocaleString()} km
            </span>
          </div>
          <div className="hero-stat-item">
            <span className="hero-stat-label">Combustible</span>
            <span className="hero-stat-value">{diagnostico.nivel_gasolina}</span>
          </div>
          <div className="hero-stat-item">
            <span className="hero-stat-label">Estado</span>
            <span className="hero-stat-value">
              <span className={`badge-status ${diagnostico.estado === 'Finalizado' ? 'finalizado' : 'proceso'}`}>
                {diagnostico.estado}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* ── Observaciones Generales ── */}
      <div className="card-custom">
        <h4 style={{ margin: '0 0 10px 0', fontSize: '15px', color: 'var(--heading, #1e3a8a)', fontWeight: 700 }}>
          Observaciones de Ingreso
        </h4>
        <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text, #334155)', lineHeight: 1.6 }}>
          {diagnostico.observaciones || 'No se registraron observaciones adicionales para este ingreso.'}
        </p>
      </div>

      {/* ── Tabla de Accesorios Verificados ── */}
      <div className="card-custom">
        <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: 'var(--heading, #1e3a8a)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckSquare size={18} className="text-primary" />
          <span>Inventario y Accesorios Verificados</span>
        </h4>
        <p style={{ fontSize: '12.5px', color: 'var(--muted, #64748b)', margin: '0 0 16px 0' }}>
          Estado en el que se entregaron los accesorios del vehículo al momento de la recepción.
        </p>

        <div className="table-responsive">
          <table className="table-custom">
            <thead>
              <tr>
                <th style={{ width: '40%' }}>Accesorio / Elemento</th>
                <th style={{ width: '25%' }}>Estado</th>
                <th style={{ width: '35%' }}>Observación</th>
              </tr>
            </thead>
            <tbody>
              {diagnostico.accesorios && diagnostico.accesorios.length > 0 ? (
                diagnostico.accesorios.map((acc, idx) => {
                  const estLower = (acc.estado || '').toLowerCase().replace(/\s+/g, '-');
                  return (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600, color: 'var(--text, #1e293b)' }}>{acc.nombre}</td>
                      <td>
                        <span className={`badge-accesorio ${estLower}`}>
                          {acc.estado}
                        </span>
                      </td>
                      <td style={{ color: 'var(--muted, #64748b)', fontSize: '13px' }}>
                        {acc.observacion || '—'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', color: 'var(--muted, #94a3b8)', padding: '20px' }}>
                    No se registraron accesorios para este diagnóstico.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Galería de Evidencias Fotográficas y Videos ── */}
      <div className="card-custom">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--heading, #1e3a8a)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Camera size={18} className="text-primary" />
              <span>Evidencias Multimedia ({diagnostico.archivos?.length || 0})</span>
            </h4>
            <p style={{ fontSize: '12.5px', color: 'var(--muted, #64748b)', margin: '4px 0 0 0' }}>
              Fotos y videos adjuntos como prueba del estado físico de recepción.
            </p>
          </div>
        </div>

        {diagnostico.archivos && diagnostico.archivos.length > 0 ? (
          <div className="archivos-grid">
            {diagnostico.archivos.map((arc) => (
              <div key={arc.id_archivo} className="archivo-card">
                <div
                  className="archivo-media-container"
                  style={{ cursor: arc.tipo === 'imagen' ? 'pointer' : 'default' }}
                  onClick={() => arc.tipo === 'imagen' && setPreviewMedia(arc)}
                >
                  <span className="archivo-badge-tipo">
                    {arc.tipo === 'video' ? <Video size={12} /> : <FileImage size={12} />}
                    {arc.tipo.toUpperCase()}
                  </span>
                  {arc.tipo === 'imagen' ? (
                    arc.url ? (
                      <img
                        src={arc.url}
                        alt={arc.nombre_original}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.classList.add('img-fallback-active');
                        }}
                      />
                    ) : (
                      <div className="img-fallback-active">
                        <FileImage size={24} style={{ color: '#cbd5e1' }} />
                        <span>Foto guardada</span>
                      </div>
                    )
                  ) : (
                    <video src={arc.url || ''} controls />
                  )}
                  {arc.tipo === 'imagen' && arc.url && (
                    <div className="archivo-media-overlay" title="Click para ampliar">
                      <ExternalLink size={16} />
                      <span>Ampliar</span>
                    </div>
                  )}
                </div>

                <div className="archivo-info">
                  <span className="archivo-nombre" title={arc.nombre_original}>
                    {arc.nombre_original}
                  </span>
                  <span className="archivo-meta">
                    {formatoMb(arc.tamano)} • {new Date(arc.creado_en || Date.now()).toLocaleDateString('es-CO')}
                  </span>
                  {arc.descripcion && (
                    <p style={{ fontSize: '12px', color: 'var(--heading, #1e3a8a)', margin: '4px 0 0 0', fontWeight: 500 }}>
                      📝 {arc.descripcion}
                    </p>
                  )}
                </div>

                <div className="archivo-actions">
                  {arc.tipo === 'imagen' ? (
                    <button
                      type="button"
                      onClick={() => setPreviewMedia(arc)}
                      className="btn-accion ver"
                      style={{ fontSize: '11.5px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      title="Ver foto ampliada"
                    >
                      <FileImage size={13} />
                      <span>Ver foto</span>
                    </button>
                  ) : (
                    <a
                      href={arc.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-accion ver"
                      style={{ fontSize: '11.5px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      title="Abrir video"
                      onClick={(e) => {
                        if (!arc.url || !arc.url.startsWith('http')) {
                          e.preventDefault();
                          alert('El video aún no está disponible.');
                        }
                      }}
                    >
                      <Video size={13} />
                      <span>Ver video</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteArchivo(arc)}
                    className="btn-accion eliminar"
                    title="Eliminar este archivo"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--muted, #94a3b8)' }}>
            <FileImage size={36} style={{ color: '#cbd5e1', marginBottom: '8px' }} />
            <p style={{ margin: 0, fontSize: '13.5px' }}>
              No se adjuntaron fotos ni videos en este diagnóstico.
            </p>
          </div>
        )}
      </div>

      {/* ── Modal Visualizador Ampliado de Imágenes (Diseño Claro y Nítido) ── */}
      {previewMedia && (
        <div className="modal-overlay" onClick={() => setPreviewMedia(null)}>
          <div
            style={{
              maxWidth: '92vw',
              maxHeight: '92vh',
              background: 'var(--surface, #ffffff)',
              borderRadius: '16px',
              overflow: 'hidden',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 60px rgba(15, 23, 42, 0.35)',
              border: '1px solid var(--border, #e2e8f0)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del modal */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 20px',
                background: 'var(--canvas, #f8fafc)',
                borderBottom: '1px solid #e2e8f0'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'var(--blue-bg, #eff6ff)',
                    color: 'var(--heading, #1e3a8a)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <FileImage size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text, #1e293b)' }}>
                    {previewMedia.nombre_original}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--muted, #64748b)' }}>
                    {formatoMb(previewMedia.tamano)} {previewMedia.descripcion ? `• ${previewMedia.descripcion}` : ''}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {previewMedia.url && previewMedia.url.startsWith('http') && (
                  <a
                    href={previewMedia.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary-custom"
                    style={{ fontSize: '12px', padding: '6px 12px', textDecoration: 'none' }}
                  >
                    <ExternalLink size={13} />
                    <span>Pestaña nueva</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewMedia(null)}
                  style={{
                    background: 'var(--raised, #f1f5f9)',
                    border: 'none',
                    borderRadius: '8px',
                    width: '32px',
                    height: '32px',
                    color: 'var(--muted, #64748b)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Cerrar vista previa"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Contenedor de la foto con fondo claro e iluminación natural */}
            <div
              style={{
                padding: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--canvas, #f8fafc)',
                minHeight: '260px',
                maxHeight: '75vh',
                overflow: 'auto'
              }}
            >
              {previewMedia.url && previewMedia.url.startsWith('http') ? (
                <img
                  src={previewMedia.url}
                  alt={previewMedia.nombre_original}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '70vh',
                    objectFit: 'contain',
                    borderRadius: '8px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)'
                  }}
                />
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--muted, #64748b)', padding: '40px 20px' }}>
                  <FileImage size={48} style={{ color: '#cbd5e1', marginBottom: '12px' }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>La imagen aún no tiene un enlace activo.</p>
                  <p style={{ margin: '4px 0 0', fontSize: '12.5px' }}>
                    Asegúrate de que la foto se haya subido correctamente.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Confirmar Eliminación ── */}
      {isDeleteModalOpen && (
        <div className="modal-overlay" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="modal-dialog-custom modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom">
              <h3 className="modal-title-custom" style={{ color: 'var(--error, #ef4444)', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--text, #334155)' }}>
                ¿Deseas eliminar definitivamente este diagnóstico del vehículo{' '}
                <strong>{diagnostico.placa}</strong>?
              </p>
              <div style={{ background: 'var(--error-bg, #fef2f2)', border: '1px solid #fee2e2', borderRadius: '8px', padding: '12px', fontSize: '12.5px', color: 'var(--error, #991b1b)' }}>
                Se eliminarán los registros de accesorios y todos los archivos físicos subidos a Supabase.
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
                onClick={handleDeleteDiagnostico}
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

import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Video,
  UploadCloud,
  Trash2,
  AlertCircle,
  Play,
  CheckCircle2,
  Radio,
  Square,
  Sparkles,
  FileImage,
  X,
  Eye,
  ExternalLink
} from 'lucide-react';
import { prepararSubidaArchivo, eliminarArchivo } from '../../services/diagnosticoService';
import { subirVideoFirmado } from '../../services/storageService';

const MAX_MB = Number(import.meta.env.VITE_DIAG_MAX_MB || 25);
const ALLOWED_MIME = (
  import.meta.env.VITE_DIAG_ALLOWED_MIME ||
  'image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime'
)
  .split(',')
  .map((s) => s.trim().toLowerCase());

export default function ArchivoUploader({
  diagnosticoId,
  archivos = [],
  setArchivos,
  colaLocal = [],
  setColaLocal
}) {
  const [error, setError] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const [progresoSubida, setProgresoSubida] = useState(null);
  const [previewMedia, setPreviewMedia] = useState(null);

  // Cámara web en vivo (escritorio / navegador)
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [grabandoVideo, setGrabandoVideo] = useState(false);
  const [tiempoGrabacion, setTiempoGrabacion] = useState(0);

  const videoStreamRef = useRef(null);
  const streamObjectRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const videoChunksRef = useRef([]);
  const timerGrabacionRef = useRef(null);

  const fileInputRef = useRef(null);
  const cameraInputFotoRef = useRef(null);
  const cameraInputVideoRef = useRef(null);

  const formatoMb = (bytes) => `${(Number(bytes || 0) / (1024 * 1024)).toFixed(1)} MB`;

  // Detener cámara al desmontar
  useEffect(() => {
    return () => {
      detenerCamaraWeb();
    };
  }, []);

  const validarArchivo = (file) => {
    const mime = (file.type || '').toLowerCase();
    const esVideoExt = /\.(mp4|mov|webm|mkv)$/i.test(file.name);
    const esImgExt = /\.(jpg|jpeg|png|webp)$/i.test(file.name);

    const esValido = ALLOWED_MIME.includes(mime) || (file.type.startsWith('video/') && esVideoExt) || (file.type.startsWith('image/') && esImgExt);

    if (!esValido) {
      setError(`Formato no permitido (${file.type || file.name}). Use JPG, PNG, WEBP, MP4, WEBM o MOV.`);
      return false;
    }

    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`El archivo "${file.name}" pesa ${formatoMb(file.size)}, superando el límite de ${MAX_MB} MB.`);
      return false;
    }

    return true;
  };

  // Procesar archivos seleccionados o capturados
  const procesarArchivos = async (archivosRecibidos) => {
    setError('');
    const validos = Array.from(archivosRecibidos).filter(validarArchivo);
    if (validos.length === 0) return;

    // Si ya existe el diagnóstico en backend, subimos inmediatamente a Supabase
    if (diagnosticoId) {
      setSubiendo(true);
      for (let i = 0; i < validos.length; i++) {
        const file = validos[i];
        setProgresoSubida(`Subiendo archivo ${i + 1} de ${validos.length}...`);
        try {
          const tipo = file.type.startsWith('video') || /\.(mp4|mov|webm)$/i.test(file.name) ? 'video' : 'imagen';
          const firma = await prepararSubidaArchivo(diagnosticoId, {
            nombre_original: file.name,
            mime: file.type || (tipo === 'video' ? 'video/mp4' : 'image/jpeg'),
            tamano: file.size,
            tipo,
            descripcion: ''
          });

          // Subir directo a Supabase con la firma
          await subirVideoFirmado({
            bucket: firma.bucket || 'diagnosticos',
            ruta: firma.ruta,
            token: firma.token,
            archivo: file
          });

          // Añadir al estado
          setArchivos((prev) => [
            ...prev,
            {
              id_archivo: Date.now() + Math.random(),
              ruta: firma.ruta,
              url: URL.createObjectURL(file),
              tipo,
              nombre_original: file.name,
              tamano: file.size,
              descripcion: ''
            }
          ]);
        } catch (err) {
          setError(err.message || 'Error al subir archivo');
        }
      }
      setSubiendo(false);
      setProgresoSubida(null);
    } else {
      // Modo creación: guardamos en cola local con vista previa de blob
      const nuevos = validos.map((file) => {
        const tipo = file.type.startsWith('video') || /\.(mp4|mov|webm)$/i.test(file.name) ? 'video' : 'imagen';
        return {
          tempId: Date.now() + Math.random(),
          file,
          previewUrl: URL.createObjectURL(file),
          tipo,
          nombre_original: file.name,
          tamano: file.size,
          descripcion: ''
        };
      });
      setColaLocal((prev) => [...prev, ...nuevos]);
    }
  };

  // Cámara Web nativa con getUserMedia
  const iniciarCamaraWeb = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      });
      streamObjectRef.current = stream;
      setCamaraActiva(true);
      setTimeout(() => {
        if (videoStreamRef.current) {
          videoStreamRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      setError('No se pudo acceder a la cámara. Permita los permisos en su navegador.');
    }
  };

  const detenerCamaraWeb = () => {
    if (mediaRecorderRef.current && grabandoVideo) {
      mediaRecorderRef.current.stop();
    }
    if (streamObjectRef.current) {
      streamObjectRef.current.getTracks().forEach((track) => track.stop());
      streamObjectRef.current = null;
    }
    clearInterval(timerGrabacionRef.current);
    setCamaraActiva(false);
    setGrabandoVideo(false);
    setTiempoGrabacion(0);
  };

  const capturarFotoWebcam = () => {
    if (!videoStreamRef.current) return;
    const video = videoStreamRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `foto-diagnostico-${Date.now()}.jpg`, { type: 'image/jpeg' });
      procesarArchivos([file]);
      detenerCamaraWeb();
    }, 'image/jpeg', 0.9);
  };

  const iniciarGrabacionWebcam = () => {
    if (!streamObjectRef.current) return;
    videoChunksRef.current = [];
    const mediaRecorder = new MediaRecorder(streamObjectRef.current);
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        videoChunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(videoChunksRef.current, { type: 'video/mp4' });
      const file = new File([blob], `video-diagnostico-${Date.now()}.mp4`, { type: 'video/mp4' });
      procesarArchivos([file]);
      detenerCamaraWeb();
    };

    mediaRecorder.start();
    setGrabandoVideo(true);
    setTiempoGrabacion(0);
    timerGrabacionRef.current = setInterval(() => {
      setTiempoGrabacion((t) => t + 1);
    }, 1000);
  };

  const detenerGrabacionWebcam = () => {
    if (mediaRecorderRef.current && grabandoVideo) {
      mediaRecorderRef.current.stop();
    }
  };

  const handleEliminarRemoto = async (archivo) => {
    if (!window.confirm('¿Eliminar este archivo del diagnóstico?')) return;
    try {
      await eliminarArchivo(diagnosticoId, archivo.id_archivo);
      setArchivos((prev) => prev.filter((a) => a.id_archivo !== archivo.id_archivo));
    } catch (err) {
      setError(err.message || 'Error al eliminar archivo');
    }
  };

  const handleEliminarLocal = (tempId) => {
    setColaLocal((prev) => prev.filter((a) => a.tempId !== tempId));
  };

  const handleDescripcionChangeLocal = (tempId, desc) => {
    setColaLocal((prev) =>
      prev.map((a) => (a.tempId === tempId ? { ...a, descripcion: desc } : a))
    );
  };

  const handleDescripcionChangeRemoto = (idArchivo, desc) => {
    setArchivos((prev) =>
      prev.map((a) => (a.id_archivo === idArchivo ? { ...a, descripcion: desc } : a))
    );
  };

  return (
    <div className="form-section-card">
      <h3 className="form-section-title">
        <Camera size={18} className="text-primary" />
        <span>Fotos y Videos de Evidencia (Recepción)</span>
      </h3>
      <p style={{ fontSize: '12.5px', color: '#64748b', margin: '-8px 0 16px 0' }}>
        Capture o seleccione fotografías del estado de la carrocería, rayones, tablero y videos de funcionamiento.
        Máximo {MAX_MB} MB por archivo.
      </p>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '10px', padding: '10px 14px', color: '#b91c1c', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Opciones de Carga / Botones */}
      <div className="uploader-options-row">
        {/* Selector de archivos tradicional */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALLOWED_MIME.join(',')}
          style={{ display: 'none' }}
          onChange={(e) => {
            procesarArchivos(e.target.files);
            e.target.value = '';
          }}
        />

        {/* Captura nativa móvil para fotos */}
        <input
          ref={cameraInputFotoRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={(e) => {
            procesarArchivos(e.target.files);
            e.target.value = '';
          }}
        />

        {/* Captura nativa móvil para videos */}
        <input
          ref={cameraInputVideoRef}
          type="file"
          accept="video/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={(e) => {
            procesarArchivos(e.target.files);
            e.target.value = '';
          }}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="btn-primary-custom"
          disabled={subiendo}
        >
          <UploadCloud size={16} />
          Subir Archivos
        </button>

        <button
          type="button"
          onClick={() => {
            // Si está en celular abre cámara nativa, si está en PC puede abrir stream
            const esTactil = window.matchMedia('(pointer: coarse)').matches;
            if (esTactil) {
              cameraInputFotoRef.current?.click();
            } else {
              iniciarCamaraWeb();
            }
          }}
          className="btn-camara-capture"
          disabled={subiendo || camaraActiva}
        >
          <Camera size={16} />
          Tomar Foto
        </button>

        <button
          type="button"
          onClick={() => {
            const esTactil = window.matchMedia('(pointer: coarse)').matches;
            if (esTactil) {
              cameraInputVideoRef.current?.click();
            } else {
              iniciarCamaraWeb();
            }
          }}
          className="btn-camara-capture"
          disabled={subiendo || camaraActiva}
        >
          <Video size={16} />
          Grabar Video
        </button>
      </div>

      {/* Cámara Web en Vivo (Escritorio / Pantalla) */}
      {camaraActiva && (
        <div className="camera-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Radio size={16} style={{ color: '#ef4444' }} className="spin" />
              Cámara en Directo
            </span>
            <button
              type="button"
              onClick={detenerCamaraWeb}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          </div>

          <video ref={videoStreamRef} autoPlay playsInline muted className="camera-preview-video" />

          {grabandoVideo && (
            <div style={{ color: '#ef4444', fontWeight: 700, fontSize: '13px' }}>
              ● Grabando: {tiempoGrabacion}s
            </div>
          )}

          <div className="camera-controls">
            {!grabandoVideo ? (
              <>
                <button
                  type="button"
                  onClick={capturarFotoWebcam}
                  className="btn-primary-custom"
                >
                  <Camera size={16} />
                  Capturar Foto
                </button>
                <button
                  type="button"
                  onClick={iniciarGrabacionWebcam}
                  className="btn-danger-custom"
                >
                  <Video size={16} />
                  Iniciar Grabación
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={detenerGrabacionWebcam}
                className="btn-danger-custom"
              >
                <Square size={16} />
                Detener y Guardar
              </button>
            )}
            <button
              type="button"
              onClick={detenerCamaraWeb}
              className="btn-secondary-custom"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Indicador de subida */}
      {subiendo && (
        <div style={{ padding: '12px', background: '#eff6ff', borderRadius: '10px', color: '#1e3a8a', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <Radio size={16} className="spin" />
          <span>{progresoSubida || 'Subiendo archivos a Supabase Storage...'}</span>
        </div>
      )}

      {/* Grid de Previsualización: Archivos Remotos ya subidos */}
      {archivos.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#334155', margin: '0 0 8px 0' }}>
            Archivos Guardados ({archivos.length})
          </h4>
          <div className="archivos-grid">
            {archivos.map((arc) => (
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
                    <img
                      src={arc.url || arc.ruta}
                      alt={arc.nombre_original}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.classList.add('img-fallback-active');
                      }}
                    />
                  ) : (
                    <video src={arc.url || arc.ruta} controls />
                  )}
                  {arc.tipo === 'imagen' && (
                    <div className="archivo-media-overlay" title="Click para ampliar">
                      <Eye size={16} />
                      <span>Ver foto</span>
                    </div>
                  )}
                </div>
                <div className="archivo-info">
                  <span className="archivo-nombre" title={arc.nombre_original}>
                    {arc.nombre_original}
                  </span>
                  <span className="archivo-meta">{formatoMb(arc.tamano)}</span>
                  <input
                    type="text"
                    placeholder="Descripción (ej. golpe lateral)"
                    value={arc.descripcion || ''}
                    onChange={(e) => handleDescripcionChangeRemoto(arc.id_archivo, e.target.value)}
                    className="form-control-custom"
                    style={{ fontSize: '11.5px', padding: '4px 8px', marginTop: '4px' }}
                  />
                </div>
                <div className="archivo-actions">
                  <span style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={13} /> Guardado
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {arc.tipo === 'imagen' && (
                      <button
                        type="button"
                        onClick={() => setPreviewMedia(arc)}
                        className="btn-accion ver"
                        title="Ver foto ampliada"
                        style={{ padding: '4px 8px' }}
                      >
                        <Eye size={13} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleEliminarRemoto(arc)}
                      className="btn-accion eliminar"
                      title="Eliminar archivo"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid de Previsualización: Archivos en cola local (listos para subirse al guardar) */}
      {colaLocal.length > 0 && (
        <div>
          <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#1e3a8a', margin: '0 0 8px 0' }}>
            Archivos Nuevos por Subir ({colaLocal.length})
          </h4>
          <div className="archivos-grid">
            {colaLocal.map((arc) => (
              <div key={arc.tempId} className="archivo-card">
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
                    <img src={arc.previewUrl} alt={arc.nombre_original} />
                  ) : (
                    <video src={arc.previewUrl} controls />
                  )}
                  {arc.tipo === 'imagen' && (
                    <div className="archivo-media-overlay" title="Click para ampliar">
                      <Eye size={16} />
                      <span>Ver foto</span>
                    </div>
                  )}
                </div>
                <div className="archivo-info">
                  <span className="archivo-nombre" title={arc.nombre_original}>
                    {arc.nombre_original}
                  </span>
                  <span className="archivo-meta">{formatoMb(arc.tamano)}</span>
                  <input
                    type="text"
                    placeholder="Descripción (ej. rayón puerta)"
                    value={arc.descripcion || ''}
                    onChange={(e) => handleDescripcionChangeLocal(arc.tempId, e.target.value)}
                    className="form-control-custom"
                    style={{ fontSize: '11.5px', padding: '4px 8px', marginTop: '4px' }}
                  />
                </div>
                <div className="archivo-actions">
                  <span style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 600 }}>
                    Pendiente
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {arc.tipo === 'imagen' && (
                      <button
                        type="button"
                        onClick={() => setPreviewMedia(arc)}
                        className="btn-accion ver"
                        title="Ver foto ampliada"
                        style={{ padding: '4px 8px' }}
                      >
                        <Eye size={13} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleEliminarLocal(arc.tempId)}
                      className="btn-accion eliminar"
                      title="Quitar archivo"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Modal Visualizador Ampliado de Imágenes ── */}
      {previewMedia && (
        <div className="modal-overlay" onClick={() => setPreviewMedia(null)}>
          <div
            style={{
              maxWidth: '92vw',
              maxHeight: '92vh',
              background: '#ffffff',
              borderRadius: '16px',
              overflow: 'hidden',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 60px rgba(15, 23, 42, 0.35)',
              border: '1px solid #e2e8f0'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 20px',
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: '#eff6ff',
                    color: '#1e3a8a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <FileImage size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#1e293b' }}>
                    {previewMedia.nombre_original}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                    {formatoMb(previewMedia.tamano)} {previewMedia.descripcion ? `• ${previewMedia.descripcion}` : ''}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPreviewMedia(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '8px',
                  width: '32px',
                  height: '32px',
                  color: '#64748b',
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

            <div
              style={{
                padding: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f8fafc',
                minHeight: '260px',
                maxHeight: '75vh',
                overflow: 'auto'
              }}
            >
              <img
                src={previewMedia.previewUrl || previewMedia.url || previewMedia.ruta}
                alt={previewMedia.nombre_original}
                style={{
                  maxWidth: '100%',
                  maxHeight: '70vh',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)'
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

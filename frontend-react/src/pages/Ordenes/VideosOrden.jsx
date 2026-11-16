import { useEffect, useRef, useState } from 'react';
import { Video, Upload, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  getVideosOrden,
  firmarVideoOrden,
  registrarVideoOrden,
  eliminarVideoOrden
} from '../../services/ordenesService';
import { subirVideoFirmado } from '../../services/storageService';
import './VideosOrden.css';

const SECCIONES = [
  {
    tipo: 'recepcion',
    titulo: 'Recepción del vehículo',
    ayuda: 'Al recibirlo en el taller: carrocería, daños previos, tablero y kilometraje.',
    vacio: 'Aún no hay video de recepción'
  },
  {
    tipo: 'entrega',
    titulo: 'Entrega del vehículo',
    ayuda: 'Al entregarlo al cliente: cómo queda al terminar el trabajo.',
    vacio: 'Aún no hay video de entrega'
  }
];

// Los videos son evidencia: solo estos roles pueden borrarlos (el servidor también lo exige).
const ROLES_ELIMINAR = ['Administrador', 'Jefe de taller'];

const formatoMb = (bytes) => `${(Number(bytes) / (1024 * 1024)).toFixed(1)} MB`;
const formatoFecha = (fecha) =>
  new Date(fecha).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

// Algunos celulares Android entregan el video sin tipo MIME; se acepta por la extensión.
const esVideo = (archivo) =>
  archivo.type.startsWith('video/') || (!archivo.type && /\.(mp4|mov|webm|3gp|m4v|mkv)$/i.test(archivo.name));

// Importante: este componente vive dentro del <form> de la orden, por eso todos los botones son type="button".
export default function VideosOrden({ idOrden }) {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [recarga, setRecarga] = useState(0);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [subiendo, setSubiendo] = useState(null); // tipo que se está subiendo
  const entradas = useRef({});

  const puedeEliminar = ROLES_ELIMINAR.includes(sessionStorage.getItem('rol'));

  useEffect(() => {
    let activo = true;
    getVideosOrden(idOrden)
      .then((d) => {
        if (!activo) return;
        setDatos(d);
        setError('');
      })
      .catch((err) => activo && setError(err.message))
      .finally(() => activo && setCargando(false));
    return () => {
      activo = false;
    };
  }, [idOrden, recarga]);

  const handleArchivo = async (tipo, e) => {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;

    setError('');
    setAviso('');

    if (!esVideo(archivo)) {
      setError('El archivo seleccionado no es un video.');
      return;
    }
    const maxMb = datos?.max_mb ?? 50;
    if (archivo.size > maxMb * 1024 * 1024) {
      setError(
        `El video pesa ${formatoMb(archivo.size)} y el máximo es ${maxMb} MB. ` +
          'Grábalo en menor calidad (por ejemplo 720p) o recórtalo.'
      );
      return;
    }

    setSubiendo(tipo);
    try {
      // 1) el servidor valida y da permiso · 2) el navegador sube directo al almacenamiento · 3) se registra
      const firma = await firmarVideoOrden(idOrden, { tipo, archivo });
      await subirVideoFirmado({ bucket: firma.bucket, ruta: firma.ruta, token: firma.token, archivo });
      await registrarVideoOrden(idOrden, { tipo, ruta: firma.ruta, nombreArchivo: archivo.name });
      setAviso('Video guardado correctamente.');
      setRecarga((n) => n + 1);
    } catch (err) {
      setError(err.message || 'No se pudo subir el video.');
    } finally {
      setSubiendo(null);
    }
  };

  const handleEliminar = async (video) => {
    if (!window.confirm('¿Eliminar este video? Es una evidencia y no se podrá recuperar.')) return;
    setError('');
    setAviso('');
    try {
      await eliminarVideoOrden(idOrden, video.id_video);
      setRecarga((n) => n + 1);
    } catch (err) {
      setError(err.message || 'No se pudo eliminar el video.');
    }
  };

  const maxPorTipo = datos?.max_por_tipo ?? 5;
  const sinAlmacenamiento = datos?.almacenamiento === false;

  return (
    <div className="orden-detalle-section videos-orden">
      <h4 className="detalle-heading videos-heading">
        <Video size={18} className="text-primary" />
        <span>Videos de recepción y entrega</span>
      </h4>

      {error && (
        <div className="alert-modal-error">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}
      {aviso && (
        <div className="videos-ok">
          <CheckCircle2 size={16} />
          <span>{aviso}</span>
        </div>
      )}
      {sinAlmacenamiento && (
        <div className="videos-aviso">
          El almacenamiento de videos aún no está configurado en el servidor, por eso no se
          pueden subir ni reproducir videos.
        </div>
      )}

      <div className="videos-grid">
        {SECCIONES.map(({ tipo, titulo, ayuda, vacio }) => {
          const lista = (datos?.videos || []).filter((v) => v.tipo === tipo);
          const lleno = lista.length >= maxPorTipo;

          return (
            <div className="videos-col" key={tipo}>
              <strong className="videos-col-titulo">{titulo}</strong>
              <p className="videos-col-ayuda">{ayuda}</p>

              {cargando ? (
                <div className="lista-vacia">Cargando…</div>
              ) : lista.length === 0 ? (
                <div className="lista-vacia">{vacio}</div>
              ) : (
                lista.map((v) => (
                  <div className="video-item" key={v.id_video}>
                    {v.url ? (
                      <video controls preload="metadata" playsInline src={v.url} />
                    ) : (
                      <div className="video-no-disponible">Video no disponible por ahora</div>
                    )}
                    <div className="video-meta">
                      <div>
                        <div className="video-nombre" title={v.nombre_archivo}>
                          {v.nombre_archivo}
                        </div>
                        <div className="video-sub">
                          {formatoFecha(v.fecha)} · {formatoMb(v.tamano)}
                          {v.subido_por ? ` · ${v.subido_por}` : ''}
                        </div>
                      </div>
                      {puedeEliminar && (
                        <button
                          type="button"
                          className="btn-quitar"
                          title="Eliminar video"
                          onClick={() => handleEliminar(v)}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}

              <input
                type="file"
                accept="video/*"
                hidden
                ref={(el) => {
                  entradas.current[tipo] = el;
                }}
                onChange={(e) => handleArchivo(tipo, e)}
              />
              <button
                type="button"
                className="btn-secondary-custom videos-subir"
                disabled={Boolean(subiendo) || lleno || sinAlmacenamiento}
                onClick={() => entradas.current[tipo]?.click()}
              >
                <Upload size={16} />
                <span>
                  {subiendo === tipo
                    ? 'Subiendo… no cierres esta ventana'
                    : lleno
                      ? `Máximo ${maxPorTipo} videos`
                      : 'Subir video'}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {datos && !sinAlmacenamiento && (
        <p className="videos-nota">
          Máximo {datos.max_mb} MB por video y {maxPorTipo} por tipo. Los videos son privados: solo
          se pueden ver desde el sistema.
        </p>
      )}
    </div>
  );
}

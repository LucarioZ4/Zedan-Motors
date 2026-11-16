import { useState, useRef } from 'react';
import {
  X,
  Camera,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Plus,
  Sparkles,
  Info,
  Loader2
} from 'lucide-react';
import {
  analizarImagenesIA,
  confirmarAnalisisIA,
  descartarAnalisisIA
} from '../../services/inventarioIaService';
import './AnalisisIAModal.css';

/**
 * Reduce la imagen con un canvas HTML5 a máx. ~1568 px en su lado más largo
 * y calidad JPEG 0.85 (recomendación oficial de Anthropic para vision).
 */
const reducirImagenCanvas = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const MAX_DIM = 1568;
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file); // fallback si falla canvas
              return;
            }
            const reducedFile = new File(
              [blob],
              file.name.replace(/\.[^.]+$/, '') + '.jpg',
              { type: 'image/jpeg' }
            );
            resolve(reducedFile);
          },
          'image/jpeg',
          0.85
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

export default function AnalisisIAModal({
  isOpen,
  onClose,
  onSuccess,
  maxImagenes = 5,
  maxMb = 5
}) {
  // Pasos: 1 = 'fotos', 2 = 'analizando', 3 = 'revision'
  const [paso, setPaso] = useState(1);
  const [fotos, setFotos] = useState([]); // Array de { file, previewUrl }
  const [fotoSeleccionadaIdx, setFotoSeleccionadaIdx] = useState(0);

  // Datos devueltos por el backend
  const [idAnalisis, setIdAnalisis] = useState(null);
  const [advertencias, setAdvertencias] = useState([]);
  const [itemsPropuestos, setItemsPropuestos] = useState([]);

  // Estados UI
  const [errorModal, setErrorModal] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // ── Paso 1: Manejo de Fotos ──
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setErrorModal('');
    const disponibles = maxImagenes - fotos.length;
    if (files.length > disponibles) {
      setErrorModal(`Solo puedes subir hasta ${maxImagenes} fotos en total.`);
    }

    const seleccionadas = files.slice(0, disponibles);
    const nuevas = seleccionadas.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file)
    }));

    setFotos((prev) => [...prev, ...nuevas]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleQuitarFoto = (index) => {
    setFotos((prev) => {
      const copy = [...prev];
      if (copy[index]?.previewUrl) URL.revokeObjectURL(copy[index].previewUrl);
      copy.splice(index, 1);
      return copy;
    });
    if (fotoSeleccionadaIdx >= index && fotoSeleccionadaIdx > 0) {
      setFotoSeleccionadaIdx((prev) => prev - 1);
    }
  };

  const handleIniciarAnalisis = async () => {
    if (fotos.length === 0) {
      setErrorModal('Selecciona al menos una foto para comenzar.');
      return;
    }

    setErrorModal('');
    setPaso(2); // Estado 'analizando' con spinner
    setIsProcessing(true);

    try {
      // Reducir cada imagen client-side
      const imagenesReducidas = await Promise.all(
        fotos.map((item) => reducirImagenCanvas(item.file))
      );

      const data = await analizarImagenesIA(imagenesReducidas, 'entrada');

      setIdAnalisis(data.id_analisis);
      setAdvertencias(data.advertencias || []);

      // Formatear ítems para la tabla editable
      const itemsFormateados = (data.items || []).map((it) => {
        const tieneCoincidencia = it.candidatos && it.candidatos.length > 0;
        let accionInicial;

        if (it.estado === 'coincide' && tieneCoincidencia) {
          accionInicial = 'actualizar';
        } else if (it.estado === 'nuevo') {
          accionInicial = 'crear';
        } else {
          accionInicial = 'revisar'; // Requiere elección del usuario
        }

        return {
          indice: it.indice,
          descripcion: it.descripcion,
          categoria: it.categoria,
          marca: it.marca,
          referencia: it.referencia,
          codigo_barras: it.codigo_barras,
          evidencia: it.evidencia,
          confianza: it.confianza,
          estadoOriginal: it.estado,
          candidatos: it.candidatos || [],
          // Valores editables
          cantidad: it.cantidad || 1,
          accion: accionInicial, // 'actualizar' | 'crear' | 'ignorar' | 'revisar'
          id_repuesto_seleccionado: tieneCoincidencia ? it.candidatos[0].id_repuesto : null,
          nuevo: {
            nombre: it.descripcion || '',
            marca: it.marca || '',
            precio: '',
            referencia: it.referencia || '',
            codigo_barras: it.codigo_barras || ''
          }
        };
      });

      setItemsPropuestos(itemsFormateados);
      setPaso(3); // Estado 'revision'
    } catch (err) {
      setErrorModal(err.message || 'Error al analizar las imágenes');
      setPaso(1);
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Paso 3: Edición de la propuesta ──
  const handleItemChange = (index, field, value) => {
    setItemsPropuestos((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleNuevoFieldChange = (index, field, value) => {
    setItemsPropuestos((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        nuevo: { ...copy[index].nuevo, [field]: value }
      };
      return copy;
    });
  };

  // Validación: todos los ítems deben tener acción válida resuelta y los nuevos precio > 0
  const esPropuestaValida = () => {
    if (itemsPropuestos.length === 0) return false;

    for (const it of itemsPropuestos) {
      if (it.accion === 'revisar') return false; // Falta resolver
      if (it.accion === 'ignorar') continue;

      const cant = parseInt(it.cantidad, 10);
      if (isNaN(cant) || cant < 1 || cant > 10000) return false;

      if (it.accion === 'actualizar') {
        if (!it.id_repuesto_seleccionado) return false;
      } else if (it.accion === 'crear') {
        if (!it.nuevo?.nombre?.trim()) return false;
        const precio = parseFloat(it.nuevo?.precio);
        if (isNaN(precio) || precio <= 0) return false;
      }
    }
    return true;
  };

  const handleConfirmar = async () => {
    if (!esPropuestaValida()) {
      setErrorModal('Por favor resuelve todos los ítems marcados para revisión y verifica que los precios sean válidos.');
      return;
    }

    setIsProcessing(true);
    setErrorModal('');

    try {
      const payloadItems = itemsPropuestos.map((it) => ({
        indice: it.indice,
        accion: it.accion,
        id_repuesto: it.accion === 'actualizar' ? Number(it.id_repuesto_seleccionado) : undefined,
        cantidad: parseInt(it.cantidad, 10),
        descripcion_detectada: it.descripcion,
        nuevo:
          it.accion === 'crear'
            ? {
                nombre: it.nuevo.nombre.trim(),
                marca: it.nuevo.marca?.trim() || null,
                precio: parseFloat(it.nuevo.precio),
                referencia: it.nuevo.referencia?.trim() || null,
                codigo_barras: it.nuevo.codigo_barras?.trim() || null
              }
            : undefined
      }));

      const res = await confirmarAnalisisIA(idAnalisis, payloadItems);
      onSuccess?.(res);
      handleCerrar();
    } catch (err) {
      setErrorModal(err.message || 'Error al confirmar inventario');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDescartar = async () => {
    if (idAnalisis) {
      try {
        await descartarAnalisisIA(idAnalisis);
      } catch (e) {
        console.warn('Error al descartar análisis:', e);
      }
    }
    handleCerrar();
  };

  const handleCerrar = () => {
    fotos.forEach((f) => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    });
    setFotos([]);
    setPaso(1);
    setErrorModal('');
    setItemsPropuestos([]);
    setIdAnalisis(null);
    onClose();
  };

  const getBadgeConfianza = (conf) => {
    if (conf >= 0.8) {
      return <span className="badge-ia-confianza alta">Alta ({Math.round(conf * 100)}%)</span>;
    }
    if (conf >= 0.5) {
      return <span className="badge-ia-confianza media">Media ({Math.round(conf * 100)}%)</span>;
    }
    return <span className="badge-ia-confianza baja">Baja ({Math.round(conf * 100)}%)</span>;
  };

  return (
    <div className="modal-overlay" onClick={handleCerrar}>
      <div
        className={`modal-dialog-custom modal-ia ${paso === 3 ? 'modal-ia-ancho' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="modal-header-custom modal-ia-header">
          <div className="d-flex align-items-center gap-2">
            <div className="ia-icon-bubble">
              <Sparkles size={18} />
            </div>
            <div>
              <h5 className="modal-title-custom mb-0">Actualizar inventario con IA</h5>
              <span className="ia-header-subtitle">
                {paso === 1 && 'Paso 1: Selecciona o toma hasta 5 fotografías'}
                {paso === 2 && 'Paso 2: Procesando con visión artificial...'}
                {paso === 3 && 'Paso 3: Revisa y confirma la propuesta antes de actualizar'}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="btn-modal-close"
            onClick={handleCerrar}
            disabled={isProcessing}
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div className="modal-body-custom modal-ia-body">
          {errorModal && (
            <div className="alert-modal-error mb-3">
              <AlertCircle size={16} />
              <span>{errorModal}</span>
            </div>
          )}

          {/* ════════════ PASO 1: SUBIR FOTOS ════════════ */}
          {paso === 1 && (
            <div className="ia-paso-fotos">
              {/* Guía corta */}
              <div className="ia-guia-box">
                <Info size={18} className="ia-guia-icon" />
                <div>
                  <strong>Consejos para una detección óptima:</strong>
                  <p className="mb-0">
                    Ubica los objetos separados, en una sola capa, con fondo liso y buena luz.
                    Si necesitas que el modelo lea la referencia exacta, agrega una foto de cerca de la etiqueta.
                    Facturas y remisiones impresas también son bienvenidas.
                  </p>
                </div>
              </div>

              {/* Botón de carga y zona de fotos */}
              <div className="ia-upload-zone" onClick={() => fileInputRef.current?.click()}>
                <Camera size={38} className="ia-upload-icon" />
                <h6>Haz clic para tomar o seleccionar fotos</h6>
                <p>Formatos JPEG, PNG o WebP (máx. {maxImagenes} fotos, {maxMb} MB c/u)</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
              </div>

              {/* Grid de Miniaturas */}
              {fotos.length > 0 && (
                <div className="ia-thumbnails-grid">
                  {fotos.map((item, idx) => (
                    <div key={idx} className="ia-thumbnail-item">
                      <img src={item.previewUrl} alt={`Foto ${idx + 1}`} />
                      <button
                        type="button"
                        className="btn-ia-delete-thumb"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuitarFoto(idx);
                        }}
                        title="Quitar foto"
                      >
                        <Trash2 size={13} />
                      </button>
                      <span className="ia-thumb-index">#{idx + 1}</span>
                    </div>
                  ))}
                  {fotos.length < maxImagenes && (
                    <button
                      type="button"
                      className="ia-btn-add-more"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Plus size={20} />
                      <span>Agregar otra</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ════════════ PASO 2: ANALIZANDO ════════════ */}
          {paso === 2 && (
            <div className="ia-paso-loading">
              <Loader2 size={46} className="ia-spinner" />
              <h5>Analizando imágenes con Claude...</h5>
              <p>
                Extrayendo repuestos, identificando marcas, referencias y cruzando con el catálogo de Zedan Motors.
                Este proceso toma unos segundos.
              </p>
            </div>
          )}

          {/* ════════════ PASO 3: REVISIÓN DE PROPUESTA ════════════ */}
          {paso === 3 && (
            <div className="ia-paso-revision">
              {/* Advertencias */}
              {advertencias.length > 0 && (
                <div className="ia-advertencias-box">
                  <AlertTriangle size={18} className="text-warning-icon" />
                  <div>
                    <strong>Observaciones del modelo:</strong>
                    <ul className="mb-0">
                      {advertencias.map((adv, i) => (
                        <li key={i}>{adv}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <div className="ia-revision-split">
                {/* Panel Izquierdo: Foto Grande y selector */}
                <div className="ia-foto-preview-panel">
                  <div className="ia-foto-viewer">
                    {fotos[fotoSeleccionadaIdx] ? (
                      <img
                        src={fotos[fotoSeleccionadaIdx].previewUrl}
                        alt="Foto seleccionada"
                        className="ia-foto-grande"
                      />
                    ) : (
                      <div className="ia-no-foto">Sin foto</div>
                    )}
                  </div>
                  {fotos.length > 1 && (
                    <div className="ia-foto-strip">
                      {fotos.map((f, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className={`ia-strip-thumb ${idx === fotoSeleccionadaIdx ? 'active' : ''}`}
                          onClick={() => setFotoSeleccionadaIdx(idx)}
                        >
                          <img src={f.previewUrl} alt={`Foto ${idx + 1}`} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Panel Derecho: Tabla de Ítems */}
                <div className="ia-tabla-panel">
                  <div className="ia-tabla-responsive">
                    <table className="table-custom ia-tabla">
                      <thead>
                        <tr>
                          <th>Ítem detectado</th>
                          <th style={{ width: '90px' }}>Cant.</th>
                          <th>Coincidencia en Catálogo</th>
                          <th style={{ width: '100px' }}>Confianza</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itemsPropuestos.map((it, idx) => {
                          const requiereAtencion = it.accion === 'revisar';
                          return (
                            <tr
                              key={idx}
                              className={`ia-item-row ${requiereAtencion ? 'row-revisar' : ''}`}
                            >
                              <td>
                                <div className="ia-item-desc">{it.descripcion}</div>
                                <div className="ia-item-meta">
                                  {it.marca && <span>Marca: {it.marca}</span>}
                                  {it.referencia && <span>Ref: {it.referencia}</span>}
                                  {it.codigo_barras && <span>Código: {it.codigo_barras}</span>}
                                </div>
                                {it.evidencia && (
                                  <div className="ia-item-evidencia">
                                    <em>Evidencia:</em> {it.evidencia}
                                  </div>
                                )}
                              </td>

                              {/* Cantidad editable */}
                              <td>
                                <input
                                  type="number"
                                  min="1"
                                  max="10000"
                                  className="field-input ia-input-cant"
                                  value={it.cantidad}
                                  onChange={(e) =>
                                    handleItemChange(idx, 'cantidad', e.target.value)
                                  }
                                />
                              </td>

                              {/* Selector de Coincidencia */}
                              <td>
                                <select
                                  className={`field-input ia-select-coincidencia ${requiereAtencion ? 'select-warning' : ''}`}
                                  value={
                                    it.accion === 'actualizar'
                                      ? `act_${it.id_repuesto_seleccionado}`
                                      : it.accion === 'crear'
                                      ? 'accion_crear'
                                      : it.accion === 'ignorar'
                                      ? 'accion_ignorar'
                                      : 'accion_revisar'
                                  }
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val.startsWith('act_')) {
                                      const id = Number(val.replace('act_', ''));
                                      handleItemChange(idx, 'accion', 'actualizar');
                                      handleItemChange(idx, 'id_repuesto_seleccionado', id);
                                    } else if (val === 'accion_crear') {
                                      handleItemChange(idx, 'accion', 'crear');
                                    } else if (val === 'accion_ignorar') {
                                      handleItemChange(idx, 'accion', 'ignorar');
                                    } else {
                                      handleItemChange(idx, 'accion', 'revisar');
                                    }
                                  }}
                                >
                                  {requiereAtencion && (
                                    <option value="accion_revisar" disabled>
                                      ⚠️ Selecciona una opción...
                                    </option>
                                  )}
                                  {it.candidatos.map((cand) => (
                                    <option key={cand.id_repuesto} value={`act_${cand.id_repuesto}`}>
                                      Actualizar: {cand.nombre} ({cand.marca || 'Genérica'} - Ref:{' '}
                                      {cand.referencia || 'S/R'})
                                    </option>
                                  ))}
                                  <option value="accion_crear">+ Crear repuesto nuevo</option>
                                  <option value="accion_ignorar">✕ Ignorar este ítem</option>
                                </select>

                                {/* Formulario para 'crear' nuevo repuesto */}
                                {it.accion === 'crear' && (
                                  <div className="ia-subform-nuevo">
                                    <div className="ia-subform-grid">
                                      <div>
                                        <label className="ia-sub-label">Nombre *</label>
                                        <input
                                          type="text"
                                          className="field-input ia-sub-input"
                                          value={it.nuevo.nombre}
                                          onChange={(e) =>
                                            handleNuevoFieldChange(idx, 'nombre', e.target.value)
                                          }
                                          required
                                        />
                                      </div>
                                      <div>
                                        <label className="ia-sub-label">Marca</label>
                                        <input
                                          type="text"
                                          className="field-input ia-sub-input"
                                          value={it.nuevo.marca}
                                          onChange={(e) =>
                                            handleNuevoFieldChange(idx, 'marca', e.target.value)
                                          }
                                        />
                                      </div>
                                      <div>
                                        <label className="ia-sub-label">Precio ($) *</label>
                                        <input
                                          type="number"
                                          step="0.01"
                                          min="0.01"
                                          className="field-input ia-sub-input"
                                          placeholder="0.00"
                                          value={it.nuevo.precio}
                                          onChange={(e) =>
                                            handleNuevoFieldChange(idx, 'precio', e.target.value)
                                          }
                                          required
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </td>

                              {/* Insignia de Confianza */}
                              <td>{getBadgeConfianza(it.confianza)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pie del Modal */}
        <div className="modal-footer-custom modal-ia-footer">
          {paso === 1 && (
            <>
              <button
                type="button"
                className="btn-secondary-custom"
                onClick={handleCerrar}
                disabled={isProcessing}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary-custom"
                onClick={handleIniciarAnalisis}
                disabled={isProcessing || fotos.length === 0}
              >
                <Sparkles size={16} />
                <span>Analizar con IA ({fotos.length})</span>
              </button>
            </>
          )}

          {paso === 3 && (
            <>
              <button
                type="button"
                className="btn-secondary-custom"
                onClick={handleDescartar}
                disabled={isProcessing}
              >
                Descartar propuesta
              </button>
              <button
                type="button"
                className="btn-primary-custom"
                onClick={handleConfirmar}
                disabled={isProcessing || !esPropuestaValida()}
                title={
                  !esPropuestaValida()
                    ? 'Resuelve los ítems en revisión y completa los campos obligatorios'
                    : 'Confirmar y actualizar stock'
                }
              >
                <CheckCircle2 size={16} />
                <span>{isProcessing ? 'Confirmando...' : 'Confirmar inventario'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

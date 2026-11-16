import { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, Camera, X, Check, AlertTriangle, ArrowLeft } from 'lucide-react';
import {
  getInventario,
  analizarFotoInventario,
  aplicarConteoIA
} from '../../services/inventarioService';
import { prepararImagen } from '../../utils/imagen';
import './InventarioIA.css';

const MODOS = {
  sumar: {
    titulo: 'Ingreso de mercancía',
    ayuda: 'Suma lo que se ve en la foto al stock actual. Úsalo cuando llega un pedido.'
  },
  establecer: {
    titulo: 'Conteo físico',
    ayuda: 'Reemplaza el stock por lo contado en la foto. Úsalo al inventariar una estantería.'
  }
};

const ETIQUETA_CONFIANZA = { alta: 'Confianza alta', media: 'Confianza media', baja: 'Confianza baja' };

const filasDesdeIA = (items) =>
  items.map((it, i) => ({
    key: `${i}-${it.nombre_detectado}`,
    nombre: it.nombre_detectado,
    marca: it.marca_detectada || '',
    cantidad: it.cantidad,
    confianza: it.confianza,
    nota: it.nota || '',
    // 'id:<n>' = repuesto existente · 'nuevo' = crear uno · 'ignorar' = no tocar
    seleccion: it.id_repuesto ? `id:${it.id_repuesto}` : 'nuevo',
    nuevoNombre: it.nombre_detectado,
    nuevaMarca: it.marca_detectada || '',
    nuevoPrecio: ''
  }));

const errorDeFila = (f) => {
  if (f.seleccion === 'ignorar') return '';
  const cantidad = Number(f.cantidad);
  if (f.cantidad === '' || !Number.isInteger(cantidad) || cantidad < 0) return 'Cantidad inválida';
  if (f.seleccion === 'nuevo') {
    if (!f.nuevoNombre.trim()) return 'Falta el nombre';
    if (!(Number(f.nuevoPrecio) > 0)) return 'Falta el precio';
  }
  return '';
};

export default function InventarioIA({ onClose, onApplied }) {
  const [paso, setPaso] = useState('foto'); // 'foto' | 'revision'
  const [modo, setModo] = useState('sumar');
  const [imagen, setImagen] = useState(null);
  const [catalogo, setCatalogo] = useState([]);
  const [filas, setFilas] = useState([]);
  const [observaciones, setObservaciones] = useState('');
  const [nota, setNota] = useState('');
  const [analizando, setAnalizando] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const ocupado = analizando || aplicando;

  // El catálogo completo se necesita para mostrar el stock actual y elegir con qué repuesto coincide cada fila.
  useEffect(() => {
    let activo = true;
    getInventario('')
      .then((data) => activo && setCatalogo(data || []))
      .catch(() => activo && setError('No se pudo cargar el inventario actual.'));
    return () => {
      activo = false;
    };
  }, []);

  const catalogoPorId = useMemo(() => new Map(catalogo.map((r) => [r.id_repuesto, r])), [catalogo]);

  const activas = filas.filter((f) => f.seleccion !== 'ignorar');
  const hayErrores = activas.some((f) => errorDeFila(f));

  const actualizarFila = (key, cambios) =>
    setFilas((prev) => prev.map((f) => (f.key === key ? { ...f, ...cambios } : f)));

  const handleArchivo = async (e) => {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    setError('');
    try {
      setImagen(await prepararImagen(archivo));
    } catch (err) {
      setImagen(null);
      setError(err.message);
    }
  };

  const handleAnalizar = async () => {
    if (!imagen) return;
    setError('');
    setAnalizando(true);
    try {
      const data = await analizarFotoInventario(imagen);
      setFilas(filasDesdeIA(data.items));
      setObservaciones(data.observaciones || '');
      setPaso('revision');
    } catch (err) {
      setError(err.message || 'No se pudo analizar la imagen.');
    } finally {
      setAnalizando(false);
    }
  };

  const handleAplicar = async () => {
    setError('');
    const items = activas.map((f) =>
      f.seleccion === 'nuevo'
        ? {
            cantidad: Number(f.cantidad),
            nuevo: {
              nombre: f.nuevoNombre.trim(),
              marca: f.nuevaMarca.trim(),
              precio: Number(f.nuevoPrecio)
            }
          }
        : { id_repuesto: Number(f.seleccion.slice(3)), cantidad: Number(f.cantidad) }
    );

    setAplicando(true);
    try {
      const data = await aplicarConteoIA({ modo, items, nota: nota.trim() });
      onApplied(data.mensaje);
      onClose();
    } catch (err) {
      setError(err.message || 'No se pudo actualizar el inventario.');
    } finally {
      setAplicando(false);
    }
  };

  const cerrar = () => !ocupado && onClose();

  return (
    <div className="modal-overlay" onClick={cerrar}>
      <div className="modal-dialog-custom ia-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-custom">
          <h5 className="modal-title-custom ia-title">
            <Sparkles size={18} />
            <span>Contar inventario con IA</span>
          </h5>
          <button type="button" className="btn-modal-close" onClick={cerrar}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body-custom">
          {error && (
            <div className="alert-modal-error">
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {paso === 'foto' && (
            <>
              <label className="field-label">¿Qué vas a hacer con esta foto?</label>
              <div className="ia-modos">
                {Object.entries(MODOS).map(([clave, m]) => (
                  <button
                    key={clave}
                    type="button"
                    className={`ia-modo ${modo === clave ? 'activo' : ''}`}
                    onClick={() => setModo(clave)}
                  >
                    <strong>{m.titulo}</strong>
                    <span>{m.ayuda}</span>
                  </button>
                ))}
              </div>

              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleArchivo}
              />

              {imagen ? (
                <div className="ia-preview">
                  <img src={imagen.preview} alt="Foto a analizar" />
                  <div className="ia-preview-info">
                    <span>Foto lista ({imagen.kb} KB)</span>
                    <button
                      type="button"
                      className="btn-secondary-custom"
                      disabled={ocupado}
                      onClick={() => inputRef.current?.click()}
                    >
                      <Camera size={16} />
                      <span>Cambiar foto</span>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="ia-subir"
                  onClick={() => inputRef.current?.click()}
                >
                  <Camera size={28} />
                  <strong>Tomar o elegir una foto</strong>
                  <span>
                    Buena luz, productos separados y con la etiqueta a la vista. La IA solo
                    cuenta lo que se ve.
                  </span>
                </button>
              )}
            </>
          )}

          {paso === 'revision' && (
            <>
              <div className="ia-aviso">
                <AlertTriangle size={16} />
                <span>
                  La IA puede equivocarse al contar. Revisa cada fila y corrige lo que haga
                  falta: <strong>nada se guarda hasta que pulses &quot;Aplicar&quot;</strong>.
                </span>
              </div>
              {observaciones && <p className="ia-observaciones">{observaciones}</p>}

              {filas.length === 0 ? (
                <p className="ia-vacio">
                  La IA no identificó productos en la foto. Prueba con otra más cercana o con
                  mejor luz.
                </p>
              ) : (
                <div className="table-responsive">
                  <table className="table-custom ia-tabla">
                    <thead>
                      <tr>
                        <th>Detectado</th>
                        <th>Cantidad</th>
                        <th>Repuesto</th>
                        <th>Resultado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filas.map((f) => {
                        const rep = f.seleccion.startsWith('id:')
                          ? catalogoPorId.get(Number(f.seleccion.slice(3)))
                          : null;
                        const cantidad = Number(f.cantidad) || 0;
                        const errorFila = errorDeFila(f);

                        return (
                          <tr key={f.key} className={f.seleccion === 'ignorar' ? 'ia-ignorada' : ''}>
                            <td>
                              <div className="td-primary">{f.nombre}</div>
                              <div className="td-sub">{f.marca || 'Sin marca visible'}</div>
                              <span className={`ia-confianza ${f.confianza}`}>
                                {ETIQUETA_CONFIANZA[f.confianza]}
                              </span>
                              {f.nota && <div className="td-sub">{f.nota}</div>}
                            </td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                className="field-input ia-cantidad"
                                value={f.cantidad}
                                onChange={(e) => actualizarFila(f.key, { cantidad: e.target.value })}
                              />
                            </td>
                            <td>
                              <select
                                className="field-input"
                                value={f.seleccion}
                                onChange={(e) => actualizarFila(f.key, { seleccion: e.target.value })}
                              >
                                <option value="nuevo">➕ Crear repuesto nuevo</option>
                                <option value="ignorar">🚫 Ignorar esta fila</option>
                                {catalogo.map((r) => (
                                  <option key={r.id_repuesto} value={`id:${r.id_repuesto}`}>
                                    {r.nombre}
                                    {r.marca ? ` — ${r.marca}` : ''} (stock {r.stock})
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              {f.seleccion === 'ignorar' && <span className="td-muted">No se modifica</span>}
                              {rep && (
                                <span className="ia-resultado">
                                  {rep.stock} → <strong>{modo === 'sumar' ? rep.stock + cantidad : cantidad}</strong>
                                </span>
                              )}
                              {f.seleccion === 'nuevo' && (
                                <div className="ia-nuevo">
                                  <input
                                    type="text"
                                    className="field-input"
                                    placeholder="Nombre"
                                    value={f.nuevoNombre}
                                    onChange={(e) => actualizarFila(f.key, { nuevoNombre: e.target.value })}
                                  />
                                  <input
                                    type="text"
                                    className="field-input"
                                    placeholder="Marca (opcional)"
                                    value={f.nuevaMarca}
                                    onChange={(e) => actualizarFila(f.key, { nuevaMarca: e.target.value })}
                                  />
                                  <input
                                    type="number"
                                    min="0"
                                    className="field-input"
                                    placeholder="Precio *"
                                    value={f.nuevoPrecio}
                                    onChange={(e) => actualizarFila(f.key, { nuevoPrecio: e.target.value })}
                                  />
                                </div>
                              )}
                              {errorFila && <div className="ia-error-fila">{errorFila}</div>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <label className="field-label ia-nota-label">Nota del movimiento (opcional)</label>
              <input
                type="text"
                className="field-input"
                maxLength={200}
                placeholder="Ej. Pedido proveedor, conteo de fin de mes…"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
              />
            </>
          )}
        </div>

        <div className="modal-footer-custom">
          {paso === 'foto' ? (
            <>
              <button type="button" className="btn-secondary-custom" disabled={ocupado} onClick={onClose}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary-custom"
                disabled={!imagen || ocupado}
                onClick={handleAnalizar}
              >
                <Sparkles size={16} />
                <span>{analizando ? 'Analizando…' : 'Analizar con IA'}</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn-secondary-custom"
                disabled={ocupado}
                onClick={() => setPaso('foto')}
              >
                <ArrowLeft size={16} />
                <span>Otra foto</span>
              </button>
              <button
                type="button"
                className="btn-primary-custom"
                disabled={ocupado || activas.length === 0 || hayErrores}
                onClick={handleAplicar}
              >
                <Check size={16} />
                <span>
                  {aplicando
                    ? 'Aplicando…'
                    : `Aplicar al inventario (${activas.length} ${activas.length === 1 ? 'cambio' : 'cambios'})`}
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

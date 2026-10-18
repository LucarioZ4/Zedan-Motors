import React, { useEffect, useState, useRef } from 'react';
import {
  getInventario,
  getRepuestoById,
  createRepuesto,
  updateRepuesto,
  deleteRepuesto,
  importarRepuestos
} from '../../services/inventarioService';
import './Inventario.css';

const emptyForm = {
  id_repuesto: null,
  nombre: '',
  marca: '',
  precio: '',
  stock: 0
};

export default function Inventario() {
  const [repuestos, setRepuestos] = useState([]);
  const [todosRepuestos, setTodosRepuestos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroStock, setFiltroStock] = useState('todos');

  // Modal Formulario (Crear/Editar)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [repuestoActual, setRepuestoActual] = useState(emptyForm);
  const [modalError, setModalError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Modal Eliminar
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [repuestoToDelete, setRepuestoToDelete] = useState(null);

  // Modal Importar CSV
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [itemsParaImportar, setItemsParaImportar] = useState([]);
  const [importError, setImportError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);
  const timerBuscar = useRef(null);
  const fileInputRef = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  };

  const fetchData = async (buscar = '') => {
    try {
      setLoading(true);
      const data = await getInventario(buscar);
      setTodosRepuestos(data || []);
    } catch (err) {
      console.error('Error al cargar inventario:', err);
      showToast(err.message || 'Error al cargar inventario', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    let lista = [...todosRepuestos];
    if (filtroStock === 'bajo') {
      lista = lista.filter((r) => r.stock_bajo || r.stock <= 5);
    } else if (filtroStock === 'ok') {
      lista = lista.filter((r) => !r.stock_bajo && r.stock > 5);
    }
    setRepuestos(lista);
  }, [filtroStock, todosRepuestos]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);

    if (timerBuscar.current) clearTimeout(timerBuscar.current);
    timerBuscar.current = setTimeout(async () => {
      try {
        const data = await getInventario(val);
        setTodosRepuestos(data || []);
      } catch (err) {
        console.error('Error filtrando inventario:', err);
      }
    }, 400);
  };

  // Modal Crear
  const handleOpenCreate = () => {
    setRepuestoActual(emptyForm);
    setModalError('');
    setModalMode('create');
    setIsModalOpen(true);
  };

  // Modal Editar
  const handleOpenEdit = async (id) => {
    try {
      const data = await getRepuestoById(id);
      setRepuestoActual({
        id_repuesto: data.id_repuesto,
        nombre: data.nombre || '',
        marca: data.marca || '',
        precio: data.precio || '',
        stock: data.stock ?? 0
      });
      setModalError('');
      setModalMode('edit');
      setIsModalOpen(true);
    } catch (err) {
      showToast(err.message || 'Error al cargar repuesto', 'error');
    }
  };

  // Guardar Repuesto
  const handleSaveRepuesto = async (e) => {
    e.preventDefault();
    if (!repuestoActual.nombre.trim()) {
      setModalError('El nombre es obligatorio.');
      return;
    }
    const precioNum = parseFloat(repuestoActual.precio);
    if (isNaN(precioNum) || precioNum <= 0) {
      setModalError('El precio debe ser un número mayor a cero.');
      return;
    }

    setIsSaving(true);
    setModalError('');

    try {
      const payload = {
        nombre: repuestoActual.nombre.trim(),
        marca: repuestoActual.marca.trim(),
        precio: precioNum,
        stock: parseInt(repuestoActual.stock) || 0
      };

      if (modalMode === 'edit') {
        await updateRepuesto(repuestoActual.id_repuesto, payload);
        showToast('Repuesto actualizado correctamente', 'success');
      } else {
        await createRepuesto(payload);
        showToast('Repuesto registrado con éxito', 'success');
      }

      setIsModalOpen(false);
      fetchData(searchTerm);
    } catch (err) {
      setModalError(err.message || 'Error al guardar repuesto');
    } finally {
      setIsSaving(false);
    }
  };

  // Modal Eliminar
  const handleOpenDelete = (repuesto) => {
    setRepuestoToDelete(repuesto);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!repuestoToDelete) return;
    try {
      await deleteRepuesto(repuestoToDelete.id_repuesto);
      setIsDeleteModalOpen(false);
      setRepuestoToDelete(null);
      showToast('Repuesto eliminado correctamente', 'success');
      fetchData(searchTerm);
    } catch (err) {
      showToast(err.message || 'Error al eliminar repuesto', 'error');
    }
  };

  // ── Importación Masiva CSV ──
  const handleOpenImport = () => {
    setCsvText('');
    setItemsParaImportar([]);
    setImportError('');
    setIsImportModalOpen(true);
  };

  const parsearCsvContenido = (texto) => {
    setImportError('');
    if (!texto || !texto.trim()) {
      setItemsParaImportar([]);
      return;
    }

    const lineas = texto
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lineas.length === 0) return;

    let inicio = 0;
    const primeraFila = lineas[0].toLowerCase();
    if (
      primeraFila.includes('nombre') ||
      primeraFila.includes('precio') ||
      primeraFila.includes('repuesto')
    ) {
      inicio = 1;
    }

    const items = [];
    for (let i = inicio; i < lineas.length; i++) {
      const linea = lineas[i];
      let separador = ',';
      if (linea.includes('\t')) separador = '\t';
      else if (linea.includes(';') && !linea.includes(',')) separador = ';';

      const cols = linea
        .split(separador)
        .map((c) => c.trim().replace(/^["']|["']$/g, ''));
      if (cols.length === 0 || !cols[0]) continue;

      const nombre = cols[0] || '';
      const marca = cols[1] || '';
      const precio = parseFloat(cols[2]?.replace(/[^0-9.]/g, '')) || 0;
      const stock = parseInt(cols[3]?.replace(/[^0-9]/g, '')) || 0;

      const esValido = nombre.length > 0 && precio > 0 && stock >= 0;

      items.push({
        fila: i + 1,
        nombre,
        marca,
        precio,
        stock,
        valido: esValido
      });
    }

    setItemsParaImportar(items);
  };

  const handleCsvTextChange = (e) => {
    const val = e.target.value;
    setCsvText(val);
    parsearCsvContenido(val);
  };

  const handleFileUpload = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      setCsvText(content);
      parsearCsvContenido(content);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleDescargarPlantilla = () => {
    const csvContent =
      'Nombre,Marca,Precio,Stock\n' +
      'Filtro de Aceite Sintetico,Bosch,15.50,20\n' +
      'Pastillas de Freno Delanteras,Brembo,45.00,12\n' +
      'Bujia de Iridio,Denso,8.75,50\n' +
      'Aceite 5W-30 Sintetico 1 Galon,Mobil,32.00,15\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'plantilla_repuestos_zedan.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEjecutarImportacion = async () => {
    const validos = itemsParaImportar.filter((it) => it.valido);
    if (validos.length === 0) {
      setImportError('No hay repuestos válidos para importar.');
      return;
    }

    setIsImporting(true);
    setImportError('');

    try {
      const res = await importarRepuestos(validos);
      setIsImportModalOpen(false);
      setItemsParaImportar([]);
      setCsvText('');
      showToast(res.mensaje || 'Repuestos importados correctamente', 'success');
      fetchData(searchTerm);
    } catch (err) {
      setImportError(err.message || 'Error durante la importación');
    } finally {
      setIsImporting(false);
    }
  };

  const repuestosBajos = todosRepuestos.filter(
    (r) => r.stock_bajo || r.stock <= 5
  );

  return (
    <div className="inventario-container">
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
      <div className="inventario-header">
        <div className="inventario-header-info">
          <h2>Inventario de Repuestos</h2>
          <p>Control de stock, precios y catálogo de piezas del taller.</p>
        </div>
        <div className="header-buttons">
          <button
            className="btn-secondary-custom"
            onClick={handleOpenImport}
            type="button"
          >
            <i className="bi bi-file-earmark-arrow-up"></i>
            <span>Importar CSV</span>
          </button>
          <button
            className="btn-primary-custom"
            onClick={handleOpenCreate}
            type="button"
          >
            <i className="bi bi-plus-lg"></i>
            <span>Nuevo repuesto</span>
          </button>
        </div>
      </div>

      {/* Alerta de Stock Bajo */}
      {repuestosBajos.length > 0 && (
        <div className="alert-stock">
          <i className="bi bi-exclamation-triangle-fill"></i>
          <div>
            <strong>¡Atención! {repuestosBajos.length} repuesto(s) con stock bajo:</strong>{' '}
            {repuestosBajos.map((r) => r.nombre).join(', ')}
          </div>
        </div>
      )}

      {/* Barra de búsqueda, filtro y contador */}
      <div className="inventario-actions-row">
        <div className="search-bar">
          <i className="bi bi-search"></i>
          <input
            type="text"
            placeholder="Buscar por nombre o marca..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
        <select
          className="filtro-select"
          value={filtroStock}
          onChange={(e) => setFiltroStock(e.target.value)}
        >
          <option value="todos">Todos los repuestos</option>
          <option value="bajo">Stock bajo (≤ 5)</option>
          <option value="ok">Stock suficiente</option>
        </select>
        <div className="stat-pill">
          <span>{repuestos.length}</span> repuestos
        </div>
      </div>

      {/* Tabla de Inventario */}
      <div className="card-custom">
        <div className="table-responsive">
          <table className="table-custom">
            <thead>
              <tr>
                <th>Repuesto</th>
                <th>Marca</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="table-empty">
                    Cargando inventario...
                  </td>
                </tr>
              ) : repuestos.length === 0 ? (
                <tr>
                  <td colSpan="6" className="table-empty">
                    No se encontraron repuestos registrados.
                  </td>
                </tr>
              ) : (
                repuestos.map((r) => {
                  const pct = Math.min(((r.stock || 0) / 20) * 100, 100);
                  const esBajo = r.stock_bajo || r.stock <= 5;
                  const color = esBajo ? '#ef4444' : '#16a34a';

                  return (
                    <tr key={r.id_repuesto}>
                      <td>
                        <div className="td-primary">{r.nombre}</div>
                        <div className="td-sub">ID #{r.id_repuesto}</div>
                      </td>
                      <td className="td-muted">{r.marca || '—'}</td>
                      <td>
                        <span className="td-precio">
                          ${parseFloat(r.precio || 0).toLocaleString('es-CO')}
                        </span>
                      </td>
                      <td>
                        <div className="stock-cell">
                          <div className="stock-bar">
                            <div
                              className="stock-bar-fill"
                              style={{ width: `${pct}%`, background: color }}
                            ></div>
                          </div>
                          <span style={{ fontWeight: 700, color }}>{r.stock}</span>
                        </div>
                      </td>
                      <td>
                        {esBajo ? (
                          <span className="badge-custom badge-stock-bajo">
                            Stock bajo
                          </span>
                        ) : (
                          <span className="badge-custom badge-stock-ok">
                            Normal
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          <button
                            className="btn-accion editar"
                            title="Editar repuesto"
                            onClick={() => handleOpenEdit(r.id_repuesto)}
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            className="btn-accion eliminar"
                            title="Eliminar repuesto"
                            onClick={() => handleOpenDelete(r)}
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

      {/* ── Modal Nuevo / Editar Repuesto ── */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => !isSaving && setIsModalOpen(false)}>
          <div className="modal-dialog-custom" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom">
              <h5 className="modal-title-custom">
                {modalMode === 'edit' ? 'Editar repuesto' : 'Nuevo repuesto'}
              </h5>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => !isSaving && setIsModalOpen(false)}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <form onSubmit={handleSaveRepuesto}>
              <div className="modal-body-custom">
                {modalError && (
                  <div className="alert-modal-error">
                    <i className="bi bi-exclamation-circle-fill"></i>
                    <span>{modalError}</span>
                  </div>
                )}

                <div className="form-grid">
                  <div className="form-group-full">
                    <label className="field-label">Nombre del repuesto *</label>
                    <input
                      type="text"
                      className="field-input"
                      placeholder="Ej. Pastillas de freno cerámicas"
                      value={repuestoActual.nombre}
                      onChange={(e) =>
                        setRepuestoActual((prev) => ({ ...prev, nombre: e.target.value }))
                      }
                      required
                    />
                  </div>

                  <div className="form-group-full">
                    <label className="field-label">Marca</label>
                    <input
                      type="text"
                      className="field-input"
                      placeholder="Ej. Bosch, Brembo, Denso..."
                      value={repuestoActual.marca}
                      onChange={(e) =>
                        setRepuestoActual((prev) => ({ ...prev, marca: e.target.value }))
                      }
                    />
                  </div>

                  <div>
                    <label className="field-label">Precio ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="field-input"
                      placeholder="0.00"
                      value={repuestoActual.precio}
                      onChange={(e) =>
                        setRepuestoActual((prev) => ({ ...prev, precio: e.target.value }))
                      }
                      required
                    />
                  </div>

                  <div>
                    <label className="field-label">Stock inicial</label>
                    <input
                      type="number"
                      min="0"
                      className="field-input"
                      placeholder="0"
                      value={repuestoActual.stock}
                      onChange={(e) =>
                        setRepuestoActual((prev) => ({ ...prev, stock: e.target.value }))
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
      {isDeleteModalOpen && repuestoToDelete && (
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
                ¿Eliminar el repuesto{' '}
                <strong style={{ color: '#1e293b' }}>{repuestoToDelete.nombre}</strong>?
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

      {/* ── Modal Importación Masiva CSV ── */}
      {isImportModalOpen && (
        <div className="modal-overlay" onClick={() => !isImporting && setIsImportModalOpen(false)}>
          <div className="modal-dialog-custom modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom">
              <h5 className="modal-title-custom">
                <i className="bi bi-file-earmark-spreadsheet me-2" style={{ color: '#3b82f6' }}></i>
                Importación masiva de repuestos
              </h5>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => !isImporting && setIsImportModalOpen(false)}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div className="modal-body-custom">
              {importError && (
                <div className="alert-modal-error">
                  <i className="bi bi-exclamation-circle-fill"></i>
                  <span>{importError}</span>
                </div>
              )}

              <div className="import-actions-row">
                <p className="import-desc">
                  Arrastra un archivo CSV o pega el texto separado por comas:
                </p>
                <button
                  type="button"
                  className="btn-plantilla"
                  onClick={handleDescargarPlantilla}
                >
                  <i className="bi bi-download"></i> Descargar plantilla CSV
                </button>
              </div>

              {/* Drop zone */}
              <div
                className={`drop-zone ${isDragOver ? 'dragover' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  if (e.dataTransfer.files?.length > 0) {
                    handleFileUpload(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <i className="bi bi-cloud-arrow-up drop-icon"></i>
                <p>Haz clic para seleccionar un archivo o arrástralo aquí</p>
                <span className="drop-hint">Formato .csv (Nombre, Marca, Precio, Stock)</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files?.length > 0) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />
              </div>

              <div style={{ marginTop: '14px' }}>
                <label className="field-label">O pega el texto CSV aquí</label>
                <textarea
                  className="field-input csv-textarea"
                  rows="3"
                  placeholder="Nombre,Marca,Precio,Stock&#10;Filtro de Aceite,Bosch,15.50,20"
                  value={csvText}
                  onChange={handleCsvTextChange}
                />
              </div>

              {/* Previsualización */}
              {itemsParaImportar.length > 0 && (
                <div className="preview-container">
                  <div className="preview-header">
                    <span>
                      Previsualización: <strong>{itemsParaImportar.length}</strong> repuestos
                      detectados
                    </span>
                    <span className="preview-valid-count">
                      {itemsParaImportar.filter((i) => i.valido).length} válidos
                    </span>
                  </div>
                  <div className="table-responsive" style={{ maxHeight: '200px' }}>
                    <table className="table-custom preview-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Nombre</th>
                          <th>Marca</th>
                          <th>Precio</th>
                          <th>Stock</th>
                          <th>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itemsParaImportar.map((it, idx) => (
                          <tr
                            key={idx}
                            style={{
                              background: it.valido ? 'transparent' : 'rgba(239, 68, 68, 0.06)'
                            }}
                          >
                            <td>{idx + 1}</td>
                            <td>
                              <strong>{it.nombre || '—'}</strong>
                            </td>
                            <td>{it.marca || '—'}</td>
                            <td>${it.precio?.toFixed?.(2) || it.precio}</td>
                            <td>{it.stock}</td>
                            <td>
                              {it.valido ? (
                                <span className="badge-custom badge-completada">
                                  <i className="bi bi-check"></i> Válido
                                </span>
                              ) : (
                                <span className="badge-custom badge-cancelada">
                                  <i className="bi bi-x"></i> Inválido
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer-custom">
              <button
                type="button"
                className="btn-secondary-custom"
                disabled={isImporting}
                onClick={() => setIsImportModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary-custom"
                disabled={
                  isImporting ||
                  itemsParaImportar.filter((i) => i.valido).length === 0
                }
                onClick={handleEjecutarImportacion}
              >
                <i className="bi bi-check-circle"></i>
                <span>{isImporting ? 'Importando...' : 'Confirmar Importación'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

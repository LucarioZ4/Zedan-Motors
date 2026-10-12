import React, { useEffect, useState, useRef } from 'react';
import {
  getVehiculos,
  createVehiculo,
  updateVehiculo,
  deleteVehiculo,
  importarVehiculos
} from '../../services/vehiculosService';
import { getClientes } from '../../services/clientesService';
import './Vehiculos.css';

export default function Vehiculos() {
  const [vehiculos, setVehiculos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados Modal Formulario (Crear / Editar)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [vehiculoActual, setVehiculoActual] = useState({
    id_vehiculo: null,
    placa: '',
    marca: '',
    modelo: '',
    anio: '',
    color: '',
    id_cliente: ''
  });
  const [modalError, setModalError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Estados Modal Eliminar
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [vehiculoToDelete, setVehiculoToDelete] = useState(null);

  // Estados Modal Importación Masiva
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importTab, setImportTab] = useState('file'); // 'file' | 'text'
  const [importClienteDefecto, setImportClienteDefecto] = useState('');
  const [importText, setImportText] = useState('');
  const [vehiculosParaImportar, setVehiculosParaImportar] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

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
      const [vData, cData] = await Promise.all([
        getVehiculos(buscar),
        getClientes()
      ]);
      setVehiculos(vData || []);
      setClientes(cData || []);
    } catch (err) {
      console.error('Error al cargar datos:', err);
      showToast(err.message || 'Error al cargar vehículos', 'error');
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
        const data = await getVehiculos(val);
        setVehiculos(data || []);
      } catch (err) {
        console.error('Error filtrando vehículos:', err);
      }
    }, 400);
  };

  // Abrir Modal Crear
  const handleOpenCreate = () => {
    setVehiculoActual({
      id_vehiculo: null,
      placa: '',
      marca: '',
      modelo: '',
      anio: '',
      color: '',
      id_cliente: ''
    });
    setModalError('');
    setModalMode('create');
    setIsModalOpen(true);
  };

  // Abrir Modal Editar
  const handleOpenEdit = (v) => {
    setVehiculoActual({
      id_vehiculo: v.id_vehiculo,
      placa: v.placa || '',
      marca: v.marca || '',
      modelo: v.modelo || '',
      anio: v.anio || '',
      color: v.color || '',
      id_cliente: v.id_cliente || ''
    });
    setModalError('');
    setModalMode('edit');
    setIsModalOpen(true);
  };

  // Guardar Vehículo
  const handleSaveVehiculo = async (e) => {
    e.preventDefault();
    if (!vehiculoActual.placa.trim() || !vehiculoActual.marca.trim() || !vehiculoActual.modelo.trim() || !vehiculoActual.id_cliente) {
      setModalError('Placa, marca, modelo y cliente son obligatorios.');
      return;
    }

    setIsSaving(true);
    setModalError('');

    try {
      const payload = {
        placa: vehiculoActual.placa.trim().toUpperCase(),
        marca: vehiculoActual.marca.trim(),
        modelo: vehiculoActual.modelo.trim(),
        anio: vehiculoActual.anio ? parseInt(vehiculoActual.anio) : null,
        color: vehiculoActual.color.trim(),
        id_cliente: vehiculoActual.id_cliente
      };

      if (modalMode === 'edit') {
        await updateVehiculo(vehiculoActual.id_vehiculo, payload);
        showToast('Vehículo actualizado correctamente', 'success');
      } else {
        await createVehiculo(payload);
        showToast('Vehículo registrado con éxito', 'success');
      }

      setIsModalOpen(false);
      fetchData(searchTerm);
    } catch (err) {
      setModalError(err.message || 'Error al guardar vehículo');
    } finally {
      setIsSaving(false);
    }
  };

  // Modal Eliminar
  const handleOpenDelete = (v) => {
    setVehiculoToDelete(v);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!vehiculoToDelete) return;
    try {
      await deleteVehiculo(vehiculoToDelete.id_vehiculo);
      setIsDeleteModalOpen(false);
      setVehiculoToDelete(null);
      showToast('Vehículo eliminado correctamente', 'success');
      fetchData(searchTerm);
    } catch (err) {
      showToast(err.message || 'Error al eliminar vehículo', 'error');
    }
  };

  // ══════════════════════════════════════════
  // LÓGICA DE IMPORTACIÓN MASIVA
  // ══════════════════════════════════════════
  const handleOpenImport = () => {
    setVehiculosParaImportar([]);
    setImportText('');
    setImportError('');
    setImportClienteDefecto('');
    setImportTab('file');
    setIsImportModalOpen(true);
  };

  const parsearTextoVehiculos = (texto, clienteDef = importClienteDefecto) => {
    setImportError('');
    if (!texto || !texto.trim()) {
      setVehiculosParaImportar([]);
      return;
    }

    const lineas = texto.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lineas.length === 0) return;

    let inicio = 0;
    const primeraFila = lineas[0].toLowerCase();
    if (primeraFila.includes('placa') || primeraFila.includes('marca') || primeraFila.includes('modelo')) {
      inicio = 1;
    }

    const items = [];
    for (let i = inicio; i < lineas.length; i++) {
      const linea = lineas[i];
      let separador = ',';
      if (linea.includes('\t')) separador = '\t';
      else if (linea.includes(';') && !linea.includes(',')) separador = ';';

      const cols = linea.split(separador).map(c => c.trim().replace(/^["']|["']$/g, ''));
      if (cols.length === 0 || !cols[0]) continue;

      const placa = (cols[0] || '').toUpperCase();
      const marca = cols[1] || '';
      const modelo = cols[2] || '';
      const anio = parseInt(cols[3]?.replace(/[^0-9]/g, '')) || null;
      const color = cols[4] || '';
      const clienteRef = cols[5] || clienteDef;

      let clienteEncontrado = null;
      if (clienteRef) {
        clienteEncontrado = clientes.find(c =>
          String(c.id_cliente) === String(clienteRef) ||
          (c.correo && c.correo.toLowerCase() === String(clienteRef).toLowerCase()) ||
          (`${c.nombre} ${c.apellido}`.toLowerCase() === String(clienteRef).toLowerCase())
        );
      }

      const anioValido = !anio || (anio >= 1900 && anio <= new Date().getFullYear() + 1);
      const esValido = placa.length >= 3 && marca.length > 0 && modelo.length > 0 && !!clienteEncontrado && anioValido;

      items.push({
        fila: i + 1,
        placa,
        marca,
        modelo,
        anio,
        color,
        clienteRaw: clienteRef,
        id_cliente: clienteEncontrado ? clienteEncontrado.id_cliente : null,
        clienteNombre: clienteEncontrado ? `${clienteEncontrado.nombre} ${clienteEncontrado.apellido}` : (clienteRef || 'Sin cliente'),
        valido: esValido
      });
    }

    setVehiculosParaImportar(items);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result;
        setImportText(content);
        parsearTextoVehiculos(content);
      };
      reader.readAsText(file, 'UTF-8');
    }
  };

  const handleDropFile = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result;
        setImportText(content);
        parsearTextoVehiculos(content);
      };
      reader.readAsText(file, 'UTF-8');
    }
  };

  const handleExecuteImport = async () => {
    const validos = vehiculosParaImportar.filter(it => it.valido);
    if (validos.length === 0) {
      setImportError('No hay vehículos válidos para importar.');
      return;
    }

    setIsImporting(true);
    setImportError('');

    try {
      const res = await importarVehiculos(validos, importClienteDefecto || null);
      showToast(res.mensaje || 'Vehículos importados exitosamente', 'success');
      setIsImportModalOpen(false);
      fetchData(searchTerm);
    } catch (err) {
      setImportError(err.message || 'Error durante la importación');
    } finally {
      setIsImporting(false);
    }
  };

  const descargarPlantilla = () => {
    const csvContent = "Placa,Marca,Modelo,Anio,Color,ID_Cliente\n" +
                       "ABC123,Toyota,Corolla,2022,Blanco,1\n" +
                       "XYZ789,Chevrolet,Spark GT,2019,Rojo,2\n" +
                       "KLS456,Mazda,CX-5,2023,Gris Plata,1\n";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plantilla_vehiculos_zedan.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="vehiculos-container">
      {/* Toast Flotante */}
      {toast && (
        <div className={`toast-floating ${toast.type}`}>
          <i className={`bi ${toast.type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'}`}></i>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header superior */}
      <div className="vehiculos-header">
        <div className="vehiculos-header-info">
          <h2>Gestión de Vehículos</h2>
          <p>Administra la flota vehicular registrada en Zedan Motor's.</p>
        </div>
        <div className="vehiculos-header-actions">
          <button className="btn-secondary-custom" onClick={handleOpenImport}>
            <i className="bi bi-file-earmark-arrow-up"></i>
            <span>Importar vehículos</span>
          </button>
          <button className="btn-primary-custom" onClick={handleOpenCreate}>
            <i className="bi bi-plus-lg"></i>
            <span>Nuevo vehículo</span>
          </button>
        </div>
      </div>

      {/* Barra de búsqueda y contador */}
      <div className="vehiculos-actions-row">
        <div className="search-bar">
          <i className="bi bi-search"></i>
          <input
            type="text"
            placeholder="Buscar por placa, marca, modelo o cliente..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
        <div className="stat-pill">
          <span>{vehiculos.length}</span> vehículos
        </div>
      </div>

      {/* Tabla de Vehículos */}
      <div className="card-custom">
        <div className="table-responsive">
          <table className="table-custom">
            <thead>
              <tr>
                <th>Vehículo</th>
                <th>Placa</th>
                <th>Año</th>
                <th>Color</th>
                <th>Cliente</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                    <i className="bi bi-arrow-clockwise spinning me-2"></i> Cargando flota vehicular...
                  </td>
                </tr>
              ) : vehiculos.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                    No se encontraron vehículos registrados.
                  </td>
                </tr>
              ) : (
                vehiculos.map((v) => (
                  <tr key={v.id_vehiculo}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="vehiculo-icon">
                          <i className="bi bi-car-front-fill"></i>
                        </div>
                        <div>
                          <div className="vehiculo-title">{v.marca} {v.modelo}</div>
                          <div className="vehiculo-sub">ID #{v.id_vehiculo}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="placa-badge">{v.placa}</span>
                    </td>
                    <td style={{ color: '#64748b' }}>{v.anio || '—'}</td>
                    <td>
                      {v.color ? (
                        <span>
                          <span className="color-dot" style={{ backgroundColor: v.color.toLowerCase() }}></span>
                          {v.color}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>—</span>
                      )}
                    </td>
                    <td style={{ fontWeight: 500, color: '#1e3a8a' }}>{v.cliente}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="btn-accion editar"
                          title="Editar vehículo"
                          onClick={() => handleOpenEdit(v)}
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button
                          className="btn-accion eliminar"
                          title="Eliminar vehículo"
                          onClick={() => handleOpenDelete(v)}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal Nuevo / Editar Vehículo ── */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => !isSaving && setIsModalOpen(false)}>
          <div className="modal-dialog-custom" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom">
              <h5 className="modal-title-custom">
                {modalMode === 'edit' ? 'Editar vehículo' : 'Nuevo vehículo'}
              </h5>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => !isSaving && setIsModalOpen(false)}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <form onSubmit={handleSaveVehiculo}>
              <div className="modal-body-custom">
                {modalError && (
                  <div className="alert-modal-error">
                    <i className="bi bi-exclamation-circle-fill"></i>
                    <span>{modalError}</span>
                  </div>
                )}

                <div className="form-grid">
                  <div>
                    <label className="field-label">Placa *</label>
                    <input
                      type="text"
                      className="field-input"
                      placeholder="ABC123"
                      value={vehiculoActual.placa}
                      onChange={(e) => setVehiculoActual({ ...vehiculoActual, placa: e.target.value.toUpperCase() })}
                      required
                      style={{ textTransform: 'uppercase' }}
                    />
                  </div>
                  <div>
                    <label className="field-label">Marca *</label>
                    <input
                      type="text"
                      className="field-input"
                      placeholder="Toyota"
                      value={vehiculoActual.marca}
                      onChange={(e) => setVehiculoActual({ ...vehiculoActual, marca: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="field-label">Modelo *</label>
                    <input
                      type="text"
                      className="field-input"
                      placeholder="Corolla"
                      value={vehiculoActual.modelo}
                      onChange={(e) => setVehiculoActual({ ...vehiculoActual, modelo: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="field-label">Año</label>
                    <input
                      type="number"
                      className="field-input"
                      placeholder="2022"
                      min="1900"
                      max={new Date().getFullYear() + 2}
                      value={vehiculoActual.anio}
                      onChange={(e) => setVehiculoActual({ ...vehiculoActual, anio: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="field-label">Color</label>
                    <input
                      type="text"
                      className="field-input"
                      placeholder="Blanco"
                      value={vehiculoActual.color}
                      onChange={(e) => setVehiculoActual({ ...vehiculoActual, color: e.target.value })}
                    />
                  </div>
                  <div className="form-group-full">
                    <label className="field-label">Cliente Asociado *</label>
                    <select
                      className="field-input"
                      value={vehiculoActual.id_cliente}
                      onChange={(e) => setVehiculoActual({ ...vehiculoActual, id_cliente: e.target.value })}
                      required
                    >
                      <option value="">Seleccionar cliente...</option>
                      {clientes.map((c) => (
                        <option key={c.id_cliente} value={c.id_cliente}>
                          {c.nombre} {c.apellido} (ID #{c.id_cliente})
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
      {isDeleteModalOpen && vehiculoToDelete && (
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
                ¿Eliminar el vehículo <strong style={{ color: '#1e293b' }}>{vehiculoToDelete.marca} {vehiculoToDelete.modelo} ({vehiculoToDelete.placa})</strong>?
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

      {/* ── Modal Importación Masiva ── */}
      {isImportModalOpen && (
        <div className="modal-overlay" onClick={() => !isImporting && setIsImportModalOpen(false)}>
          <div className="modal-dialog-custom modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom">
              <h5 className="modal-title-custom">
                <i className="bi bi-file-earmark-arrow-up text-primary"></i>
                Importación Masiva de Vehículos
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

              {/* Instrucciones y Descarga */}
              <div className="import-instructions">
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: '#1e3a8a' }}>
                    <i className="bi bi-info-circle me-1 text-primary"></i> Columnas requeridas:
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    1. <strong>Placa</strong> &bull; 2. <strong>Marca</strong> &bull; 3. <strong>Modelo</strong> &bull; 4. <strong>Año</strong> &bull; 5. <strong>Color</strong> &bull; 6. <strong>ID_Cliente</strong>
                  </div>
                </div>
                <button type="button" className="btn-secondary-custom" onClick={descargarPlantilla}>
                  <i className="bi bi-download"></i> Plantilla CSV
                </button>
              </div>

              {/* Cliente por defecto */}
              <div className="import-client-default-box">
                <label className="field-label" style={{ color: '#1e3a8a' }}>
                  <i className="bi bi-person-check me-1"></i> Cliente por defecto (opcional):
                </label>
                <select
                  className="field-input"
                  value={importClienteDefecto}
                  onChange={(e) => {
                    const val = e.target.value;
                    setImportClienteDefecto(val);
                    if (importText) parsearTextoVehiculos(importText, val);
                  }}
                >
                  <option value="">Asignar según columna en archivo (ID o Correo)</option>
                  {clientes.map(c => (
                    <option key={c.id_cliente} value={c.id_cliente}>
                      {c.nombre} {c.apellido} (ID #{c.id_cliente})
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  Si tu archivo no tiene la columna ID_Cliente o todos pertenecen al mismo cliente, selecciónalo aquí.
                </div>
              </div>

              {/* Pestañas de origen de datos */}
              <div className="nav-tabs-custom">
                <button
                  type="button"
                  className={`tab-btn ${importTab === 'file' ? 'active' : ''}`}
                  onClick={() => setImportTab('file')}
                >
                  <i className="bi bi-file-earmark-spreadsheet"></i> Subir Archivo (.csv)
                </button>
                <button
                  type="button"
                  className={`tab-btn ${importTab === 'text' ? 'active' : ''}`}
                  onClick={() => setImportTab('text')}
                >
                  <i className="bi bi-clipboard-plus"></i> Copiar y Pegar (Excel / Texto)
                </button>
              </div>

              {importTab === 'file' ? (
                <div
                  className={`drop-zone ${isDragOver ? 'dragover' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDropFile}
                  onClick={() => document.getElementById('fileInputVehiculosReact')?.click()}
                >
                  <input
                    type="file"
                    id="fileInputVehiculosReact"
                    accept=".csv,text/csv"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                  <div className="drop-zone-icon"><i className="bi bi-cloud-arrow-up"></i></div>
                  <div className="drop-zone-text">Haz clic aquí o arrastra tu archivo CSV</div>
                  <div className="drop-zone-sub">Formato delimitado por comas (,) o punto y coma (;)</div>
                </div>
              ) : (
                <textarea
                  className="field-input"
                  rows="4"
                  placeholder="Pega aquí los datos copiados de Excel o CSV...&#10;Ejemplo:&#10;ABC123,Toyota,Corolla,2022,Blanco,1&#10;XYZ789,Chevrolet,Spark GT,2019,Rojo,2"
                  value={importText}
                  onChange={(e) => {
                    const txt = e.target.value;
                    setImportText(txt);
                    parsearTextoVehiculos(txt);
                  }}
                ></textarea>
              )}

              {/* Vista Previa */}
              {vehiculosParaImportar.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e3a8a' }}>
                      Vista previa ({vehiculosParaImportar.length} vehículos detectados)
                    </span>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer' }}
                      onClick={() => {
                        setVehiculosParaImportar([]);
                        setImportText('');
                      }}
                    >
                      <i className="bi bi-x-circle me-1"></i> Limpiar
                    </button>
                  </div>
                  <div className="preview-table-wrapper">
                    <table className="table-custom">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Placa</th>
                          <th>Marca</th>
                          <th>Modelo</th>
                          <th>Año</th>
                          <th>Color</th>
                          <th>Cliente</th>
                          <th>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vehiculosParaImportar.map((it, idx) => (
                          <tr key={idx} style={{ background: it.valido ? 'transparent' : 'rgba(239, 68, 68, 0.06)' }}>
                            <td>{idx + 1}</td>
                            <td><strong>{it.placa || <span className="text-danger">Falta</span>}</strong></td>
                            <td>{it.marca || <span className="text-danger">Falta</span>}</td>
                            <td>{it.modelo || <span className="text-danger">Falta</span>}</td>
                            <td>{it.anio || '—'}</td>
                            <td>{it.color || '—'}</td>
                            <td style={{ color: it.id_cliente ? '#3b82f6' : '#ef4444' }}>
                              {it.clienteNombre}
                            </td>
                            <td>
                              {it.valido ? (
                                <span style={{ color: '#16a34a', fontSize: '12px', fontWeight: 600 }}>
                                  <i className="bi bi-check-circle-fill me-1"></i>Válido
                                </span>
                              ) : (
                                <span style={{ color: '#ef4444', fontSize: '12px', fontWeight: 600 }}>
                                  <i className="bi bi-exclamation-circle-fill me-1"></i>Incompleto
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
                disabled={isImporting || vehiculosParaImportar.filter(v => v.valido).length === 0}
                onClick={handleExecuteImport}
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

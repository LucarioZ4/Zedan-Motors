import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Car,
  Calendar,
  Gauge,
  Fuel,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  Save,
  RotateCw,
  Clock,
  User,
  Search,
  ChevronDown,
  X,
  Phone
} from 'lucide-react';
import {
  crearDiagnostico,
  actualizarDiagnostico,
  getDiagnostico,
  prepararSubidaArchivo
} from '../../services/diagnosticoService';
import { getVehiculos } from '../../services/vehiculosService';
import { getCitas } from '../../services/citasService';
import { subirVideoFirmado } from '../../services/storageService';
import AccesoriosChecklist from './AccesoriosChecklist';
import ArchivoUploader from './ArchivoUploader';
import './Diagnosticos.css';

const NIVELES_GASOLINA = ['Reserva', '1/4', '1/2', '3/4', 'Lleno'];

export default function DiagnosticoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [vehiculos, setVehiculos] = useState([]);
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensajeGuardado, setMensajeGuardado] = useState('');
  const [error, setError] = useState('');

  // Form State
  const [form, setForm] = useState({
    id_vehiculo: '',
    id_cita: '',
    fecha_ingreso: new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16),
    kilometraje: '',
    nivel_gasolina: '1/2',
    observaciones: '',
    estado: 'En proceso',
    accesorios: [],
    archivos: []
  });

  // Archivos locales en cola para subir tras crear el diagnóstico
  const [colaLocal, setColaLocal] = useState([]);
  const [busquedaVehiculo, setBusquedaVehiculo] = useState('');
  const [dropdownAbierto, setDropdownAbierto] = useState(false);
  const comboboxRef = useRef(null);

  useEffect(() => {
    const handleClickAfuera = (e) => {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target)) {
        setDropdownAbierto(false);
      }
    };
    document.addEventListener('mousedown', handleClickAfuera);
    return () => document.removeEventListener('mousedown', handleClickAfuera);
  }, []);

  useEffect(() => {
    const cargarDatosIniciales = async () => {
      try {
        setLoading(true);
        const [vData, cData] = await Promise.all([
          getVehiculos(),
          getCitas().catch(() => [])
        ]);
        setVehiculos(vData || []);
        setCitas(cData || []);

        if (isEdit) {
          const diag = await getDiagnostico(id);
          setForm({
            id_vehiculo: diag.id_vehiculo,
            id_cita: diag.id_cita || '',
            fecha_ingreso: diag.fecha_ingreso
              ? new Date(new Date(diag.fecha_ingreso).getTime() - new Date().getTimezoneOffset() * 60000)
                  .toISOString()
                  .slice(0, 16)
              : '',
            kilometraje: diag.kilometraje,
            nivel_gasolina: diag.nivel_gasolina || '1/2',
            observaciones: diag.observaciones || '',
            estado: diag.estado || 'En proceso',
            accesorios: diag.accesorios || [],
            archivos: diag.archivos || []
          });
        }
      } catch (err) {
        console.error('Error al inicializar formulario:', err);
        setError(err.message || 'Error al cargar los datos');
      } finally {
        setLoading(false);
      }
    };

    cargarDatosIniciales();
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleGasolinaClick = (nivel) => {
    setForm((prev) => ({ ...prev, nivel_gasolina: nivel }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (!form.id_vehiculo) {
      setError('Debe seleccionar un vehículo ya registrado en el taller.');
      return;
    }
    if (form.kilometraje === '' || Number(form.kilometraje) < 0) {
      setError('El kilometraje es obligatorio y no puede ser negativo.');
      return;
    }

    try {
      setGuardando(true);
      const payload = {
        id_vehiculo: Number(form.id_vehiculo),
        id_cita: form.id_cita ? Number(form.id_cita) : null,
        fecha_ingreso: form.fecha_ingreso || new Date(),
        kilometraje: Number(form.kilometraje),
        nivel_gasolina: form.nivel_gasolina,
        observaciones: form.observaciones.trim() || null,
        estado: form.estado,
        accesorios: form.accesorios
      };

      let diagId = id;
      if (isEdit) {
        setMensajeGuardado('Actualizando diagnóstico...');
        await actualizarDiagnostico(id, payload);
      } else {
        setMensajeGuardado('Creando diagnóstico...');
        const nuevo = await crearDiagnostico(payload);
        diagId = nuevo.id_diagnostico;
      }

      // Si hay archivos en cola local por subir
      if (colaLocal.length > 0 && diagId) {
        for (let i = 0; i < colaLocal.length; i++) {
          const item = colaLocal[i];
          setMensajeGuardado(`Subiendo evidencia ${i + 1} de ${colaLocal.length}...`);
          try {
            const firma = await prepararSubidaArchivo(diagId, {
              nombre_original: item.file.name,
              mime: item.file.type || (item.tipo === 'video' ? 'video/mp4' : 'image/jpeg'),
              tamano: item.file.size,
              tipo: item.tipo,
              descripcion: item.descripcion || ''
            });

            await subirVideoFirmado({
              bucket: firma.bucket || 'diagnosticos',
              ruta: firma.ruta,
              token: firma.token,
              archivo: item.file
            });
          } catch (uploadErr) {
            console.warn('Error subiendo archivo en cola:', uploadErr);
          }
        }
      }

      navigate(`/diagnosticos/${diagId}`);
    } catch (err) {
      console.error('Error al guardar diagnóstico:', err);
      setError(err.message || 'Error al guardar el diagnóstico.');
    } finally {
      setGuardando(false);
      setMensajeGuardado('');
    }
  };

  const vehiculosFiltrados = vehiculos.filter((v) => {
    if (!busquedaVehiculo.trim()) return true;
    const q = busquedaVehiculo.toLowerCase();
    const placa = (v.placa || '').toLowerCase();
    const marca = (v.marca || '').toLowerCase();
    const modelo = (v.modelo || '').toLowerCase();
    const cliente = (v.cliente || v.nombre_cliente || '').toLowerCase();
    return placa.includes(q) || marca.includes(q) || modelo.includes(q) || cliente.includes(q);
  });

  const vehiculoSeleccionado = vehiculos.find(
    (v) => String(v.id_vehiculo) === String(form.id_vehiculo)
  );

  const handleSeleccionarVehiculo = (vehiculo) => {
    setForm((prev) => ({ ...prev, id_vehiculo: vehiculo.id_vehiculo }));
    setBusquedaVehiculo('');
    setDropdownAbierto(false);
  };

  const handleQuitarVehiculo = () => {
    setForm((prev) => ({ ...prev, id_vehiculo: '', id_cita: '' }));
    setBusquedaVehiculo('');
    setDropdownAbierto(false);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: 'var(--muted, #64748b)' }}>
        <RotateCw size={30} className="spin" style={{ marginBottom: '10px' }} />
        <p>Cargando datos del diagnóstico...</p>
      </div>
    );
  }

  return (
    <div className="diagnosticos-container">
      {/* ── Barra de Encabezado y Regreso ── */}
      <div className="form-header-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            type="button"
            onClick={() => navigate('/diagnosticos')}
            className="btn-secondary-custom"
            title="Volver a la lista"
          >
            <ArrowLeft size={16} />
            <span>Volver</span>
          </button>
          <h2>
            <Car size={22} className="text-primary" />
            {isEdit ? `Editar Diagnóstico #${id}` : 'Nuevo Diagnóstico de Recepción'}
          </h2>
        </div>
      </div>

      {error && (
        <div style={{ background: 'var(--error-bg, #fef2f2)', border: '1px solid #fee2e2', borderRadius: '12px', padding: '12px 16px', color: 'var(--error, #b91c1c)', fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* ── Sección 1: Datos Generales de Ingreso ── */}
        <div className="form-section-card">
          <h3 className="form-section-title">
            <Car size={18} className="text-primary" />
            <span>Datos del Vehículo y Recepción</span>
          </h3>

          <div className="form-grid-2">
            {/* Buscador y Selección de Vehículo Unificado (Combobox) */}
            <div className="form-group-custom">
              <label>
                Vehículo Registrado <span className="req">*</span>
              </label>

              {/* Si ya hay un vehículo seleccionado */}
              {vehiculoSeleccionado ? (
                <div className="vehiculo-selected-card">
                  <div className="vehiculo-selected-details">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span className="placa-badge">{vehiculoSeleccionado.placa}</span>
                      <strong style={{ fontSize: '14px', color: 'var(--heading, #1e3a8a)' }}>
                        {vehiculoSeleccionado.marca} {vehiculoSeleccionado.modelo}
                      </strong>
                      {vehiculoSeleccionado.anio && (
                        <span style={{ color: 'var(--muted, #64748b)', fontSize: '12.5px' }}>({vehiculoSeleccionado.anio})</span>
                      )}
                      {vehiculoSeleccionado.color && (
                        <span style={{ color: 'var(--muted, #64748b)', fontSize: '12.5px' }}>• Color: {vehiculoSeleccionado.color}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text, #334155)', fontSize: '12.5px', marginTop: '2px', flexWrap: 'wrap' }}>
                      <User size={14} style={{ color: 'var(--link, #2563eb)' }} />
                      <span>
                        <strong>Cliente:</strong> {vehiculoSeleccionado.cliente || vehiculoSeleccionado.nombre_cliente || 'Sin cliente asignado'}
                      </span>
                      {vehiculoSeleccionado.telefono_cliente && (
                        <span style={{ color: 'var(--muted, #64748b)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          • <Phone size={12} /> {vehiculoSeleccionado.telefono_cliente}
                        </span>
                      )}
                    </div>
                  </div>

                  {!isEdit && (
                    <button
                      type="button"
                      onClick={handleQuitarVehiculo}
                      className="btn-secondary-custom"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      title="Cambiar vehículo seleccionado"
                    >
                      <X size={14} />
                      <span>Cambiar</span>
                    </button>
                  )}
                </div>
              ) : (
                /* Barra de búsqueda interactiva desplegable */
                <div className="vehiculo-combobox-wrapper" ref={comboboxRef}>
                  <div className="vehiculo-search-input-wrapper">
                    <Search size={16} className="search-icon" />
                    <input
                      type="text"
                      placeholder="Buscar por placa, marca, modelo o cliente..."
                      value={busquedaVehiculo}
                      onChange={(e) => {
                        setBusquedaVehiculo(e.target.value);
                        setDropdownAbierto(true);
                      }}
                      onFocus={() => setDropdownAbierto(true)}
                      className="form-control-custom"
                      style={{ paddingLeft: '40px', paddingRight: '36px' }}
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      onClick={() => setDropdownAbierto((v) => !v)}
                      className="clear-icon-btn"
                      title="Desplegar lista de vehículos"
                    >
                      <ChevronDown
                        size={18}
                        style={{
                          transform: dropdownAbierto ? 'rotate(180deg)' : 'none',
                          transition: 'transform 0.2s'
                        }}
                      />
                    </button>
                  </div>

                  {dropdownAbierto && (
                    <div className="vehiculo-dropdown-menu">
                      {vehiculosFiltrados.length === 0 ? (
                        <div className="vehiculo-dropdown-empty">
                          No se encontraron vehículos que coincidan con "{busquedaVehiculo}".
                        </div>
                      ) : (
                        vehiculosFiltrados.map((v) => {
                          const nombreCliente = v.cliente || v.nombre_cliente || 'Sin cliente asignado';
                          return (
                            <div
                              key={v.id_vehiculo}
                              onClick={() => handleSeleccionarVehiculo(v)}
                              className="vehiculo-dropdown-item"
                            >
                              <div className="vehiculo-dropdown-item-header">
                                <span className="placa-badge">{v.placa}</span>
                                <strong style={{ color: 'var(--text, #1e293b)', fontSize: '13.5px' }}>
                                  {v.marca} {v.modelo}
                                </strong>
                                {v.color && (
                                  <span style={{ fontSize: '12px', color: 'var(--muted, #94a3b8)' }}>
                                    ({v.color})
                                  </span>
                                )}
                              </div>
                              <div className="vehiculo-dropdown-item-meta">
                                <span className="vehiculo-dropdown-item-cliente">
                                  <User size={13} />
                                  <span>{nombreCliente}</span>
                                </span>
                                {v.telefono_cliente && (
                                  <span>Tel: {v.telefono_cliente}</span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Cita Asociada (opcional) */}
            <div className="form-group-custom">
              <label>Cita Asociada (Opcional)</label>
              <select
                name="id_cita"
                value={form.id_cita}
                onChange={handleChange}
                className="form-control-custom"
              >
                <option value="">-- Ninguna cita asociada --</option>
                {citas
                  .filter((c) => !form.id_vehiculo || String(c.id_vehiculo) === String(form.id_vehiculo))
                  .map((c) => (
                    <option key={c.id_cita} value={c.id_cita}>
                      Cita #{c.id_cita} ({c.fecha} {c.hora}) — {c.motivo || 'Revisión'}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="form-grid-3" style={{ marginTop: '16px' }}>
            {/* Fecha y Hora de Ingreso */}
            <div className="form-group-custom">
              <label>
                Fecha y Hora de Ingreso <span className="req">*</span>
              </label>
              <input
                type="datetime-local"
                name="fecha_ingreso"
                value={form.fecha_ingreso}
                onChange={handleChange}
                required
                className="form-control-custom"
              />
            </div>

            {/* Kilometraje */}
            <div className="form-group-custom">
              <label>
                Kilometraje de Ingreso <span className="req">*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  name="kilometraje"
                  min="0"
                  step="1"
                  placeholder="Ej. 65000"
                  value={form.kilometraje}
                  onChange={handleChange}
                  required
                  className="form-control-custom"
                  style={{ paddingRight: '40px' }}
                />
                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'var(--muted, #94a3b8)', fontWeight: 600 }}>
                  KM
                </span>
              </div>
            </div>

            {/* Estado del Diagnóstico */}
            <div className="form-group-custom">
              <label>Estado del Diagnóstico</label>
              <select
                name="estado"
                value={form.estado}
                onChange={handleChange}
                className="form-control-custom"
              >
                <option value="En proceso">En proceso</option>
                <option value="Finalizado">Finalizado</option>
              </select>
            </div>
          </div>

          {/* Selector de Nivel de Gasolina */}
          <div style={{ marginTop: '16px' }}>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text, #334155)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Fuel size={15} style={{ color: 'var(--link, #3b82f6)' }} />
              Nivel de Combustible / Gasolina <span className="req">*</span>
            </label>
            <div className="gasolina-selector">
              {NIVELES_GASOLINA.map((nivel) => {
                const isActive = form.nivel_gasolina === nivel;
                return (
                  <button
                    key={nivel}
                    type="button"
                    onClick={() => handleGasolinaClick(nivel)}
                    className={`btn-gasolina-option ${isActive ? 'active' : ''}`}
                  >
                    {nivel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Observaciones Generales */}
          <div className="form-group-custom" style={{ marginTop: '16px' }}>
            <label>Observaciones Generales de la Recepción</label>
            <textarea
              name="observaciones"
              value={form.observaciones}
              onChange={handleChange}
              rows={3}
              placeholder="Describa el motivo de visita según el cliente, ruidos extraños, fallas reportadas o detalles particulares..."
              className="form-control-custom"
            />
          </div>
        </div>

        {/* ── Sección 2: Checklist Dinámico de Accesorios ── */}
        <AccesoriosChecklist
          accesorios={form.accesorios}
          setAccesorios={(list) => setForm((prev) => ({ ...prev, accesorios: list }))}
        />

        {/* ── Sección 3: Evidencias Visuales (Fotos y Videos) ── */}
        <ArchivoUploader
          diagnosticoId={id}
          archivos={form.archivos}
          setArchivos={(list) => setForm((prev) => ({ ...prev, archivos: list }))}
          colaLocal={colaLocal}
          setColaLocal={setColaLocal}
        />

        {/* ── Barra de Botones de Guardado ── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px', paddingBottom: '30px' }}>
          <button
            type="button"
            onClick={() => navigate('/diagnosticos')}
            className="btn-secondary-custom"
            disabled={guardando}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn-primary-custom"
            disabled={guardando}
            style={{ padding: '12px 24px', fontSize: '14px' }}
          >
            {guardando ? (
              <>
                <RotateCw size={18} className="spin" />
                <span>{mensajeGuardado || 'Guardando...'}</span>
              </>
            ) : (
              <>
                <Save size={18} />
                <span>{isEdit ? 'Actualizar Diagnóstico' : 'Guardar y Finalizar Diagnóstico'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

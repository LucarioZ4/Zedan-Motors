import React, { useEffect, useState } from 'react';
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
  User
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

  const vehiculoSeleccionado = vehiculos.find(
    (v) => String(v.id_vehiculo) === String(form.id_vehiculo)
  );

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
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
        <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px', padding: '12px 16px', color: '#b91c1c', fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '10px' }}>
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
            {/* Selección de Vehículo */}
            <div className="form-group-custom">
              <label>
                Vehículo Registrado <span className="req">*</span>
              </label>
              <select
                name="id_vehiculo"
                value={form.id_vehiculo}
                onChange={handleChange}
                required
                disabled={isEdit}
                className="form-control-custom"
              >
                <option value="">-- Seleccionar vehículo por placa o cliente --</option>
                {vehiculos.map((v) => (
                  <option key={v.id_vehiculo} value={v.id_vehiculo}>
                    {v.placa} — {v.marca} {v.modelo} ({v.nombre_cliente || 'Sin cliente'})
                  </option>
                ))}
              </select>
              {vehiculoSeleccionado && (
                <div style={{ marginTop: '4px', fontSize: '12px', color: '#1e3a8a', background: '#eff6ff', padding: '6px 10px', borderRadius: '6px' }}>
                  <strong>{vehiculoSeleccionado.placa}</strong> • {vehiculoSeleccionado.marca} {vehiculoSeleccionado.modelo} ({vehiculoSeleccionado.color || 'Color no especificado'}) • Cliente: {vehiculoSeleccionado.nombre_cliente}
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
                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
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
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Fuel size={15} style={{ color: '#3b82f6' }} />
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

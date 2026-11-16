import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { crearDiagnostico, actualizarDiagnostico, getDiagnostico } from '../../services/diagnosticoService';
import { getVehiculos } from '../../services/vehiculosService';
import AccesoriosChecklist from './AccesoriosChecklist';
import ArchivoUploader from './ArchivoUploader';

export default function DiagnosticoForm() {
  const { id } = useParams(); // undefined for create, defined for edit
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [vehiculos, setVehiculos] = useState([]);
  const [form, setForm] = useState({
    id_vehiculo: '',
    id_cita: '',
    fecha_ingreso: new Date().toISOString().slice(0, 16), // datetime-local
    kilometraje: '',
    nivel_gasolina: 'Reserva',
    observaciones: '',
    estado: 'En proceso',
    accesorios: [],
    archivos: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadVehiculos = async () => {
      try {
        const data = await getVehiculos();
        setVehiculos(data);
      } catch (e) {
        alert('Error al cargar vehículos');
      }
    };
    loadVehiculos();
  }, []);

  useEffect(() => {
    if (isEdit) {
      const loadDiagnostico = async () => {
        try {
          const d = await getDiagnostico(id);
          setForm({
            id_vehiculo: d.id_vehiculo,
            id_cita: d.id_cita || '',
            fecha_ingreso: new Date(d.fecha_ingreso).toISOString().slice(0, 16),
            kilometraje: d.kilometraje,
            nivel_gasolina: d.nivel_gasolina,
            observaciones: d.observaciones || '',
            estado: d.estado,
            accesorios: d.accesorios || [],
            archivos: d.archivos || [],
          });
        } catch (e) {
          alert('Error al cargar diagnóstico');
        } finally {
          setLoading(false);
        }
      };
      loadDiagnostico();
    } else {
      setLoading(false);
    }
  }, [isEdit, id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        accesorios: form.accesorios,
      };
      if (isEdit) {
        await actualizarDiagnostico(id, payload);
      } else {
        await crearDiagnostico(payload);
      }
      navigate('/diagnosticos');
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <p className="p-4">Cargando…</p>;

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">
        {isEdit ? 'Editar' : 'Nuevo'} diagnóstico
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">Vehículo *</label>
          <select
            name="id_vehiculo"
            value={form.id_vehiculo}
            onChange={handleChange}
            required
            className="w-full border rounded p-2"
            disabled={isEdit}
          >
            <option value="">Seleccione un vehículo</option>
            {vehiculos.map((v) => (
              <option key={v.id_vehiculo} value={v.id_vehiculo}>
                {v.placa} - {v.marca} {v.modelo}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block mb-1 font-medium">Cita (opcional)</label>
          <input
            type="text"
            name="id_cita"
            value={form.id_cita}
            onChange={handleChange}
            placeholder="ID de la cita"
            className="w-full border rounded p-2"
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Fecha y hora de ingreso</label>
          <input
            type="datetime-local"
            name="fecha_ingreso"
            value={form.fecha_ingreso}
            onChange={handleChange}
            className="w-full border rounded p-2"
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Kilometraje *</label>
          <input
            type="number"
            name="kilometraje"
            min="0"
            value={form.kilometraje}
            onChange={handleChange}
            required
            className="w-full border rounded p-2"
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Nivel de gasolina *</label>
          <select
            name="nivel_gasolina"
            value={form.nivel_gasolina}
            onChange={handleChange}
            required
            className="w-full border rounded p-2"
          >
            <option value="Reserva">Reserva</option>
            <option value="1/4">1/4</option>
            <option value="1/2">1/2</option>
            <option value="3/4">3/4</option>
            <option value="Lleno">Lleno</option>
          </select>
        </div>
        <div>
          <label className="block mb-1 font-medium">Observaciones</label>
          <textarea
            name="observaciones"
            value={form.observaciones}
            onChange={handleChange}
            rows={3}
            className="w-full border rounded p-2"
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Estado</label>
          <select
            name="estado"
            value={form.estado}
            onChange={handleChange}
            className="w-full border rounded p-2"
          >
            <option value="En proceso">En proceso</option>
            <option value="Finalizado">Finalizado</option>
          </select>
        </div>
        <AccesoriosChecklist
          accesorios={form.accesorios}
          setAccesorios={(list) => setForm((p) => ({ ...p, accesorios: list }))}
        />
        <ArchivoUploader
          diagnosticoId={form.id_diagnostico}
          existingFiles={form.archivos}
          onUpload={(newFile) =>
            setForm((p) => ({ ...p, archivos: [...p.archivos, newFile] }))
          }
          onDelete={(fileId) =>
            setForm((p) => ({ ...p, archivos: p.archivos.filter((f) => f.id_archivo !== fileId) }))
          }
        />
        <div className="flex space-x-4 mt-4">
          <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded">
            {isEdit ? 'Actualizar' : 'Crear'}
          </button>
          <button type="button" onClick={() => navigate('/diagnosticos')} className="px-4 py-2 rounded border">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

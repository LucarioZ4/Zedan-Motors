import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDiagnostico, eliminarDiagnostico, eliminarArchivo } from '../../services/diagnosticoService';
import { getVehiculoById } from '../../services/vehiculosService';

export default function DiagnosticoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [diagnostico, setDiagnostico] = useState(null);
  const [vehiculo, setVehiculo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const d = await getDiagnostico(id);
        setDiagnostico(d);
        const v = await getVehiculoById(d.id_vehiculo);
        setVehiculo(v);
      } catch (e) {
        alert(e.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('¿Eliminar este diagnóstico?')) return;
    try {
      await eliminarDiagnostico(id);
      navigate('/diagnosticos');
    } catch (e) {
      alert(e.message);
    }
  };

  const handleFileDelete = async (fileId) => {
    if (!window.confirm('¿Eliminar este archivo?')) return;
    try {
      await eliminarArchivo(id, fileId);
      setDiagnostico((prev) => ({
        ...prev,
        archivos: prev.archivos.filter((f) => f.id_archivo !== fileId),
      }));
    } catch (e) {
      alert(e.message);
    }
  };

  const generarWhatsAppLink = () => {
    if (!vehiculo) return '#';
    const telefono = (vehiculo.telefono_cliente || '').replace(/[^0-9]/g, '');
    const texto = `Hola ${vehiculo.nombre_cliente || ''}!\nDiagnóstico de ${vehiculo.placa}:\n${window.location.origin}/diagnosticos/${id}`;
    return `https://wa.me/${telefono}?text=${encodeURIComponent(texto)}`;
  };

  if (loading) return <p className="p-4">Cargando diagnóstico…</p>;
  if (!diagnostico) return <p className="p-4">Diagnóstico no encontrado.</p>;

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Detalle del diagnóstico</h2>

      <section className="mb-6">
        <h3 className="font-semibold mb-2">Vehículo</h3>
        {vehiculo ? (
          <p>{vehiculo.placa} - {vehiculo.marca} {vehiculo.modelo} (Cliente: {vehiculo.nombre_cliente})</p>
        ) : (
          <p>Información del vehículo no disponible.</p>
        )}
      </section>

      <section className="mb-6">
        <h3 className="font-semibold mb-2">Datos del diagnóstico</h3>
        <ul className="list-disc list-inside">
          <li><strong>Fecha ingreso:</strong> {new Date(diagnostico.fecha_ingreso).toLocaleString()}</li>
          <li><strong>Kilometraje:</strong> {diagnostico.kilometraje}</li>
          <li><strong>Nivel de gasolina:</strong> {diagnostico.nivel_gasolina}</li>
          <li><strong>Estado:</strong> {diagnostico.estado}</li>
          <li><strong>Observaciones:</strong> {diagnostico.observaciones || '—'}</li>
        </ul>
      </section>

      <section className="mb-6">
        <h3 className="font-semibold mb-2">Accesorios</h3>
        <table className="min-w-full bg-white border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">Accesorio</th>
              <th className="p-2 border">Estado</th>
              <th className="p-2 border">Observación</th>
            </tr>
          </thead>
          <tbody>
            {diagnostico.accesorios && diagnostico.accesorios.length > 0 ? (
              diagnostico.accesorios.map((a, i) => (
                <tr key={i} className="text-center">
                  <td className="p-2 border">{a.nombre}</td>
                  <td className="p-2 border">{a.estado}</td>
                  <td className="p-2 border">{a.observacion || ''}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="p-2 border text-center">Sin accesorios registrados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="mb-6">
        <h3 className="font-semibold mb-2">Archivos (fotos / videos)</h3>
        <ul className="grid grid-cols-2 gap-4">
          {diagnostico.archivos && diagnostico.archivos.map((f) => (
            <li key={f.id_archivo} className="border p-2 rounded">
              {f.tipo === 'imagen' ? (
                <img src={f.ruta} alt={f.nombre_original} className="object-cover w-full h-32" />
              ) : (
                <video src={f.ruta} controls className="w-full h-32" />
              )}
              <p className="text-xs mt-1 truncate">{f.nombre_original}</p>
              <button
                type="button"
                onClick={() => handleFileDelete(f.id_archivo)}
                className="mt-1 bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs"
              >
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex space-x-4 mt-4">
        <button
          type="button"
          onClick={() => navigate(`/diagnosticos/editar/${id}`)}
          className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded"
        >
          Editar
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
        >
          Eliminar
        </button>
        <a
          href={generarWhatsAppLink()}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
        >
          Enviar por WhatsApp
        </a>
        <button
          type="button"
          onClick={() => navigate('/diagnosticos')}
          className="px-4 py-2 rounded border"
        >
          Volver
        </button>
      </div>
    </div>
  );
}


import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getDiagnosticos, eliminarDiagnostico } from '../../services/diagnosticoService';

export default function Diagnosticos() {
  const [diagnosticos, setDiagnosticos] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const data = await getDiagnosticos();
      setDiagnosticos(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este diagnóstico?')) return;
    try {
      await eliminarDiagnostico(id);
      setDiagnosticos((prev) => prev.filter((d) => d.id_diagnostico !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <p className="p-4">Cargando diagnósticos…</p>;

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Diagnósticos</h2>
      <div className="flex justify-end mb-2">
        <Link
          to="nuevo"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded"
        >
          Nuevo diagnóstico
        </Link>
      </div>
      {diagnosticos.length === 0 ? (
        <p>No hay diagnósticos registrados.</p>
      ) : (
        <table className="min-w-full bg-white border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">#</th>
              <th className="p-2 border">Vehículo</th>
              <th className="p-2 border">Fecha</th>
              <th className="p-2 border">Estado</th>
              <th className="p-2 border">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {diagnosticos.map((d) => (
              <tr key={d.id_diagnostico} className="text-center">
                <td className="p-2 border">{d.id_diagnostico}</td>
                <td className="p-2 border">{d.placa || d.id_vehiculo}</td>
                <td className="p-2 border">
                  {new Date(d.fecha_ingreso).toLocaleString()}
                </td>
                <td className="p-2 border">{d.estado}</td>
                <td className="p-2 border space-x-2">
                  <button
                    onClick={() => navigate(`${d.id_diagnostico}`)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
                  >
                    Ver
                  </button>
                  <button
                    onClick={() => navigate(`editar/${d.id_diagnostico}`)}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-2 py-1 rounded"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(d.id_diagnostico)}
                    className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}


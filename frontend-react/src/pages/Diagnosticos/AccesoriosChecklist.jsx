import React from 'react';

export default function AccesoriosChecklist({ accesorios, setAccesorios }) {
  const defaultAccesorios = [
    'llanta de repuesto',
    'gato',
    'llave de ruedas',
    'extintor',
    'triángulos de seguridad',
    'botiquín',
    'radio/pantalla',
    'aire acondicionado',
    'luces delanteras',
    'luces traseras',
    'espejos',
    'limpiaparabrisas',
    'tapetes',
    'tapicería',
    'antena',
    'tapas de ruedas',
  ];

  const addAccesorio = () => {
    setAccesorios([...accesorios, { nombre: '', estado: 'Bueno', observacion: '' }]);
  };

  const updateAccesorio = (index, field, value) => {
    const newList = accesorios.map((a, i) => (i === index ? { ...a, [field]: value } : a));
    setAccesorios(newList);
  };

  const removeAccesorio = (index) => {
    const newList = accesorios.filter((_, i) => i !== index);
    setAccesorios(newList);
  };

  // If the list is empty, initialize with defaults (read‑only selection)
  React.useEffect(() => {
    if (accesorios.length === 0) {
      const init = defaultAccesorios.map((n) => ({ nombre: n, estado: 'Bueno', observacion: '' }));
      setAccesorios(init);
    }
    // eslint‑disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Revisión de accesorios</h3>
      <table className="min-w-full bg-white border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">Accesorio</th>
            <th className="p-2 border">Estado</th>
            <th className="p-2 border">Observación</th>
            <th className="p-2 border">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {accesorios.map((a, i) => (
            <tr key={i} className="text-center">
              <td className="p-2 border">
                <input
                  type="text"
                  value={a.nombre}
                  onChange={(e) => updateAccesorio(i, 'nombre', e.target.value)}
                  className="w-full border rounded p-1"
                />
              </td>
              <td className="p-2 border">
                <select
                  value={a.estado}
                  onChange={(e) => updateAccesorio(i, 'estado', e.target.value)}
                  className="w-full border rounded p-1"
                >
                  <option>Bueno</option>
                  <option>Regular</option>
                  <option>Malo</option>
                  <option>No tiene</option>
                </select>
              </td>
              <td className="p-2 border">
                <input
                  type="text"
                  value={a.observacion || ''}
                  onChange={(e) => updateAccesorio(i, 'observacion', e.target.value)}
                  className="w-full border rounded p-1"
                />
              </td>
              <td className="p-2 border">
                <button
                  onClick={() => removeAccesorio(i)}
                  className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={addAccesorio} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded">
        Añadir accesorio
      </button>
    </div>
  );
}


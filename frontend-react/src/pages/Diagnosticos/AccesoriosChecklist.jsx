import React, { useState } from 'react';
import { Plus, Trash2, CheckSquare, Wrench } from 'lucide-react';

const ACCESORIOS_DEFAULT = [
  'Llanta de repuesto',
  'Gato mecánico/hidráulico',
  'Llave de ruedas',
  'Extintor vigente',
  'Triángulos de seguridad',
  'Botiquín de primeros auxilios',
  'Radio / Pantalla táctil',
  'Aire acondicionado',
  'Luces delanteras / exploradoras',
  'Luces traseras / stop',
  'Espejos retrovisores',
  'Limpiaparabrisas (plumillas)',
  'Tapetes',
  'Tapicería y asientos',
  'Antena',
  'Tapas de ruedas (copas / rines)'
];

const ESTADOS = [
  { valor: 'Bueno', label: 'Bueno', activeClass: 'active-bueno' },
  { valor: 'Regular', label: 'Regular', activeClass: 'active-regular' },
  { valor: 'Malo', label: 'Malo', activeClass: 'active-malo' },
  { valor: 'No tiene', label: 'No tiene', activeClass: 'active-notiene' }
];

export default function AccesoriosChecklist({ accesorios = [], setAccesorios }) {
  const [nuevoNombre, setNuevoNombre] = useState('');

  // Inicializa con la lista por defecto si está vacía
  React.useEffect(() => {
    if (!accesorios || accesorios.length === 0) {
      const inicial = ACCESORIOS_DEFAULT.map((nombre) => ({
        nombre,
        estado: 'Bueno',
        observacion: ''
      }));
      setAccesorios(inicial);
    }
  }, []);

  const handleEstadoChange = (index, nuevoEstado) => {
    const list = [...accesorios];
    list[index].estado = nuevoEstado;
    setAccesorios(list);
  };

  const handleObservacionChange = (index, observacion) => {
    const list = [...accesorios];
    list[index].observacion = observacion;
    setAccesorios(list);
  };

  const handleNombreChange = (index, nombre) => {
    const list = [...accesorios];
    list[index].nombre = nombre;
    setAccesorios(list);
  };

  const handleRemove = (index) => {
    setAccesorios(accesorios.filter((_, i) => i !== index));
  };

  const handleAddCustom = (e) => {
    e.preventDefault();
    if (!nuevoNombre.trim()) return;
    setAccesorios([
      ...accesorios,
      {
        nombre: nuevoNombre.trim(),
        estado: 'Bueno',
        observacion: ''
      }
    ]);
    setNuevoNombre('');
  };

  return (
    <div className="form-section-card">
      <h3 className="form-section-title">
        <CheckSquare size={18} className="text-primary" />
        <span>Revisión de Inventario y Accesorios</span>
      </h3>
      <p style={{ fontSize: '12.5px', color: 'var(--muted, #64748b)', margin: '-8px 0 16px 0' }}>
        Verifique el estado con el que ingresa cada elemento al taller. Seleccione el estado y añada notas opcionales.
      </p>

      <div className="table-responsive">
        <table className="accesorios-table">
          <thead>
            <tr>
              <th style={{ width: '32%' }}>Accesorio / Elemento</th>
              <th style={{ width: '33%' }}>Estado de Recepción</th>
              <th style={{ width: '30%' }}>Observación / Detalle</th>
              <th style={{ width: '5%', textAlign: 'center' }}></th>
            </tr>
          </thead>
          <tbody>
            {accesorios.map((acc, idx) => (
              <tr key={idx}>
                <td>
                  <input
                    type="text"
                    value={acc.nombre}
                    onChange={(e) => handleNombreChange(idx, e.target.value)}
                    className="form-control-custom"
                    style={{ padding: '6px 10px', fontSize: '13px' }}
                    placeholder="Nombre del accesorio"
                  />
                </td>
                <td>
                  <div className="estado-pill-group">
                    {ESTADOS.map((est) => {
                      const isActive = acc.estado === est.valor;
                      return (
                        <button
                          key={est.valor}
                          type="button"
                          className={`btn-estado-pill ${isActive ? est.activeClass : ''}`}
                          onClick={() => handleEstadoChange(idx, est.valor)}
                        >
                          {est.label}
                        </button>
                      );
                    })}
                  </div>
                </td>
                <td>
                  <input
                    type="text"
                    value={acc.observacion || ''}
                    onChange={(e) => handleObservacionChange(idx, e.target.value)}
                    placeholder="Opcional: rayones, desgaste, marca..."
                    className="form-control-custom"
                    style={{ padding: '6px 10px', fontSize: '12.5px' }}
                  />
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => handleRemove(idx)}
                    className="btn-accion eliminar"
                    title="Quitar accesorio de la lista"
                    style={{ padding: '4px 6px' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Agregar otro accesorio no estándar */}
      <div style={{ marginTop: '16px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Nombre de otro accesorio (ej. Portaequipajes, Cargador USB...)"
          value={nuevoNombre}
          onChange={(e) => setNuevoNombre(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddCustom(e);
            }
          }}
          className="form-control-custom"
          style={{ maxWidth: '420px', padding: '8px 12px' }}
        />
        <button
          type="button"
          onClick={handleAddCustom}
          className="btn-secondary-custom"
          style={{ padding: '8px 14px' }}
        >
          <Plus size={16} />
          Añadir Accesorio
        </button>
      </div>
    </div>
  );
}

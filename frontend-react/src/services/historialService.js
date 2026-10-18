import { apiFetch } from './api';

export const getHistorialVehiculo = async (idVehiculo) => {
  const res = await apiFetch(`/api/historial/vehiculo/${idVehiculo}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al cargar historial');
  return data;
};

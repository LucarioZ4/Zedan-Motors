import { apiFetch } from './api';

export const getVehiculos = async (buscar = '') => {
  const query = buscar ? `?buscar=${encodeURIComponent(buscar)}` : '';
  const res = await apiFetch(`/api/vehiculos${query}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al cargar vehículos');
  return data;
};

export const getVehiculoById = async (id) => {
  const res = await apiFetch(`/api/vehiculos/${id}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al obtener vehículo');
  return data;
};

export const createVehiculo = async (vehiculo) => {
  const res = await apiFetch('/api/vehiculos', {
    method: 'POST',
    body: JSON.stringify(vehiculo)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al crear vehículo');
  return data;
};

export const updateVehiculo = async (id, vehiculo) => {
  const res = await apiFetch(`/api/vehiculos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(vehiculo)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al actualizar vehículo');
  return data;
};

export const deleteVehiculo = async (id) => {
  const res = await apiFetch(`/api/vehiculos/${id}`, {
    method: 'DELETE'
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al eliminar vehículo');
  return data;
};

export const importarVehiculos = async (items, idClienteDefecto = null) => {
  const res = await apiFetch('/api/vehiculos/importar', {
    method: 'POST',
    body: JSON.stringify({ items, idClienteDefecto })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error en la importación de vehículos');
  return data;
};

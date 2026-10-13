import { apiFetch } from './api';

export const getServicios = async (buscar = '') => {
  const query = buscar ? `?buscar=${encodeURIComponent(buscar)}` : '';
  const res = await apiFetch(`/api/servicios${query}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al cargar servicios');
  return data;
};

export const getServicioById = async (id) => {
  const res = await apiFetch(`/api/servicios/${id}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al obtener servicio');
  return data;
};

export const createServicio = async (servicio) => {
  const res = await apiFetch('/api/servicios', {
    method: 'POST',
    body: JSON.stringify(servicio)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al crear servicio');
  return data;
};

export const updateServicio = async (id, servicio) => {
  const res = await apiFetch(`/api/servicios/${id}`, {
    method: 'PUT',
    body: JSON.stringify(servicio)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al actualizar servicio');
  return data;
};

export const deleteServicio = async (id) => {
  const res = await apiFetch(`/api/servicios/${id}`, {
    method: 'DELETE'
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al eliminar servicio');
  return data;
};

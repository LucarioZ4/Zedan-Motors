import { apiFetch } from './api';

export const getCitas = async (buscar = '') => {
  const url = buscar
    ? `/api/citas?buscar=${encodeURIComponent(buscar)}`
    : '/api/citas';
  const res = await apiFetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al cargar citas');
  return data;
};

export const getCitaById = async (id) => {
  const res = await apiFetch(`/api/citas/${id}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al obtener cita');
  return data;
};

export const createCita = async (cita) => {
  const res = await apiFetch('/api/citas', {
    method: 'POST',
    body: JSON.stringify(cita)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al crear cita');
  return data;
};

export const updateCita = async (id, cita) => {
  const res = await apiFetch(`/api/citas/${id}`, {
    method: 'PUT',
    body: JSON.stringify(cita)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al actualizar cita');
  return data;
};

export const deleteCita = async (id) => {
  const res = await apiFetch(`/api/citas/${id}`, {
    method: 'DELETE'
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al eliminar cita');
  return data;
};

export const getVehiculosPorCliente = async (idCliente) => {
  const res = await apiFetch(`/api/clientes/${idCliente}/vehiculos`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al cargar vehículos');
  return data;
};

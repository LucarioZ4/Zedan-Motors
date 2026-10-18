import { apiFetch } from './api';

export const getInventario = async (buscar = '') => {
  const url = buscar
    ? `/api/inventario?buscar=${encodeURIComponent(buscar)}`
    : '/api/inventario';
  const res = await apiFetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al cargar inventario');
  return data;
};

export const getRepuestoById = async (id) => {
  const res = await apiFetch(`/api/inventario/${id}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al obtener repuesto');
  return data;
};

export const createRepuesto = async (repuesto) => {
  const res = await apiFetch('/api/inventario', {
    method: 'POST',
    body: JSON.stringify(repuesto)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al crear repuesto');
  return data;
};

export const updateRepuesto = async (id, repuesto) => {
  const res = await apiFetch(`/api/inventario/${id}`, {
    method: 'PUT',
    body: JSON.stringify(repuesto)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al actualizar repuesto');
  return data;
};
export const deleteRepuesto = async (id) => {
  const res = await apiFetch(`/api/inventario/${id}`, {
    method: 'DELETE'
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al eliminar repuesto');
  return data;
};

export const importarRepuestos = async (items) => {
  const res = await apiFetch('/api/inventario/importar', {
    method: 'POST',
    body: JSON.stringify({ items })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al importar repuestos');
  return data;
};

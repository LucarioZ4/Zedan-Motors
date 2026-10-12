import { apiFetch } from './api';

export const getClientes = async (buscar = '') => {
  const query = buscar ? `?buscar=${encodeURIComponent(buscar)}` : '';
  const res = await apiFetch(`/api/clientes${query}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al cargar clientes');
  return data;
};

export const getClienteById = async (id) => {
  const res = await apiFetch(`/api/clientes/${id}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al obtener cliente');
  return data;
};

export const createCliente = async (cliente) => {
  const res = await apiFetch('/api/clientes', {
    method: 'POST',
    body: JSON.stringify(cliente)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al crear cliente');
  return data;
};

export const updateCliente = async (id, cliente) => {
  const res = await apiFetch(`/api/clientes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(cliente)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al actualizar cliente');
  return data;
};

export const deleteCliente = async (id) => {
  const res = await apiFetch(`/api/clientes/${id}`, {
    method: 'DELETE'
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al eliminar cliente');
  return data;
};

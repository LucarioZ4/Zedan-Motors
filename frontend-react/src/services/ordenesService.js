import { apiFetch } from './api';

export const getOrdenes = async () => {
  const res = await apiFetch('/api/ordenes');
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al cargar órdenes');
  return data;
};

export const getOrdenById = async (id) => {
  const res = await apiFetch(`/api/ordenes/${id}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al obtener orden');
  return data;
};

export const createOrden = async (orden) => {
  const res = await apiFetch('/api/ordenes', {
    method: 'POST',
    body: JSON.stringify(orden)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al crear orden');
  return data;
};

export const updateOrden = async (id, orden) => {
  const res = await apiFetch(`/api/ordenes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(orden)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al actualizar orden');
  return data;
};

export const deleteOrden = async (id) => {
  const res = await apiFetch(`/api/ordenes/${id}`, {
    method: 'DELETE'
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al eliminar orden');
  return data;
};

export const getServiciosOrden = async (idOrden) => {
  const res = await apiFetch(`/api/ordenes/${idOrden}/servicios`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al cargar servicios');
  return data;
};

export const getRepuestosOrden = async (idOrden) => {
  const res = await apiFetch(`/api/ordenes/${idOrden}/repuestos`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al cargar repuestos');
  return data;
};

export const addServicioOrden = async (idOrden, idServicio) => {
  const res = await apiFetch(`/api/ordenes/${idOrden}/servicios`, {
    method: 'POST',
    body: JSON.stringify({ id_servicio: idServicio })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al agregar servicio');
  return data;
};

export const removeServicioOrden = async (idOrden, idServicio) => {
  const res = await apiFetch(`/api/ordenes/${idOrden}/servicios/${idServicio}`, {
    method: 'DELETE'
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al quitar servicio');
  return data;
};

export const addRepuestoOrden = async (idOrden, idRepuesto, cantidad) => {
  const res = await apiFetch(`/api/ordenes/${idOrden}/repuestos`, {
    method: 'POST',
    body: JSON.stringify({ id_repuesto: idRepuesto, cantidad })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al agregar repuesto');
  return data;
};

export const removeRepuestoOrden = async (idOrden, idRepuesto) => {
  const res = await apiFetch(`/api/ordenes/${idOrden}/repuestos/${idRepuesto}`, {
    method: 'DELETE'
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al quitar repuesto');
  return data;
};

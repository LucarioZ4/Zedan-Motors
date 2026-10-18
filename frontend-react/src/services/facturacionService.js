import { apiFetch } from './api';

export const getFacturas = async () => {
  const res = await apiFetch('/api/facturacion');
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al cargar facturas');
  return data;
};

export const getFacturaById = async (id) => {
  const res = await apiFetch(`/api/facturacion/${id}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al obtener factura');
  return data;
};

export const createFactura = async (factura) => {
  const res = await apiFetch('/api/facturacion', {
    method: 'POST',
    body: JSON.stringify(factura)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al crear factura');
  return data;
};

export const deleteFactura = async (id) => {
  const res = await apiFetch(`/api/facturacion/${id}`, {
    method: 'DELETE'
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al eliminar factura');
  return data;
};

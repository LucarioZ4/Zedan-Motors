import { apiFetch, getErrorMessage } from './api';

export const getFacturas = async () => {
  const res = await apiFetch('/api/facturacion');
  if (!res.ok) throw new Error(await getErrorMessage(res, 'Error al cargar facturas'));
  return res.json();
};

export const getFacturaById = async (id) => {
  const res = await apiFetch(`/api/facturacion/${id}`);
  if (!res.ok) throw new Error(await getErrorMessage(res, 'Error al obtener factura'));
  return res.json();
};

export const createFactura = async (factura) => {
  const res = await apiFetch('/api/facturacion', {
    method: 'POST',
    body: JSON.stringify(factura)
  });
  if (!res.ok) throw new Error(await getErrorMessage(res, 'Error al crear factura'));
  return res.json();
};

export const deleteFactura = async (id) => {
  const res = await apiFetch(`/api/facturacion/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error(await getErrorMessage(res, 'Error al eliminar factura'));
  // La API de C# responde 204 sin cuerpo; la de Node responde JSON
  return res.status === 204 ? null : res.json();
};

export const enviarFacturaCorreo = async (id, correo = null) => {
  const options = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  };
  if (correo) {
    options.body = JSON.stringify({ correo });
  }
  const res = await apiFetch(`/api/facturacion/${id}/enviar-correo`, options);
  if (!res.ok) throw new Error(await getErrorMessage(res, 'Error al enviar factura por correo'));
  return res.json();
};

export const enviarFacturaWhatsApp = async (id) => {
  const res = await apiFetch(`/api/facturacion/${id}/enviar-whatsapp`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error(await getErrorMessage(res, 'Error al enviar factura por WhatsApp'));
  return res.json();
};
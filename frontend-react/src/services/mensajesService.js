import { apiFetch } from './api';

export const getMensajes = async () => {
  const res = await apiFetch('/api/mensajes');
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al obtener mensajes');
  return data;
};

export const createMensaje = async (mensajeData) => {
  const res = await apiFetch('/api/mensajes', {
    method: 'POST',
    body: JSON.stringify(mensajeData)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al registrar mensaje');
  return data;
};

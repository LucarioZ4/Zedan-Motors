import { apiFetch } from './api';

// CRUD para diagnóstico
export const getDiagnosticos = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await apiFetch(`/api/diagnosticos${query ? '?' + query : ''}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al obtener diagnósticos');
  return data;
};

export const getDiagnostico = async (id) => {
  const res = await apiFetch(`/api/diagnosticos/${id}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Diagnóstico no encontrado');
  return data;
};

export const crearDiagnostico = async (payload) => {
  const res = await apiFetch('/api/diagnosticos', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al crear diagnóstico');
  return data;
};

export const actualizarDiagnostico = async (id, payload) => {
  const res = await apiFetch(`/api/diagnosticos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al actualizar diagnóstico');
  return data;
};

export const eliminarDiagnostico = async (id) => {
  const res = await apiFetch(`/api/diagnosticos/${id}`, { method: 'DELETE' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al eliminar diagnóstico');
  return data;
};

// Archivos
export const prepararSubidaArchivo = async (diagnosticoId, archivo) => {
  const { nombre_original, mime, tamano, tipo, descripcion } = archivo;
  const body = { nombre_original, mime, tamano, tipo, descripcion };
  const res = await apiFetch(`/api/diagnosticos/${diagnosticoId}/archivos`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al preparar subida');
  return data; // {ruta, token, bucket}
};

export const eliminarArchivo = async (diagnosticoId, archivoId) => {
  const res = await apiFetch(`/api/diagnosticos/${diagnosticoId}/archivos/${archivoId}`, { method: 'DELETE' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al eliminar archivo');
  return data;
};


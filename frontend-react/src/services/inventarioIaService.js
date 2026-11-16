import { API_URL, getErrorMessage } from './api';

/**
 * Encabezados sin Content-Type para peticiones con FormData (multipart).
 * El navegador genera el boundary automáticamente.
 */
const getAuthHeaders = () => {
  const token = sessionStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Consulta el estado y configuración de la función de IA.
 * GET /api/inventario/ia/estado
 */
export const getEstadoIA = async () => {
  const token = sessionStorage.getItem('token');
  const res = await fetch(`${API_URL}/api/inventario/ia/estado`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  if (res.status === 401) {
    sessionStorage.clear();
    window.location.href = '/login';
    throw new Error('Sesión expirada');
  }

  if (!res.ok) {
    const msg = await getErrorMessage(res, 'Error al consultar estado de IA');
    throw new Error(msg);
  }

  return res.json();
};

/**
 * Envía las imágenes para análisis de IA (multipart/form-data).
 * POST /api/inventario/ia/analizar
 */
export const analizarImagenesIA = async (imagenesFiles, modo = 'entrada') => {
  const formData = new FormData();
  formData.append('modo', modo);

  for (const file of imagenesFiles) {
    formData.append('imagenes', file);
  }

  const res = await fetch(`${API_URL}/api/inventario/ia/analizar`, {
    method: 'POST',
    headers: getAuthHeaders(), // SIN Content-Type para multipart
    body: formData
  });

  if (res.status === 401) {
    sessionStorage.clear();
    window.location.href = '/login';
    throw new Error('Sesión expirada');
  }

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error('Alcanzaste el límite de análisis por hora. Intenta más tarde.');
    }
    if (res.status === 503) {
      throw new Error('La función de IA no está configurada o se encuentra deshabilitada.');
    }
    const msg = await getErrorMessage(res, 'Error al analizar las imágenes');
    throw new Error(msg);
  }

  return res.json();
};

/**
 * Obtiene el detalle de un análisis existente.
 * GET /api/inventario/ia/:id
 */
export const getAnalisisIAById = async (idAnalisis) => {
  const token = sessionStorage.getItem('token');
  const res = await fetch(`${API_URL}/api/inventario/ia/${idAnalisis}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  if (res.status === 401) {
    sessionStorage.clear();
    window.location.href = '/login';
    throw new Error('Sesión expirada');
  }

  if (!res.ok) {
    const msg = await getErrorMessage(res, 'Error al consultar análisis de IA');
    throw new Error(msg);
  }

  return res.json();
};

/**
 * Confirma una propuesta de análisis para sumar stock o crear repuestos.
 * POST /api/inventario/ia/:id/confirmar
 */
export const confirmarAnalisisIA = async (idAnalisis, items) => {
  const token = sessionStorage.getItem('token');
  const res = await fetch(`${API_URL}/api/inventario/ia/${idAnalisis}/confirmar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ items })
  });

  if (res.status === 401) {
    sessionStorage.clear();
    window.location.href = '/login';
    throw new Error('Sesión expirada');
  }

  if (!res.ok) {
    if (res.status === 409) {
      throw new Error('Este análisis ya fue confirmado o descartado previamente.');
    }
    const msg = await getErrorMessage(res, 'Error al confirmar análisis');
    throw new Error(msg);
  }

  return res.json();
};

/**
 * Descarta un análisis pendiente.
 * POST /api/inventario/ia/:id/descartar
 */
export const descartarAnalisisIA = async (idAnalisis) => {
  const token = sessionStorage.getItem('token');
  const res = await fetch(`${API_URL}/api/inventario/ia/${idAnalisis}/descartar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  if (res.status === 401) {
    sessionStorage.clear();
    window.location.href = '/login';
    throw new Error('Sesión expirada');
  }

  if (!res.ok) {
    const msg = await getErrorMessage(res, 'Error al descartar análisis');
    throw new Error(msg);
  }

  return res.json();
};

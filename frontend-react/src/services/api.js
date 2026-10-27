const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5200';
const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL || 'http://localhost:3000';

export const getHeaders = () => {
  const token = sessionStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export const apiFetch = async (endpoint, options = {}) => {
  // Rutas que maneja Node (puerto 3000): auth, dashboard, ordenes y facturacion (con DIAN/Factus y subrutas de repuestos/servicios)
  const isNodeEndpoint = 
    endpoint.startsWith('/api/auth') || 
    endpoint.startsWith('/api/dashboard') ||
    endpoint.startsWith('/api/ordenes') ||
    endpoint.startsWith('/api/facturacion');

  const baseUrl = isNodeEndpoint ? AUTH_API_URL : API_URL;
  const url = `${baseUrl}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers
    }
  });

  if (response.status === 401) {
    sessionStorage.clear();
    window.location.href = '/login';
    throw new Error('Sesión expirada');
  }

  return response;
};

// Helper para extraer mensajes de error de APIs Node o ASP.NET Core
export const getErrorMessage = async (res, defaultMsg = 'Error en la petición') => {
  try {
    const data = await res.json();
    if (data.mensaje) return data.mensaje;
    if (data.error) return data.error;
    if (data.title) {
      if (data.errors && typeof data.errors === 'object') {
        const details = Object.values(data.errors).flat().join(', ');
        return details || data.title;
      }
      return data.title;
    }
  } catch {
    // Si no es JSON o falla el parseo
  }
  return defaultMsg;
};

export { API_URL };

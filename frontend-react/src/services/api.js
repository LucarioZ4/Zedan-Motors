// En producción (ej. Vercel), frontend y backend comparten el mismo dominio (/api),
// por lo que nunca debe apuntar a localhost ni requerir URL absoluta.
let apiUrl = import.meta.env.VITE_API_URL || '';
if (import.meta.env.PROD && (apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1'))) {
  apiUrl = '';
}
const API_URL = apiUrl;

export const getHeaders = () => {
  const token = sessionStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export const apiFetch = async (endpoint, options = {}, { redirectOnUnauthorized = true } = {}) => {
  const url = `${API_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers
    }
  });

  if (response.status === 401 && redirectOnUnauthorized) {
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

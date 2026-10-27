const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const getHeaders = () => {
  const token = sessionStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export const apiFetch = async (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint}`;
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

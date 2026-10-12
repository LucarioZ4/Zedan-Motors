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

export { API_URL };

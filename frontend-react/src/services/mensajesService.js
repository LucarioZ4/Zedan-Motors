const BASE_URL = '/api/mensajes';

const getAuthHeaders = () => {
  const token = sessionStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export const getMensajes = async () => {
  const res = await fetch(BASE_URL, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Error al obtener mensajes');
  }
  return res.json();
};

export const createMensaje = async (mensajeData) => {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(mensajeData)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Error al registrar mensaje');
  }
  return res.json();
};

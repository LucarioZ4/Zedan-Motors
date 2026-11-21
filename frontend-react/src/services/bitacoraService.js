import { apiFetch } from './api';

export const bitacoraService = {
  // Obtiene los eventos y diffs de la sesión activa actual del usuario
  getSesionActiva: async () => {
    const res = await apiFetch('/api/bitacora/activa');
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al obtener bitácora de la sesión activa');
    }
    return res.json();
  },

  // Lista todas las sesiones con contadores y métricas (solo administradores)
  getSesiones: async ({ idUsuario = '', estado = '', limit = 50, offset = 0 } = {}) => {
    const params = new URLSearchParams();
    if (idUsuario) params.append('id_usuario', idUsuario);
    if (estado) params.append('estado', estado);
    params.append('limit', limit);
    params.append('offset', offset);

    const res = await apiFetch(`/api/bitacora/sesiones?${params.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al listar sesiones de bitácora');
    }
    return res.json();
  },

  // Obtiene el timeline y diffs detallados de una sesión específica por su UUID
  getTimelineSesion: async (idSesion) => {
    const res = await apiFetch(`/api/bitacora/sesiones/${idSesion}/timeline`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al obtener la línea de tiempo de la sesión');
    }
    return res.json();
  }
};

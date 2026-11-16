import { apiFetch } from './api';

export const getDashboardKPIs = async () => {
  const res = await apiFetch('/api/dashboard/kpis');
  if (!res.ok) throw new Error('Error al cargar KPIs');
  return res.json();
};

export const getCitasHoy = async () => {
  const res = await apiFetch('/api/dashboard/citas-hoy');
  if (!res.ok) throw new Error('Error al cargar citas de hoy');
  return res.json();
};

export const getGraficas = async () => {
  const res = await apiFetch('/api/dashboard/graficas');
  if (!res.ok) throw new Error('Error al cargar las gráficas');
  return res.json();
};
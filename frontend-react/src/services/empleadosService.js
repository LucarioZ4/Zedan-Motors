import { apiFetch } from './api';

export const getEmpleados = async (buscar = '') => {
  const res = await apiFetch('/api/empleados');
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al cargar empleados');

  if (!buscar) return data;
  const term = buscar.toUpperCase();
  return data.filter(e =>
    e.nombre?.toUpperCase().includes(term) ||
    e.apellido?.toUpperCase().includes(term) ||
    (e.cargo && e.cargo.toUpperCase().includes(term))
  );
};

export const getEmpleadoById = async (id) => {
  const res = await apiFetch(`/api/empleados/${id}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al obtener empleado');
  return data;
};

export const getCargos = async () => {
  const res = await apiFetch('/api/cargos');
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al cargar cargos');
  return data;
};

export const createEmpleado = async (empleado) => {
  const res = await apiFetch('/api/empleados', {
    method: 'POST',
    body: JSON.stringify(empleado)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al crear empleado');
  return data;
};

export const updateEmpleado = async (id, empleado) => {
  const res = await apiFetch(`/api/empleados/${id}`, {
    method: 'PUT',
    body: JSON.stringify(empleado)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al actualizar empleado');
  return data;
};

export const deleteEmpleado = async (id) => {
  const res = await apiFetch(`/api/empleados/${id}`, {
    method: 'DELETE'
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al eliminar empleado');
  return data;
};

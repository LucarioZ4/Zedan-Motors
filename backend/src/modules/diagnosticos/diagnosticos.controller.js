// Diagnosticos Controller
// Sigue el mismo estilo que los demás controladores del proyecto.
// Usa el driver pg (pool) y storage.service para subir archivos a Supabase.

const pool = require('../../config/database');
const storage = require('../../services/storage.service');
const crypto = require('crypto');
const path = require('path');
const { diagMaxMb, diagAllowedMime, diagBucket } = require('../../config/env');

// Helper para respuestas de error
const responderError = (res, err, mensajeGen) => {
  if (err.status) return res.status(err.status).json({ error: err.message });
  console.error(err);
  return res.status(500).json({ error: mensajeGen });
};

const guardar = async (req, res) => {
  const id = req.params.id;
  const { id_vehiculo, id_cita, fecha_ingreso, kilometraje, nivel_gasolina, observaciones, estado, accesorios } = req.body;
  if ((!id && (!id_vehiculo || kilometraje == null || !nivel_gasolina)) ||
      (kilometraje != null && (!Number.isInteger(Number(kilometraje)) || Number(kilometraje) < 0)) ||
      (accesorios != null && !Array.isArray(accesorios)))
    return res.status(400).json({ error: 'Datos de diagnóstico inválidos' });

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const result = id
      ? await client.query(
          `UPDATE diagnostico SET fecha_ingreso=COALESCE($1,fecha_ingreso),kilometraje=COALESCE($2,kilometraje),
               nivel_gasolina=COALESCE($3,nivel_gasolina),observaciones=COALESCE($4,observaciones),estado=COALESCE($5,estado)
           WHERE id_diagnostico=$6 RETURNING *`,[fecha_ingreso,kilometraje,nivel_gasolina,observaciones,estado,id])
      : await client.query(
          `INSERT INTO diagnostico(id_vehiculo,id_cita,fecha_ingreso,kilometraje,nivel_gasolina,observaciones,estado)
           VALUES($1,$2,COALESCE($3::timestamp,LOCALTIMESTAMP),$4,$5,$6,$7) RETURNING *`,
          [id_vehiculo,id_cita,fecha_ingreso,kilometraje,nivel_gasolina,observaciones,estado || 'En proceso']);
    const diagnostico = result.rows[0];
    if (!diagnostico) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Diagnóstico no encontrado' });
    }
    if (accesorios != null) {
      await client.query('DELETE FROM diagnostico_accesorio WHERE id_diagnostico=$1',[diagnostico.id_diagnostico]);
      for (const a of accesorios)
        await client.query('INSERT INTO diagnostico_accesorio(id_diagnostico,nombre,estado,observacion) VALUES($1,$2,$3,$4)',
          [diagnostico.id_diagnostico,a?.nombre,a?.estado,a?.observacion || null]);
    }
    await client.query('COMMIT');
    res.status(id ? 200 : 201).json(diagnostico);
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    if (err.code === '23503') return res.status(404).json({ error: 'Vehículo o cita no encontrados' });
    if (['23505','23514','23502','22001','22007','22P02'].includes(err.code))
      return res.status(400).json({ error: 'Datos del diagnóstico o accesorios inválidos' });
    responderError(res,err,'Error al guardar diagnóstico');
  } finally {
    if (client) client.release();
  }
};

// GET /api/diagnosticos
const listar = async (req, res) => {
  try {
    const { vehiculo, cliente, fechaDesde, fechaHasta, estado } = req.query;
    let sql = `
      SELECT d.*, v.placa, v.marca, v.modelo,
             cl.nombre || ' ' || cl.apellido AS cliente
      FROM diagnostico d
      JOIN vehiculo v ON d.id_vehiculo = v.id_vehiculo
      JOIN cliente cl ON v.id_cliente = cl.id_cliente
      WHERE 1=1`;
    const params = [];
    let idx = 1;
    if (vehiculo) { sql += ` AND v.placa ILIKE $${idx++}`; params.push(`%${vehiculo}%`); }
    if (cliente) { sql += ` AND (cl.nombre ILIKE $${idx++} OR cl.apellido ILIKE $${idx++})`; params.push(`%${cliente}%`, `%${cliente}%`); }
    if (fechaDesde) { sql += ` AND d.fecha_ingreso >= $${idx++}`; params.push(fechaDesde); }
    if (fechaHasta) { sql += ` AND d.fecha_ingreso <= $${idx++}`; params.push(fechaHasta); }
    if (estado) { sql += ` AND d.estado = $${idx++}`; params.push(estado); }
    sql += ' ORDER BY d.fecha_ingreso DESC';
    const r = await pool.query(sql, params);
    res.json(r.rows);
  } catch (err) {
    responderError(res, err, 'Error al listar diagnósticos');
  }
};

// GET /api/diagnosticos/:id
const detalle = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const d = await pool.query('SELECT * FROM diagnostico WHERE id_diagnostico=$1', [id]);
    if (d.rowCount === 0) return res.status(404).json({ error: 'Diagnóstico no encontrado' });

    const accesorios = await pool.query(
      'SELECT nombre, estado, observacion FROM diagnostico_accesorio WHERE id_diagnostico=$1',
      [id]
    );
    const archivos = await pool.query(
      'SELECT * FROM diagnostico_archivo WHERE id_diagnostico=$1',
      [id]
    );
    res.json({ ...d.rows[0], accesorios: accesorios.rows, archivos: archivos.rows });
  } catch (err) {
    responderError(res, err, 'Error al obtener diagnóstico');
  }
};

// DELETE /api/diagnosticos/:id
const remover = async (req, res) => {
  try {
    const id = Number(req.params.id);
    // borrar archivos físicos primero
    const archivos = await pool.query('SELECT ruta FROM diagnostico_archivo WHERE id_diagnostico=$1', [id]);
    const rutas = archivos.rows.map(r => r.ruta);
    await storage.eliminar(rutas.filter(r => r.startsWith('archivos/')), diagBucket);
    await storage.eliminar(rutas.filter(r => !r.startsWith('archivos/')));
    // cascade eliminará accesorios y registros de archivo
    await pool.query('DELETE FROM diagnostico WHERE id_diagnostico=$1', [id]);
    res.json({ mensaje: 'Diagnóstico eliminado' });
  } catch (err) {
    responderError(res, err, 'Error al eliminar diagnóstico');
  }
};

/* ---------- Archivos ---------- */

// POST /api/diagnosticos/:id/archivos (prepara firma de subida)
const subirArchivo = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existe = await pool.query('SELECT 1 FROM diagnostico WHERE id_diagnostico=$1', [id]);
    if (existe.rowCount === 0) return res.status(404).json({ error: 'Diagnóstico no encontrado' });

    const { tipo, nombre_original, mime, tamano, descripcion } = req.body;
    if (!['imagen', 'video'].includes(tipo))
      return res.status(400).json({ error: 'Tipo debe ser "imagen" o "video"' });
    if (!diagAllowedMime.includes(mime))
      return res.status(400).json({ error: `MIME ${mime} no permitido` });
    const maxBytes = diagMaxMb * 1024 * 1024;
    if (tamano > maxBytes)
      return res.status(413).json({ error: `Archivo supera ${diagMaxMb} MB` });

    if (!Number.isSafeInteger(tamano) || tamano <= 0 || typeof nombre_original !== 'string')
      return res.status(400).json({ error: 'Nombre o tamaño de archivo inválido' });
    const extension = path.extname(nombre_original);
    const ext = /^[.][a-z0-9]{1,6}$/i.test(extension) ? extension : (tipo === 'video' ? '.mp4' : '.jpg');
    const ruta = `archivos/${id}/${tipo}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;

    const firma = await storage.crearSubidaFirmada(ruta, diagBucket);
    // Guardamos registro provisional (se completará después de la subida real)
    await pool.query(
      `INSERT INTO diagnostico_archivo (id_diagnostico, ruta, tipo, nombre_original, tamano, descripcion)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, ruta, tipo, nombre_original, tamano, descripcion || null]
    );
    res.json({ ruta: firma.ruta, token: firma.token, bucket: diagBucket });
  } catch (err) {
    responderError(res, err, 'Error al preparar subida de archivo');
  }
};

// DELETE /api/diagnosticos/:id/archivos/:archivoId
const eliminarArchivo = async (req, res) => {
  try {
    const { id, archivoId } = req.params;
    const r = await pool.query(
      'SELECT ruta FROM diagnostico_archivo WHERE id_archivo=$1 AND id_diagnostico=$2',
      [archivoId, id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'Archivo no encontrado' });
    const ruta = r.rows[0].ruta;
    await storage.eliminar([ruta], ruta.startsWith('archivos/') ? diagBucket : storage.bucket);
    await pool.query('DELETE FROM diagnostico_archivo WHERE id_archivo=$1', [archivoId]);
    res.json({ mensaje: 'Archivo eliminado' });
  } catch (err) {
    responderError(res, err, 'Error al eliminar archivo');
  }
};

module.exports = {
  crear: guardar,
  listar,
  detalle,
  actualizar: guardar,
  remover,
  subirArchivo,
  eliminarArchivo,
};


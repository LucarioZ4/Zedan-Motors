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

// Verifica existencia de vehículo
const vehiculoExiste = async id => {
  const r = await pool.query('SELECT 1 FROM vehiculo WHERE id_vehiculo=$1', [id]);
  return r.rowCount > 0;
};
// Verifica existencia de cita (opcional)
const citaExiste = async id => {
  if (!id) return true;
  const r = await pool.query('SELECT 1 FROM cita WHERE id_cita=$1', [id]);
  return r.rowCount > 0;
};

/* ---------- CRUD ---------- */

// POST /api/diagnosticos
const crear = async (req, res) => {
  try {
    const {
      id_vehiculo,
      id_cita,
      fecha_ingreso,
      kilometraje,
      nivel_gasolina,
      observaciones,
      estado,
      accesorios = []
    } = req.body;

    if (!await vehiculoExiste(id_vehiculo))
      return res.status(404).json({ error: 'Vehículo no encontrado' });
    if (!await citaExiste(id_cita))
      return res.status(404).json({ error: 'Cita no encontrada' });

    const r = await pool.query(
      `INSERT INTO diagnostico (id_vehiculo, id_cita, fecha_ingreso, kilometraje,
                                 nivel_gasolina, observaciones, estado)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        id_vehiculo,
        id_cita || null,
        fecha_ingreso || new Date(),
        kilometraje,
        nivel_gasolina,
        observaciones || null,
        estado || 'En proceso',
      ]
    );
    const diagnostico = r.rows[0];

    // Insertar accesorios (si los hay)
    const insAcc = accesorios.map(a =>
      pool.query(
        `INSERT INTO diagnostico_accesorio (id_diagnostico, nombre, estado, observacion)
         VALUES ($1,$2,$3,$4)`,
        [diagnostico.id_diagnostico, a.nombre, a.estado, a.observacion || null]
      )
    );
    await Promise.all(insAcc);

    res.status(201).json(diagnostico);
  } catch (err) {
    responderError(res, err, 'Error al crear diagnóstico');
  }
};

// GET /api/diagnosticos
const listar = async (req, res) => {
  try {
    const { vehiculo, cliente, fechaDesde, fechaHasta, estado } = req.query;
    let sql = `
      SELECT d.*, v.placa, v.marca, v.modelo, v.color, v.anio,
             cl.nombre || ' ' || cl.apellido AS cliente, cl.telefono AS cliente_telefono,
             (SELECT COUNT(*) FROM diagnostico_accesorio WHERE id_diagnostico = d.id_diagnostico)::int AS total_accesorios,
             (SELECT COUNT(*) FROM diagnostico_archivo WHERE id_diagnostico = d.id_diagnostico)::int AS total_archivos
      FROM diagnostico d
      JOIN vehiculo v ON d.id_vehiculo = v.id_vehiculo
      JOIN cliente cl ON v.id_cliente = cl.id_cliente
      WHERE 1=1`;
    const params = [];
    let idx = 1;
    if (vehiculo) { sql += ` AND (v.placa ILIKE $${idx} OR v.marca ILIKE $${idx} OR v.modelo ILIKE $${idx})`; params.push(`%${vehiculo}%`); idx++; }
    if (cliente) { sql += ` AND (cl.nombre ILIKE $${idx} OR cl.apellido ILIKE $${idx})`; params.push(`%${cliente}%`); idx++; }
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
    const d = await pool.query(`
      SELECT d.*, v.placa, v.marca, v.modelo, v.anio, v.color,
             cl.id_cliente, cl.nombre AS cliente_nombre, cl.apellido AS cliente_apellido,
             cl.nombre || ' ' || cl.apellido AS cliente, cl.telefono AS cliente_telefono, cl.correo AS cliente_correo,
             c.fecha AS cita_fecha, c.hora AS cita_hora, c.motivo AS cita_motivo
      FROM diagnostico d
      JOIN vehiculo v ON d.id_vehiculo = v.id_vehiculo
      JOIN cliente cl ON v.id_cliente = cl.id_cliente
      LEFT JOIN cita c ON d.id_cita = c.id_cita
      WHERE d.id_diagnostico=$1`, [id]);
    if (d.rowCount === 0) return res.status(404).json({ error: 'Diagnóstico no encontrado' });

    const accesorios = await pool.query(
      'SELECT id_accesorio, nombre, estado, observacion FROM diagnostico_accesorio WHERE id_diagnostico=$1 ORDER BY id_accesorio ASC',
      [id]
    );
    const archivos = await pool.query(
      'SELECT id_archivo, id_diagnostico, ruta, tipo, nombre_original, tamano, descripcion, creado_en FROM diagnostico_archivo WHERE id_diagnostico=$1 ORDER BY creado_en DESC',
      [id]
    );

    let urls = {};
    if (storage.configurado() && archivos.rows.length > 0) {
      try {
        urls = await storage.urlsFirmadas(archivos.rows.map(a => a.ruta));
      } catch (e) {
        console.warn('No se pudieron generar URLs firmadas:', e.message);
      }
    }
    const archivosConUrl = archivos.rows.map(a => ({
      ...a,
      url: urls[a.ruta] || a.ruta
    }));

    res.json({ ...d.rows[0], accesorios: accesorios.rows, archivos: archivosConUrl });
  } catch (err) {
    responderError(res, err, 'Error al obtener diagnóstico');
  }
};

// PUT /api/diagnosticos/:id
const actualizar = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const {
      fecha_ingreso,
      kilometraje,
      nivel_gasolina,
      observaciones,
      estado,
      accesorios
    } = req.body;

    const d = await pool.query('SELECT * FROM diagnostico WHERE id_diagnostico=$1', [id]);
    if (d.rowCount === 0) return res.status(404).json({ error: 'Diagnóstico no encontrado' });

    await pool.query(
      `UPDATE diagnostico SET
         fecha_ingreso = $1,
         kilometraje = $2,
         nivel_gasolina = $3,
         observaciones = $4,
         estado = $5
       WHERE id_diagnostico = $6`,
      [
        fecha_ingreso || d.rows[0].fecha_ingreso,
        kilometraje ?? d.rows[0].kilometraje,
        nivel_gasolina || d.rows[0].nivel_gasolina,
        observaciones ?? d.rows[0].observaciones,
        estado || d.rows[0].estado,
        id,
      ]
    );

    if (Array.isArray(accesorios)) {
      await pool.query('DELETE FROM diagnostico_accesorio WHERE id_diagnostico=$1', [id]);
      const ins = accesorios.map(a =>
        pool.query(
          `INSERT INTO diagnostico_accesorio (id_diagnostico, nombre, estado, observacion)
           VALUES ($1,$2,$3,$4)`,
          [id, a.nombre, a.estado, a.observacion || null]
        )
      );
      await Promise.all(ins);
    }
    const actualizado = await pool.query('SELECT * FROM diagnostico WHERE id_diagnostico=$1', [id]);
    res.json(actualizado.rows[0]);
  } catch (err) {
    responderError(res, err, 'Error al actualizar diagnóstico');
  }
};

// DELETE /api/diagnosticos/:id
const remover = async (req, res) => {
  try {
    const id = Number(req.params.id);
    // borrar archivos físicos primero
    const archivos = await pool.query('SELECT ruta FROM diagnostico_archivo WHERE id_diagnostico=$1', [id]);
    if (archivos.rowCount) await storage.eliminar(archivos.rows.map(r => r.ruta));
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

    const ext = path.extname(nombre_original) || (tipo === 'video' ? '.mp4' : '.jpg');
    const ruta = `${diagBucket}/${id}/${tipo}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;

    const firma = await storage.crearSubidaFirmada(ruta);
    // Guardamos registro provisional (se completará después de la subida real)
    await pool.query(
      `INSERT INTO diagnostico_archivo (id_diagnostico, ruta, tipo, nombre_original, tamano, descripcion)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, ruta, tipo, nombre_original, tamano, descripcion || null]
    );
    res.json({ ruta: firma.ruta, token: firma.token, bucket: storage.bucket });
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
    await storage.eliminar([ruta]);
    await pool.query('DELETE FROM diagnostico_archivo WHERE id_archivo=$1', [archivoId]);
    res.json({ mensaje: 'Archivo eliminado' });
  } catch (err) {
    responderError(res, err, 'Error al eliminar archivo');
  }
};

module.exports = {
  crear,
  listar,
  detalle,
  actualizar,
  remover,
  subirArchivo,
  eliminarArchivo,
};


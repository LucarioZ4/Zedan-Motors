const crypto = require('crypto');
const pool = require('../../config/database');
const storage = require('../../services/storage.service');

const TIPOS = ['recepcion', 'entrega'];
const MAX_POR_TIPO = 5;

const EXTENSION_POR_MIME = {
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/webm': 'webm',
    'video/x-matroska': 'mkv',
    'video/3gpp': '3gp',
    'video/x-m4v': 'm4v',
};

const responderError = (res, err, mensajeGenerico) => {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error(err);
    return res.status(500).json({ error: mensajeGenerico });
};

const ordenExiste = async (idOrden) => {
    const r = await pool.query('SELECT 1 FROM orden_trabajo WHERE id_orden = $1', [idOrden]);
    return r.rows.length > 0;
};

const extensionDe = (mime, nombreArchivo) => {
    if (EXTENSION_POR_MIME[mime]) return EXTENSION_POR_MIME[mime];
    const m = /\.([a-z0-9]{2,5})$/i.exec(nombreArchivo || '');
    return m ? m[1].toLowerCase() : 'mp4';
};

// GET /api/ordenes/:id/videos
const listar = async (req, res) => {
    try {
        const idOrden = Number(req.params.id);
        if (!(await ordenExiste(idOrden)))
            return res.status(404).json({ error: 'Orden no encontrada' });

        const config = {
            max_mb: storage.videoMaxMb,
            max_por_tipo: MAX_POR_TIPO,
            bucket: storage.bucket,
        };

        const filas = await pool.query(
            `SELECT v.id_video, v.tipo, v.ruta, v.nombre_archivo, v.mime, v.tamano::float8 AS tamano, v.fecha,
                    u.nombre_usuario AS subido_por
             FROM orden_video v
             LEFT JOIN usuario u ON u.id_usuario = v.id_usuario
             WHERE v.id_orden = $1
             ORDER BY v.fecha`,
            [idOrden]
        );

        if (!storage.configurado()) {
            // Sin almacenamiento no hay enlaces de reproducción; se avisa para que la pantalla lo explique.
            return res.json({
                ...config,
                almacenamiento: false,
                videos: filas.rows.map(({ ruta, ...resto }) => ({ ...resto, url: null })),
            });
        }

        const urls = await storage.urlsFirmadas(filas.rows.map((v) => v.ruta));
        res.json({
            ...config,
            almacenamiento: true,
            videos: filas.rows.map(({ ruta, ...resto }) => ({ ...resto, url: urls[ruta] || null })),
        });
    } catch (err) {
        responderError(res, err, 'Error al cargar los videos');
    }
};

// POST /api/ordenes/:id/videos/firma
// Paso 1 de la subida: valida y entrega una URL firmada para que el navegador suba el video directo a Supabase.
const firmarSubida = async (req, res) => {
    try {
        const idOrden = Number(req.params.id);
        const { tipo, nombre_archivo: nombreArchivo, mime, tamano } = req.body || {};

        if (!TIPOS.includes(tipo))
            return res.status(400).json({ error: "El tipo debe ser 'recepcion' o 'entrega'" });
        if (typeof mime !== 'string' || !mime.startsWith('video/'))
            return res.status(400).json({ error: 'El archivo debe ser un video' });

        const bytes = Number(tamano);
        const maxBytes = storage.videoMaxMb * 1024 * 1024;
        if (!Number.isFinite(bytes) || bytes <= 0)
            return res.status(400).json({ error: 'No se pudo determinar el tamaño del video' });
        if (bytes > maxBytes)
            return res.status(413).json({
                error: `El video pesa más de ${storage.videoMaxMb} MB. Grábalo en menor calidad (por ejemplo 720p) o recórtalo.`
            });

        if (!(await ordenExiste(idOrden)))
            return res.status(404).json({ error: 'Orden no encontrada' });

        const cuenta = await pool.query(
            'SELECT COUNT(*)::int AS total FROM orden_video WHERE id_orden = $1 AND tipo = $2',
            [idOrden, tipo]
        );
        if (cuenta.rows[0].total >= MAX_POR_TIPO)
            return res.status(409).json({
                error: `Esta orden ya tiene ${MAX_POR_TIPO} videos de ${tipo}. Elimina alguno para subir otro.`
            });

        const ext = extensionDe(mime, nombreArchivo);
        const ruta = `ordenes/${idOrden}/${tipo}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;

        const firma = await storage.crearSubidaFirmada(ruta);
        res.json({ ruta: firma.ruta, token: firma.token, bucket: storage.bucket });
    } catch (err) {
        responderError(res, err, 'Error al preparar la subida del video');
    }
};

// POST /api/ordenes/:id/videos
// Paso 2: el navegador ya subió el archivo; aquí se verifica que exista de verdad y se registra.
const registrar = async (req, res) => {
    try {
        const idOrden = Number(req.params.id);
        const { tipo, ruta, nombre_archivo: nombreArchivo } = req.body || {};

        if (!TIPOS.includes(tipo))
            return res.status(400).json({ error: "El tipo debe ser 'recepcion' o 'entrega'" });

        // La ruta debe ser exactamente una de las que genera firmarSubida para ESTA orden y este tipo.
        const patron = new RegExp(`^ordenes/${idOrden}/${tipo}-\\d{10,}-[0-9a-f]{8}\\.[a-z0-9]{2,5}$`);
        if (typeof ruta !== 'string' || !patron.test(ruta))
            return res.status(400).json({ error: 'Ruta de video inválida' });

        if (!(await ordenExiste(idOrden)))
            return res.status(404).json({ error: 'Orden no encontrada' });

        const info = await storage.infoObjeto(ruta);
        if (!info)
            return res.status(400).json({ error: 'No se encontró el archivo en el almacenamiento. La subida pudo fallar; intenta de nuevo.' });

        const maxBytes = storage.videoMaxMb * 1024 * 1024;
        if ((info.mime && !info.mime.startsWith('video/')) || info.tamano <= 0 || info.tamano > maxBytes) {
            // No es un video válido o excede el límite: se borra para no dejar archivos huérfanos.
            await storage.eliminar([ruta]).catch((e) => console.error('No se pudo limpiar el archivo:', e.message));
            return res.status(400).json({ error: 'El archivo subido no es un video válido o excede el tamaño permitido' });
        }

        const idUsuario = Number.isInteger(req.usuario?.id) ? req.usuario.id : null;
        const nombre = (typeof nombreArchivo === 'string' && nombreArchivo.trim()
            ? nombreArchivo.trim() : ruta.split('/').pop()).slice(0, 200);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const orden = await client.query('SELECT 1 FROM orden_trabajo WHERE id_orden=$1 FOR UPDATE', [idOrden]);
            if (!orden.rowCount) throw Object.assign(new Error('Orden no encontrada'), { status: 404 });
            const cuenta = await client.query('SELECT COUNT(*)::int AS total FROM orden_video WHERE id_orden=$1 AND tipo=$2', [idOrden,tipo]);
            if (cuenta.rows[0].total >= MAX_POR_TIPO)
                throw Object.assign(new Error('Se alcanzó el límite de videos para este tipo'), { status: 409 });
            const r = await client.query(
                `INSERT INTO orden_video(id_orden,tipo,ruta,nombre_archivo,mime,tamano,id_usuario)
                 VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id_video,tipo,nombre_archivo,mime,tamano::float8 AS tamano,fecha`,
                [idOrden,tipo,ruta,nombre,info.mime || 'video/mp4',info.tamano,idUsuario]);
            await client.query('COMMIT');
            res.status(201).json(r.rows[0]);
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }

    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ error: 'Este video ya estaba registrado' });
        responderError(res, err, 'Error al registrar el video');
    }
};

// DELETE /api/ordenes/:id/videos/:vid  (solo Administrador y Jefe de taller: es evidencia)
const eliminar = async (req, res) => {
    try {
        const idOrden = Number(req.params.id);
        const idVideo = Number(req.params.vid);

        const r = await pool.query(
            'SELECT ruta FROM orden_video WHERE id_video = $1 AND id_orden = $2', [idVideo, idOrden]
        );
        if (r.rows.length === 0)
            return res.status(404).json({ error: 'Video no encontrado' });

        // Primero el archivo y luego el registro: si el archivo no se pudo borrar, el registro sigue
        // y se puede reintentar (al revés quedaría un archivo huérfano sin forma de encontrarlo).
        await storage.eliminar([r.rows[0].ruta]);
        await pool.query('DELETE FROM orden_video WHERE id_video = $1', [idVideo]);

        res.json({ mensaje: 'Video eliminado' });
    } catch (err) {
        responderError(res, err, 'Error al eliminar el video');
    }
};

module.exports = { listar, firmarSubida, registrar, eliminar };

const pool = require('../../config/database');

/**
 * GET /api/bitacora/sesiones
 * Lista las sesiones de usuario con resumen de actividad y contadores
 */
const listarSesiones = async (req, res) => {
    try {
        const { id_usuario, estado, limit = 50, offset = 0 } = req.query;
        let where = 'WHERE 1=1';
        const params = [];

        if (id_usuario) {
            params.push(Number(id_usuario));
            where += ` AND s.id_usuario = $${params.length}`;
        }

        if (estado && ['activa', 'cerrada', 'expirada'].includes(estado)) {
            params.push(estado);
            where += ` AND s.estado = $${params.length}`;
        }

        const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
        const offsetNum = Math.max(parseInt(offset, 10) || 0, 0);

        params.push(limitNum);
        const limitParamIndex = params.length;
        params.push(offsetNum);
        const offsetParamIndex = params.length;

        const sql = `
            SELECT 
                s.id_sesion,
                s.id_usuario,
                u.nombre_usuario,
                CONCAT(e.nombre, ' ', e.apellido) AS nombre_completo,
                c.nombre_cargo AS rol,
                s.inicio_en,
                s.ultima_actividad,
                s.fin_en,
                s.estado,
                s.ip,
                s.user_agent,
                ROUND(EXTRACT(EPOCH FROM (COALESCE(s.fin_en, s.ultima_actividad) - s.inicio_en))) AS duracion_segundos,
                COUNT(b.id_evento)::int AS total_acciones,
                COUNT(CASE WHEN b.modulo = 'diagnostico' THEN 1 END)::int AS acciones_diagnostico,
                COUNT(CASE WHEN b.modulo = 'inventario' THEN 1 END)::int AS acciones_inventario,
                COUNT(CASE WHEN b.modulo = 'orden' THEN 1 END)::int AS acciones_orden,
                COUNT(CASE WHEN b.accion = 'confirmar_ia' THEN 1 END)::int AS acciones_ia
            FROM sesion_bitacora s
            JOIN usuario u ON s.id_usuario = u.id_usuario
            JOIN empleado e ON u.id_empleado = e.id_empleado
            LEFT JOIN cargo c ON e.id_cargo = c.id_cargo
            LEFT JOIN bitacora_evento b ON s.id_sesion = b.id_sesion
            ${where}
            GROUP BY 
                s.id_sesion, s.id_usuario, u.nombre_usuario, 
                e.nombre, e.apellido, c.nombre_cargo,
                s.inicio_en, s.ultima_actividad, s.fin_en, s.estado, s.ip, s.user_agent
            ORDER BY s.inicio_en DESC
            LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
        `;

        const result = await pool.query(sql, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Error al listar sesiones de bitácora:', err);
        res.status(500).json({ error: 'Error al consultar sesiones de bitácora' });
    }
};

/**
 * GET /api/bitacora/sesiones/:id_sesion/timeline
 * Devuelve la línea de tiempo de eventos con sus diffs antes/después estructurados
 */
const timelineSesion = async (req, res) => {
    try {
        const { id_sesion } = req.params;

        // Validar formato UUID básico
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id_sesion)) {
            return res.status(400).json({ error: 'ID de sesión inválido' });
        }

        // Consultar detalles de la sesión
        const sesionRes = await pool.query(`
            SELECT 
                s.id_sesion, s.id_usuario, u.nombre_usuario,
                CONCAT(e.nombre, ' ', e.apellido) AS nombre_completo,
                c.nombre_cargo AS rol, s.inicio_en, s.ultima_actividad, s.fin_en, s.estado, s.ip, s.user_agent
            FROM sesion_bitacora s
            JOIN usuario u ON s.id_usuario = u.id_usuario
            JOIN empleado e ON u.id_empleado = e.id_empleado
            LEFT JOIN cargo c ON e.id_cargo = c.id_cargo
            WHERE s.id_sesion = $1
        `, [id_sesion]);

        if (sesionRes.rows.length === 0) {
            return res.status(404).json({ error: 'Sesión no encontrada' });
        }

        // Consultar eventos y estructurar diferencias dinámicamente con JSONB
        const eventosRes = await pool.query(`
            SELECT 
                b.id_evento,
                b.creado_en,
                b.modulo,
                b.accion,
                b.entidad,
                b.id_registro,
                b.descripcion,
                b.datos_antes,
                b.datos_despues,
                b.campos_modificados,
                b.contexto,
                COALESCE(
                    (
                        SELECT jsonb_agg(
                            jsonb_build_object(
                                'campo', c,
                                'antes', b.datos_antes -> c,
                                'despues', b.datos_despues -> c
                            )
                        )
                        FROM unnest(b.campos_modificados) AS c
                    ),
                    '[]'::jsonb
                ) AS diferencias
            FROM bitacora_evento b
            WHERE b.id_sesion = $1
            ORDER BY b.creado_en ASC
        `, [id_sesion]);

        res.json({
            sesion: sesionRes.rows[0],
            eventos: eventosRes.rows
        });
    } catch (err) {
        console.error('Error al obtener timeline de sesión:', err);
        res.status(500).json({ error: 'Error al consultar timeline de la sesión' });
    }
};

/**
 * GET /api/bitacora/activa
 * Devuelve la sesión actual del usuario autenticado y su bitácora en tiempo real
 */
const sesionActiva = async (req, res) => {
    try {
        const idSesion = req.usuario?.id_sesion;
        if (!idSesion) {
            return res.status(400).json({ error: 'La sesión actual no cuenta con id_sesion en el token' });
        }

        req.params.id_sesion = idSesion;
        return timelineSesion(req, res);
    } catch (err) {
        console.error('Error al obtener sesión activa:', err);
        res.status(500).json({ error: 'Error al consultar sesión activa' });
    }
};

module.exports = {
    listarSesiones,
    timelineSesion,
    sesionActiva
};

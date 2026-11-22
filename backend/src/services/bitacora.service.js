const pool = require('../config/database');

// Llaves que deben protegerse por seguridad y privacidad en la bitácora
const CAMPOS_SENSIBLES = new Set([
    'password_hash',
    'password',
    'contrasena',
    'token',
    'jwt_secret',
    'authorization',
    'service_role_key',
    'api_key'
]);

/**
 * Sanitiza recursivamente objetos y arreglos para no almacenar credenciales
 */
function sanitizarDatos(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sanitizarDatos);

    const limpio = {};
    for (const [key, value] of Object.entries(obj)) {
        if (!CAMPOS_SENSIBLES.has(key.toLowerCase())) {
            limpio[key] = (typeof value === 'object' && value !== null)
                ? sanitizarDatos(value)
                : value;
        }
    }
    return limpio;
}

/**
 * Calcula el diff entre antes y después.
 * Detecta qué campos cambiaron y prepara la estructura JSONB.
 */
function calcularDiff(antes = null, despues = null) {
    const seguroAntes = sanitizarDatos(antes) || null;
    const seguroDespues = sanitizarDatos(despues) || null;

    if (!seguroAntes && seguroDespues) {
        return {
            datosAntes: null,
            datosDespues: seguroDespues,
            camposModificados: Object.keys(seguroDespues)
        };
    }

    if (seguroAntes && !seguroDespues) {
        return {
            datosAntes: seguroAntes,
            datosDespues: null,
            camposModificados: Object.keys(seguroAntes)
        };
    }

    if (!seguroAntes && !seguroDespues) {
        return {
            datosAntes: null,
            datosDespues: null,
            camposModificados: []
        };
    }

    const camposModificados = [];
    const llaves = new Set([
        ...Object.keys(seguroAntes),
        ...Object.keys(seguroDespues)
    ]);

    for (const k of llaves) {
        const valA = JSON.stringify(seguroAntes[k] ?? null);
        const valB = JSON.stringify(seguroDespues[k] ?? null);
        if (valA !== valB) {
            camposModificados.push(k);
        }
    }

    return {
        datosAntes: seguroAntes,
        datosDespues: seguroDespues,
        camposModificados
    };
}

/**
 * Registra inicio de sesión en BD
 */
async function iniciarSesion({ idUsuario, ip, userAgent }) {
    const query = `
        INSERT INTO sesion_bitacora (id_usuario, ip, user_agent)
        VALUES ($1, $2, $3)
        RETURNING id_sesion, inicio_en
    `;
    const res = await pool.query(query, [
        idUsuario,
        ip || '127.0.0.1',
        (userAgent || 'Desconocido').slice(0, 255)
    ]);
    const sesion = res.rows[0];

    // Registrar evento de login inicial
    await registrarEvento({
        idSesion: sesion.id_sesion,
        idUsuario,
        modulo: 'auth',
        accion: 'login',
        entidad: 'usuario',
        idRegistro: idUsuario,
        descripcion: 'Inicio de sesión exitoso en Zedan Motors',
        contexto: { ip, user_agent: userAgent }
    });

    return sesion.id_sesion;
}

/**
 * Cierra la sesión activa en BD
 */
async function cerrarSesion({ idSesion, idUsuario }) {
    if (!idSesion) return;

    await pool.query(`
        UPDATE sesion_bitacora 
        SET fin_en = clock_timestamp(), 
            ultima_actividad = clock_timestamp(),
            estado = 'cerrada'
        WHERE id_sesion = $1
    `, [idSesion]);

    if (idUsuario) {
        await registrarEvento({
            idSesion,
            idUsuario,
            modulo: 'auth',
            accion: 'logout',
            entidad: 'usuario',
            idRegistro: idUsuario,
            descripcion: 'Cierre voluntario de sesión'
        });
    }
}

/**
 * Actualiza timestamp de última actividad
 */
async function renovarActividad(idSesion) {
    if (!idSesion) return;
    try {
        await pool.query(`
            UPDATE sesion_bitacora 
            SET ultima_actividad = clock_timestamp() 
            WHERE id_sesion = $1 AND estado = 'activa'
        `, [idSesion]);
    } catch (err) {
        // En background no bloqueamos el flujo
        console.warn('⚠️ No se pudo actualizar actividad de sesión:', err.message);
    }
}

/**
 * Registra un evento en la bitácora
 * @param {object} params
 * @param {import('pg').PoolClient} [params.client] - Cliente transaccional opcional
 */
async function registrarEvento({
    client = null,
    idSesion,
    idUsuario,
    modulo,
    accion,
    entidad,
    idRegistro,
    descripcion,
    datosAntes = null,
    datosDespues = null,
    contexto = {}
}) {
    if (!idSesion || !idUsuario) {
        console.warn('⚠️ Bitácora omitida: falta idSesion o idUsuario');
        return null;
    }

    const { datosAntes: dAntes, datosDespues: dDesp, camposModificados } = calcularDiff(datosAntes, datosDespues);

    const query = `
        INSERT INTO bitacora_evento (
            id_sesion, id_usuario, modulo, accion, 
            entidad, id_registro, descripcion, 
            datos_antes, datos_despues, campos_modificados, contexto
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id_evento
    `;

    const params = [
        idSesion,
        idUsuario,
        modulo,
        accion,
        entidad,
        String(idRegistro ?? ''),
        descripcion,
        dAntes ? JSON.stringify(dAntes) : null,
        dDesp ? JSON.stringify(dDesp) : null,
        camposModificados,
        JSON.stringify(contexto || {})
    ];

    const ejecutor = client || pool;
    const res = await ejecutor.query(query, params);
    return res.rows[0];
}

module.exports = {
    iniciarSesion,
    cerrarSesion,
    renovarActividad,
    registrarEvento,
    calcularDiff,
    sanitizarDatos
};

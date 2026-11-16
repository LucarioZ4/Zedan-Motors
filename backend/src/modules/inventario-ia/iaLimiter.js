const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const { iaAnalisisPorHora } = require('../../config/env');

/**
 * Limitador de tasa para análisis de IA por usuario autenticado.
 * Si el usuario no tiene id_usuario (por alguna anomalía), usa ipKeyGenerator para IPv6/IPv4.
 */
const iaLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    limit: iaAnalisisPorHora || 20,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        if (req.usuario && req.usuario.id_usuario) {
            return `user_${req.usuario.id_usuario}`;
        }
        return ipKeyGenerator(req.ip);
    },
    message: {
        error: 'Alcanzaste el límite de análisis por hora. Intenta de nuevo más tarde.'
    }
});

module.exports = iaLimiter;

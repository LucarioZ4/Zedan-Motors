const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5,                    // 5 intentos por IP en esa ventana
    standardHeaders: true,     // manda info del límite en los headers de la respuesta
    legacyHeaders: false,
    message: { error: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.' },
    skipSuccessfulRequests: true // un login correcto no cuenta para el límite
});

module.exports = loginLimiter;
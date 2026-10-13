const rateLimit = require('express-rate-limit');

// Límite general para toda la API (el login ya tiene el suyo, más estricto, en loginLimiter.js).
// Si el taller comparte una sola IP pública entre varios empleados, sube `limit`.
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutos
    limit: 1000,               // solicitudes por IP en esa ventana
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.' }
});

module.exports = apiLimiter;

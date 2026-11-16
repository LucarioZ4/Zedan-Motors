const rateLimit = require('express-rate-limit');

// Cada análisis con IA cuesta dinero: límite por usuario (no por IP) y más estricto que el general.
// Va DESPUÉS de `auth`, para que req.usuario ya exista.
// Nota: en Vercel el contador vive en memoria de cada instancia, así que es un freno básico;
// el control real de gasto se pone en la consola de Anthropic/Gemini (límite mensual).
const iaLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,  // 1 hora
    limit: 30,                 // análisis por usuario en esa ventana
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `usuario-${req.usuario?.id ?? 'desconocido'}`,
    message: { error: 'Alcanzaste el límite de análisis con IA (30 por hora). Intenta más tarde.' }
});

module.exports = iaLimiter;

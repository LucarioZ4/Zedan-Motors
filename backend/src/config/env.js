require('dotenv').config();

const JWT_SECRET_MIN_LENGTH = 32;
const jwtSecret = process.env.JWT_SECRET;

// Falla al arrancar (fail-fast) si el secreto falta o es débil:
// un secreto corto o vacío permite falsificar tokens.
if (!jwtSecret || jwtSecret.trim().length < JWT_SECRET_MIN_LENGTH) {
    throw new Error(
        `JWT_SECRET no está definido o es demasiado corto (mínimo ${JWT_SECRET_MIN_LENGTH} caracteres). ` +
        'Genera uno con: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'
    );
}

// Orígenes permitidos por CORS, separados por coma.
// Como Express ya sirve el frontend, el origen normal es el mismo servidor.
const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

// Configuración IA (Anthropic)
const anthropicApiKey = process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.trim() : '';
const anthropicModel = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
const iaAnalisisPorHora = parseInt(process.env.IA_ANALISIS_POR_HORA, 10) || 20;
const iaMaxImagenes = parseInt(process.env.IA_MAX_IMAGENES, 10) || 5;
const iaMaxMb = parseInt(process.env.IA_MAX_MB, 10) || 5;

module.exports = {
    port:       process.env.PORT       || 3000,
    jwtSecret,
    jwtExpires: process.env.JWT_EXPIRES_IN || '8h',
    corsOrigins,
    anthropicApiKey,
    anthropicModel,
    iaAnalisisPorHora,
    iaMaxImagenes,
    iaMaxMb,
    iaHabilitada: Boolean(anthropicApiKey),
};

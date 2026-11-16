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

const numeroPositivo = (valor, porDefecto) => {
    const n = Number(valor);
    return Number.isFinite(n) && n > 0 ? n : porDefecto;
};

module.exports = {
    // ...existing exports above
    // Diagnóstico (nuevo módulo)
    diagMaxMb: numeroPositivo(process.env.DIAG_MAX_MB, 10),
    diagAllowedMime: (process.env.DIAG_ALLOWED_MIME || 'image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime')
        .split(',').map(m => m.trim()),
    diagBucket: process.env.DIAG_BUCKET || 'diagnosticos',
    port:       process.env.PORT       || 3000,
    jwtSecret,
    jwtExpires: process.env.JWT_EXPIRES_IN || '8h',
    corsOrigins,

    // Inventario con IA (foto -> productos y cantidades con Google Gemini o Anthropic).
    ia: {
        geminiApiKey: process.env.GEMINI_API_KEY || '',
        geminiModel:  process.env.GEMINI_MODEL || 'gemini-3.5-flash',
        apiKey:       process.env.ANTHROPIC_API_KEY || '',
        model:        process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
        baseUrl:      (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/+$/, ''),
    },

    // Videos de recepción/entrega, guardados en Supabase Storage (bucket privado).
    // Opcional: si falta la configuración, solo los videos responden 503.
    almacenamiento: {
        supabaseUrl: (process.env.SUPABASE_URL || '').replace(/\/+$/, ''),
        serviceKey:  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        bucket:      process.env.VIDEOS_BUCKET || 'videos-ordenes',
        videoMaxMb:  numeroPositivo(process.env.VIDEO_MAX_MB, 50),
    },
};

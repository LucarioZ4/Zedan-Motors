// Solo información descriptiva: nunca imprimir usuario, contraseña ni URL completa.
const getDatabaseInfo = (env = process.env) => {
    let host = env.DB_HOST || '';
    let name = env.DB_NAME || 'predeterminada';
    if (env.DATABASE_URL) {
        try {
            const url = new URL(env.DATABASE_URL);
            host = url.hostname;
            name = decodeURIComponent(url.pathname.slice(1)) || 'predeterminada';
        } catch {
            return 'PostgreSQL (DATABASE_URL no válida)';
        }
    }
    const provider = /(^|\.)supabase\.(co|com)$/i.test(host) ? 'Supabase' : 'PostgreSQL';
    // Evita saltos de línea o caracteres de control provenientes de la configuración.
    return `${provider} (${name.replace(/[\x00-\x1f\x7f]/g, '')})`;
};

module.exports = getDatabaseInfo;

require('dotenv').config();
const path = require('path');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Se carga primero: si JWT_SECRET falta o es débil, el servidor no arranca.
const { port, corsOrigins } = require('./config/env');
const apiLimiter = require('./middleware/apiLimiter');

const app = express();

// Si despliegas detrás de un proxy (Nginx, Render, Railway...) descomenta esta línea,
// para que el rate limiting vea la IP real del cliente y no la del proxy:
app.set('trust proxy', 1);

// ── Middleware ──
app.use(helmet({
    contentSecurityPolicy: false,
}));
app.use(cors({
    origin(origin, callback) {
        // Sin header Origin = mismo origen, Postman o curl: se permite.
        // Origen no listado: se responde sin cabeceras CORS y el navegador lo bloquea.
        if (!origin || corsOrigins.includes(origin)) return callback(null, true);
        return callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(morgan('dev', { skip: () => process.env.NODE_ENV === 'test' }));

// La foto del inventario con IA viaja en base64 y supera el límite por defecto (100 kb).
// Va ANTES del parser general, que se salta lo que ya fue leído.
app.use('/api/inventario/ia', express.json({ limit: '6mb' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Rate limiting general de la API ──
app.use('/api', apiLimiter);

// ── Helper para montaje seguro de rutas (compatible con CJS/ESM y bundlers de Vercel) ──
const rutasMontadas = [];
const esRouter = (x) => typeof x === 'function';
const safeMount = (ruta, modulo) => {
    // Prioridad: el propio módulo si ya es un router/función (module.exports = router).
    // Solo si no lo es, se buscan envoltorios típicos de bundlers (default / router).
    // Antes se daba prioridad a `modulo.default`, y si Vercel dejaba ahí un objeto
    // el router real se descartaba y la ruta quedaba sin montar (404 silencioso).
    const handler = [modulo, modulo && modulo.default, modulo && modulo.router].find(esRouter);
    if (handler) {
        app.use(ruta, handler);
        rutasMontadas.push(ruta);
    } else {
        const forma = modulo && typeof modulo === 'object'
            ? `object con claves [${Object.keys(modulo).join(', ')}], default: ${typeof modulo.default}`
            : typeof modulo;
        // No se lanza excepción: tumbaría también el login y el resto de la API.
        // El log muestra la forma exacta del export para diagnosticar en Runtime Logs.
        console.error(`❌ No se pudo montar ${ruta}: el módulo exporta ${forma}`);
    }
};

// ── Rutas ──
safeMount('/api/auth', require('./modules/auth/auth.routes'));
safeMount('/api/dashboard', require('./modules/dashboard/dashboard.routes'));
safeMount('/api/clientes', require('./modules/clientes/clientes.routes'));
safeMount('/api/vehiculos', require('./modules/vehiculos/vehiculos.routes'));
safeMount('/api/citas', require('./modules/citas/citas.routes'));
safeMount('/api/estados', require('./modules/estados/estados.routes'));
safeMount('/api/ordenes', require('./modules/ordenes/ordenes.routes'));
safeMount('/api/empleados', require('./modules/empleados/empleados.routes'));
safeMount('/api/servicios', require('./modules/servicios/servicios.routes'));
safeMount('/api/inventario', require('./modules/inventario/inventario.routes'));
safeMount('/api/facturacion', require('./modules/facturacion/facturacion.routes'));
safeMount('/api/cargos', require('./modules/cargos/cargos.routes'));
safeMount('/api/historial', require('./modules/historial/historial.routes'));
safeMount('/api/mensajes', require('./modules/mensajes/mensajes.routes'));
safeMount('/api/bitacora', require('./modules/bitacora/bitacora.routes'));
safeMount('/api/diagnosticos', require('./modules/diagnosticos/diagnosticos.routes'));

// Servir la compilación de React en Docker y desarrollo local.
const frontendPath = path.join(__dirname, '../../frontend-react/dist');
if (!process.env.VERCEL) {
    app.use(express.static(frontendPath));
}

// ── Versión desplegada: sin auth, sirve para comprobar QUÉ código corre en Vercel ──
app.get('/api/version', (req, res) => {
    res.json({
        commit: process.env.VERCEL_GIT_COMMIT_SHA || 'local',
        rama: process.env.VERCEL_GIT_COMMIT_REF || 'local',
        desplegado_en_vercel: !!process.env.VERCEL,
        rutas: rutasMontadas,
    });
});


// ── Health check ──
app.get('/health', async (req, res) => {
    const pool = require('./config/database');
    const env = require('./config/env');
    let dbStatus = 'desconectado';
    try {
        await pool.query('SELECT 1');
        dbStatus = 'conectado';
    } catch (err) {
        dbStatus = err.message;
    }
    const ok = dbStatus === 'conectado' && !!env.jwtSecret;
    res.status(ok ? 200 : 500).json({
        status: ok ? 'ok' : 'error',
        database: dbStatus,
        config: {
            JWT_SECRET: env.jwtSecret ? '✅ configurado' : '❌ FALTA',
            DATABASE_URL: process.env.DATABASE_URL ? '✅ configurado' : '❌ FALTA',
            N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL ? '✅ configurado' : '❌ FALTA',
            EMAIL_USER: process.env.EMAIL_USER ? '✅ configurado' : '❌ FALTA',
        }
    });
});

// React Router resuelve las páginas cuando se abren o recargan directamente.
app.get('*', (req, res, next) => {
    if (process.env.VERCEL || req.path === '/api' || req.path.startsWith('/api/') || path.extname(req.path)) {
        return next();
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// ── 404 ──
app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

// ── Error handler ──
app.use((err, req, res, next) => {
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Solicitud demasiado grande' });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido' });
    console.error(err.stack);
    res.status(500).json({ error: 'Error interno del servidor' });
});

// Solo escucha si se ejecuta directamente (node src/app.js); los tests importan `app` sin abrir puerto.
if (require.main === module) {
    app.listen(port, () => {
        console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
        console.log(`📦 Base de datos configurada: ${require('./config/databaseInfo')()}`);
    });
}

module.exports = app;

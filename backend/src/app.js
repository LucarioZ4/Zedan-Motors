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
const safeMount = (ruta, modulo) => {
    const handler = (modulo && modulo.default) ? modulo.default : modulo;
    if (typeof handler === 'function') {
        app.use(ruta, handler);
    } else {
        console.error(`❌ Error montando ruta ${ruta}: el módulo exporta ${typeof handler}`);
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
app.use('/api/ordenestrabajo', (req, res, next) => {
    require('./modules/ordenes/ordenes.routes')(req, res, next);
});
safeMount('/api/empleados', require('./modules/empleados/empleados.routes'));
safeMount('/api/servicios', require('./modules/servicios/servicios.routes'));
safeMount('/api/inventario', require('./modules/inventario/inventario.routes'));
app.use('/api/facturacion', (req, res, next) => {
    require('./modules/facturacion/facturacion.routes')(req, res, next);
});
app.use('/api/facturas', (req, res, next) => {
    require('./modules/facturacion/facturacion.routes')(req, res, next);
});
safeMount('/api/cargos', require('./modules/cargos/cargos.routes'));
safeMount('/api/historial', require('./modules/historial/historial.routes'));
safeMount('/api/mensajes', require('./modules/mensajes/mensajes.routes'));
safeMount('/api/bitacora', require('./modules/bitacora/bitacora.routes'));
safeMount('/api/diagnosticos', require('./modules/diagnosticos/diagnosticos.routes'));

// Servir frontend solo en entorno local (en Vercel el frontend lo sirve Vercel directamente)
if (!process.env.VERCEL) {
    const frontendPath = path.join(__dirname, '../../frontend');
    app.use(express.static(frontendPath));
    app.get('/', (req, res) => {
        res.sendFile(path.join(frontendPath, 'index.html'));
    });
}

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

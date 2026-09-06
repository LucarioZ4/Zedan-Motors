require('dotenv').config();
const path = require('path');

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');

const app  = express();
const port = process.env.PORT || 3000;

// ── Middleware ──
app.use(helmet({
    contentSecurityPolicy: false,
}));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// ── Rutas ──
app.use('/api/auth',      require('./modules/auth/auth.routes'));
app.use('/api/dashboard', require('./modules/dashboard/dashboard.routes'));
app.use('/api/clientes', require('./modules/clientes/clientes.routes'));
app.use('/api/vehiculos', require('./modules/vehiculos/vehiculos.routes'));
app.use('/api/citas',     require('./modules/citas/citas.routes'));
app.use('/api/estados',   require('./modules/estados/estados.routes'));
app.use('/api/ordenes',    require('./modules/ordenes/ordenes.routes'));
app.use('/api/empleados',  require('./modules/empleados/empleados.routes'));
app.use('/api/servicios',  require('./modules/servicios/servicios.routes'));

// Servir frontend
app.use(express.static(path.join(__dirname, '../../frontend')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

// ── Health check ──
app.get('/health', async (req, res) => {
    const pool = require('./config/database');
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'ok', database: 'conectado' });
    } catch (err) {
        res.status(500).json({ status: 'error', database: err.message });
    }
});

// ── 404 ──
app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

// ── Error handler ──
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(port, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
    console.log(`📦 Base de datos: ${process.env.DB_NAME}`);
});

module.exports = app;
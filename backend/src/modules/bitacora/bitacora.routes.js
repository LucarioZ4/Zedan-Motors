const express = require('express');
const router = express.Router();
const controller = require('./bitacora.controller');
const auth = require('../../middleware/auth');
const roles = require('../../middleware/roles');

// Rutas protegidas para bitácora
router.use(auth);

// Ver la bitácora de la sesión en curso del usuario actual
router.get('/activa', controller.sesionActiva);

// Consulta administrativa: listar sesiones históricas y ver timeline de cualquiera
router.get('/sesiones', roles('Administrador'), controller.listarSesiones);
router.get('/sesiones/:id_sesion/timeline', roles('Administrador'), controller.timelineSesion);

module.exports = router;

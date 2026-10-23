const express = require('express');
const router = express.Router();
const mensajesController = require('./mensajes.controller');
const verifyToken = require('../../middleware/auth');

router.use(verifyToken);

router.get('/', mensajesController.getMensajes);
router.post('/', mensajesController.createMensaje);

module.exports = router;

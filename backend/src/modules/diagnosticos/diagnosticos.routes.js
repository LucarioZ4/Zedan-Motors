const express = require('express');
const router = express.Router();
const ctrl = require('./diagnosticos.controller');

// Crear diagnóstico
router.post('/', ctrl.crear);

// Listado y detalle
router.get('/', ctrl.listar);
router.get('/:id', ctrl.detalle);

// Actualizar / borrar diagnóstico
router.put('/:id', ctrl.actualizar);
router.delete('/:id', ctrl.remover);

// Archivos
router.post('/:id/archivos', ctrl.subirArchivo);
router.delete('/:id/archivos/:archivoId', ctrl.eliminarArchivo);

module.exports = router;


const express = require('express');
const router  = express.Router();
const auth    = require('../../middleware/auth');
const roles = require('../../middleware/roles');
const ctrl    = require('./facturacion.controller');

router.get('/',    auth, ctrl.getAll);
router.get('/:id', auth, ctrl.getById);
router.post('/', auth, roles('Administrador'), ctrl.create);
router.delete('/:id', auth, roles('Administrador'), ctrl.remove);

module.exports = router;

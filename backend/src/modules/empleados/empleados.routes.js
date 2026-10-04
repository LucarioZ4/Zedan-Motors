const express    = require('express');
const router     = express.Router();
const controller = require('./empleados.controller');
const auth       = require('../../middleware/auth');
const roles      = require('../../middleware/roles');

router.get('/cargos',  auth, controller.getCargos);
router.get('/',         auth, controller.getAll);
router.get('/:id',      auth, controller.getById);
router.post('/',        auth, roles('Administrador'), controller.create);
router.put('/:id',      auth, roles('Administrador'), controller.update);
router.delete('/:id',   auth, roles('Administrador'), controller.remove);

module.exports = router;
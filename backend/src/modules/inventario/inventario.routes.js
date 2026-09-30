const express    = require('express');
const router     = express.Router();
const controller = require('./inventario.controller');
const auth       = require('../../middleware/auth');
const roles = require('../../middleware/roles');

router.get('/',          auth, controller.getAll);
router.post('/importar',  auth, controller.importar);
router.get('/:id',       auth, controller.getById);
router.post('/', auth, roles('Administrador', 'Jefe de taller'), controller.create);
router.put('/:id', auth, roles('Administrador', 'Jefe de taller'), controller.update);
router.delete('/:id', auth, roles('Administrador'), controller.remove);

module.exports = router;
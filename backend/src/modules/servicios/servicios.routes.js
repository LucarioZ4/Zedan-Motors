const express    = require('express');
const router     = express.Router();
const controller = require('./servicios.controller');
const auth       = require('../../middleware/auth');
const roles = require('../../middleware/roles');

router.get('/',       auth, controller.getAll);
router.get('/:id',    auth, controller.getById);
router.post('/',      auth, controller.create);
router.put('/:id',    auth, controller.update);
router.delete('/:id', auth, roles('Administrador'), controller.remove);

module.exports = router;
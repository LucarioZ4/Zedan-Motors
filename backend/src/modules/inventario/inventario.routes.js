const express    = require('express');
const router     = express.Router();
const controller = require('./inventario.controller');
const auth       = require('../../middleware/auth');

router.get('/',          auth, controller.getAll);
router.post('/importar',  auth, controller.importar);
router.get('/:id',       auth, controller.getById);
router.post('/',         auth, controller.create);
router.put('/:id',       auth, controller.update);
router.delete('/:id',    auth, controller.remove);

module.exports = router;
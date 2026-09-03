const express    = require('express');
const router     = express.Router();
const controller = require('./vehiculos.controller');
const auth       = require('../../middleware/auth');

router.get('/',       auth, controller.getAll);
router.get('/:id',    auth, controller.getById);
router.post('/',      auth, controller.create);
router.put('/:id',    auth, controller.update);
router.delete('/:id', auth, controller.remove);

module.exports = router;
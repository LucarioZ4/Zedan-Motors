const express    = require('express');
const router     = express.Router();
const controller = require('./clientes.controller');
const auth       = require('../../middleware/auth');

router.get('/',         auth, controller.getAll);
router.get('/:id',      auth, controller.getById);
router.post('/',        auth, controller.create);
router.put('/:id',      auth, controller.update);
router.delete('/:id',   auth, controller.remove);
router.get('/:id/vehiculos', auth, controller.getVehiculos);

module.exports = router;
const express    = require('express');
const router     = express.Router();
const controller = require('./historial.controller');
const auth       = require('../../middleware/auth');
const roles = require('../../middleware/roles');

router.get('/vehiculo/:id', auth, controller.getByVehiculo);

module.exports = router;
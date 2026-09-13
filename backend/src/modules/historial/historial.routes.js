const express    = require('express');
const router     = express.Router();
const controller = require('./historial.controller');
const auth       = require('../../middleware/auth');

router.get('/vehiculo/:id', auth, controller.getByVehiculo);

module.exports = router;
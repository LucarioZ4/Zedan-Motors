const express    = require('express');
const router     = express.Router();
const controller = require('./historial.controller');
const auth       = require('../../middleware/auth');
router.use(auth);
router.param('id', require('../../middleware/idEntero'));

router.get('/vehiculo/:id', controller.getByVehiculo);

module.exports = router;
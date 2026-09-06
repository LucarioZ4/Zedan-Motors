const express    = require('express');
const router     = express.Router();
const controller = require('./ordenes.controller');
const auth       = require('../../middleware/auth');

router.get('/',                        auth, controller.getAll);
router.get('/:id',                     auth, controller.getById);
router.post('/',                       auth, controller.create);
router.put('/:id',                     auth, controller.update);
router.delete('/:id',                  auth, controller.remove);
router.get('/:id/servicios',           auth, controller.getServicios);
router.post('/:id/servicios',          auth, controller.addServicio);
router.delete('/:id/servicios/:sid',   auth, controller.removeServicio);
router.get('/:id/repuestos',           auth, controller.getRepuestos);
router.post('/:id/repuestos',          auth, controller.addRepuesto);
router.delete('/:id/repuestos/:rid',   auth, controller.removeRepuesto);

module.exports = router;
const express = require('express');
const router  = express.Router();
const auth    = require('../../middleware/auth');
const ctrl    = require('./facturacion.controller');

router.get('/',    auth, ctrl.getAll);
router.get('/:id', auth, ctrl.getById);
router.post('/',   auth, ctrl.create);
router.delete('/:id', auth, ctrl.remove);

module.exports = router;

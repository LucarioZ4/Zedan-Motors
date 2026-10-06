const express = require('express');
const router  = express.Router();
const auth    = require('../../middleware/auth');
const roles   = require('../../middleware/roles');
const ctrl    = require('./facturacion.controller');
const { body, validationResult } = require('express-validator');

const validarFactura = [
    body('id_orden').notEmpty().withMessage('Debe seleccionar una orden')
        .isInt().withMessage('Orden inválida'),
    body('metodo_pago').notEmpty().withMessage('Debe seleccionar un método de pago')
        .isIn(['Efectivo', 'Tarjeta', 'Transferencia']).withMessage('Método de pago no válido'),
];

const validar = (req, res, next) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        const mensaje = errores.array().map(e => e.msg).join('. ');
        return res.status(400).json({ error: mensaje });
    }
    next();
};

router.get('/',       auth, ctrl.getAll);
router.get('/:id',    auth, ctrl.getById);
router.post('/',      auth, roles('Administrador'), validarFactura, validar, ctrl.create);
router.delete('/:id', auth, roles('Administrador'), ctrl.remove);

module.exports = router;
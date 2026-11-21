const express = require('express');
const router  = express.Router();
const auth    = require('../../middleware/auth');
const roles   = require('../../middleware/roles');
const ctrl    = require('./facturacion.controller');
const { body, validationResult } = require('express-validator');

const validarPago = body('metodo_pago').notEmpty().withMessage('Debe seleccionar un método de pago')
        .isIn(['Efectivo', 'Tarjeta', 'Transferencia']).withMessage('Método de pago no válido');

const validarFactura = [
    body('id_orden').notEmpty().withMessage('Debe seleccionar una orden')
        .isInt().withMessage('Orden inválida'),
    validarPago,
];

const validar = (req, res, next) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        const mensaje = errores.array().map(e => e.msg).join('. ');
        return res.status(400).json({ error: mensaje });
    }
    next();
};

router.use(auth);
router.param('id', require('../../middleware/idEntero'));

router.get('/',       ctrl.getAll);
router.get('/:id',    ctrl.getById);
router.get('/:id/pdf', ctrl.descargarPdf);
router.post('/:id/enviar-correo', ctrl.enviarCorreo);
router.post('/:id/enviar-whatsapp', ctrl.enviarWhatsApp);
router.post('/',      roles('Administrador'), validarFactura, validar, ctrl.create);
router.put('/:id', roles('Administrador'), validarPago, validar, ctrl.update);
router.delete('/:id', roles('Administrador'), ctrl.remove);

module.exports = router;
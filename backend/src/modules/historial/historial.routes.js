const express    = require('express');
const router     = express.Router();
const controller = require('./historial.controller');
const auth       = require('../../middleware/auth');
const { param, validationResult } = require('express-validator');

const validar = (req, res, next) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        const mensaje = errores.array().map(e => e.msg).join('. ');
        return res.status(400).json({ error: mensaje });
    }
    next();
};

router.get(
    '/vehiculo/:id',
    auth,
    param('id').isInt().withMessage('El id del vehículo no es válido'),
    validar,
    controller.getByVehiculo
);

module.exports = router;
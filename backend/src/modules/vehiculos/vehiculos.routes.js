const express    = require('express');
const router     = express.Router();
const controller = require('./vehiculos.controller');
const auth       = require('../../middleware/auth');
const roles      = require('../../middleware/roles');
const { body, validationResult } = require('express-validator');

const validarVehiculo = [
    body('placa').trim().notEmpty().withMessage('La placa es obligatoria')
        .customSanitizer(v => v.toUpperCase())
        .matches(/^[A-Z]{3}[0-9]{2}[0-9A-Z]$/).withMessage('La placa debe tener el formato ABC123 (carro) o ABC12A (moto)'),
    body('marca').trim().notEmpty().withMessage('La marca es obligatoria')
        .isLength({ max: 50 }).withMessage('La marca es muy larga'),
    body('modelo').trim().notEmpty().withMessage('El modelo es obligatorio')
        .isLength({ max: 50 }).withMessage('El modelo es muy largo'),
    body('anio').optional({ checkFalsy: true })
        .isInt({ min: 1900, max: new Date().getFullYear() + 1 }).withMessage('Año no válido'),
    body('color').optional({ checkFalsy: true })
        .isLength({ max: 20 }).withMessage('El color es muy largo'),
    body('id_cliente').notEmpty().withMessage('Debe seleccionar un cliente')
        .isInt().withMessage('Cliente inválido'),
];

const validar = (req, res, next) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        const mensaje = errores.array().map(e => e.msg).join('. ');
        return res.status(400).json({ error: mensaje });
    }
    next();
};

router.get('/',           auth, controller.getAll);
router.post('/importar',  auth, controller.importar);
router.get('/:id',        auth, controller.getById);
router.post('/',          auth, validarVehiculo, validar, controller.create);
router.put('/:id',        auth, validarVehiculo, validar, controller.update);
router.delete('/:id',     auth, roles('Administrador'), controller.remove);

module.exports = router;
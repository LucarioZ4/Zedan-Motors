const express    = require('express');
const router     = express.Router();
const controller = require('./servicios.controller');
const auth       = require('../../middleware/auth');
const roles      = require('../../middleware/roles');
const { body, validationResult } = require('express-validator');

const validarServicio = [
    body('nombre_servicio').trim().notEmpty().withMessage('El nombre es obligatorio')
        .isLength({ max: 100 }).withMessage('El nombre es muy largo'),
    body('descripcion').optional({ checkFalsy: true })
        .isLength({ max: 200 }).withMessage('La descripción es muy larga'),
    body('costo').notEmpty().withMessage('El costo es obligatorio')
        .isFloat({ gt: 0 }).withMessage('El costo debe ser mayor a cero'),
];

const validar = (req, res, next) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        const mensaje = errores.array().map(e => e.msg).join('. ');
        return res.status(400).json({ error: mensaje });
    }
    next();
};

router.get('/',       auth, controller.getAll);
router.get('/:id',    auth, controller.getById);
router.post('/',      auth, validarServicio, validar, controller.create);
router.put('/:id',    auth, validarServicio, validar, controller.update);
router.delete('/:id', auth, roles('Administrador'), controller.remove);

module.exports = router;
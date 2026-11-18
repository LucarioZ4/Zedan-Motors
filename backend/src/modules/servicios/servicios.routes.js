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
        .isFloat({ min: 0.01, max: 99999999.99 }).withMessage('El costo debe estar entre 0.01 y 99999999.99'),
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

router.get('/',       controller.getAll);
router.get('/:id',    controller.getById);
router.post('/',      validarServicio, validar, controller.create);
router.put('/:id',    validarServicio, validar, controller.update);
router.delete('/:id', roles('Administrador'), controller.remove);

module.exports = router;
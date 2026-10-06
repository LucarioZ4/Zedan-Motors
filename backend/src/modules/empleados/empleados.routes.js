const express    = require('express');
const router     = express.Router();
const controller = require('./empleados.controller');
const auth       = require('../../middleware/auth');
const roles      = require('../../middleware/roles');
const { body, validationResult } = require('express-validator');

const validarEmpleado = [
    body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio')
        .isLength({ max: 100 }).withMessage('El nombre es muy largo'),
    body('apellido').trim().notEmpty().withMessage('El apellido es obligatorio')
        .isLength({ max: 100 }).withMessage('El apellido es muy largo'),
    body('telefono').trim().notEmpty().withMessage('El teléfono es obligatorio')
        .matches(/^[0-9+\-\s]{7,20}$/).withMessage('El teléfono solo debe tener números, +, - o espacios'),
    body('correo').optional({ checkFalsy: true })
        .isEmail().withMessage('El correo no tiene un formato válido'),
    body('id_cargo').notEmpty().withMessage('Debe seleccionar un cargo')
        .isInt().withMessage('Cargo inválido'),
];

const validar = (req, res, next) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        const mensaje = errores.array().map(e => e.msg).join('. ');
        return res.status(400).json({ error: mensaje });
    }
    next();
};

router.get('/cargos',  auth, controller.getCargos);
router.get('/',         auth, controller.getAll);
router.get('/:id',      auth, controller.getById);
router.post('/',        auth, roles('Administrador'), validarEmpleado, validar, controller.create);
router.put('/:id',      auth, roles('Administrador'), validarEmpleado, validar, controller.update);
router.delete('/:id',   auth, roles('Administrador'), controller.remove);

module.exports = router;
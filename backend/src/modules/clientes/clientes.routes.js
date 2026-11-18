const express    = require('express');
const router     = express.Router();
const controller = require('./clientes.controller');
const auth       = require('../../middleware/auth');
const roles      = require('../../middleware/roles');
const { body, validationResult } = require('express-validator');

const validarCliente = [
    body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio')
        .isLength({ max: 100 }).withMessage('El nombre es muy largo'),
    body('apellido').trim().notEmpty().withMessage('El apellido es obligatorio')
        .isLength({ max: 100 }).withMessage('El apellido es muy largo'),
    body('telefono').trim().notEmpty().withMessage('El teléfono es obligatorio')
        .isLength({ min: 7, max: 20 }).withMessage('El teléfono debe tener entre 7 y 20 caracteres')
        .matches(/^[0-9+\-\s]+$/).withMessage('El teléfono solo debe tener números, +, - o espacios'),
    body('correo').optional({ checkFalsy: true })
        .isEmail().withMessage('El correo no tiene un formato válido'),
    body('direccion').optional({ checkFalsy: true })
        .isLength({ max: 150 }).withMessage('La dirección es muy larga'),
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

router.get('/',               controller.getAll);
router.get('/:id',            controller.getById);
router.post('/',              validarCliente, validar, controller.create);
router.put('/:id',            validarCliente, validar, controller.update);
router.delete('/:id',         roles('Administrador'), controller.remove);
router.get('/:id/vehiculos',  controller.getVehiculos);

module.exports = router;
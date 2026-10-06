const express    = require('express');
const router     = express.Router();
const controller = require('./inventario.controller');
const auth       = require('../../middleware/auth');
const roles      = require('../../middleware/roles');
const { body, validationResult } = require('express-validator');

const validarInventario = [
    body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio')
        .isLength({ max: 100 }).withMessage('El nombre es muy largo'),
    body('marca').optional({ checkFalsy: true })
        .isLength({ max: 50 }).withMessage('La marca es muy larga'),
    body('precio').notEmpty().withMessage('El precio es obligatorio')
        .isFloat({ gt: 0 }).withMessage('El precio debe ser mayor a cero'),
    body('stock').optional({ checkFalsy: false })
        .isInt({ min: 0 }).withMessage('El stock no puede ser negativo'),
];

const validar = (req, res, next) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        const mensaje = errores.array().map(e => e.msg).join('. ');
        return res.status(400).json({ error: mensaje });
    }
    next();
};

router.get('/',          auth, controller.getAll);
router.post('/importar', auth, roles('Administrador', 'Jefe de taller'), controller.importar);
router.get('/:id',       auth, controller.getById);
router.post('/',         auth, roles('Administrador', 'Jefe de taller'), validarInventario, validar, controller.create);
router.put('/:id',       auth, roles('Administrador', 'Jefe de taller'), validarInventario, validar, controller.update);
router.delete('/:id',    auth, roles('Administrador'), controller.remove);

module.exports = router;
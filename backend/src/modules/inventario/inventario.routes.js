const express    = require('express');
const router     = express.Router();
const controller = require('./inventario.controller');
const iaController = require('./inventario.ia.controller');
const auth       = require('../../middleware/auth');
const roles      = require('../../middleware/roles');
const iaLimiter  = require('../../middleware/iaLimiter');
const { body, validationResult } = require('express-validator');

const validarInventario = [
    body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio')
        .isLength({ max: 100 }).withMessage('El nombre es muy largo'),
    body('marca').optional({ checkFalsy: true })
        .isLength({ max: 50 }).withMessage('La marca es muy larga'),
    body('precio').notEmpty().withMessage('El precio es obligatorio')
        .isFloat({ min: 0.01, max: 99999999.99 }).withMessage('El precio debe ser mayor a cero'),
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

router.use(auth);
router.param('id', require('../../middleware/idEntero'));

router.get('/',          controller.getAll);

// ── Inventario con IA ──
router.post('/ia/analizar', roles('Administrador', 'Jefe de taller'), iaLimiter, iaController.analizar);
router.post('/ia/aplicar',  roles('Administrador', 'Jefe de taller'), iaController.aplicar);

router.post('/importar', roles('Administrador', 'Jefe de taller'), controller.importar);
router.get('/:id',       controller.getById);
router.post('/',         roles('Administrador', 'Jefe de taller'), validarInventario, validar, controller.create);
router.put('/:id',       roles('Administrador', 'Jefe de taller'), validarInventario, validar, controller.update);
router.delete('/:id',    roles('Administrador'), controller.remove);

module.exports = router;

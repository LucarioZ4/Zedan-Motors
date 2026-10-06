const express    = require('express');
const router     = express.Router();
const controller = require('./citas.controller');
const auth       = require('../../middleware/auth');
const roles      = require('../../middleware/roles');
const { body, validationResult } = require('express-validator');

const reglasBase = [
    body('fecha').notEmpty().withMessage('La fecha es obligatoria')
        .isISO8601().withMessage('La fecha no es válida'),
    body('hora').notEmpty().withMessage('La hora es obligatoria')
        .matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('La hora debe tener el formato HH:MM'),
    body('motivo').optional({ checkFalsy: true })
        .isLength({ max: 200 }).withMessage('El motivo es muy largo'),
    body('id_vehiculo').notEmpty().withMessage('Debe seleccionar un vehículo')
        .isInt().withMessage('Vehículo inválido'),
    body('id_estado').optional({ checkFalsy: true })
        .isInt().withMessage('Estado inválido'),
];

// Solo al crear: no se pueden agendar citas en una fecha ya pasada.
// Al editar no se exige (puede que estés registrando una cita que ya ocurrió).
const noFechaPasada = body('fecha').custom(fecha => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    if (new Date(fecha) < hoy)
        throw new Error('No puede agendar citas en fechas pasadas');
    return true;
});

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
router.post('/',      auth, [...reglasBase, noFechaPasada], validar, controller.create);
router.put('/:id',    auth, reglasBase, validar, controller.update);
router.delete('/:id', auth, roles('Administrador'), controller.remove);

module.exports = router;
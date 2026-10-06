const express    = require('express');
const router     = express.Router();
const controller = require('./ordenes.controller');
const auth       = require('../../middleware/auth');
const roles      = require('../../middleware/roles');
const { body, param, validationResult } = require('express-validator');

// ── Orden (datos generales) ──
const validarOrden = [
    body('fecha_inicio').notEmpty().withMessage('La fecha de inicio es obligatoria')
        .isISO8601().withMessage('La fecha de inicio no es válida'),
    body('fecha_fin').optional({ checkFalsy: true })
        .isISO8601().withMessage('La fecha de fin no es válida')
        .custom((fecha_fin, { req }) => {
            if (req.body.fecha_inicio && fecha_fin < req.body.fecha_inicio)
                throw new Error('La fecha de fin no puede ser anterior a la fecha de inicio');
            return true;
        }),
    body('observaciones').optional({ checkFalsy: true })
        .isLength({ max: 300 }).withMessage('Las observaciones son muy largas'),
    body('id_cita').notEmpty().withMessage('Debe seleccionar una cita')
        .isInt().withMessage('Cita inválida'),
    body('id_empleado').notEmpty().withMessage('Debe seleccionar un empleado')
        .isInt().withMessage('Empleado inválido'),
];

// ── Agregar servicio a una orden ──
const validarServicioOrden = [
    body('id_servicio').notEmpty().withMessage('Debe seleccionar un servicio')
        .isInt().withMessage('Servicio inválido'),
];

// ── Agregar repuesto a una orden ──
const validarRepuestoOrden = [
    body('id_repuesto').notEmpty().withMessage('Debe seleccionar un repuesto')
        .isInt().withMessage('Repuesto inválido'),
    body('cantidad').notEmpty().withMessage('La cantidad es obligatoria')
        .isInt({ gt: 0 }).withMessage('La cantidad debe ser mayor a cero'),
];

// ── Validación de ids en la URL (:id, :sid, :rid) ──
const validarIdUrl = (nombreParam, etiqueta) =>
    param(nombreParam).isInt().withMessage(`${etiqueta} no es válido`);

const validar = (req, res, next) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        const mensaje = errores.array().map(e => e.msg).join('. ');
        return res.status(400).json({ error: mensaje });
    }
    next();
};

router.get('/',     auth, controller.getAll);
router.get('/:id',  auth, validarIdUrl('id', 'El id de la orden'), validar, controller.getById);

router.post('/',    auth, validarOrden, validar, controller.create);
router.put('/:id',  auth, validarIdUrl('id', 'El id de la orden'), validarOrden, validar, controller.update);
router.delete('/:id', auth, roles('Administrador'),
    validarIdUrl('id', 'El id de la orden'), validar, controller.remove);

router.get('/:id/servicios',  auth, validarIdUrl('id', 'El id de la orden'), validar, controller.getServicios);
router.post('/:id/servicios', auth,
    validarIdUrl('id', 'El id de la orden'), validarServicioOrden, validar, controller.addServicio);
router.delete('/:id/servicios/:sid', auth,
    [validarIdUrl('id', 'El id de la orden'), validarIdUrl('sid', 'El id del servicio')],
    validar, controller.removeServicio);

router.get('/:id/repuestos',  auth, validarIdUrl('id', 'El id de la orden'), validar, controller.getRepuestos);
router.post('/:id/repuestos', auth,
    validarIdUrl('id', 'El id de la orden'), validarRepuestoOrden, validar, controller.addRepuesto);
router.delete('/:id/repuestos/:rid', auth,
    [validarIdUrl('id', 'El id de la orden'), validarIdUrl('rid', 'El id del repuesto')],
    validar, controller.removeRepuesto);

module.exports = router;
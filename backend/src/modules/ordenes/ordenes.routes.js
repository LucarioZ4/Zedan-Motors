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
    body('id_cita').optional({ nullable: true })
        .isInt().withMessage('Cita inválida'),
    body('id_empleado').optional({ nullable: true })
        .isInt().withMessage('Empleado inválido'),
    body('id_estado').optional({ nullable: true })
        .isInt().withMessage('Estado inválido'),
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

router.use(auth);
router.param('id', require('../../middleware/idEntero'));

router.get('/',     controller.getAll);
router.get('/:id',  validarIdUrl('id', 'El id de la orden'), validar, controller.getById);

router.post('/',    validarOrden, validar, controller.create);
router.put('/:id',  validarIdUrl('id', 'El id de la orden'), validarOrden, validar, controller.update);
router.delete('/:id', roles('Administrador'),
    validarIdUrl('id', 'El id de la orden'), validar, controller.remove);

router.get('/:id/servicios',  validarIdUrl('id', 'El id de la orden'), validar, controller.getServicios);
router.post('/:id/servicios', validarIdUrl('id', 'El id de la orden'), validarServicioOrden, validar, controller.addServicio);
router.delete('/:id/servicios/:sid', [validarIdUrl('id', 'El id de la orden'), validarIdUrl('sid', 'El id del servicio')],
    validar, controller.removeServicio);

router.get('/:id/repuestos',  validarIdUrl('id', 'El id de la orden'), validar, controller.getRepuestos);
router.post('/:id/repuestos', validarIdUrl('id', 'El id de la orden'), validarRepuestoOrden, validar, controller.addRepuesto);
router.delete('/:id/repuestos/:rid', [validarIdUrl('id', 'El id de la orden'), validarIdUrl('rid', 'El id del repuesto')],
    validar, controller.removeRepuesto);

// ── Videos de recepción y entrega (evidencia multimedia) ──
const videosController = require('./videos.controller');
router.get('/:id/videos', validarIdUrl('id', 'El id de la orden'), validar, videosController.listar);
router.post('/:id/videos/firma', roles('Administrador', 'Jefe de taller', 'Mecánico'), validarIdUrl('id', 'El id de la orden'), validar, videosController.firmarSubida);
router.post('/:id/videos', roles('Administrador', 'Jefe de taller', 'Mecánico'), validarIdUrl('id', 'El id de la orden'), validar, videosController.registrar);
router.delete('/:id/videos/:vid', roles('Administrador', 'Jefe de taller'),
    [validarIdUrl('id', 'El id de la orden'), validarIdUrl('vid', 'El id del video')],
    validar, videosController.eliminar);

module.exports = router;

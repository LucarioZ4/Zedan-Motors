const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');
const bitacoraService = require('../services/bitacora.service');

module.exports = (req, res, next) => {
    const header = req.headers['authorization'];

    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token requerido' });
    }

    const token = header.split(' ')[1];

    try {
        const decoded = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
        // Los tokens locales anteriores al contrato común caducan con su vigencia original.
        if ((decoded.iss !== undefined && decoded.iss !== (process.env.JWT_ISSUER || 'ZedanMotorsApi')) ||
            (decoded.aud !== undefined && decoded.aud !== (process.env.JWT_AUDIENCE || 'ZedanMotorsFrontend')))
            return res.status(401).json({ error: 'Token inválido o expirado' });
        req.usuario = { ...decoded, id: Number(decoded.id), id_empleado: Number(decoded.id_empleado), rol: decoded.rol ?? null };

        // Actualizar última actividad de forma asíncrona (sin bloquear el request)
        if (decoded.id_sesion) {
            bitacoraService.renovarActividad(decoded.id_sesion);
        }

        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
    }
};
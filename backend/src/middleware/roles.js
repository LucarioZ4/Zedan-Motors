const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.usuario || !req.usuario.rol) {
            return res.status(403).json({ error: 'Acceso denegado: no se pudo verificar el rol del usuario' });
        }

        if (!allowedRoles.includes(req.usuario.rol)) {
            return res.status(403).json({ error: 'Acceso denegado: rol insuficiente' });
        }

        next();
    };
};

module.exports = authorizeRoles;

const jwt  = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { jwtSecret, jwtExpires } = require('../../config/env');

// TODO: Temporal para la demo, mover a la base de datos
const USUARIOS = [
    { id: 1, usuario: 'admin',     passwordHash: '$2a$10$fklA676wn628NDubTeKP6ObJMqocZKEZrV4D.bUrbO/QY8zQZoItG', rol: 'Administrador', nombre: 'Admin' },
    { id: 2, usuario: 'mecanico',  passwordHash: '$2a$10$fklA676wn628NDubTeKP6ObJMqocZKEZrV4D.bUrbO/QY8zQZoItG', rol: 'Mecánico',      nombre: 'Mecánico' },
    { id: 3, usuario: 'recepcion', passwordHash: '$2a$10$fklA676wn628NDubTeKP6ObJMqocZKEZrV4D.bUrbO/QY8zQZoItG', rol: 'Recepcionista', nombre: 'Recepción' },
];

const login = async (req, res) => {
    try {
        const { usuario, password } = req.body;

        if (!usuario || !password)
            return res.status(400).json({ error: 'Usuario y contraseña requeridos' });

        const encontrado = USUARIOS.find(
            u => u.usuario === usuario && bcrypt.compareSync(password, u.passwordHash)
        );

        if (!encontrado)
            return res.status(401).json({ error: 'Credenciales incorrectas' });

        const token = jwt.sign(
            { id: encontrado.id, usuario: encontrado.usuario, rol: encontrado.rol, nombre: encontrado.nombre },
            jwtSecret,
            { expiresIn: jwtExpires }
        );

        res.json({ token, usuario: encontrado });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const verificar = (req, res) => {
    res.json({ usuario: req.usuario });
};

module.exports = { login, verificar };
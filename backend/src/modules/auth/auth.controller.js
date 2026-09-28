const jwt    = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool   = require('../../config/database');
const { jwtSecret, jwtExpires } = require('../../config/env');

const login = async (req, res) => {
    try {
        const { usuario, password } = req.body;

        if (!usuario || !password)
            return res.status(400).json({ error: 'Usuario y contraseña requeridos' });

        const result = await pool.query(`
            SELECT u.id_usuario, u.nombre_usuario, u.password_hash, u.activo,
                   e.id_empleado, e.nombre, c.nombre_cargo AS rol
            FROM usuario u
            JOIN empleado e ON u.id_empleado = e.id_empleado
            LEFT JOIN cargo c ON e.id_cargo = c.id_cargo
            WHERE u.nombre_usuario = $1
        `, [usuario]);

        const fila = result.rows[0];

        // Mismo mensaje si el usuario no existe, está inactivo o la clave es incorrecta
        if (!fila || !fila.activo || !(await bcrypt.compare(password, fila.password_hash)))
            return res.status(401).json({ error: 'Credenciales incorrectas' });

        const datos = {
            id: fila.id_usuario,
            id_empleado: fila.id_empleado,
            usuario: fila.nombre_usuario,
            rol: fila.rol,
            nombre: fila.nombre
        };

        const token = jwt.sign(datos, jwtSecret, { expiresIn: jwtExpires });

        res.json({ token, usuario: datos });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

const verificar = (req, res) => {
    res.json({ usuario: req.usuario });
};

module.exports = { login, verificar };
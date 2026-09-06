const express = require('express');
const router  = express.Router();
const auth    = require('../../middleware/auth');
const pool    = require('../../config/database');

router.get('/', auth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT e.id_empleado,
                   e.nombre || ' ' || e.apellido AS nombre_completo,
                   e.nombre, e.apellido, e.telefono, e.correo,
                   c.nombre_cargo AS cargo
            FROM empleado e
            LEFT JOIN cargo c ON e.id_cargo = c.id_cargo
            ORDER BY e.apellido
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
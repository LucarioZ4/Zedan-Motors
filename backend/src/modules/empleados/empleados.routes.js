const express = require('express');
const router  = express.Router();
const auth    = require('../../middleware/auth');
const pool    = require('../../config/database');

// GET all empleados
router.get('/', auth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT e.id_empleado,
                   e.nombre, e.apellido,
                   e.nombre || ' ' || e.apellido AS nombre_completo,
                   e.telefono, e.correo,
                   c.id_cargo, c.nombre_cargo AS cargo
            FROM empleado e
            LEFT JOIN cargo c ON e.id_cargo = c.id_cargo
            ORDER BY e.apellido, e.nombre
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET cargos (para el select)
router.get('/cargos', auth, async (req, res) => {
    try {
        const result = await pool.query('SELECT id_cargo, nombre_cargo FROM cargo ORDER BY nombre_cargo');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET one
router.get('/:id', auth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT e.id_empleado, e.nombre, e.apellido, e.telefono, e.correo, e.id_cargo,
                   c.nombre_cargo AS cargo
            FROM empleado e
            LEFT JOIN cargo c ON e.id_cargo = c.id_cargo
            WHERE e.id_empleado = $1
        `, [req.params.id]);
        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Empleado no encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST create
router.post('/', auth, async (req, res) => {
    try {
        const { nombre, apellido, telefono, correo, id_cargo } = req.body;
        if (!nombre || !apellido || !telefono)
            return res.status(400).json({ error: 'Nombre, apellido y teléfono son obligatorios' });

        const result = await pool.query(`
            INSERT INTO empleado (nombre, apellido, telefono, correo, id_cargo)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [nombre, apellido, telefono, correo || null, id_cargo || null]);

        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT update
router.put('/:id', auth, async (req, res) => {
    try {
        const { nombre, apellido, telefono, correo, id_cargo } = req.body;
        if (!nombre || !apellido || !telefono)
            return res.status(400).json({ error: 'Nombre, apellido y teléfono son obligatorios' });

        const result = await pool.query(`
            UPDATE empleado
            SET nombre = $1, apellido = $2, telefono = $3, correo = $4, id_cargo = $5
            WHERE id_empleado = $6
            RETURNING *
        `, [nombre, apellido, telefono, correo || null, id_cargo || null, req.params.id]);

        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Empleado no encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE
router.delete('/:id', auth, async (req, res) => {
    try {
        const result = await pool.query(
            'DELETE FROM empleado WHERE id_empleado = $1 RETURNING *',
            [req.params.id]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Empleado no encontrado' });
        res.json({ mensaje: 'Empleado eliminado correctamente' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
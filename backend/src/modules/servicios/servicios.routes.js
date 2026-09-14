const express = require('express');
const router  = express.Router();
const auth    = require('../../middleware/auth');
const pool    = require('../../config/database');

// GET all servicios
router.get('/', auth, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id_servicio, nombre_servicio, descripcion, costo FROM servicio ORDER BY nombre_servicio'
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET one
router.get('/:id', auth, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id_servicio, nombre_servicio, descripcion, costo FROM servicio WHERE id_servicio = $1',
            [req.params.id]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Servicio no encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST create
router.post('/', auth, async (req, res) => {
    try {
        const { nombre_servicio, descripcion, costo } = req.body;
        if (!nombre_servicio || !costo)
            return res.status(400).json({ error: 'Nombre y costo son obligatorios' });

        const result = await pool.query(`
            INSERT INTO servicio (nombre_servicio, descripcion, costo)
            VALUES ($1, $2, $3)
            RETURNING *
        `, [nombre_servicio, descripcion || null, parseFloat(costo)]);

        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT update
router.put('/:id', auth, async (req, res) => {
    try {
        const { nombre_servicio, descripcion, costo } = req.body;
        if (!nombre_servicio || !costo)
            return res.status(400).json({ error: 'Nombre y costo son obligatorios' });

        const result = await pool.query(`
            UPDATE servicio
            SET nombre_servicio = $1, descripcion = $2, costo = $3
            WHERE id_servicio = $4
            RETURNING *
        `, [nombre_servicio, descripcion || null, parseFloat(costo), req.params.id]);

        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Servicio no encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE
router.delete('/:id', auth, async (req, res) => {
    try {
        const result = await pool.query(
            'DELETE FROM servicio WHERE id_servicio = $1 RETURNING *',
            [req.params.id]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Servicio no encontrado' });
        res.json({ mensaje: 'Servicio eliminado correctamente' });
    } catch (err) {
        if (err.code === '23503')
            return res.status(400).json({ error: 'No se puede eliminar: el servicio está en uso en órdenes de trabajo' });
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
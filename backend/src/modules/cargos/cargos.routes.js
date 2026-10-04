const express = require('express');
const router  = express.Router();
const auth    = require('../../middleware/auth');
const roles = require('../../middleware/roles');
const pool    = require('../../config/database');

router.get('/', auth, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id_cargo, nombre_cargo FROM cargo ORDER BY nombre_cargo'
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
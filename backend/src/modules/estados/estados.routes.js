const express = require('express');
const router  = express.Router();
const auth    = require('../../middleware/auth');
const pool    = require('../../config/database');

router.get('/', auth, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id_estado, nombre_estado FROM estado ORDER BY id_estado'
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
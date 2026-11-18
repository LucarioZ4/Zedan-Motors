const express = require('express');
const router  = express.Router();
const auth    = require('../../middleware/auth');
const pool    = require('../../config/database');

router.use(auth);
router.param('id', require('../../middleware/idEntero'));

router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id_estado, nombre_estado FROM estado ORDER BY id_estado'
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id_estado, nombre_estado FROM estado WHERE id_estado = $1',
            [req.params.id]
        );
        if (!result.rows.length)
            return res.status(404).json({ error: 'Estado no encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
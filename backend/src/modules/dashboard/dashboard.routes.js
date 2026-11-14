const express = require('express');
const router  = express.Router();
const { getKPIs, getCitasHoy, getGraficas } = require('./dashboard.controller');
const auth = require('../../middleware/auth');

router.get('/kpis',      auth, getKPIs);
router.get('/citas-hoy', auth, getCitasHoy);
router.get('/graficas',  auth, getGraficas);

module.exports = router;
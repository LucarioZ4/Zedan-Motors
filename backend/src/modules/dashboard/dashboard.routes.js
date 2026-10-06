const express = require('express');
const router  = express.Router();
const { getKPIs, getCitasHoy } = require('./dashboard.controller');
const auth = require('../../middleware/auth');

router.get('/kpis',      auth, getKPIs);
router.get('/citas-hoy', auth, getCitasHoy);

module.exports = router;
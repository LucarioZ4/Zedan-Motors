const express = require('express');
const router  = express.Router();
const { login, verificar } = require('./auth.controller');
const authMiddleware = require('../../middleware/auth');

router.post('/login',    login);
router.get('/verificar', authMiddleware, verificar);

module.exports = router;
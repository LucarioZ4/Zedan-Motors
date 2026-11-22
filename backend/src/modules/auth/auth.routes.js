const express = require('express');
const router  = express.Router();
const { login, logout, verificar } = require('./auth.controller');
const authMiddleware = require('../../middleware/auth');
const loginLimiter   = require('../../middleware/loginLimiter');

router.post('/login',    loginLimiter, login);
router.post('/logout',   authMiddleware, logout);
router.get('/verificar', authMiddleware, verificar);

module.exports = router;
const express = require('express');
const router  = express.Router();
const { login, verificar } = require('./auth.controller');
const authMiddleware = require('../../middleware/auth');
const loginLimiter   = require('../../middleware/loginLimiter');

router.post('/login',    loginLimiter, login);
router.get('/verificar', authMiddleware, verificar);

module.exports = router;
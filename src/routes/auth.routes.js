const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/perfil/:id', authController.getPerfil);
router.put('/perfil/:id', authController.updatePerfil);

module.exports = router;
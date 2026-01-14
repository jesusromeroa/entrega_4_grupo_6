const express = require('express');
const router = express.Router();
const empleosController = require('../controllers/empleos.controller.js');

// GET http://localhost:3000/empleos
router.get('/', empleosController.getOfertas);

// POST http://localhost:3000/empleos/publicar
router.post('/publicar', empleosController.publicarOferta);

module.exports = router;
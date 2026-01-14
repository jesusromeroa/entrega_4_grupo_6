const express = require('express');
const router = express.Router();
const alquilerController = require('../controllers/alquiler.controller.js');

router.get('/', alquilerController.getAlquileres);
router.get('/datos-form', alquilerController.getDatosFormulario); // Para llenar selects
router.post('/publicar', alquilerController.publicarAlquiler);

module.exports = router;
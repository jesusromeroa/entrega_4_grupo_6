const express = require('express');
const router = express.Router();
const recController = require('../controllers/recomendacion.controller.js');

router.get('/', recController.getRecomendaciones);
router.post('/publicar', recController.publicarRecomendacion);

module.exports = router;
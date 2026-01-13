const express = require('express');
const router = express.Router();
const controller = require('../controllers/conexion.controller');

router.get('/', controller.getAllMiembros); // Esta es la que fallaba
router.get('/:id/amigos', controller.getAmigosDeMiembro);
router.get('/:id/conversaciones', controller.getConversacionesDeMiembro);
router.get('/conversacion/:id/mensajes', controller.getMensajes);

module.exports = router;
const express = require('express');
const router = express.Router();
const controller = require('../controllers/conexion.controller');

// Rutas Admin
router.get('/', controller.getAllMiembros);

// Rutas de Miembro (Interacción)
router.get('/buscar', controller.getMiembrosParaConectar);
router.post('/solicitar', controller.enviarSolicitud);
router.post('/aceptar', controller.aceptarSolicitud);
router.get('/:id/pendientes', controller.getSolicitudes);

// Rutas Comunes (Ver detalle)
router.get('/:id/amigos', controller.getAmigosDeMiembro);
router.get('/:id/conversaciones', controller.getConversacionesDeMiembro);
router.get('/conversacion/:id/mensajes', controller.getMensajes);

module.exports = router;
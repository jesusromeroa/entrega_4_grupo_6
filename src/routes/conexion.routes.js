const express = require('express');
const router = express.Router();
const conexionController = require('../controllers/conexion.controller');

// Rutas de Conexiones
router.get('/buscar', conexionController.getMiembrosParaConectar); // Buscar gente nueva
router.post('/solicitar', conexionController.enviarSolicitud);     // Enviar solicitud
router.post('/aceptar', conexionController.aceptarSolicitud);      // Aceptar solicitud
router.get('/:id/amigos', conexionController.getConexiones);       // Ver mis amigos
router.get('/:id/pendientes', conexionController.getSolicitudesPendientes); // Ver pendientes

// Rutas de Conversaciones
router.get('/:id/conversaciones', conexionController.getConversaciones); // Ver lista de chats
router.get('/conversacion/:conversacionId', conexionController.getMensajesDeConversacion); // Ver mensajes

module.exports = router;
const express = require('express');
const router = express.Router();
const controller = require('../controllers/conexion.controller');

// --- RUTAS ADMIN ---
router.get('/', controller.getAllMiembros);

// --- RUTAS MIEMBRO (CONEXIONES) ---
router.get('/buscar', controller.getMiembrosParaConectar);
router.post('/solicitar', controller.enviarSolicitud);
router.get('/:id/pendientes', controller.getSolicitudes);
router.post('/aceptar', controller.aceptarSolicitud);
router.post('/rechazar', controller.rechazarSolicitud); // <-- NUEVA
router.get('/:id/amigos', controller.getAmigosDeMiembro);

// --- RUTAS MIEMBRO (MENSAJERÍA) ---
router.get('/:id/conversaciones', controller.getConversacionesDeMiembro);
router.post('/conversacion', controller.iniciarConversacion); // <-- NUEVA
router.get('/conversacion/:id/mensajes', controller.getMensajes);
router.post('/mensaje', controller.enviarMensaje); // <-- NUEVA

module.exports = router;
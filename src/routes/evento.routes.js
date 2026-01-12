const express = require('express');
const router = express.Router();
const eventoController = require('../controllers/evento.controller');

router.get('/', eventoController.getEventos);
router.get('/organizadores', eventoController.getOrganizadores);
router.get('/:id', eventoController.getEventoById);
router.get('/:id/asistentes', eventoController.getAsistentes); // <--- Para el modal
router.post('/', eventoController.crearEvento);
router.put('/:id', eventoController.updateEvento);
router.delete('/:id', eventoController.eliminarEvento);

module.exports = router;
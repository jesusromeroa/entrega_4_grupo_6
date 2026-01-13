const express = require('express');
const router = express.Router();
const controller = require('../controllers/evento.controller');

// Rutas Admin
router.get('/', controller.getEventos);
router.post('/', controller.createEvento);
router.put('/:id', controller.updateEvento);
router.delete('/:id', controller.deleteEvento);
router.get('/:id/participantes', controller.getParticipantes);
router.get('/organizadores', controller.getOrganizadores);

// Rutas Miembro (NUEVAS)
router.get('/buscar', controller.getEventosDisponibles); // Buscar eventos
router.get('/:id/mis-eventos', controller.getMisEventos); // Mis eventos
router.post('/asistir', controller.asistirEvento);        // Asistir
router.post('/cancelar', controller.cancelarAsistencia);  // Cancelar

module.exports = router;
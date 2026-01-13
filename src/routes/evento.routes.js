const express = require('express');
const router = express.Router();
const eventoController = require('../controllers/evento.controller');

// Rutas CRUD Básicas
router.get('/', eventoController.getEventos);
router.post('/', eventoController.createEvento);
router.put('/:id', eventoController.updateEvento);
router.delete('/:id', eventoController.deleteEvento);

// Rutas Auxiliares
router.get('/organizadores', eventoController.getOrganizadores);
router.get('/:id/participantes', eventoController.getParticipantes);

module.exports = router;
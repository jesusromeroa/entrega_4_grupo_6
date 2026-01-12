const express = require('express');
const router = express.Router();
const eventoController = require('../controllers/evento.controller');

router.get('/', eventoController.getEventos);
router.get('/organizadores', eventoController.getOrganizadores);

module.exports = router;
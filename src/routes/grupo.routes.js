const express = require('express');
const router = express.Router();
const controller = require('../controllers/grupo.controller');

// Rutas Admin
router.get('/', controller.getGrupos);
router.get('/creadores', controller.getCreadores);
router.post('/', controller.crearGrupo);
router.put('/:id', controller.updateGrupo);
router.delete('/:id', controller.eliminarGrupo);
router.get('/:id/miembros', controller.getMiembrosGrupo);

// Rutas Miembro (NUEVAS)
router.get('/buscar', controller.getGruposDisponibles); // Buscar grupos
router.get('/:id/mis-grupos', controller.getMisGrupos); // Mis grupos
router.post('/unirse', controller.unirseGrupo);         // Unirse
router.post('/salir', controller.salirGrupo);           // Salirse

module.exports = router;
const express = require('express');
const router = express.Router();
const grupoController = require('../controllers/grupo.controller');

router.get('/', grupoController.getGrupos);
router.get('/creadores', grupoController.getCreadores);
router.get('/:id', grupoController.getGrupoById);

// ¡ESTA LÍNEA ES LA IMPORTANTE! Verifícala:
router.get('/:id/miembros', grupoController.getMiembrosGrupo); 

router.post('/', grupoController.crearGrupo);
router.put('/:id', grupoController.updateGrupo);
router.delete('/:id', grupoController.eliminarGrupo);

module.exports = router;
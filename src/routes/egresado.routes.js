const express = require('express');
const router = express.Router();
const egresadoController = require('../controllers/egresado.controller');

router.get('/', egresadoController.getEgresados);
router.get('/candidatos', egresadoController.getCandidatos);
router.get('/:id', egresadoController.getEgresadoById);
router.post('/', egresadoController.crearEgresado);
router.put('/:id', egresadoController.updateEgresado);
router.delete('/:id', egresadoController.eliminarEgresado);

module.exports = router;
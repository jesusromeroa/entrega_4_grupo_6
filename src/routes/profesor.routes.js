const express = require('express');
const router = express.Router();
const profesorController = require('../controllers/profesor.controller');

router.get('/', profesorController.getProfesores);
router.get('/candidatos', profesorController.getCandidatos);
router.get('/:id', profesorController.getProfesorById);
router.post('/', profesorController.crearProfesor);
router.put('/:id', profesorController.updateProfesor);
router.delete('/:id', profesorController.eliminarProfesor);

module.exports = router;
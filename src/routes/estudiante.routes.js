const express = require('express');
const router = express.Router();
const estudianteController = require('../controllers/estudiante.controller');

router.get('/', estudianteController.getEstudiantes);
router.get('/candidatos', estudianteController.getCandidatos);
router.post('/', estudianteController.crearEstudiante);
router.delete('/:id', estudianteController.eliminarEstudiante);
router.get('/:id', estudianteController.getEstudianteById); 
router.put('/:id', estudianteController.updateEstudiante);   
module.exports = router;
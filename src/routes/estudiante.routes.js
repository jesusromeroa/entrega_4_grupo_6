const express = require('express');
const router = express.Router();
const estudianteController = require('../controllers/estudiante.controller');

// Definir rutas SIN prefijo "/estudiantes"
router.get('/', estudianteController.getEstudiantes);
router.post('/', estudianteController.crearEstudiante);
router.get('/candidatos', estudianteController.getCandidatos); // GET /estudiantes/candidatos
router.get('/:id', estudianteController.getEstudianteById);
router.put('/:id', estudianteController.updateEstudiante);
router.delete('/:id', estudianteController.eliminarEstudiante);

module.exports = router;
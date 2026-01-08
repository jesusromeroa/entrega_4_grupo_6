const router = require('express').Router();
const controller = require('../controllers/estudiante.controller');

router.get('/estudiantes', controller.getEstudiantes);
router.post('/estudiantes', controller.createEstudiante);
router.get('/estudiantes/candidatos', controller.getCandidatos); // Ruta especial para el select
router.get('/estudiantes/:id', controller.getEstudianteById);
router.put('/estudiantes/:id', controller.updateEstudiante);
router.delete('/estudiantes/:id', controller.deleteEstudiante);

module.exports = router;
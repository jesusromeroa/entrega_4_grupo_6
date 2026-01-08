const router = require('express').Router();
const controller = require('../controllers/miembro.controller');

// Definimos las rutas
// Fíjate que usamos '/' porque en el index definiremos que todo esto empieza con /miembros

router.get('/miembros', controller.getMiembros);       // Buscar/Listar
router.post('/miembros', controller.createMiembro);    // Crear
router.get('/miembros/:id', controller.getMiembroById);// Obtener uno
router.put('/miembros/:id', controller.updateMiembro); // Modificar
router.delete('/miembros/:id', controller.deleteMiembro); // Eliminar

// Ruta extra para ciudades
router.get('/ciudades', controller.getCiudades);

module.exports = router;
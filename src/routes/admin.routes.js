const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller.js');

// Rutas de Roles
router.get('/roles', adminController.getRoles);
router.post('/roles', adminController.crearRol);

// Rutas de Elecciones
router.get('/elecciones', adminController.getElecciones);
router.post('/elecciones', adminController.crearEleccion);
router.put('/elecciones/:id/cerrar', adminController.cerrarEleccion);

module.exports = router;
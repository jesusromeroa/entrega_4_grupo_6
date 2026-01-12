const express = require('express');
const router = express.Router();
const miembroController = require('../controllers/miembro.controller');

// Definir rutas SIN el prefijo "/miembros" (se agregará en index.js)
router.get('/', miembroController.getMiembros);           // GET /miembros
router.post('/', miembroController.createMiembro);        // POST /miembros
router.get('/:id', miembroController.getMiembroById);     // GET /miembros/:id
router.put('/:id', miembroController.updateMiembro);      // PUT /miembros/:id
router.delete('/:id', miembroController.deleteMiembro);   // DELETE /miembros/:id

// Nota: La ruta de /ciudades la manejaremos directo en index.js para evitar conflictos
module.exports = router;
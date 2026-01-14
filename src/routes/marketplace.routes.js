const express = require('express');
const router = express.Router();
const marketController = require('../controllers/marketplace.controller');

router.get('/', marketController.getArticulos);
router.get('/categorias', marketController.getCategorias); // Para llenar el select
router.post('/publicar', marketController.publicarArticulo);

module.exports = router;
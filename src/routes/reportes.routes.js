const express = require('express');
const router = express.Router();
const reportesController = require('../controllers/reportes.controller.js');

router.get('/dashboard', reportesController.getDashboardData);

module.exports = router;
const express = require('express');
const router = express.Router();
const { getGlobalStats } = require('../controllers/stats');

// GET /api/stats - Obtener estadísticas globales
router.get('/', getGlobalStats);

module.exports = router;
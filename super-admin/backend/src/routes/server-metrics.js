const express = require('express');
const router = express.Router();
const { getServerMetrics } = require('../controllers/server-metrics');

// GET /api/system/server-metrics - Obtener métricas reales del servidor
router.get('/', getServerMetrics);

module.exports = router;

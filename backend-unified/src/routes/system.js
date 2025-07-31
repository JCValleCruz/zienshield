const express = require('express');
const router = express.Router();
const { getServerMetrics } = require('../controllers/systemMetrics');

// GET /api/system/server-metrics - Obtener métricas del servidor
router.get('/server-metrics', getServerMetrics);

module.exports = router;
const express = require('express');
const router = express.Router();
const { getWebTrafficMetrics } = require('../controllers/webTrafficMetrics');

// GET /api/web-traffic/metrics - Obtener métricas de tráfico web
router.get('/metrics', getWebTrafficMetrics);

module.exports = router;
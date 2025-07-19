const express = require('express');
const router = express.Router();
const { getCompanyStats, getCriticalDevices } = require('../controllers/company-stats');

// Ruta para obtener estadísticas específicas de una empresa
// GET /api/company/:tenantId/stats
router.get('/:tenantId/stats', getCompanyStats);

// Nueva ruta para obtener dispositivos críticos de una empresa
// GET /api/company/:tenantId/devices/critical
router.get('/:tenantId/devices/critical', getCriticalDevices);

module.exports = router;

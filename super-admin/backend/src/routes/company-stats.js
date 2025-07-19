const express = require('express');
const router = express.Router();
const { getCompanyStats } = require('../controllers/company-stats');

// Ruta para obtener estadísticas específicas de una empresa
// GET /api/company/:tenantId/stats
router.get('/:tenantId/stats', getCompanyStats);

module.exports = router;

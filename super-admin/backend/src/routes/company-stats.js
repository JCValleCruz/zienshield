// ========================================
// MODIFICAR EL ARCHIVO: super-admin/backend/src/routes/company-stats.js
// (Reemplazar TODO el contenido con este código)
// ========================================

const express = require('express');
const router = express.Router();
const { getCompanyStats, getCriticalDevices, getAllCompanyDevices } = require('../controllers/company-stats');

// Ruta para obtener estadísticas específicas de una empresa
// GET /api/company/:tenantId/stats
router.get('/:tenantId/stats', getCompanyStats);

// Ruta para obtener dispositivos críticos de una empresa (TOP 4)
// GET /api/company/:tenantId/devices/critical
router.get('/:tenantId/devices/critical', getCriticalDevices);

// NUEVA RUTA: Obtener inventario completo de dispositivos de una empresa
// GET /api/company/:tenantId/devices
// Parámetros de query opcionales:
// - page: número de página (default: 1)
// - limit: dispositivos por página (default: 20)
// - search: búsqueda por nombre, IP o OS
// - sortBy: campo para ordenar (name, ip, os, status, criticality_score, last_seen)
// - sortOrder: asc o desc
// - status: filtrar por estado (all, active, disconnected, pending)
router.get('/:tenantId/devices', getAllCompanyDevices);

module.exports = router;

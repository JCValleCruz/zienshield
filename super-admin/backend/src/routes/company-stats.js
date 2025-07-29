// ========================================
// MODIFICAR EL ARCHIVO: super-admin/backend/src/routes/company-stats.js
// (Reemplazar TODO el contenido con este código)
// ========================================

const express = require('express');
const router = express.Router();
const { getCompanyStats, getCriticalDevices, getAllCompanyDevices, searchCVEInIncibe } = require('../controllers/company-stats');

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

// NUEVA RUTA: Buscar CVE específico en INCIBE
// GET /api/company/:tenantId/cve/:cve/incibe
// Busca un CVE en la base de datos de INCIBE y devuelve la URL específica
router.get('/:tenantId/cve/:cve/incibe', searchCVEInIncibe);

// RUTAS DE ANÁLISIS (Seguridad Windows)
// GET /api/company/:tenantId/analysis/alerts
router.get('/:tenantId/analysis/alerts', async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    // Retornar datos simulados de alertas por ahora
    const alerts = {
      recent_alerts: [
        {
          id: 1,
          type: "Windows Defender",
          severity: "high",
          message: "Amenaza detectada y bloqueada",
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          device: "pc-axafone-kevin"
        },
        {
          id: 2,
          type: "Firewall",
          severity: "medium",
          message: "Conexión sospechosa bloqueada",
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          device: "pc-axafone-jcvalle"
        }
      ],
      total_alerts: 15,
      high_severity: 3,
      medium_severity: 7,
      low_severity: 5
    };
    
    res.json({ success: true, data: alerts });
  } catch (error) {
    console.error('Error obteniendo alertas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/company/:tenantId/analysis/vulnerabilities
router.get('/:tenantId/analysis/vulnerabilities', async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    // Retornar datos simulados de vulnerabilidades por ahora
    const vulnerabilities = {
      recent_vulnerabilities: [
        {
          cve: "CVE-2024-1234",
          severity: "critical",
          description: "Vulnerabilidad crítica en Windows Kernel",
          affected_devices: 3,
          status: "pending",
          discovered: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
        },
        {
          cve: "CVE-2024-5678",
          severity: "high",
          description: "Escalación de privilegios en Windows",
          affected_devices: 5,
          status: "in_progress",
          discovered: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString()
        }
      ],
      summary: {
        total: 25,
        critical: 4,
        high: 12,
        medium: 7,
        low: 2
      }
    };
    
    res.json({ success: true, data: vulnerabilities });
  } catch (error) {
    console.error('Error obteniendo vulnerabilidades:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;

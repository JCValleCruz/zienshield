const express = require('express');
const router = express.Router();
const { 
  getStoredVulnerabilities, 
  getCompanyVulnerabilitySummary,
  forceUpdateCompanyVulnerabilities 
} = require('../utils/vulnerabilityScanner');
const pool = require('../../config/database');

/**
 * GET /api/company/:tenantId/vulnerabilities/summary
 * Obtiene resumen de vulnerabilidades de la empresa
 */
router.get('/:tenantId/vulnerabilities/summary', async (req, res) => {
  try {
    const { tenantId } = req.params;

    // Buscar empresa
    const companyQuery = `
      SELECT id, name, wazuh_group 
      FROM companies 
      WHERE tenant_id = $1
    `;
    const companyResult = await pool.query(companyQuery, [tenantId]);

    if (companyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Empresa no encontrada"
      });
    }

    const company = companyResult.rows[0];
    const summary = await getCompanyVulnerabilitySummary(company.id);

    res.json({
      success: true,
      data: {
        company_name: company.name,
        ...summary
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo resumen de vulnerabilidades:', error);
    res.status(500).json({
      success: false,
      error: "Error interno del servidor"
    });
  }
});

/**
 * GET /api/company/:tenantId/vulnerabilities/agents
 * Obtiene vulnerabilidades detalladas por agente
 */
router.get('/:tenantId/vulnerabilities/agents', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { agent_id, include_details = 'false' } = req.query;

    // Buscar empresa
    const companyQuery = `
      SELECT id, name, wazuh_group 
      FROM companies 
      WHERE tenant_id = $1
    `;
    const companyResult = await pool.query(companyQuery, [tenantId]);

    if (companyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Empresa no encontrada"
      });
    }

    const company = companyResult.rows[0];
    const vulnerabilities = await getStoredVulnerabilities(company.id, agent_id);

    // Formatear datos para el frontend
    const formattedData = vulnerabilities.map(vuln => {
      const result = {
        agent_id: vuln.agent_id,
        agent_name: vuln.agent_name,
        counts: vuln.counts,
        last_scan: vuln.last_scan
      };

      // Incluir detalles de CVE si se solicita
      if (include_details === 'true') {
        result.vulnerabilities = vuln.vulnerabilities;
      }

      return result;
    });

    res.json({
      success: true,
      data: {
        company_name: company.name,
        agents: formattedData,
        total_agents: formattedData.length
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo vulnerabilidades por agente:', error);
    res.status(500).json({
      success: false,
      error: "Error interno del servidor"
    });
  }
});

/**
 * GET /api/company/:tenantId/vulnerabilities/cve-list
 * Obtiene lista de CVEs con detalles para mostrar en frontend
 */
router.get('/:tenantId/vulnerabilities/cve-list', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { severity, agent_id, limit = 50, offset = 0 } = req.query;

    // Buscar empresa
    const companyQuery = `
      SELECT id, name, wazuh_group 
      FROM companies 
      WHERE tenant_id = $1
    `;
    const companyResult = await pool.query(companyQuery, [tenantId]);

    if (companyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Empresa no encontrada"
      });
    }

    const company = companyResult.rows[0];
    const vulnerabilities = await getStoredVulnerabilities(company.id, agent_id);

    // Extraer y consolidar todas las CVEs
    const allCves = [];
    
    vulnerabilities.forEach(agentVuln => {
      const { vulnerabilities: vulnData, agent_id, agent_name } = agentVuln;
      
      // Procesar cada categoria de severidad
      ['critical', 'high', 'medium', 'low'].forEach(severityLevel => {
        if (vulnData[severityLevel]) {
          vulnData[severityLevel].forEach(cve => {
            // Verificar filtro de severidad
            if (severity && cve.severity !== severity) return;
            
            // Buscar si ya existe este CVE
            let existingCve = allCves.find(existing => existing.cve === cve.cve);
            
            if (existingCve) {
              // Agregar dispositivo afectado
              if (!existingCve.affected_devices.some(device => device.agent_id === agent_id)) {
                existingCve.affected_devices.push({
                  agent_id,
                  agent_name,
                  package_name: cve.package_name,
                  package_version: cve.package_version
                });
              }
            } else {
              // Crear nueva entrada de CVE
              allCves.push({
                cve: cve.cve,
                severity: cve.severity,
                cvss_score: cve.cvss_score,
                description: cve.description,
                affected_devices: [{
                  agent_id,
                  agent_name,
                  package_name: cve.package_name,
                  package_version: cve.package_version
                }],
                first_detected: cve.detected_at
              });
            }
          });
        }
      });
    });

    // Ordenar por severidad y score CVSS
    const severityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
    allCves.sort((a, b) => {
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.cvss_score - a.cvss_score;
    });

    // Aplicar paginación
    const paginatedCves = allCves.slice(offset, offset + parseInt(limit));

    res.json({
      success: true,
      data: {
        company_name: company.name,
        cves: paginatedCves,
        total_cves: allCves.length,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          has_next: (offset + parseInt(limit)) < allCves.length,
          has_prev: offset > 0
        }
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo lista de CVEs:', error);
    res.status(500).json({
      success: false,
      error: "Error interno del servidor"
    });
  }
});

/**
 * POST /api/company/:tenantId/vulnerabilities/force-update
 * Fuerza actualización inmediata de vulnerabilidades
 */
router.post('/:tenantId/vulnerabilities/force-update', async (req, res) => {
  try {
    const { tenantId } = req.params;

    // Buscar empresa
    const companyQuery = `
      SELECT id, name, wazuh_group 
      FROM companies 
      WHERE tenant_id = $1
    `;
    const companyResult = await pool.query(companyQuery, [tenantId]);

    if (companyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Empresa no encontrada"
      });
    }

    const company = companyResult.rows[0];
    
    // Importar función de actualización forzada
    const { forceUpdateCompanyVulnerabilities } = require('../services/vulnerabilityUpdateService');
    
    console.log(`🔄 Forzando actualización de vulnerabilidades para empresa: ${company.name}`);
    
    // Ejecutar actualización en segundo plano
    forceUpdateCompanyVulnerabilities(company.id)
      .then(success => {
        if (success) {
          console.log(`✅ Actualización forzada completada para: ${company.name}`);
        } else {
          console.log(`❌ Error en actualización forzada para: ${company.name}`);
        }
      })
      .catch(error => {
        console.error(`❌ Error en actualización forzada:`, error);
      });

    res.json({
      success: true,
      data: {
        message: "Actualización de vulnerabilidades iniciada",
        company_name: company.name,
        estimated_time: "2-5 minutos"
      }
    });

  } catch (error) {
    console.error('❌ Error forzando actualización:', error);
    res.status(500).json({
      success: false,
      error: "Error interno del servidor"
    });
  }
});

module.exports = router;
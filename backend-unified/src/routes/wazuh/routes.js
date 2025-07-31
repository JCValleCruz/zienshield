/**
 * RUTAS DE WAZUH UNIFICADAS
 *
 * Define todos los endpoints para gestión de Wazuh:
 * - Sincronización de empresas
 * - Monitoreo de agentes
 * - Gestión de grupos
 * - Health checks y diagnósticos
 */

const express = require('express');
const WazuhController = require('./controller');
const { createSmartRateLimit } = require('../../middleware/rateLimiting');
const { requireAuth, requireSuperAdmin, auditAuthenticatedAction } = require('../../middleware/auth');
const { getDatabaseService } = require('../../services/databaseService');

/**
 * Crear router de Wazuh con todas las rutas configuradas
 *
 * ¿Qué hace? Configura todas las rutas de Wazuh con middlewares apropiados
 * ¿Por qué? Organización modular y control de acceso granular
 * ¿Para qué? Gestión completa de integración Wazuh
 */
function createWazuhRouter() {
  console.log('🔧 Configurando rutas de Wazuh...');

  const router = express.Router();
  
  // Inicializar controlador con servicio de base de datos
  const databaseService = getDatabaseService();
  const wazuhController = new WazuhController(databaseService);

  // Rate limiting inteligente
  const smartRateLimit = createSmartRateLimit();

  // ====================================================================
  // RUTAS DE SINCRONIZACIÓN (REQUIEREN SUPER ADMIN)
  // ====================================================================

  /**
   * POST /api/wazuh/sync/companies - Sincronizar todas las empresas
   *
   * Operación crítica que sincroniza masivamente empresas con Wazuh
   * Requiere: Super admin
   * Auditoría: Crítica - todas las sincronizaciones se registran
   */
  router.post('/sync/companies',
    smartRateLimit,
    requireAuth,
    requireSuperAdmin,
    auditAuthenticatedAction,
    wazuhController.syncAllCompanies.bind(wazuhController)
  );

  /**
   * POST /api/wazuh/sync/company/:companyId - Sincronizar empresa específica
   *
   * Sincroniza una empresa individual con Wazuh
   * Requiere: Super admin
   * Auditoría: Normal
   */
  router.post('/sync/company/:companyId',
    smartRateLimit,
    requireAuth,
    requireSuperAdmin,
    auditAuthenticatedAction,
    wazuhController.syncCompany.bind(wazuhController)
  );

  /**
   * GET /api/wazuh/sync/status - Estado de sincronización
   *
   * Muestra estadísticas de sincronización del sistema
   * Requiere: Super admin
   */
  router.get('/sync/status',
    requireAuth,
    requireSuperAdmin,
    wazuhController.getSyncStatus.bind(wazuhController)
  );

  // ====================================================================
  // RUTAS DE MONITOREO (REQUIEREN AUTENTICACIÓN)
  // ====================================================================

  /**
   * GET /api/wazuh/agents/:tenantId - Obtener agentes de empresa
   *
   * Lista agentes Wazuh de una empresa específica
   * Requiere: Autorización (super admin o admin de la empresa)
   * Multi-tenant: Validación automática de acceso
   */
  router.get('/agents/:tenantId',
    requireAuth,
    // TODO: Añadir middleware requireCompanyAccess('tenantId') cuando esté implementado
    wazuhController.getCompanyAgents.bind(wazuhController)
  );


  /**
   * GET /api/wazuh/groups - Estadísticas de grupos
   *
   * Lista todos los grupos Wazuh del sistema
   * Requiere: Super admin (información sensible de múltiples empresas)
   */
  router.get('/groups',
    requireAuth,
    requireSuperAdmin,
    wazuhController.getGroupsStats.bind(wazuhController)
  );

  // ====================================================================
  // RUTAS DE DIAGNÓSTICO Y UTILIDAD
  // ====================================================================

  /**
   * GET /api/wazuh/health - Health check de Wazuh
   *
   * Verifica conectividad y estado del servicio Wazuh
   * Público: Útil para monitoreo automático
   */
  router.get('/health',
    wazuhController.healthCheck.bind(wazuhController)
  );

  /**
   * POST /api/wazuh/cache/clear - Limpiar cache de tokens
   *
   * Debugging: Limpia cache de autenticación Wazuh
   * Requiere: Super admin
   * Auditoría: Importante para trazabilidad
   */
  router.post('/cache/clear',
    smartRateLimit,
    requireAuth,
    requireSuperAdmin,
    auditAuthenticatedAction,
    wazuhController.clearCache.bind(wazuhController)
  );

  // ====================================================================
  // RUTA DE INFORMACIÓN DEL MÓDULO
  // ====================================================================

  /**
   * GET /api/wazuh/info - Información del módulo Wazuh
   *
   * Metadatos y capacidades del módulo
   * Útil para verificar que el módulo está funcionando
   */
  router.get('/info', (req, res) => {
    console.log('ℹ️ Información del módulo Wazuh solicitada');

    res.json({
      module: 'wazuh',
      version: '1.0.0',
      status: 'active',
      features: {
        company_sync: 'enabled',
        agent_monitoring: 'enabled',
        group_management: 'enabled',
        health_checks: 'enabled',
        token_caching: 'enabled',
        automatic_retry: 'enabled'
      },
      endpoints: {
        sync: {
          'POST /api/wazuh/sync/companies': 'Sincronizar todas las empresas',
          'POST /api/wazuh/sync/company/:id': 'Sincronizar empresa específica',
          'GET /api/wazuh/sync/status': 'Estado de sincronización'
        },
        monitoring: {
          'GET /api/wazuh/agents/:tenantId': 'Agentes de empresa',
          'GET /api/wazuh/groups': 'Estadísticas de grupos'
        },
        diagnostics: {
          'GET /api/wazuh/health': 'Health check',
          'POST /api/wazuh/cache/clear': 'Limpiar cache',
          'GET /api/wazuh/info': 'Información del módulo'
        }
      },
      security: {
        rate_limiting: 'enabled',
        authentication_required: 'most_endpoints',
        role_based_access: 'enabled',
        audit_logging: 'enabled',
        token_caching: 'enabled'
      },
      configuration: {
        wazuh_api_url: process.env.WAZUH_API_URL || 'not_configured',
        ssl_verify: process.env.WAZUH_SSL_VERIFY || 'false',
        timeout: process.env.WAZUH_TIMEOUT || '30000ms',
        retry_attempts: process.env.WAZUH_RETRY_ATTEMPTS || '3',
        cache_enabled: process.env.WAZUH_CACHE_ENABLED || 'true'
      },
      timestamp: new Date().toISOString()
    });
  });

  console.log('✅ Rutas de Wazuh configuradas correctamente');
  console.log('📊 Rutas disponibles:');
  console.log('   POST   /api/wazuh/sync/companies          - Sincronizar todas las empresas (super admin)');
  console.log('   POST   /api/wazuh/sync/company/:id        - Sincronizar empresa específica (super admin)');
  console.log('   GET    /api/wazuh/sync/status             - Estado de sincronización (super admin)');
  console.log('   GET    /api/wazuh/agents/:tenantId        - Agentes de empresa (autenticado)');
  console.log('   GET    /api/wazuh/groups                  - Estadísticas de grupos (super admin)');
  console.log('   GET    /api/wazuh/health                  - Health check (público)');
  console.log('   POST   /api/wazuh/cache/clear             - Limpiar cache (super admin)');
  console.log('   GET    /api/wazuh/info                   - Información del módulo (público)');

  return router;
}

module.exports = {
  createWazuhRouter
};
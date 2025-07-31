/**
 * CONTROLADOR DE WAZUH UNIFICADO
 *
 * Maneja todas las operaciones relacionadas con Wazuh:
 * - Sincronización de empresas
 * - Gestión de grupos
 * - Monitoreo de agentes
 * - Health checks
 */

const WazuhService = require('../../services/wazuhService');
const { createError, ErrorTypes } = require('../../middleware/errorHandler');

/**
 * Controlador principal para operaciones Wazuh
 *
 * ¿Qué hace? Expone endpoints para gestión de Wazuh
 * ¿Por qué? Separación de responsabilidades API/lógica
 * ¿Para qué? Endpoints consistentes y documentados
 */
class WazuhController {
  constructor(databaseService) {
    this.db = databaseService;
    this.wazuhService = new WazuhService(databaseService);
    console.log('🔧 WazuhController inicializado');
  }

  /**
   * POST /api/wazuh/sync/companies - Sincronizar todas las empresas
   *
   * ¿Qué hace? Sincroniza masivamente empresas con Wazuh
   * ¿Por qué? Operación de mantenimiento automática
   * ¿Para qué? Asegurar que todas las empresas tienen grupo
   */
  async syncAllCompanies(req, res, next) {
    try {
      console.log('🔄 Inicio sincronización masiva de empresas con Wazuh');
      console.log(`   Solicitado por: ${req.user?.email || 'Sistema'}`);

      const startTime = Date.now();
      const syncResults = await this.wazuhService.syncAllCompanies();
      const executionTime = Date.now() - startTime;

      // Log de auditoría para operación crítica
      console.log('📝 AUDITORÍA - Sincronización Wazuh:', {
        timestamp: new Date().toISOString(),
        user: req.user?.email || 'Sistema',
        operation: 'SYNC_ALL_COMPANIES',
        totalCompanies: syncResults.totalCompanies,
        syncedCompanies: syncResults.syncedCompanies,
        errors: syncResults.errors.length,
        executionTimeMs: executionTime,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        message: 'Sincronización con Wazuh completada',
        data: {
          totalCompanies: syncResults.totalCompanies,
          syncedCompanies: syncResults.syncedCompanies,
          failedCompanies: syncResults.errors.length,
          executionTimeMs: executionTime,
          errors: syncResults.errors
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error en sincronización masiva:', error.message);
      next(createError(
        'Error ejecutando sincronización con Wazuh',
        500,
        ErrorTypes.EXTERNAL_SERVICE,
        { operation: 'sync_all_companies', error: error.message }
      ));
    }
  }

  /**
   * POST /api/wazuh/sync/company/:companyId - Sincronizar empresa específica
   *
   * ¿Qué hace? Sincroniza una empresa individual con Wazuh
   * ¿Por qué? Control granular de sincronización
   * ¿Para qué? Corrección de empresas específicas
   */
  async syncCompany(req, res, next) {
    try {
      const { companyId } = req.params;
      console.log(`🔄 Sincronizando empresa ${companyId} con Wazuh`);

      // Obtener información de la empresa
      const companyResult = await this.db.query(`
        SELECT id, tenant_id, name, wazuh_group 
        FROM companies 
        WHERE id = $1
      `, [companyId]);

      if (companyResult.rows.length === 0) {
        return next(createError(
          `Empresa con ID ${companyId} no encontrada`,
          404,
          ErrorTypes.NOT_FOUND,
          { companyId }
        ));
      }

      const company = companyResult.rows[0];

      if (company.wazuh_group) {
        return res.json({
          success: true,
          message: `Empresa ${company.name} ya está sincronizada`,
          data: {
            companyId: company.id,
            companyName: company.name,
            tenantId: company.tenant_id,
            wazuhGroup: company.wazuh_group,
            alreadySynced: true
          },
          timestamp: new Date().toISOString()
        });
      }

      // Sincronizar empresa
      const syncResult = await this.wazuhService.syncCompanyToWazuh(
        company.id,
        company.tenant_id,
        company.name
      );

      console.log(`✅ Empresa ${company.name} sincronizada exitosamente`);

      res.json({
        success: true,
        message: `Empresa ${company.name} sincronizada con Wazuh`,
        data: syncResult,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error(`❌ Error sincronizando empresa ${req.params.companyId}:`, error.message);
      next(error);
    }
  }

  /**
   * GET /api/wazuh/agents/:tenantId - Obtener agentes de empresa
   *
   * ¿Qué hace? Lista agentes Wazuh de una empresa específica
   * ¿Por qué? Monitoreo multi-tenant
   * ¿Para qué? Dashboard de empresa y estadísticas
   */
  async getCompanyAgents(req, res, next) {
    try {
      const { tenantId } = req.params;
      console.log(`📡 Obteniendo agentes para tenant: ${tenantId}`);

      // Verificar que la empresa existe y obtener su grupo Wazuh
      const companyResult = await this.db.query(`
        SELECT id, name, wazuh_group, tenant_id 
        FROM companies 
        WHERE tenant_id = $1
      `, [tenantId]);

      if (companyResult.rows.length === 0) {
        return next(createError(
          `Empresa con tenant_id ${tenantId} no encontrada`,
          404,
          ErrorTypes.NOT_FOUND,
          { tenantId }
        ));
      }

      const company = companyResult.rows[0];

      if (!company.wazuh_group) {
        return res.json({
          success: true,
          message: `Empresa ${company.name} no tiene grupo Wazuh configurado`,
          data: {
            companyId: company.id,
            companyName: company.name,
            tenantId: company.tenant_id,
            agents: [],
            needsSync: true
          },
          timestamp: new Date().toISOString()
        });
      }

      // Obtener agentes del grupo
      const agents = await this.wazuhService.getCompanyAgents(company.wazuh_group);

      res.json({
        success: true,
        data: {
          companyId: company.id,
          companyName: company.name,
          tenantId: company.tenant_id,
          wazuhGroup: company.wazuh_group,
          agents: agents,
          agentCount: agents.length
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error(`❌ Error obteniendo agentes para ${req.params.tenantId}:`, error.message);
      next(error);
    }
  }

  /**
   * GET /api/wazuh/groups - Obtener estadísticas de grupos
   *
   * ¿Qué hace? Lista todos los grupos Wazuh del sistema
   * ¿Por qué? Monitoreo global de grupos
   * ¿Para qué? Dashboard administrativo y debugging
   */
  async getGroupsStats(req, res, next) {
    try {
      console.log('📊 Obteniendo estadísticas de grupos Wazuh');

      const groups = await this.wazuhService.getGroupsStats();

      // Obtener información de empresas para correlacionar
      const companiesResult = await this.db.query(`
        SELECT id, name, tenant_id, wazuh_group, created_at
        FROM companies 
        WHERE wazuh_group IS NOT NULL
      `);

      const companiesMap = {};
      companiesResult.rows.forEach(company => {
        companiesMap[company.wazuh_group] = {
          id: company.id,
          name: company.name,
          tenant_id: company.tenant_id,
          created_at: company.created_at
        };
      });

      // Enriquecer datos de grupos con información de empresas
      const enrichedGroups = groups.map(group => ({
        ...group,
        company: companiesMap[group.name] || null,
        isCompanyGroup: group.name.startsWith('zs_')
      }));

      res.json({
        success: true,
        data: {
          totalGroups: groups.length,
          companyGroups: enrichedGroups.filter(g => g.isCompanyGroup).length,
          systemGroups: enrichedGroups.filter(g => !g.isCompanyGroup).length,
          groups: enrichedGroups
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error obteniendo estadísticas de grupos:', error.message);
      next(error);
    }
  }

  /**
   * GET /api/wazuh/health - Verificar estado de Wazuh
   *
   * ¿Qué hace? Health check del servicio Wazuh
   * ¿Por qué? Monitoreo de servicios críticos
   * ¿Para qué? Alertas y diagnósticos automáticos
   */
  async healthCheck(req, res, next) {
    try {
      console.log('❤️ Verificando estado de Wazuh');

      const healthStatus = await this.wazuhService.healthCheck();

      const statusCode = healthStatus.status === 'healthy' ? 200 : 503;

      res.status(statusCode).json({
        service: 'wazuh',
        ...healthStatus
      });

    } catch (error) {
      console.error('❌ Error en health check de Wazuh:', error.message);
      
      res.status(503).json({
        service: 'wazuh',
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }


  /**
   * POST /api/wazuh/cache/clear - Limpiar cache de tokens
   *
   * ¿Qué hace? Limpia cache de autenticación Wazuh
   * ¿Por qué? Debugging y resolución de problemas
   * ¿Para qué? Forzar nueva autenticación
   */
  async clearCache(req, res, next) {
    try {
      console.log('🧹 Limpiando cache de Wazuh');
      console.log(`   Solicitado por: ${req.user?.email}`);

      this.wazuhService.clearTokenCache();

      // Log de auditoría
      console.log('📝 AUDITORÍA - Cache limpiado:', {
        timestamp: new Date().toISOString(),
        user: req.user?.email,
        operation: 'CLEAR_WAZUH_CACHE',
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Cache de Wazuh limpiado exitosamente',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error limpiando cache:', error.message);
      next(createError(
        'Error limpiando cache de Wazuh',
        500,
        ErrorTypes.INTERNAL,
        { operation: 'clear_cache', error: error.message }
      ));
    }
  }

  /**
   * GET /api/wazuh/sync/status - Estado de sincronización
   *
   * ¿Qué hace? Muestra estado actual de sincronización
   * ¿Por qué? Monitoreo de operaciones de sincronización
   * ¿Para qué? Dashboard de estado del sistema
   */
  async getSyncStatus(req, res, next) {
    try {
      console.log('📊 Obteniendo estado de sincronización');

      // Estadísticas de empresas
      const statsResult = await this.db.query(`
        SELECT 
          COUNT(*) as total_companies,
          COUNT(wazuh_group) as synced_companies,
          COUNT(*) - COUNT(wazuh_group) as pending_companies
        FROM companies
      `);

      const stats = statsResult.rows[0];

      // Empresas pendientes de sincronización
      const pendingResult = await this.db.query(`
        SELECT id, name, tenant_id, created_at
        FROM companies 
        WHERE wazuh_group IS NULL
        ORDER BY created_at DESC
        LIMIT 10
      `);

      res.json({
        success: true,
        data: {
          summary: {
            totalCompanies: parseInt(stats.total_companies),
            syncedCompanies: parseInt(stats.synced_companies),
            pendingCompanies: parseInt(stats.pending_companies),
            syncPercentage: Math.round((stats.synced_companies / stats.total_companies) * 100)
          },
          pendingCompanies: pendingResult.rows,
          lastUpdate: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error obteniendo estado de sincronización:', error.message);
      next(error);
    }
  }
}

module.exports = WazuhController;
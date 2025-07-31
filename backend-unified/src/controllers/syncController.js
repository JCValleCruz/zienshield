const WazuhController = require('../routes/wazuh/controller');
const { getDatabaseService } = require('../services/databaseService');

// Controlador de compatibilidad para endpoints de sync
class SyncController {
  constructor() {
    const databaseService = getDatabaseService();
    this.wazuhController = new WazuhController(databaseService);
  }

  /**
   * POST /api/sync/companies-to-wazuh - Alias para sincronizar empresas
   * 
   * ¿Qué hace? Wrapper directo sin validaciones extra
   * ¿Por qué? Mantener compatibilidad con frontend existente
   * ¿Para qué? Evitar cambios en el frontend
   */
  async syncCompaniesToWazuh(req, res, next) {
    try {
      console.log('🔄 Sincronización solicitada vía endpoint de compatibilidad');
      console.log('🔍 DEBUG: req.body =', JSON.stringify(req.body));
      console.log('🔍 DEBUG: this.wazuhController =', !!this.wazuhController);
      console.log('🔍 DEBUG: this.wazuhController.wazuhService =', !!this.wazuhController?.wazuhService);
      
      // Llamar directamente al WazuhService sin pasar por validaciones extra
      const startTime = Date.now();
      console.log('🔍 DEBUG: About to call syncAllCompanies...');
      const syncResults = await this.wazuhController.wazuhService.syncAllCompanies();
      console.log('🔍 DEBUG: syncResults =', syncResults);
      const executionTime = Date.now() - startTime;

      // Log de auditoría para operación crítica
      console.log('📝 AUDITORÍA - Sincronización Wazuh (compatibilidad):', {
        timestamp: new Date().toISOString(),
        user: req.user?.email || 'Sistema',
        operation: 'SYNC_ALL_COMPANIES_COMPAT',
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
      console.error('❌ Error en sync de compatibilidad:', error);
      
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message,
        details: 'Error en endpoint de sincronización de compatibilidad'
      });
    }
  }
}

// Crear instancia singleton
let syncControllerInstance = null;

function getSyncController() {
  if (!syncControllerInstance) {
    syncControllerInstance = new SyncController();
  }
  return syncControllerInstance;
}

module.exports = {
  SyncController,
  getSyncController
};
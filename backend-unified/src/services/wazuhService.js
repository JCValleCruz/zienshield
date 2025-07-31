/**
 * SERVICIO DE WAZUH UNIFICADO
 *
 * Consolida toda la funcionalidad de integración con Wazuh:
 * - Autenticación con API Wazuh
 * - Gestión de grupos para empresas
 * - Sincronización automática
 * - Cache inteligente de tokens
 * - Gestión de agentes y vulnerabilidades
 */

const { execSync } = require('child_process');
const { get } = require('../config/environment');
const { createError, ErrorTypes } = require('../middleware/errorHandler');

/**
 * Clase principal del servicio Wazuh
 *
 * ¿Qué hace? Centraliza toda la interacción con Wazuh
 * ¿Por qué? Elimina duplicación y mejora mantenibilidad
 * ¿Para qué? Gestión consistente de agentes y grupos
 */
class WazuhService {
  constructor(databaseService) {
    this.db = databaseService;
    this.tokenCache = {
      token: null,
      expires: null
    };
    
    // Configuración desde variables de entorno
    this.config = {
      apiUrl: get('wazuh.apiUrl'),
      username: get('wazuh.username'),
      password: get('wazuh.password'),
      sslVerify: get('wazuh.sslVerify'),
      timeout: get('wazuh.timeout'),
      retryAttempts: get('wazuh.retryAttempts'),
      rateLimit: get('wazuh.rateLimit')
    };

    console.log('🔧 WazuhService inicializado');
    console.log(`   API URL: ${this.config.apiUrl}`);
    console.log(`   SSL Verify: ${this.config.sslVerify}`);
  }

  /**
   * Obtener token de autenticación Wazuh con cache inteligente
   *
   * ¿Qué hace? Gestiona autenticación con cache automático
   * ¿Por qué? Evita llamadas innecesarias a la API
   * ¿Para qué? Mejor rendimiento y menos carga en Wazuh
   */
  async getAuthToken() {
    try {
      // Verificar cache válido
      if (this.tokenCache.token && 
          this.tokenCache.expires && 
          new Date() < this.tokenCache.expires) {
        return this.tokenCache.token;
      }

      console.log('🔐 Obteniendo nuevo token de Wazuh...');

      const auth = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
      
      const response = await fetch(`${this.config.apiUrl}/security/user/authenticate`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        timeout: this.config.timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data || !data.data || !data.data.token) {
        throw new Error('Respuesta inválida de Wazuh API');
      }

      // Cache token con 15 minutos de validez
      this.tokenCache.token = data.data.token;
      this.tokenCache.expires = new Date(Date.now() + 15 * 60 * 1000);

      console.log('✅ Token de Wazuh obtenido exitosamente');
      return this.tokenCache.token;

    } catch (error) {
      console.error('❌ Error obteniendo token de Wazuh:', error.message);
      this.tokenCache.token = null;
      this.tokenCache.expires = null;
      throw createError(
        'Error conectando con Wazuh API',
        503,
        ErrorTypes.EXTERNAL_SERVICE,
        { service: 'wazuh', operation: 'authenticate', error: error.message }
      );
    }
  }

  /**
   * Realizar llamada a API Wazuh con reintentos automáticos
   *
   * ¿Qué hace? Wrapper para todas las llamadas a Wazuh API
   * ¿Por qué? Manejo consistente de errores y reintentos
   * ¿Para qué? Robustez en la comunicación con Wazuh
   */
  async apiCall(endpoint, method = 'GET', body = null) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const token = await this.getAuthToken();
        
        const options = {
          method: method,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: this.config.timeout
        };

        if (body && method !== 'GET') {
          options.body = JSON.stringify(body);
        }

        const response = await fetch(`${this.config.apiUrl}${endpoint}`, options);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data;

      } catch (error) {
        lastError = error;
        console.warn(`⚠️ Intento ${attempt}/${this.config.retryAttempts} falló:`, error.message);
        
        if (attempt < this.config.retryAttempts) {
          // Esperar antes del siguiente intento (backoff exponencial)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    // Todos los intentos fallaron
    throw createError(
      `Error en API Wazuh después de ${this.config.retryAttempts} intentos`,
      503,
      ErrorTypes.EXTERNAL_SERVICE,
      { 
        service: 'wazuh', 
        endpoint: endpoint, 
        method: method, 
        lastError: lastError.message 
      }
    );
  }

  /**
   * Crear grupo Wazuh para empresa
   *
   * ¿Qué hace? Crea grupos de agentes para empresas específicas
   * ¿Por qué? Organización multi-tenant de agentes
   * ¿Para qué? Separación de datos entre empresas
   */
  async createCompanyGroup(tenantId, companyName) {
    try {
      const groupName = `zs_${tenantId}`;
      console.log(`🏗️ Creando grupo Wazuh: ${groupName} para ${companyName}`);

      // Usar comando local de Wazuh para crear grupo
      const command = `sudo /var/ossec/bin/agent_groups -a -g ${groupName} -q`;
      
      try {
        const output = execSync(command, { 
          encoding: 'utf8',
          timeout: 10000 // 10 segundos timeout
        });
        
        console.log(`✅ Grupo ${groupName} creado exitosamente`);
        return { success: true, groupName: groupName };
        
      } catch (execError) {
        // Verificar si el error es porque el grupo ya existe
        if (execError.message.includes('already exists') || 
            execError.stderr && execError.stderr.includes('already exists')) {
          console.log(`ℹ️ Grupo ${groupName} ya existe`);
          return { success: true, groupName: groupName, existed: true };
        } else {
          throw execError;
        }
      }

    } catch (error) {
      console.error(`❌ Error creando grupo para ${companyName}:`, error.message);
      throw createError(
        `Error creando grupo Wazuh para empresa`,
        500,
        ErrorTypes.EXTERNAL_SERVICE,
        { 
          service: 'wazuh', 
          operation: 'create_group', 
          tenantId: tenantId,
          error: error.message 
        }
      );
    }
  }

  /**
   * Sincronizar empresa con Wazuh
   *
   * ¿Qué hace? Crea grupo y actualiza BD si es necesario
   * ¿Por qué? Mantener sincronización entre BD y Wazuh
   * ¿Para qué? Consistencia de datos multi-tenant
   */
  async syncCompanyToWazuh(companyId, tenantId, companyName) {
    try {
      console.log(`🔄 Sincronizando empresa ${companyName} con Wazuh...`);

      // 1. Crear grupo en Wazuh
      const groupResult = await this.createCompanyGroup(tenantId, companyName);
      
      if (!groupResult.success) {
        throw new Error('Error creando grupo en Wazuh');
      }

      // 2. Actualizar BD con nombre del grupo
      await this.db.query(
        'UPDATE companies SET wazuh_group = $1 WHERE id = $2',
        [groupResult.groupName, companyId]
      );

      console.log(`✅ Empresa ${companyName} sincronizada con Wazuh`);
      console.log(`   Grupo: ${groupResult.groupName}`);
      console.log(`   Estado: ${groupResult.existed ? 'Ya existía' : 'Creado nuevo'}`);

      return {
        success: true,
        companyId: companyId,
        tenantId: tenantId,
        companyName: companyName,
        wazuhGroup: groupResult.groupName,
        isNewGroup: !groupResult.existed
      };

    } catch (error) {
      console.error(`❌ Error sincronizando empresa ${companyName}:`, error.message);
      throw error;
    }
  }

  /**
   * Sincronizar todas las empresas sin grupo Wazuh
   *
   * ¿Qué hace? Sincroniza masivamente todas las empresas pendientes
   * ¿Por qué? Operación de mantenimiento automática
   * ¿Para qué? Asegurar que todas las empresas tienen grupo
   */
  async syncAllCompanies() {
    try {
      console.log('🌐 Iniciando sincronización masiva con Wazuh...');

      // Obtener empresas sin grupo de Wazuh
      const result = await this.db.query(`
        SELECT id, tenant_id, name, wazuh_group 
        FROM companies 
        WHERE wazuh_group IS NULL
      `);

      if (result.rows.length === 0) {
        console.log('✅ Todas las empresas ya están sincronizadas');
        return {
          success: true,
          totalCompanies: 0,
          syncedCompanies: 0,
          errors: []
        };
      }

      console.log(`📋 Encontradas ${result.rows.length} empresas para sincronizar`);

      const syncResults = {
        success: true,
        totalCompanies: result.rows.length,
        syncedCompanies: 0,
        errors: []
      };

      // Procesar cada empresa
      for (const company of result.rows) {
        try {
          await this.syncCompanyToWazuh(
            company.id, 
            company.tenant_id, 
            company.name
          );
          
          syncResults.syncedCompanies++;
          
          // Pequeña pausa entre empresas para no sobrecargar
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.error(`❌ Error sincronizando ${company.name}:`, error.message);
          syncResults.errors.push({
            companyId: company.id,
            companyName: company.name,
            error: error.message
          });
        }
      }

      // Log del resumen final
      console.log('🎉 Sincronización masiva completada:');
      console.log(`   Total empresas: ${syncResults.totalCompanies}`);
      console.log(`   Sincronizadas: ${syncResults.syncedCompanies}`);
      console.log(`   Errores: ${syncResults.errors.length}`);

      if (syncResults.errors.length > 0) {
        console.log('   Empresas con errores:');
        syncResults.errors.forEach(error => {
          console.log(`     - ${error.companyName}: ${error.error}`);
        });
      }

      return syncResults;

    } catch (error) {
      console.error('❌ Error en sincronización masiva:', error.message);
      throw createError(
        'Error en sincronización masiva con Wazuh',
        500,
        ErrorTypes.INTERNAL,
        { operation: 'sync_all_companies', error: error.message }
      );
    }
  }

  /**
   * Obtener agentes de una empresa específica
   *
   * ¿Qué hace? Lista agentes asociados a un grupo de empresa
   * ¿Por qué? Gestión multi-tenant de agentes
   * ¿Para qué? Monitoreo y estadísticas por empresa
   */
  async getCompanyAgents(wazuhGroup) {
    try {
      console.log(`📡 Obteniendo agentes del grupo: ${wazuhGroup}`);

      // Obtener todos los agentes
      const response = await this.apiCall('/agents?limit=1000');
      
      if (!response || !response.data || !response.data.affected_items) {
        return [];
      }

      // Filtrar agentes por grupo de la empresa
      const companyAgents = response.data.affected_items.filter(agent => {
        return agent.group && agent.group.includes(wazuhGroup);
      });

      console.log(`📊 Encontrados ${companyAgents.length} agentes para ${wazuhGroup}`);
      return companyAgents;

    } catch (error) {
      console.error(`❌ Error obteniendo agentes de ${wazuhGroup}:`, error.message);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de grupos Wazuh
   *
   * ¿Qué hace? Información de todos los grupos del sistema
   * ¿Por qué? Monitoreo y debugging
   * ¿Para qué? Dashboard administrativo
   */
  async getGroupsStats() {
    try {
      console.log('📊 Obteniendo estadísticas de grupos Wazuh...');

      const response = await this.apiCall('/groups');
      
      if (!response || !response.data || !response.data.affected_items) {
        return [];
      }

      return response.data.affected_items;

    } catch (error) {
      console.error('❌ Error obteniendo estadísticas de grupos:', error.message);
      throw error;
    }
  }

  /**
   * Health check del servicio Wazuh
   *
   * ¿Qué hace? Verifica conectividad y estado de Wazuh
   * ¿Por qué? Monitoreo de servicios externos
   * ¿Para qué? Alertas y diagnósticos
   */
  async healthCheck() {
    try {
      console.log('❤️ Verificando salud del servicio Wazuh...');

      const startTime = Date.now();
      const response = await this.apiCall('/');
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime: responseTime,
        apiUrl: this.config.apiUrl,
        tokenCached: !!this.tokenCache.token,
        tokenExpires: this.tokenCache.expires ? this.tokenCache.expires.toISOString() : null,
        wazuhVersion: response?.data?.api_version || 'unknown',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Health check de Wazuh falló:', error.message);
      return {
        status: 'unhealthy',
        error: error.message,
        apiUrl: this.config.apiUrl,
        timestamp: new Date().toISOString()
      };
    }
  }


  /**
   * Limpiar cache de tokens (útil para testing)
   */
  clearTokenCache() {
    console.log('🧹 Limpiando cache de tokens Wazuh');
    this.tokenCache.token = null;
    this.tokenCache.expires = null;
  }
}

module.exports = WazuhService;
// Archivo: /home/gacel/zienshield/api/src/wazuh-sync.js
const axios = require('axios');

class WazuhSyncService {
  constructor() {
    this.baseURL = 'https://localhost:55000';
    this.username = 'wazuh';
    this.password = "wazuh";
    this.token = null;
    this.tokenExpiry = null;
  }

  // Obtener token de autenticación
  async getAuthToken() {
    try {
      // Si tenemos un token válido, lo usamos
      if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        return this.token;
      }

      console.log('🔐 Obteniendo token de Wazuh...');
      
      const response = await axios.post(`${this.baseURL}/security/user/authenticate`, {}, {
        auth: {
          username: this.username,
          password: this.password
        },
        httpsAgent: new (require('https').Agent)({
          rejectUnauthorized: false
        })
      });

      if (response.data && response.data.data && response.data.data.token) {
        this.token = response.data.data.token;
        this.tokenExpiry = Date.now() + (15 * 60 * 1000); // 15 minutos
        console.log('✅ Token de Wazuh obtenido exitosamente');
        return this.token;
      }

      throw new Error('No se pudo obtener el token de Wazuh');
    } catch (error) {
      console.error('❌ Error obteniendo token de Wazuh:', error.message);
      throw error;
    }
  }

  // Realizar llamada autenticada a Wazuh
  async authenticatedRequest(method, endpoint, data = null) {
    try {
      const token = await this.getAuthToken();
      
      const config = {
        method,
        url: `${this.baseURL}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        httpsAgent: new (require('https').Agent)({
          rejectUnauthorized: false
        })
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error(`❌ Error en llamada a Wazuh ${endpoint}:`, error.message);
      throw error;
    }
  }

  // ========== MÉTODOS EXISTENTES ==========

  // Obtener grupos existentes en Wazuh
  async getExistingGroups() {
    try {
      const response = await this.authenticatedRequest('GET', '/groups');
      return response.data?.affected_items || [];
    } catch (error) {
      console.error('❌ Error obteniendo grupos de Wazuh:', error);
      return [];
    }
  }

  // Crear grupo en Wazuh
  async createGroup(groupName) {
    try {
      console.log(`📁 Creando grupo en Wazuh: ${groupName}`);
      
      const response = await this.authenticatedRequest('POST', '/groups', {
        group_id: groupName
      });

      console.log(`✅ Grupo ${groupName} creado exitosamente en Wazuh`);
      return response;
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log(`⚠️  Grupo ${groupName} ya existe en Wazuh`);
        return { success: true, message: 'Grupo ya existe' };
      }
      console.error(`❌ Error creando grupo ${groupName}:`, error.message);
      throw error;
    }
  }

  // Sincronizar empresas con Wazuh
  async syncCompaniesWithWazuh(companies) {
    try {
      console.log('🔄 Iniciando sincronización con Wazuh...');
      
      // Obtener grupos existentes
      const existingGroups = await this.getExistingGroups();
      const existingGroupNames = existingGroups.map(group => group.name);
      
      console.log(`📋 Grupos existentes en Wazuh: ${existingGroupNames.join(', ')}`);

      const results = [];

      for (const company of companies) {
        try {
          // Generar nombre de grupo basado en el nombre de la empresa
          const groupName = this.generateGroupName(company.name);
          
          if (existingGroupNames.includes(groupName)) {
            console.log(`✅ Grupo ${groupName} ya existe para empresa ${company.name}`);
            results.push({
              company: company.name,
              group: groupName,
              status: 'exists',
              message: 'Grupo ya existe'
            });
          } else {
            // Crear grupo nuevo
            await this.createGroup(groupName);
            results.push({
              company: company.name,
              group: groupName,
              status: 'created',
              message: 'Grupo creado exitosamente'
            });
          }
        } catch (error) {
          console.error(`❌ Error sincronizando empresa ${company.name}:`, error.message);
          results.push({
            company: company.name,
            group: this.generateGroupName(company.name),
            status: 'error',
            message: error.message
          });
        }
      }

      console.log('✅ Sincronización completada');
      return results;
    } catch (error) {
      console.error('❌ Error en sincronización:', error);
      throw error;
    }
  }

  // Generar nombre de grupo basado en el nombre de la empresa
  generateGroupName(companyName) {
    return companyName
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .substring(0, 50);
  }

  // Verificar conexión con Wazuh
  async testConnection() {
    try {
      const response = await this.authenticatedRequest('GET', '/manager/info');
      return {
        success: true,
        version: response.data?.version || 'unknown',
        status: 'connected'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: 'disconnected'
      };
    }
  }

  // ========== NUEVOS MÉTODOS PARA AGENTES Y ALERTAS ==========

  // Obtener todos los agentes
  async getAllAgents() {
    try {
      console.log('📊 Obteniendo lista de agentes desde Wazuh...');
      
      const response = await this.authenticatedRequest('GET', '/agents');
      const agents = response.data?.affected_items || [];
      
      console.log(`✅ ${agents.length} agentes encontrados en Wazuh`);
      return agents;
    } catch (error) {
      console.error('❌ Error obteniendo agentes de Wazuh:', error);
      return [];
    }
  }

  // Obtener resumen de agentes
  async getAgentsSummary() {
    try {
      const agents = await this.getAllAgents();
      
      const summary = {
        total: agents.length,
        active: agents.filter(agent => agent.status === 'active').length,
        disconnected: agents.filter(agent => agent.status === 'disconnected').length,
        pending: agents.filter(agent => agent.status === 'pending').length,
        never_connected: agents.filter(agent => agent.status === 'never_connected').length
      };

      console.log('📊 Resumen de agentes:', summary);
      return summary;
    } catch (error) {
      console.error('❌ Error obteniendo resumen de agentes:', error);
      return {
        total: 0,
        active: 0,
        disconnected: 0,
        pending: 0,
        never_connected: 0
      };
    }
  }

  // Obtener alertas recientes (último mes)
  async getRecentAlerts() {
    try {
      console.log('🚨 Obteniendo alertas recientes desde Wazuh...');
      
      // Calcular fecha de hace 30 días
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const dateFrom = thirtyDaysAgo.toISOString().split('T')[0];
      
      // Consultar alertas con filtro de fecha
      const response = await this.authenticatedRequest('GET', `/alerts?date_from=${dateFrom}&limit=10000`);
      const alerts = response.data?.affected_items || [];
      
      // Categorizar alertas por nivel de severidad
      const alertsSummary = {
        total: alerts.length,
        critical: alerts.filter(alert => alert.rule?.level >= 12).length,
        high: alerts.filter(alert => alert.rule?.level >= 8 && alert.rule?.level < 12).length,
        medium: alerts.filter(alert => alert.rule?.level >= 4 && alert.rule?.level < 8).length,
        low: alerts.filter(alert => alert.rule?.level < 4).length
      };

      console.log('🚨 Resumen de alertas (30 días):', alertsSummary);
      return alertsSummary;
    } catch (error) {
      console.error('❌ Error obteniendo alertas de Wazuh:', error);
      return {
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      };
    }
  }

  // Obtener estadísticas completas para el dashboard
  async getDashboardStats() {
    try {
      console.log('📊 Obteniendo estadísticas completas del dashboard...');
      
      // Ejecutar todas las consultas en paralelo
      const [agentsSummary, alertsSummary, groups] = await Promise.all([
        this.getAgentsSummary(),
        this.getRecentAlerts(),
        this.getExistingGroups()
      ]);

      const stats = {
        agents: agentsSummary,
        alerts: alertsSummary,
        groups: {
          total: groups.length,
          list: groups.map(group => group.name)
        },
        timestamp: new Date().toISOString()
      };

      console.log('✅ Estadísticas del dashboard obtenidas exitosamente');
      return stats;
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas del dashboard:', error);
      throw error;
    }
  }
}

module.exports = WazuhSyncService;

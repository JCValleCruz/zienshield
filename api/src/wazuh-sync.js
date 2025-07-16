// Archivo: /home/gacel/zienshield/api/src/wazuh-sync.js
const axios = require('axios');

class WazuhSyncService {
  constructor() {
    this.baseURL = 'https://localhost:55000';
    this.username = 'admin';
    this.password = '+uo.tUSlH1OPsPYc2eZHdo0L+t.G4RIC';
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
}

module.exports = WazuhSyncService;

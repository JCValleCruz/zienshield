#!/usr/bin/env node
const { Pool } = require('pg');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

class DirectWazuhSync {
  constructor() {
    this.pool = new Pool({
      user: 'zienshield_api',
      host: 'localhost',
      database: 'zienshield_multi_tenant',
      password: 'ZienAPI2025!',
      port: 5432,
    });
  }

  async getCompaniesFromDB() {
    const query = `
      SELECT id, tenant_id, name, sector, created_at, wazuh_group
      FROM companies 
      ORDER BY created_at ASC
    `;
    const result = await this.pool.query(query);
    return result.rows;
  }

  generateWazuhGroupName(tenantId) {
    return `zs_${tenantId}`;
  }

  async createWazuhGroup(groupName) {
    try {
      const { stdout, stderr } = await execAsync(`sudo /var/ossec/bin/agent_groups -a -g ${groupName}`);
      return { success: true, output: stdout };
    } catch (error) {
      // Si el grupo ya existe, no es un error
      if (error.message.includes('already exists')) {
        return { success: true, message: 'Group already exists' };
      }
      throw error;
    }
  }

  async syncCompany(company) {
    try {
      const groupName = this.generateWazuhGroupName(company.tenant_id);
      
      // Solo sincronizar si no tiene grupo asignado
      if (!company.wazuh_group) {
        console.log(`🔄 Sincronizando: ${company.name} -> ${groupName}`);
        
        // Crear grupo en Wazuh
        await this.createWazuhGroup(groupName);
        
        // Actualizar base de datos
        await this.pool.query(
          'UPDATE companies SET wazuh_group = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [groupName, company.id]
        );

        return {
          success: true,
          company: company.name,
          tenantId: company.tenant_id,
          wazuhGroup: groupName,
          action: 'created'
        };
      } else {
        return {
          success: true,
          company: company.name,
          tenantId: company.tenant_id,
          wazuhGroup: company.wazuh_group,
          action: 'already_exists'
        };
      }
    } catch (error) {
      return {
        success: false,
        company: company.name,
        error: error.message
      };
    }
  }

  async syncAll() {
    try {
      console.log('🚀 Iniciando sincronización...');
      
      const companies = await this.getCompaniesFromDB();
      const results = [];

      for (const company of companies) {
        const result = await this.syncCompany(company);
        results.push(result);
      }

      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      const created = results.filter(r => r.success && r.action === 'created');

      console.log(`✅ Sincronización completada: ${successful.length} exitosas, ${failed.length} fallidas`);
      console.log(`🆕 Grupos creados: ${created.length}`);

      return {
        success: true,
        total: companies.length,
        successful: successful.length,
        failed: failed.length,
        created: created.length,
        results
      };
    } catch (error) {
      console.error('❌ Error en sincronización:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async close() {
    await this.pool.end();
  }
}

module.exports = DirectWazuhSync;

// Si se ejecuta directamente
if (require.main === module) {
  const sync = new DirectWazuhSync();
  sync.syncAll()
    .then(result => {
      console.log('📊 Resultado final:', JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error fatal:', error);
      process.exit(1);
    })
    .finally(() => {
      sync.close();
    });
}

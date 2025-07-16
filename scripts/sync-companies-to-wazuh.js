#!/usr/bin/env node
// Script para sincronizar empresas existentes con Wazuh usando tenant_id
// Ubicación: /home/gacel/zienshield/scripts/sync-companies-to-wazuh.js

const { Pool } = require('pg');
const WazuhSyncService = require('/home/gacel/zienshield/api/src/wazuh-sync');

class CompanyWazuhSync {
  constructor() {
    // Configuración de PostgreSQL - probamos con postgres primero
    this.pool = new Pool({
      user: 'postgres',
      host: 'localhost',
      database: 'zienshield_multi_tenant',
      password: 'postgres',
      port: 5432,
    });

    this.wazuhSync = new WazuhSyncService();
  }

  // Obtener todas las empresas de la base de datos
  async getCompaniesFromDB() {
    try {
      console.log('📋 Obteniendo empresas de la base de datos...');
      
      const query = `
        SELECT 
          id,
          tenant_id,
          name,
          sector,
          created_at
        FROM companies 
        ORDER BY created_at ASC
      `;

      const result = await this.pool.query(query);
      console.log(`✅ ${result.rows.length} empresas encontradas en la base de datos`);
      
      return result.rows;
    } catch (error) {
      console.error('❌ Error obteniendo empresas:', error.message);
      throw error;
    }
  }

  // Generar nombre de grupo de Wazuh basado en tenant_id
  generateWazuhGroupName(tenantId, companyName) {
    // Usar el tenant_id tal como está (ya está bien formateado)
    return `zs_${tenantId}`;
  }

  // Sincronizar una empresa específica con Wazuh
  async syncCompanyToWazuh(company) {
    try {
      const groupName = this.generateWazuhGroupName(company.tenant_id, company.name);
      
      console.log(`🔄 Sincronizando: ${company.name} -> Grupo: ${groupName}`);

      // Crear grupo en Wazuh usando el servicio existente
      await this.wazuhSync.createGroup(groupName);

      // Actualizar la base de datos con el nombre del grupo de Wazuh
      const updateQuery = `
        UPDATE companies 
        SET updated_at = CURRENT_TIMESTAMP 
        WHERE id = $1
      `;
      
      await this.pool.query(updateQuery, [company.id]);

      return {
        success: true,
        company: company.name,
        tenantId: company.tenant_id,
        wazuhGroup: groupName,
        message: 'Sincronización exitosa'
      };

    } catch (error) {
      console.error(`❌ Error sincronizando ${company.name}:`, error.message);
      return {
        success: false,
        company: company.name,
        tenantId: company.tenant_id,
        error: error.message
      };
    }
  }

  // Procesar todas las empresas
  async syncAllCompanies() {
    try {
      console.log('🚀 Iniciando sincronización completa...\n');

      // Verificar conexión con Wazuh
      const wazuhStatus = await this.wazuhSync.testConnection();
      if (!wazuhStatus.success) {
        throw new Error(`No se puede conectar a Wazuh: ${wazuhStatus.error}`);
      }
      console.log(`✅ Conexión con Wazuh establecida (versión: ${wazuhStatus.version})\n`);

      // Obtener empresas
      const companies = await this.getCompaniesFromDB();
      
      if (companies.length === 0) {
        console.log('⚠️  No hay empresas para sincronizar');
        return [];
      }

      console.log(`📊 Empresas a sincronizar: ${companies.length}\n`);

      const results = [];

      // Procesar cada empresa
      for (let i = 0; i < companies.length; i++) {
        const company = companies[i];
        console.log(`[${i + 1}/${companies.length}] Procesando: ${company.name}`);
        
        const result = await this.syncCompanyToWazuh(company);
        results.push(result);

        // Pausa pequeña entre requests para no sobrecargar Wazuh
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Mostrar resumen
      console.log('\n📈 RESUMEN DE SINCRONIZACIÓN:');
      console.log('='.repeat(50));

      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      console.log(`✅ Exitosas: ${successful.length}`);
      console.log(`❌ Fallidas: ${failed.length}`);
      console.log(`📊 Total: ${results.length}\n`);

      if (successful.length > 0) {
        console.log('✅ EMPRESAS SINCRONIZADAS:');
        successful.forEach(r => {
          console.log(`   ${r.company} -> ${r.wazuhGroup}`);
        });
        console.log('');
      }

      if (failed.length > 0) {
        console.log('❌ EMPRESAS CON ERRORES:');
        failed.forEach(r => {
          console.log(`   ${r.company}: ${r.error}`);
        });
        console.log('');
      }

      return results;

    } catch (error) {
      console.error('❌ Error en sincronización completa:', error.message);
      throw error;
    }
  }

  // Cerrar conexiones
  async close() {
    await this.pool.end();
  }
}

// Ejecutar script si es llamado directamente
async function main() {
  const sync = new CompanyWazuhSync();
  
  try {
    await sync.syncAllCompanies();
    console.log('🎉 Sincronización completada exitosamente!\n');
  } catch (error) {
    console.error('💥 Error fatal:', error.message);
    process.exit(1);
  } finally {
    await sync.close();
  }
}

// Solo ejecutar si es el script principal
if (require.main === module) {
  main();
}

module.exports = CompanyWazuhSync;

#!/usr/bin/env node
const { Pool } = require('pg');
const { exec } = require('child_process');

const pool = new Pool({
  user: 'zienshield_api',
  host: 'localhost',
  database: 'zienshield_multi_tenant',
  password: 'ZienAPI2025!',
  port: 5432,
});

async function syncCompanies() {
  try {
    const result = await pool.query('SELECT id, tenant_id, name, wazuh_group FROM companies WHERE wazuh_group IS NULL');
    
    console.log(`📋 Empresas sin grupo: ${result.rows.length}`);
    
    for (const company of result.rows) {
      const groupName = `zs_${company.tenant_id}`;
      console.log(`🔄 ${company.name} -> ${groupName}`);
      
      // Crear grupo (sin sudo para evitar problemas)
      try {
        exec(`/var/ossec/bin/agent_groups -a -g ${groupName}`, (error, stdout, stderr) => {
          if (error && !error.message.includes('already exists')) {
            console.log(`⚠️  Error creando grupo ${groupName}: ${error.message}`);
          }
        });
        
        // Actualizar base de datos
        await pool.query('UPDATE companies SET wazuh_group = $1 WHERE id = $2', [groupName, company.id]);
        console.log(`✅ ${company.name} actualizado`);
      } catch (error) {
        console.log(`❌ Error con ${company.name}: ${error.message}`);
      }
    }
    
    console.log('🎉 Sincronización completada');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

syncCompanies();

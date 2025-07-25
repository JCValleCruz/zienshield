#!/usr/bin/env node

const { Pool } = require('pg');
const { execSync } = require('child_process'); // ✅ Cambiar a execSync para manejo síncrono

// Configuración de la base de datos
const pool = new Pool({
  user: 'zienshield_api',
  host: 'localhost',
  database: 'zienshield_multi_tenant',
  password: 'ZienAPI2025!',
  port: 5432,
});

async function syncCompanies() {
  try {
    // Obtener empresas sin grupo de Wazuh
    const result = await pool.query('SELECT id, tenant_id, name, wazuh_group FROM companies WHERE wazuh_group IS NULL');
    console.log(`📋 Empresas sin grupo: ${result.rows.length}`);
    
    // Procesar cada empresa
    for (const company of result.rows) {
      const groupName = `zs_${company.tenant_id}`;
      console.log(`🔄 ${company.name} -> ${groupName}`);
      
      try {
        // ✅ CORREGIDO: Usar execSync con sudo para manejo síncrono
        const command = `sudo /var/ossec/bin/agent_groups -a -g ${groupName} -q`;
        
        try {
          // Ejecutar comando de forma síncrona
          const output = execSync(command, { 
            encoding: 'utf8',
            timeout: 10000 // 10 segundos timeout
          });
          
          console.log(`✅ Grupo ${groupName} creado exitosamente`);
          
          // ✅ CORREGIDO: Actualizar BD solo si el comando fue exitoso
          await pool.query('UPDATE companies SET wazuh_group = $1 WHERE id = $2', [groupName, company.id]);
          console.log(`✅ ${company.name} actualizado en BD`);
          
        } catch (execError) {
          // Verificar si el error es porque el grupo ya existe
          if (execError.message.includes('already exists') || 
              execError.stderr && execError.stderr.includes('already exists')) {
            console.log(`ℹ️  Grupo ${groupName} ya existe - actualizando BD`);
            
            // Actualizar BD si el grupo ya existe
            await pool.query('UPDATE companies SET wazuh_group = $1 WHERE id = $2', [groupName, company.id]);
            console.log(`✅ ${company.name} actualizado en BD`);
          } else {
            // Error real - no actualizar BD
            console.error(`❌ Error creando grupo ${groupName}:`, execError.message);
            console.error(`   Para empresa: ${company.name} (ID: ${company.id})`);
            
            // Opcional: Reintentar una vez más
            console.log(`🔄 Reintentando crear grupo ${groupName}...`);
            try {
              execSync(command, { 
                encoding: 'utf8',
                timeout: 10000 
              });
              console.log(`✅ Grupo ${groupName} creado en segundo intento`);
              await pool.query('UPDATE companies SET wazuh_group = $1 WHERE id = $2', [groupName, company.id]);
              console.log(`✅ ${company.name} actualizado en BD (segundo intento)`);
            } catch (retryError) {
              console.error(`❌ Error en segundo intento para ${groupName}:`, retryError.message);
            }
          }
        }
        
      } catch (error) {
        console.error(`❌ Error procesando ${company.name}:`, error.message);
      }
    }
    
    console.log('🎉 Sincronización completada');
    
    // Mostrar resumen final
    const syncedResult = await pool.query('SELECT COUNT(*) as total FROM companies WHERE wazuh_group IS NOT NULL');
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM companies');
    console.log(`📊 Resumen: ${syncedResult.rows[0].total}/${totalResult.rows[0].total} empresas sincronizadas`);
    
  } catch (error) {
    console.error('❌ Error general en sincronización:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    // Cerrar conexión a la BD
    await pool.end();
  }
}

// Ejecutar sincronización
syncCompanies();

const pool = require('../super-admin/backend/config/database');

async function setupConnectionTracking() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Configurando rastreo de conexión de dispositivos...');
    
    // Agregar columnas para rastrear estado de conexión
    await client.query(`
      ALTER TABLE agents 
      ADD COLUMN IF NOT EXISTS connection_state VARCHAR(20) DEFAULT 'unknown',
      ADD COLUMN IF NOT EXISTS last_connection_time TIMESTAMP,
      ADD COLUMN IF NOT EXISTS last_disconnection_time TIMESTAMP
    `);
    
    console.log('✅ Columnas de rastreo agregadas exitosamente');
    
    // Crear índices para performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_agents_connection_state ON agents(connection_state)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_agents_last_connection ON agents(last_connection_time)
    `);
    
    console.log('✅ Índices creados exitosamente');
    
    // Actualizar registros existentes
    await client.query(`
      UPDATE agents SET connection_state = 'unknown' WHERE connection_state IS NULL
    `);
    
    console.log('✅ Registros existentes actualizados');
    console.log('🎉 Configuración de rastreo de conexión completada');
    
  } catch (error) {
    console.error('❌ Error configurando rastreo de conexión:', error);
  } finally {
    client.release();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  setupConnectionTracking()
    .then(() => {
      console.log('✨ Script completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error:', error);
      process.exit(1);
    });
}

module.exports = setupConnectionTracking;
const pool = require('../super-admin/backend/config/database');

async function createDeviceTracking() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Creando sistema de rastreo de dispositivos...');
    
    // Crear tabla para rastrear estados de conexión de dispositivos
    await client.query(`
      CREATE TABLE IF NOT EXISTS device_connection_tracking (
        id SERIAL PRIMARY KEY,
        company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
        wazuh_agent_id VARCHAR(10) NOT NULL,
        agent_name VARCHAR(255),
        current_status VARCHAR(20) NOT NULL DEFAULT 'unknown',
        previous_status VARCHAR(20),
        last_connection_time TIMESTAMP,
        last_disconnection_time TIMESTAMP,
        status_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(company_id, wazuh_agent_id)
      )
    `);
    
    console.log('✅ Tabla device_connection_tracking creada');
    
    // Crear índices para performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_device_tracking_company ON device_connection_tracking(company_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_device_tracking_agent ON device_connection_tracking(wazuh_agent_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_device_tracking_status ON device_connection_tracking(current_status)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_device_tracking_connection_time ON device_connection_tracking(last_connection_time)
    `);
    
    console.log('✅ Índices creados exitosamente');
    
    // Crear función para actualizar timestamp automáticamente
    await client.query(`
      CREATE OR REPLACE FUNCTION update_device_tracking_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);
    
    await client.query(`
      DROP TRIGGER IF EXISTS update_device_tracking_updated_at ON device_connection_tracking
    `);
    
    await client.query(`
      CREATE TRIGGER update_device_tracking_updated_at
        BEFORE UPDATE ON device_connection_tracking
        FOR EACH ROW
        EXECUTE FUNCTION update_device_tracking_updated_at()
    `);
    
    console.log('✅ Triggers creados exitosamente');
    console.log('🎉 Sistema de rastreo de dispositivos creado exitosamente');
    
  } catch (error) {
    console.error('❌ Error creando sistema de rastreo:', error);
  } finally {
    client.release();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  createDeviceTracking()
    .then(() => {
      console.log('✨ Script completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error:', error);
      process.exit(1);
    });
}

module.exports = createDeviceTracking;
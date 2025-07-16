const { Pool } = require('pg');

// Configuraciones para probar
const configs = [
  {
    name: 'Config 1 - zienshield_api',
    config: {
      user: 'zienshield_api',
      host: 'localhost',
      database: 'zienshield_multi_tenant',
      password: 'ZienAPI2025!',
      port: 5432,
    }
  },
  {
    name: 'Config 2 - postgres',
    config: {
      user: 'postgres',
      host: 'localhost',
      database: 'zienshield_multi_tenant',
      password: 'postgres',
      port: 5432,
    }
  }
];

async function testConnections() {
  for (const { name, config } of configs) {
    console.log(`\n🔍 Probando ${name}...`);
    const pool = new Pool(config);
    
    try {
      const result = await pool.query('SELECT COUNT(*) FROM companies WHERE status = $1', ['active']);
      console.log(`✅ ${name}: Conexión exitosa. Empresas activas: ${result.rows[0].count}`);
    } catch (error) {
      console.log(`❌ ${name}: Error - ${error.message}`);
    } finally {
      await pool.end();
    }
  }
}

testConnections().catch(console.error);

const pool = require('../super-admin/backend/config/database');

async function checkTables() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verificando tablas existentes...');
    
    // Listar todas las tablas
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('📋 Tablas encontradas:');
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.table_name}`);
    });
    
    // Verificar específicamente la tabla companies
    const companies = await client.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'companies'
      ORDER BY ordinal_position
    `);
    
    if (companies.rows.length > 0) {
      console.log('\n📊 Estructura de tabla companies:');
      companies.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error verificando tablas:', error);
  } finally {
    client.release();
  }
}

checkTables()
  .then(() => {
    console.log('✨ Verificación completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error:', error);
    process.exit(1);
  });
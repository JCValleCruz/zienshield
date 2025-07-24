const pool = require('../super-admin/backend/config/database');

async function checkTenants() {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT id, name, tenant_id, wazuh_group 
      FROM companies 
      ORDER BY id
    `);
    
    console.log('🏢 Empresas encontradas:');
    result.rows.forEach((company, index) => {
      console.log(`${index + 1}. ID: ${company.id}, Tenant: ${company.tenant_id}, Nombre: ${company.name}, Grupo Wazuh: ${company.wazuh_group}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
  }
}

checkTenants()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('💥 Error:', error);
    process.exit(1);
  });
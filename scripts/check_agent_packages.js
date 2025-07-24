const axios = require('axios');

const WAZUH_API_URL = 'https://194.164.172.92:55000';
const WAZUH_USERNAME = 'wazuh';
const WAZUH_PASSWORD = 'wazuh';

let tokenCache = { token: null, expires: null };

const getWazuhToken = async () => {
  try {
    if (tokenCache.token && tokenCache.expires && new Date() < tokenCache.expires) {
      return tokenCache.token;
    }

    const auth = Buffer.from(`${WAZUH_USERNAME}:${WAZUH_PASSWORD}`).toString('base64');
    
    const response = await axios.post(`${WAZUH_API_URL}/security/user/authenticate`, {}, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      httpsAgent: new (require('https').Agent)({
        rejectUnauthorized: false
      }),
      timeout: 10000
    });

    if (response.data && response.data.data && response.data.data.token) {
      tokenCache.token = response.data.data.token;
      tokenCache.expires = new Date(Date.now() + 15 * 60 * 1000);
      return tokenCache.token;
    }
  } catch (error) {
    console.error('❌ Error obteniendo token:', error.message);
    return null;
  }
};

const wazuhApiCall = async (endpoint) => {
  try {
    const token = await getWazuhToken();
    if (!token) throw new Error('No token');

    const response = await axios.get(`${WAZUH_API_URL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      httpsAgent: new (require('https').Agent)({
        rejectUnauthorized: false
      }),
      timeout: 15000
    });

    return response.data;
  } catch (error) {
    console.error(`❌ Error en API (${endpoint}):`, error.message);
    return null;
  }
};

async function checkAgentPackages() {
  console.log('🔍 Verificando paquetes de agentes reales...\n');

  // Obtener agentes de AXAFONE
  const agents = await wazuhApiCall('/agents?limit=20');
  if (!agents || !agents.data || !agents.data.affected_items) {
    console.log('❌ No se pudieron obtener agentes');
    return;
  }

  // Filtrar agentes de AXAFONE
  const axafoneAgents = agents.data.affected_items.filter(agent => 
    agent.group && agent.group.includes('zs_axafone_tel_001')
  );

  console.log(`📊 Agentes de AXAFONE encontrados: ${axafoneAgents.length}\n`);

  // Analizar algunos agentes
  for (const agent of axafoneAgents.slice(0, 3)) {
    console.log(`🖥️ Agente: ${agent.name} (ID: ${agent.id})`);
    console.log(`   Estado: ${agent.status}`);
    
    // Obtener paquetes del agente
    const packages = await wazuhApiCall(`/syscollector/${agent.id}/packages?limit=100`);
    
    if (packages && packages.data && packages.data.affected_items) {
      const pkgs = packages.data.affected_items;
      console.log(`   📦 Paquetes instalados: ${pkgs.length}`);
      
      // Mostrar algunos paquetes relevantes
      const relevantPackages = pkgs.filter(pkg => 
        pkg.name && (
          pkg.name.toLowerCase().includes('openssl') ||
          pkg.name.toLowerCase().includes('openssh') ||
          pkg.name.toLowerCase().includes('sudo') ||
          pkg.name.toLowerCase().includes('curl') ||
          pkg.name.toLowerCase().includes('nginx') ||
          pkg.name.toLowerCase().includes('apache')
        )
      );
      
      if (relevantPackages.length > 0) {
        console.log('   🎯 Paquetes relevantes para vulnerabilidades:');
        relevantPackages.forEach((pkg, idx) => {
          console.log(`      ${idx + 1}. ${pkg.name} v${pkg.version || 'N/A'} (${pkg.vendor || 'N/A'})`);
        });
      } else {
        console.log('   ⚠️ No se encontraron paquetes vulnerables conocidos');
        console.log('   📋 Algunos paquetes instalados:');
        pkgs.slice(0, 5).forEach((pkg, idx) => {
          console.log(`      ${idx + 1}. ${pkg.name} v${pkg.version || 'N/A'}`);
        });
      }
    } else {
      console.log('   ❌ No se pudieron obtener paquetes');
    }
    console.log('');
  }
}

checkAgentPackages()
  .then(() => {
    console.log('✅ Análisis completado');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Error:', error);
    process.exit(1);
  });
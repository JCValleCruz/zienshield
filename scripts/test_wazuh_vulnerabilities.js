const axios = require('axios');

const WAZUH_API_URL = 'https://194.164.172.92:55000';
const WAZUH_USERNAME = 'wazuh';
const WAZUH_PASSWORD = 'wazuh';

// Cache del token para evitar múltiples solicitudes
let tokenCache = {
  token: null,
  expires: null
};

// Función para obtener token de Wazuh
const getWazuhToken = async () => {
  try {
    // Verificar cache del token
    if (tokenCache.token && tokenCache.expires && new Date() < tokenCache.expires) {
      return tokenCache.token;
    }

    console.log('🔑 Obteniendo nuevo token de Wazuh...');
    
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
      // Cachear token por 15 minutos
      tokenCache.token = response.data.data.token;
      tokenCache.expires = new Date(Date.now() + 15 * 60 * 1000);
      
      console.log('✅ Token de Wazuh obtenido exitosamente');
      return tokenCache.token;
    } else {
      throw new Error('Respuesta de token inválida');
    }
  } catch (error) {
    console.error('❌ Error obteniendo token de Wazuh:', error.message);
    tokenCache.token = null;
    tokenCache.expires = null;
    return null;
  }
};

// Función para realizar llamadas a la API de Wazuh
const wazuhApiCall = async (endpoint) => {
  try {
    const token = await getWazuhToken();
    if (!token) {
      throw new Error('No se pudo obtener token de Wazuh');
    }

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
    console.error(`❌ Error en API Wazuh (${endpoint}):`, error.message);
    return null;
  }
};

// Función principal para probar vulnerabilidades
async function testWazuhVulnerabilities() {
  console.log('🔍 Probando endpoints de vulnerabilidades de Wazuh...\n');

  // 1. Obtener información del manager
  console.log('1. 📊 Información del Manager:');
  const managerInfo = await wazuhApiCall('/manager/info');
  if (managerInfo && managerInfo.data) {
    console.log(`   ✅ Versión: ${managerInfo.data.version}`);
    console.log(`   ✅ Compilación: ${managerInfo.data.compilation_date}`);
  }
  console.log('');

  // 2. Obtener lista de agentes
  console.log('2. 👥 Lista de Agentes:');
  const agents = await wazuhApiCall('/agents?limit=5');
  if (agents && agents.data && agents.data.affected_items) {
    console.log(`   ✅ Total de agentes: ${agents.data.total_affected_items}`);
    agents.data.affected_items.forEach(agent => {
      console.log(`   - ID: ${agent.id}, Nombre: ${agent.name}, Estado: ${agent.status}`);
    });
  }
  console.log('');

  // 3. Probar endpoints de vulnerabilidades
  console.log('3. 🔐 Endpoints de Vulnerabilidades:');
  
  // Obtener primer agente para pruebas
  if (agents && agents.data && agents.data.affected_items.length > 0) {
    const firstAgent = agents.data.affected_items[0];
    console.log(`   🎯 Probando con agente: ${firstAgent.id} (${firstAgent.name})`);
    
    // Endpoint de vulnerabilidades (Wazuh 4.7 y anteriores)
    console.log('   a) Endpoint /vulnerability/{agent_id}:');
    const vulnerabilities = await wazuhApiCall(`/vulnerability/${firstAgent.id}`);
    if (vulnerabilities) {
      console.log('      ✅ Endpoint disponible - datos de vulnerabilidades encontrados');
      if (vulnerabilities.data && vulnerabilities.data.affected_items) {
        console.log(`      📊 Vulnerabilidades encontradas: ${vulnerabilities.data.total_affected_items}`);
        if (vulnerabilities.data.affected_items.length > 0) {
          const sample = vulnerabilities.data.affected_items[0];
          console.log('      📝 Muestra de vulnerabilidad:');
          console.log(`         CVE: ${sample.cve || 'N/A'}`);
          console.log(`         Severidad: ${sample.severity || 'N/A'}`);
          console.log(`         Paquete: ${sample.name || 'N/A'}`);
          console.log(`         Versión: ${sample.version || 'N/A'}`);
        }
      }
    } else {
      console.log('      ❌ Endpoint no disponible o sin datos');
    }
    
    // Endpoint de último escaneo
    console.log('   b) Endpoint /vulnerability/{agent_id}/last_scan:');
    const lastScan = await wazuhApiCall(`/vulnerability/${firstAgent.id}/last_scan`);
    if (lastScan && lastScan.data) {
      console.log('      ✅ Último escaneo disponible');
      console.log(`      📅 Fecha: ${lastScan.data.start || 'N/A'}`);
      console.log(`      📊 Estado: ${lastScan.data.end ? 'Completado' : 'En progreso'}`);
    } else {
      console.log('      ❌ Sin datos de último escaneo');
    }
    
    // Probar paquetes instalados
    console.log('   c) Paquetes instalados (syscollector):');
    const packages = await wazuhApiCall(`/syscollector/${firstAgent.id}/packages?limit=10`);
    if (packages && packages.data && packages.data.affected_items) {
      console.log(`      ✅ Paquetes encontrados: ${packages.data.total_affected_items}`);
      console.log('      📦 Muestra de paquetes:');
      packages.data.affected_items.slice(0, 3).forEach((pkg, index) => {
        console.log(`         ${index + 1}. ${pkg.name} v${pkg.version || 'N/A'} (${pkg.vendor || 'N/A'})`);
      });
    }
  }
  console.log('');

  // 4. Probar endpoint de resumen de vulnerabilidades
  console.log('4. 📈 Resumen Global de Vulnerabilidades:');
  const vulnSummary = await wazuhApiCall('/vulnerability');
  if (vulnSummary && vulnSummary.data) {
    console.log('   ✅ Resumen disponible');
    if (vulnSummary.data.affected_items) {
      console.log(`   📊 Total de vulnerabilidades: ${vulnSummary.data.total_affected_items}`);
    }
  } else {
    console.log('   ❌ Sin resumen de vulnerabilidades');
  }

  console.log('\n🏁 Prueba completada');
}

// Ejecutar prueba
testWazuhVulnerabilities()
  .then(() => {
    console.log('✨ Script de prueba finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error en script de prueba:', error);
    process.exit(1);
  });
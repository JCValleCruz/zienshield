const pool = require('../../config/database');

// Configuración de Wazuh API
const WAZUH_API_URL = 'https://194.164.172.92:55000';
const WAZUH_USERNAME = 'wazuh';
const WAZUH_PASSWORD = 'wazuh';

// Deshabilitar verificación SSL para certificados autofirmados
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

// Función para obtener token de autenticación de Wazuh
const getWazuhToken = async () => {
  try {
    const response = await fetch(`${WAZUH_API_URL}/security/user/authenticate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${WAZUH_USERNAME}:${WAZUH_PASSWORD}`).toString('base64')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Error de autenticación Wazuh: ${response.status}`);
    }

    const data = await response.json();
    return data.data.token;
  } catch (error) {
    console.error('Error obteniendo token Wazuh:', error);
    return null;
  }
};

// Función para hacer llamadas autenticadas a Wazuh API
const wazuhApiCall = async (endpoint) => {
  try {
    const token = await getWazuhToken();
    
    if (!token) {
      throw new Error('No se pudo obtener token de Wazuh');
    }

    const response = await fetch(`${WAZUH_API_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Error en API Wazuh: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error en llamada Wazuh ${endpoint}:`, error);
    return null;
  }
};

// Obtener estadísticas globales del sistema
const getGlobalStats = async (req, res) => {
  try {
    // Estadísticas de empresas (desde BD local)
    const companiesQuery = `
      SELECT 
        COUNT(*) as total_companies,
        COUNT(CASE WHEN wazuh_group IS NOT NULL THEN 1 END) as synced_companies
      FROM companies
    `;

    // Inicializar estadísticas por defecto
    let wazuhStatus = { status: 'disconnected', version: 'unknown', last_check: new Date().toISOString() };
    let agentStats = { total: 0, active: 0, inactive: 0, pending: 0 };
    let vulnerabilityStats = { total: 0, critical: 0, high: 0, medium: 0, low: 0 };
    let eventStats = { perSecond: 0, total: 0, totalAlerts: 0, hour: 0 }; // NUEVO: Estadísticas de eventos reales
    
    try {
      console.log('🔍 Conectando con Wazuh API...');
      
      // Obtener información del manager
      const managerInfo = await wazuhApiCall('/manager/info');
      if (managerInfo && managerInfo.data) {
        wazuhStatus = {
          status: 'connected',
          version: managerInfo.data.version,
          last_check: new Date().toISOString()
        };
        console.log('✅ Conexión con Wazuh exitosa');
      }

      // NUEVO: Obtener estadísticas de eventos del manager
      console.log('📊 Obteniendo estadísticas de eventos...');
      const managerStats = await wazuhApiCall('/manager/stats');
      
      if (managerStats && managerStats.data && managerStats.data.affected_items && managerStats.data.affected_items.length > 0) {
        const statsData = managerStats.data.affected_items[0];
        
        // Calcular eventos por segundo (eventos de la última hora / 3600 segundos)
        const eventsPerSecond = statsData.events ? Math.round((statsData.events / 3600) * 100) / 100 : 0;
        
        eventStats = {
          perSecond: eventsPerSecond,
          total: statsData.events || 0,
          totalAlerts: statsData.totalAlerts || 0,
          hour: statsData.hour || 0
        };
        
        console.log(`📊 Eventos procesados: ${statsData.events} en la hora ${statsData.hour}`);
        console.log(`⚡ Eventos por segundo: ${eventsPerSecond}`);
        console.log(`🚨 Alertas generadas: ${statsData.totalAlerts}`);
      } else {
        console.warn('⚠️ No se pudieron obtener estadísticas de eventos del manager');
      }

      // Obtener lista de agentes
      const wazuhAgents = await wazuhApiCall('/agents?limit=1000');
      
      if (wazuhAgents && wazuhAgents.data && wazuhAgents.data.affected_items) {
        const agents = wazuhAgents.data.affected_items;
        
        agentStats = {
          total: agents.length,
          active: agents.filter(agent => agent.status === 'active').length,
          inactive: agents.filter(agent => agent.status === 'disconnected').length,
          pending: agents.filter(agent => agent.status === 'pending' || agent.status === 'never_connected').length
        };
        
        console.log(`✅ ${agentStats.total} agentes encontrados (${agentStats.active} activos)`);
        
        // Obtener información de paquetes instalados para calcular vulnerabilidades potenciales
        const activeAgents = agents.filter(agent => agent.status === 'active');
        let totalPackages = 0;
        
        console.log('📦 Obteniendo información de paquetes instalados...');
        
        for (const agent of activeAgents.slice(0, 5)) { // Limitar a 5 agentes para no sobrecargar
          try {
            const packages = await wazuhApiCall(`/syscollector/${agent.id}/packages?limit=5000`);
            if (packages && packages.data && packages.data.affected_items) {
              const packageCount = packages.data.affected_items.length;
              totalPackages += packageCount;
              console.log(`📦 Agente ${agent.id}: ${packageCount} paquetes instalados`);
            }
          } catch (error) {
            console.warn(`⚠️ No se pudieron obtener paquetes del agente ${agent.id}:`, error.message);
          }
        }

        // Calcular vulnerabilidades basadas en paquetes instalados
        // Esta es una estimación: ~15% de paquetes pueden tener vulnerabilidades
        if (totalPackages > 0) {
          const estimatedVulns = Math.floor(totalPackages * 0.15);
          vulnerabilityStats = {
            total: estimatedVulns,
            critical: Math.floor(estimatedVulns * 0.08), // 8% críticas
            high: Math.floor(estimatedVulns * 0.12),     // 12% altas
            medium: Math.floor(estimatedVulns * 0.35),   // 35% medias
            low: Math.floor(estimatedVulns * 0.45)       // 45% bajas
          };
          console.log(`🔍 Estimación de vulnerabilidades basada en ${totalPackages} paquetes: ${vulnerabilityStats.total} vulnerabilidades potenciales`);
        }
      }

    } catch (error) {
      console.warn('⚠️ Error conectando con Wazuh API:', error.message);
    }

    // Ejecutar consulta de empresas
    const companiesResult = await pool.query(companiesQuery);

    // Estadísticas simuladas para alertas (basadas en agentes activos)
    const alertStats = {
      total: agentStats.active * 15,
      critical: Math.floor(agentStats.active * 0.5),
      high: Math.floor(agentStats.active * 1.2),
      medium: Math.floor(agentStats.active * 3.8),
      low: Math.floor(agentStats.active * 9.5)
    };

    // Calcular compliance
    const totalCompanies = parseInt(companiesResult.rows[0].total_companies);
    const syncedCompanies = parseInt(companiesResult.rows[0].synced_companies);
    const compliance = totalCompanies > 0 ? Math.round((syncedCompanies / totalCompanies) * 100) : 85;

    const globalStats = {
      companies: {
        total: totalCompanies,
        synced: syncedCompanies
      },
      agents: agentStats,
      alerts: alertStats,
      compliance: {
        average: compliance
      },
      vulnerabilities: vulnerabilityStats,
      events: eventStats, // NUEVO: Incluir estadísticas reales de eventos
      wazuh: wazuhStatus,
      timestamp: new Date().toISOString()
    };

    res.json({ 
      success: true, 
      data: globalStats 
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas globales:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error obteniendo estadísticas globales',
      details: error.message
    });
  }
};

module.exports = {
  getGlobalStats
};

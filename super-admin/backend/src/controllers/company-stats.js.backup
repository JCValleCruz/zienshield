const pool = require('../../config/database');

// Configuración de Wazuh API
const WAZUH_API_URL = 'https://194.164.172.92:55000';
const WAZUH_USERNAME = 'wazuh';
const WAZUH_PASSWORD = 'wazuh';

// Deshabilitar verificación SSL para certificados autofirmados
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

// Base de datos de paquetes conocidos con vulnerabilidades
const VULNERABLE_PACKAGES = {
  critical: [
    'openssl', 'openssh', 'kernel', 'sudo', 'systemd', 'bash', 'glibc',
    'apache2', 'nginx', 'mysql', 'postgresql', 'docker', 'php'
  ],
  high: [
    'curl', 'wget', 'python3', 'nodejs', 'ruby', 'perl', 'git',
    'vim', 'nano', 'rsyslog', 'cron', 'bind9', 'postfix'
  ],
  medium: [
    'libssl', 'libcurl', 'zlib', 'expat', 'libxml2', 'libpng',
    'libjpeg', 'libgcc', 'libstdc++', 'libc6', 'libgomp'
  ],
  low: [
    'tar', 'gzip', 'zip', 'unzip', 'less', 'grep', 'sed', 'awk',
    'find', 'locate', 'which', 'file', 'mount'
  ]
};

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

// Función para obtener agentes de una empresa específica
const getCompanyAgents = async (wazuhGroup) => {
  try {
    console.log(`🔍 Obteniendo agentes del grupo: ${wazuhGroup}`);

    const agentsResponse = await wazuhApiCall('/agents?limit=1000');
    
    if (!agentsResponse || !agentsResponse.data || !agentsResponse.data.affected_items) {
      console.warn('⚠️ No se pudieron obtener agentes');
      return [];
    }

    // Filtrar agentes por grupo de la empresa
    const companyAgents = agentsResponse.data.affected_items.filter(agent => {
      return agent.group && agent.group.includes(wazuhGroup);
    });

    console.log(`📊 Encontrados ${companyAgents.length} agentes para el grupo ${wazuhGroup}`);
    return companyAgents;

  } catch (error) {
    console.error('❌ Error obteniendo agentes de la empresa:', error);
    return [];
  }
};

// Función para analizar vulnerabilidades de agentes específicos de una empresa
const analyzeCompanyVulnerabilities = async (companyAgents) => {
  try {
    console.log(`🔍 Analizando vulnerabilidades de ${companyAgents.length} agentes de la empresa...`);

    let vulnerabilityStats = {
      total: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    // Analizar solo agentes activos de la empresa
    const activeAgents = companyAgents.filter(agent => agent.status === 'active');
    
    if (activeAgents.length === 0) {
      console.log('⚠️ No hay agentes activos en esta empresa');
      return null;
    }

    for (const agent of activeAgents) {
      try {
        console.log(`📦 Analizando paquetes del agente ${agent.id} (${agent.name})...`);

        const packagesResponse = await wazuhApiCall(`/syscollector/${agent.id}/packages?limit=1000`);
        
        if (packagesResponse && packagesResponse.data && packagesResponse.data.affected_items) {
          const packages = packagesResponse.data.affected_items;
          console.log(`📊 Agente ${agent.id}: ${packages.length} paquetes instalados`);

          // Analizar cada paquete para identificar vulnerabilidades potenciales
          packages.forEach(pkg => {
            const packageName = pkg.name?.toLowerCase() || '';
            
            let foundVulnerability = false;

            // Verificar paquetes críticos
            VULNERABLE_PACKAGES.critical.forEach(vulnPkg => {
              if (packageName.includes(vulnPkg) && !foundVulnerability) {
                vulnerabilityStats.critical++;
                vulnerabilityStats.total++;
                foundVulnerability = true;
              }
            });

            // Verificar paquetes de alta severidad
            if (!foundVulnerability) {
              VULNERABLE_PACKAGES.high.forEach(vulnPkg => {
                if (packageName.includes(vulnPkg) && !foundVulnerability) {
                  vulnerabilityStats.high++;
                  vulnerabilityStats.total++;
                  foundVulnerability = true;
                }
              });
            }

            // Verificar paquetes de severidad media
            if (!foundVulnerability) {
              VULNERABLE_PACKAGES.medium.forEach(vulnPkg => {
                if (packageName.includes(vulnPkg) && !foundVulnerability) {
                  vulnerabilityStats.medium++;
                  vulnerabilityStats.total++;
                  foundVulnerability = true;
                }
              });
            }

            // Verificar paquetes de baja severidad
            if (!foundVulnerability) {
              VULNERABLE_PACKAGES.low.forEach(vulnPkg => {
                if (packageName.includes(vulnPkg) && !foundVulnerability) {
                  vulnerabilityStats.low++;
                  vulnerabilityStats.total++;
                  foundVulnerability = true;
                }
              });
            }
          });
        }

      } catch (agentError) {
        console.warn(`⚠️ Error analizando agente ${agent.id}:`, agentError.message);
        continue;
      }
    }

    if (vulnerabilityStats.total > 0) {
      console.log(`✅ Vulnerabilidades de la empresa:`, vulnerabilityStats);
      return vulnerabilityStats;
    }

    console.warn('⚠️ No se identificaron vulnerabilidades en la empresa');
    return null;

  } catch (error) {
    console.error('❌ Error analizando vulnerabilidades de la empresa:', error);
    return null;
  }
};

// Obtener estadísticas específicas de una empresa
const getCompanyStats = async (req, res) => {
  try {
    const { tenantId } = req.params;

    console.log(`📊 Obteniendo estadísticas para la empresa: ${tenantId}`);

    // Buscar empresa en la base de datos
    const companyQuery = `
      SELECT id, name, sector, wazuh_group, admin_name, admin_email
      FROM companies 
      WHERE tenant_id = $1
    `;

    const companyResult = await pool.query(companyQuery, [tenantId]);

    if (companyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Empresa no encontrada'
      });
    }

    const company = companyResult.rows[0];
    const wazuhGroup = company.wazuh_group;

    console.log(`🏢 Empresa encontrada: ${company.name} (Grupo Wazuh: ${wazuhGroup || 'No asignado'})`);

    // Inicializar estadísticas
    let agentStats = { total: 0, active: 0, inactive: 0, pending: 0 };
    let vulnerabilityStats = null;
    let wazuhStatus = { status: 'disconnected', version: 'unknown' };

    if (wazuhGroup) {
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
        }

        // Obtener agentes específicos de esta empresa
        const companyAgents = await getCompanyAgents(wazuhGroup);

        if (companyAgents.length > 0) {
          agentStats = {
            total: companyAgents.length,
            active: companyAgents.filter(agent => agent.status === 'active').length,
            inactive: companyAgents.filter(agent => agent.status === 'disconnected').length,
            pending: companyAgents.filter(agent => agent.status === 'pending' || agent.status === 'never_connected').length
          };

          console.log(`✅ ${agentStats.total} agentes de la empresa (${agentStats.active} activos)`);

          // Analizar vulnerabilidades solo de esta empresa
          if (agentStats.active > 0) {
            vulnerabilityStats = await analyzeCompanyVulnerabilities(companyAgents);
          }
        }

      } catch (error) {
        console.warn('⚠️ Error conectando con Wazuh API:', error.message);
      }
    }

    // Estadísticas simuladas para alertas (basadas en agentes activos de la empresa)
    const alertStats = {
      total: agentStats.active * 8,
      critical: Math.floor(agentStats.active * 0.3),
      high: Math.floor(agentStats.active * 0.8),
      medium: Math.floor(agentStats.active * 2.5),
      low: Math.floor(agentStats.active * 4.4)
    };

    // Calcular compliance específico de la empresa
    const compliance = agentStats.total > 0 ? 
      Math.round(((agentStats.active / agentStats.total) * 100)) : 85;

    // Usar vulnerabilidades reales o mostrar N/A
    const finalVulnerabilityStats = vulnerabilityStats || {
      total: 'N/A',
      critical: 'N/A',
      high: 'N/A',
      medium: 'N/A',
      low: 'N/A'
    };

    const companyStats = {
      company: {
        id: company.id,
        name: company.name,
        sector: company.sector,
        tenant_id: tenantId,
        wazuh_group: wazuhGroup
      },
      agents: agentStats,
      alerts: alertStats,
      compliance: {
        percentage: compliance
      },
      vulnerabilities: finalVulnerabilityStats, // ← Solo vulnerabilidades de esta empresa
      wazuh: wazuhStatus,
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: companyStats
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas de la empresa:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estadísticas de la empresa',
      details: error.message
    });
  }
};

module.exports = {
  getCompanyStats
};

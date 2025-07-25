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

// Función para calcular el score de criticidad de un dispositivo
const calculateCriticalityScore = (vulnerabilities) => {
  const critical = vulnerabilities.critical || 0;
  const high = vulnerabilities.high || 0;
  const medium = vulnerabilities.medium || 0;
  const low = vulnerabilities.low || 0;

  return (critical * 10) + (high * 5) + (medium * 3) + (low * 1);
};

// Función para analizar vulnerabilidades de un agente específico
const analyzeAgentVulnerabilities = async (agent, companyId = null) => {
  try {
    console.log(`🔍 Analizando vulnerabilidades del agente ${agent.id} (${agent.name}) con CVE reales...`);

    // Si el agente está desconectado, intentar obtener datos almacenados
    if (agent.status !== 'active' && companyId) {
      const storedVulns = await getStoredVulnerabilities(companyId, agent.id);
      if (storedVulns.length > 0) {
        const stored = storedVulns[0];
        console.log(`📚 Usando vulnerabilidades almacenadas para agente desconectado ${agent.id}`);
        return {
          critical: stored.counts.critical,
          high: stored.counts.high,
          medium: stored.counts.medium,
          low: stored.counts.low
        };
      }
    }

    // Obtener paquetes del agente desde Wazuh
    const packagesResponse = await wazuhApiCall(`/syscollector/${agent.id}/packages?limit=1000`);

    if (!packagesResponse || !packagesResponse.data || !packagesResponse.data.affected_items) {
      console.warn(`⚠️ No se pudieron obtener paquetes del agente ${agent.id}`);
      
      // Intentar datos almacenados como fallback
      if (companyId) {
        const storedVulns = await getStoredVulnerabilities(companyId, agent.id);
        if (storedVulns.length > 0) {
          const stored = storedVulns[0];
          console.log(`📚 Usando datos almacenados como fallback para agente ${agent.id}`);
          return {
            critical: stored.counts.critical,
            high: stored.counts.high,
            medium: stored.counts.medium,
            low: stored.counts.low
          };
        }
      }
      
      return { critical: 0, high: 0, medium: 0, low: 0 };
    }

    const packages = packagesResponse.data.affected_items;
    
    // Usar el nuevo sistema de escaneo de vulnerabilidades basado en CVE
    const vulnerabilityData = await scanAgentVulnerabilities(agent.id, packages);
    
    // Guardar datos en la base de datos si tenemos companyId
    if (companyId) {
      await saveVulnerabilityData(
        companyId,
        agent.id,
        agent.name || `Agent-${agent.id}`,
        vulnerabilityData
      );
    }

    return {
      critical: vulnerabilityData.critical.length,
      high: vulnerabilityData.high.length,
      medium: vulnerabilityData.medium.length,
      low: vulnerabilityData.low.length
    };

  } catch (error) {
    console.error(`❌ Error analizando vulnerabilidades del agente ${agent.id}:`, error);
    
    // Intentar datos almacenados como último recurso
    if (companyId) {
      try {
        const storedVulns = await getStoredVulnerabilities(companyId, agent.id);
        if (storedVulns.length > 0) {
          const stored = storedVulns[0];
          console.log(`📚 Usando datos almacenados por error en agente ${agent.id}`);
          return {
            critical: stored.counts.critical,
            high: stored.counts.high,
            medium: stored.counts.medium,
            low: stored.counts.low
          };
        }
      } catch (dbError) {
        console.error(`❌ Error accediendo a datos almacenados:`, dbError);
      }
    }
    
    return { critical: 0, high: 0, medium: 0, low: 0 };
  }
};

// Función principal para obtener dispositivos críticos de una empresa
const getCriticalDevices = async (req, res) => {
  try {
    const { tenantId } = req.params;
    console.log(`🎯 Obteniendo dispositivos críticos para la empresa: ${tenantId}`);

    const companyQuery = `
      SELECT id, name, sector, wazuh_group, admin_name, admin_email
      FROM companies
      WHERE tenant_id = $1
    `;

    const companyResult = await pool.query(companyQuery, [tenantId]);

    if (companyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Empresa no encontrada"
      });
    }

    const company = companyResult.rows[0];
    const wazuhGroup = company.wazuh_group;

    if (!wazuhGroup) {
      return res.json({
        success: true,
        data: {
          devices: [],
          message: "Empresa sin agentes configurados"
        }
      });
    }

    const managerInfo = await wazuhApiCall("/manager/info");
    if (!managerInfo || !managerInfo.data) {
      return res.status(503).json({
        success: false,
        error: "Servidor Wazuh no disponible"
      });
    }

    const companyAgents = await getCompanyAgents(wazuhGroup);

    if (companyAgents.length === 0) {
      return res.json({
        success: true,
        data: {
          devices: [],
          message: "No hay dispositivos registrados para esta empresa"
        }
      });
    }

    const devicesWithScores = [];

    for (const agent of companyAgents) {
      try {
        let osInfo = "Desconocido";
        try {
          const osResponse = await wazuhApiCall(`/syscollector/${agent.id}/os`);
          if (osResponse && osResponse.data && osResponse.data.affected_items && osResponse.data.affected_items.length > 0) {
            const osData = osResponse.data.affected_items[0];
            // USAR CAMPOS CORRECTOS
            const osName = osData.os?.name || osData.sysname || "Unknown";
            const osVersion = osData.os?.version || "";
            osInfo = `${osName} ${osVersion}`.trim();
          }
        } catch (osError) {
          console.warn(`⚠️ No se pudo obtener OS del agente ${agent.id}`);
        }

        const vulnerabilities = await analyzeAgentVulnerabilities(agent, company.id);
        const criticalityScore = calculateCriticalityScore(vulnerabilities);

        const deviceData = {
          id: agent.id,
          name: agent.name || `Agent-${agent.id}`,
          ip: agent.ip || "N/A",
          os: osInfo,
          status: agent.status,
          last_seen: agent.lastKeepAlive || agent.dateAdd || new Date().toISOString(),
          vulnerabilities: vulnerabilities,
          criticality_score: criticalityScore,
          group: agent.group ? agent.group.join(", ") : wazuhGroup
        };

        devicesWithScores.push(deviceData);

      } catch (agentError) {
        console.error(`❌ Error procesando agente ${agent.id}:`, agentError);
        continue;
      }
    }

    devicesWithScores.sort((a, b) => {
      if (a.status === "active" && b.status !== "active") return -1;
      if (b.status === "active" && a.status !== "active") return 1;
      return b.criticality_score - a.criticality_score;
    });

    const topCriticalDevices = devicesWithScores.slice(0, 4);

    res.json({
      success: true,
      data: {
        company: {
          name: company.name,
          tenant_id: tenantId,
          sector: company.sector
        },
        devices: topCriticalDevices,
        total_devices: devicesWithScores.length,
        analysis_timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("❌ Error obteniendo dispositivos críticos:", error);
    res.status(500).json({
      success: false,
      error: "Error obteniendo dispositivos críticos",
      details: error.message
    });
  }
};

// Importar el sistema de rastreo de conexión
const { updateDeviceConnectionStatus, getDeviceConnectionTime } = require('../utils/deviceConnectionTracker');

// Importar el nuevo sistema de vulnerabilidades
const { 
  analyzeAgentVulnerabilities: scanAgentVulnerabilities, 
  saveVulnerabilityData, 
  getStoredVulnerabilities,
  getCompanyVulnerabilitySummary 
} = require('../utils/vulnerabilityScanner');

// FUNCIÓN NUEVA: Obtener inventario completo de dispositivos - COMPLETAMENTE CORREGIDA
const getAllCompanyDevices = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { page = 1, limit = 20, search = '', sortBy = 'name', sortOrder = 'asc', status = 'all' } = req.query;

    console.log(`📋 Obteniendo inventario completo para empresa: ${tenantId}`);
    console.log(`🔍 Filtros: page=${page}, limit=${limit}, search="${search}", sortBy=${sortBy}, status=${status}`);

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
        error: "Empresa no encontrada"
      });
    }

    const company = companyResult.rows[0];
    const wazuhGroup = company.wazuh_group;

    if (!wazuhGroup) {
      return res.json({
        success: true,
        data: {
          devices: [],
          stats: { total: 0, active: 0, disconnected: 0, pending: 0, critical_vulnerabilities: 0, high_vulnerabilities: 0 },
          pagination: { total: 0, page: parseInt(page), limit: parseInt(limit), pages: 0, has_next: false, has_prev: false },
          filters: { search, status, sortBy, sortOrder }
        }
      });
    }

    // Verificar conexión con Wazuh
    const managerInfo = await wazuhApiCall("/manager/info");
    if (!managerInfo || !managerInfo.data) {
      return res.status(503).json({
        success: false,
        error: "Servidor Wazuh no disponible"
      });
    }

    // Obtener todos los agentes de la empresa
    const companyAgents = await getCompanyAgents(wazuhGroup);

    if (companyAgents.length === 0) {
      return res.json({
        success: true,
        data: {
          devices: [],
          stats: { total: 0, active: 0, disconnected: 0, pending: 0, critical_vulnerabilities: 0, high_vulnerabilities: 0 },
          pagination: { total: 0, page: parseInt(page), limit: parseInt(limit), pages: 0, has_next: false, has_prev: false },
          filters: { search, status, sortBy, sortOrder }
        }
      });
    }

    console.log(`🔍 Procesando ${companyAgents.length} agentes de la empresa...`);

    const fullDevicesList = [];

    // ========== PROCESAMIENTO DE CADA AGENTE ==========
    for (const agent of companyAgents) {
      try {
        console.log(`🔍 Procesando agente: ${agent.name} (ID: ${agent.id})`);
        
        // ========== EXTRACCIÓN DE OS - CORREGIDA ==========
        let osInfo = "Desconocido";
        let osVersion = "";
        let architecture = "N/A";
        
        try {
          console.log(`🖥️ Obteniendo OS del agente ${agent.id}...`);
          const osResponse = await wazuhApiCall(`/syscollector/${agent.id}/os`);
          
          if (osResponse && osResponse.data && osResponse.data.affected_items && osResponse.data.affected_items.length > 0) {
            const osData = osResponse.data.affected_items[0];
            console.log(`📊 OS Data para agente ${agent.id}:`, JSON.stringify(osData, null, 2));
            
            // USAR CAMPOS REALES DE WAZUH - ESTRUCTURA CONFIRMADA
            const osName = osData.os?.name || osData.sysname || "Desconocido";
            osVersion = osData.os?.version || "";
            architecture = osData.architecture || "N/A";
            
            osInfo = `${osName} ${osVersion}`.trim();
            
            console.log(`✅ OS extraído correctamente para ${agent.id}: ${osInfo}`);
          } else {
            console.warn(`⚠️ No se encontraron datos de OS para el agente ${agent.id}`);
          }
        } catch (osError) {
          console.error(`❌ Error obteniendo OS del agente ${agent.id}:`, osError.message);
        }

        // ========== EXTRACCIÓN DE HARDWARE - CORREGIDA ==========
        let hardwareInfo = { ram: "N/A", cpu: "N/A", cores: 0, ramMB: 0 };
        
        try {
          console.log(`🔧 Obteniendo hardware del agente ${agent.id}...`);
          const hwResponse = await wazuhApiCall(`/syscollector/${agent.id}/hardware`);
          
          if (hwResponse && hwResponse.data && hwResponse.data.affected_items && hwResponse.data.affected_items.length > 0) {
            const hwData = hwResponse.data.affected_items[0];
            console.log(`🔩 Hardware Data para agente ${agent.id}:`, JSON.stringify(hwData, null, 2));
            
            // USAR CAMPOS REALES DE WAZUH - ESTRUCTURA CONFIRMADA
            // RAM: viene en KB, convertir a GB
            let ramValue = "N/A";
            let ramMB = 0;
            
            if (hwData.ram && hwData.ram.total) {
              const ramKB = parseInt(hwData.ram.total);
              const ramGB = Math.round(ramKB / (1024 * 1024));
              ramValue = `${ramGB} GB`;
              ramMB = Math.round(ramKB / 1024);
            }
            
            // CPU: extraer nombre y cores
            let cpuName = "N/A";
            let cpuCores = 0;
            
            if (hwData.cpu) {
              cpuName = (hwData.cpu.name || "N/A").trim();
              cpuCores = parseInt(hwData.cpu.cores) || 0;
            }
            
            hardwareInfo = {
              ram: ramValue,
              cpu: cpuName,
              cores: cpuCores,
              ramMB: ramMB
            };
            
            console.log(`✅ Hardware extraído correctamente para ${agent.id}:`, hardwareInfo);
          } else {
            console.warn(`⚠️ No se encontraron datos de hardware para el agente ${agent.id}`);
          }
        } catch (hwError) {
          console.error(`❌ Error obteniendo hardware del agente ${agent.id}:`, hwError.message);
        }

        // ========== EXTRACCIÓN DE INFORMACIÓN DE RED - MEJORADA ==========
        let networkInfo = { 
          mac_address: "N/A", 
          interface_type: "N/A", 
          adapter_name: "N/A", 
          ttl: "N/A",
          interface_status: "N/A",
          speed: "N/A",
          gateway: "N/A",
          dns: "N/A"
        };
        
        try {
          console.log(`🌐 Obteniendo información de red del agente ${agent.id}...`);
          
          // Obtener interfaces de red
          const netResponse = await wazuhApiCall(`/syscollector/${agent.id}/netiface`);
          // Obtener información de protocolos (gateway, DNS)
          const protoResponse = await wazuhApiCall(`/syscollector/${agent.id}/netproto`);
          
          if (netResponse && netResponse.data && netResponse.data.affected_items && netResponse.data.affected_items.length > 0) {
            const interfaces = netResponse.data.affected_items;
            const protocols = protoResponse?.data?.affected_items || [];
            
            console.log(`🔌 Network Data para agente ${agent.id}:`, JSON.stringify(interfaces, null, 2));
            console.log(`🌐 Protocol Data para agente ${agent.id}:`, JSON.stringify(protocols, null, 2));
            
            // NUEVA LÓGICA CORREGIDA: Mejor detección de interfaces
            let mainInterface = null;
            let mainProtocol = null;
            
            // Primero, buscar protocolo IPv4 con gateway válido (solo para equipos conectados)
            const activeProtocol = protocols.find(proto => 
              proto.type === 'ipv4' && 
              proto.gateway && 
              proto.gateway.trim() !== '' && 
              proto.gateway !== ' ' &&
              !proto.iface.includes('Loopback') &&
              !proto.iface.includes('WSL') &&
              !proto.iface.includes('Bluetooth')
            );
            
            if (activeProtocol) {
              console.log(`🎯 Interfaz con gateway encontrada: ${activeProtocol.iface} con gateway: ${activeProtocol.gateway}`);
              
              // Buscar la interfaz física correspondiente
              mainInterface = interfaces.find(iface => 
                iface.name === activeProtocol.iface && 
                iface.mac !== '00:00:00:00:00:00'
              );
              
              mainProtocol = activeProtocol;
            }
            
            // Si no hay gateway (equipo desconectado), buscar la interfaz principal por otros criterios
            if (!mainInterface) {
              console.log(`🔍 No hay gateway, buscando interfaz principal por tráfico...`);
              
              // Filtrar interfaces válidas (excluir virtuales y loopback)
              const validInterfaces = interfaces.filter(iface => 
                iface.mac !== '00:00:00:00:00:00' &&
                !iface.name.includes('Loopback') &&
                !iface.name.includes('WSL') &&
                !iface.name.includes('vEthernet') &&
                !iface.name.includes('Bluetooth') &&
                !iface.name.includes('VirtualBox')
              );
              
              // Ordenar por tráfico total (RX + TX)
              validInterfaces.sort((a, b) => {
                const aTraffic = (a.rx?.bytes || 0) + (a.tx?.bytes || 0);
                const bTraffic = (b.rx?.bytes || 0) + (b.tx?.bytes || 0);
                return bTraffic - aTraffic;
              });
              
              mainInterface = validInterfaces[0];
              console.log(`🔍 Interfaz seleccionada por tráfico: ${mainInterface?.name} con ${((mainInterface?.rx?.bytes || 0) + (mainInterface?.tx?.bytes || 0))} bytes`);
            }
            
            if (mainInterface) {
              // CORREGIR: Mejor detección del tipo de interfaz
              let interfaceType = "Cable";
              const adapterName = (mainInterface.adapter || "").toLowerCase();
              const interfaceName = (mainInterface.name || "").toLowerCase();
              
              // Detectar WiFi de forma más precisa
              if (adapterName.includes('wifi') || 
                  adapterName.includes('wireless') || 
                  adapterName.includes('wi-fi') ||
                  adapterName.includes('802.11') ||
                  interfaceName.includes('wifi') ||
                  interfaceName.includes('wireless')) {
                interfaceType = "WiFi";
              }
              
              // Determinar velocidad basada en el adaptador
              let speed = "N/A";
              if (adapterName.includes('2.5gbe') || adapterName.includes('2.5g')) {
                speed = "2500 Mbps";
              } else if (adapterName.includes('gigabit') || adapterName.includes('1gbe')) {
                speed = "1000 Mbps";
              } else if (adapterName.includes('100m')) {
                speed = "100 Mbps";
              } else if (interfaceType === "WiFi") {
                // Para WiFi, estimar basado en estándares comunes
                if (adapterName.includes('ax') || adapterName.includes('wifi 6')) {
                  speed = "1200 Mbps"; // WiFi 6
                } else if (adapterName.includes('ac') || adapterName.includes('wifi 5')) {
                  speed = "866 Mbps"; // WiFi 5
                } else {
                  speed = "300 Mbps"; // WiFi básico
                }
              } else if (mainInterface.mtu && mainInterface.mtu >= 1500) {
                speed = "1000 Mbps"; // Ethernet Gigabit por defecto
              }
              
              // CORREGIR: Estado real de la interfaz
              let realStatus = "Inactiva";
              if (mainInterface.state === 'up' && activeProtocol && activeProtocol.gateway.trim() !== '') {
                realStatus = "Activa"; // Solo si está UP y tiene gateway
              } else if (mainInterface.state === 'up') {
                realStatus = "Sin conexión"; // UP pero sin gateway
              }
              
              networkInfo = {
                mac_address: mainInterface.mac || "N/A",
                interface_type: interfaceType,
                adapter_name: mainInterface.adapter || mainInterface.name || "N/A",
                ttl: interfaceType === 'WiFi' ? '64' : '64', // TTL estándar
                interface_status: realStatus,
                speed: speed,
                gateway: mainProtocol?.gateway || "N/A",
                dns: mainProtocol ? "Auto" : "N/A"
              };
              
              console.log(`✅ Información de red extraída para ${agent.id}:`, networkInfo);
              console.log(`🔍 Interfaz seleccionada: ${mainInterface.name} (${mainInterface.mac}) - Tipo: ${interfaceType} - Estado: ${realStatus}`);
            } else {
              console.warn(`⚠️ No se encontró interfaz principal para el agente ${agent.id}`);
            }
          } else {
            console.warn(`⚠️ No se encontraron interfaces de red para el agente ${agent.id}`);
          }
        } catch (netError) {
          console.error(`❌ Error obteniendo información de red del agente ${agent.id}:`, netError.message);
        }

        // Analizar vulnerabilidades
        const vulnerabilities = await analyzeAgentVulnerabilities(agent, company.id);
        const criticalityScore = calculateCriticalityScore(vulnerabilities);

        // Actualizar estado de conexión en nuestro sistema de rastreo
        await updateDeviceConnectionStatus(
          company.id, 
          agent.id, 
          agent.name || `Agent-${agent.id}`, 
          agent.status
        );
        
        // Obtener tiempo real de conexión desde nuestro sistema de rastreo
        const lastSeenText = await getDeviceConnectionTime(company.id, agent.id);

        // Crear el objeto del dispositivo con información correcta
        const deviceData = {
          id: agent.id,
          name: agent.name || `Agent-${agent.id}`,
          ip: agent.ip || "N/A",
          os: osInfo,  // ← AHORA CON DATOS REALES
          os_version: osVersion,
          architecture: architecture,
          hardware: hardwareInfo, // ← AHORA CON DATOS REALES
          network: networkInfo, // ← NUEVA INFORMACIÓN DE RED
          status: agent.status,
          last_seen: agent.lastKeepAlive || agent.dateAdd || new Date().toISOString(),
          last_seen_text: lastSeenText,
          vulnerabilities: vulnerabilities,
          criticality_score: criticalityScore,
          group: agent.group ? agent.group.join(", ") : wazuhGroup,
          version: agent.version || "N/A",
          manager_host: agent.manager || "N/A",
          node_name: agent.node_name || agent.name || "N/A",
          date_add: agent.dateAdd || "N/A"
        };

        fullDevicesList.push(deviceData);
        console.log(`✅ Dispositivo procesado: ${agent.name} - OS: ${osInfo} - CPU: ${hardwareInfo.cpu}`);

      } catch (agentError) {
        console.error(`❌ Error procesando agente ${agent.id}:`, agentError);
        
        // Agregar dispositivo con error pero información básica
        fullDevicesList.push({
          id: agent.id,
          name: agent.name || `Agent-${agent.id}`,
          ip: agent.ip || "N/A",
          os: "Error obteniendo información",
          os_version: "N/A",
          architecture: "N/A",
          hardware: { ram: "N/A", cpu: "N/A", cores: 0 },
          network: { mac_address: "N/A", interface_type: "N/A", adapter_name: "N/A", ttl: "N/A", interface_status: "N/A", speed: "N/A", gateway: "N/A", dns: "N/A" },
          status: agent.status,
          last_seen: agent.lastKeepAlive || agent.dateAdd || new Date().toISOString(),
          last_seen_text: "Error",
          vulnerabilities: { critical: 0, high: 0, medium: 0, low: 0 },
          criticality_score: 0,
          group: agent.group ? agent.group.join(", ") : wazuhGroup,
          version: agent.version || "N/A",
          manager_host: agent.manager || "N/A",
          node_name: agent.node_name || agent.name || "N/A",
          date_add: agent.dateAdd || "N/A",
          error: `Error procesando agente: ${agentError.message}`
        });
      }
    }

    console.log(`📊 Total dispositivos procesados: ${fullDevicesList.length}`);

    // ========== APLICAR FILTROS ==========
    let filteredDevices = fullDevicesList;

    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filteredDevices = filteredDevices.filter(device => 
        device.name.toLowerCase().includes(searchLower) ||
        device.ip.toLowerCase().includes(searchLower) ||
        device.os.toLowerCase().includes(searchLower) ||
        device.id.toLowerCase().includes(searchLower)
      );
    }

    // Aplicar filtros de estado
    if (status !== 'all') {
      filteredDevices = filteredDevices.filter(device => device.status === status);
    }

    // ========== APLICAR ORDENAMIENTO ==========
    filteredDevices.sort((a, b) => {
      let aValue = a[sortBy] || '';
      let bValue = b[sortBy] || '';

      // Manejar casos especiales de ordenamiento
      if (sortBy === 'criticality_score') {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      } else if (sortBy === 'last_seen') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      } else {
        aValue = String(aValue).toLowerCase();
        bValue = String(bValue).toLowerCase();
      }

      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : -1;
      }
      return aValue > bValue ? 1 : -1;
    });

    // ========== APLICAR PAGINACIÓN ==========
    const totalDevices = filteredDevices.length;
    const totalPages = Math.ceil(totalDevices / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedDevices = filteredDevices.slice(startIndex, endIndex);

    // ========== CALCULAR ESTADÍSTICAS ==========
    const stats = {
      total: totalDevices,
      active: filteredDevices.filter(d => d.status === 'active').length,
      disconnected: filteredDevices.filter(d => d.status === 'disconnected').length,
      pending: filteredDevices.filter(d => d.status === 'pending').length,
      critical_vulnerabilities: filteredDevices.reduce((sum, d) => sum + d.vulnerabilities.critical, 0),
      high_vulnerabilities: filteredDevices.reduce((sum, d) => sum + d.vulnerabilities.high, 0)
    };

    // ========== RESPUESTA FINAL ==========
    const responseData = {
      company: {
        name: company.name,
        tenant_id: tenantId,
        sector: company.sector
      },
      devices: paginatedDevices,
      stats: stats,
      pagination: {
        total: totalDevices,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1
      },
      filters: { search, status, sortBy, sortOrder },
      analysis_timestamp: new Date().toISOString()
    };

    console.log(`✅ Inventario completado - ${paginatedDevices.length} dispositivos devueltos de ${totalDevices} total`);

    res.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error("❌ Error obteniendo inventario de dispositivos:", error);
    res.status(500).json({
      success: false,
      error: "Error obteniendo inventario de dispositivos",
      details: error.message
    });
  }
};

// ========== FUNCIÓN PARA BUSCAR CVE EN INCIBE ==========
const searchCVEInIncibe = async (req, res) => {
  try {
    const { cve } = req.params;
    
    if (!cve || !cve.match(/^CVE-\d{4}-\d+$/)) {
      return res.status(400).json({
        success: false,
        error: "Formato de CVE inválido. Debe ser CVE-YYYY-NNNN"
      });
    }

    console.log(`🔍 Buscando CVE ${cve} en INCIBE...`);

    // Realizar búsqueda en INCIBE usando web scraping
    const cheerio = require('cheerio');
    const searchUrl = 'https://www.incibe.es/incibe-cert/alerta-temprana/vulnerabilidades';
    
    // Simular una búsqueda POST al formulario de INCIBE
    const formData = new URLSearchParams();
    formData.append('field_vulnerability_title_es', cve);
    
    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      body: formData
    });

    if (!response.ok) {
      // Si el POST falla, intentar con GET y parámetros de búsqueda
      const getUrl = `${searchUrl}?field_vulnerability_title_es=${encodeURIComponent(cve)}`;
      const getResponse = await fetch(getUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (getResponse.ok) {
        const html = await getResponse.text();
        const $ = cheerio.load(html);
        
        // Buscar el elemento que contiene el CVE
        const cveElement = $(`h2.node-title:contains("${cve}")`).first();
        
        if (cveElement.length > 0) {
          // Intentar encontrar el enlace del artículo
          const articleLink = cveElement.closest('article').find('a').first();
          let resultUrl = searchUrl;
          
          if (articleLink.length > 0) {
            const href = articleLink.attr('href');
            if (href) {
              resultUrl = href.startsWith('http') ? href : `https://www.incibe.es${href}`;
            }
          }
          
          return res.json({
            success: true,
            data: {
              cve: cve,
              found: true,
              url: resultUrl,
              title: cveElement.text().trim(),
              searchUrl: getUrl
            }
          });
        }
      }
    }

    // Si no se encuentra, devolver URL de búsqueda general
    const fallbackUrl = `${searchUrl}?field_vulnerability_title_es=${encodeURIComponent(cve)}`;
    
    res.json({
      success: true,
      data: {
        cve: cve,
        found: false,
        url: fallbackUrl,
        message: `CVE ${cve} no encontrado en INCIBE. Redirigiendo a búsqueda general.`,
        searchUrl: fallbackUrl
      }
    });

  } catch (error) {
    console.error(`❌ Error buscando CVE ${req.params.cve}:`, error);
    
    // Fallback: devolver URL de búsqueda manual
    const fallbackUrl = `https://www.incibe.es/incibe-cert/alerta-temprana/vulnerabilidades?field_vulnerability_title_es=${encodeURIComponent(req.params.cve || '')}`;
    
    res.json({
      success: true,
      data: {
        cve: req.params.cve,
        found: false,
        url: fallbackUrl,
        error: "Error en la búsqueda automática. Redirigiendo a búsqueda manual.",
        searchUrl: fallbackUrl
      }
    });
  }
};

// ========== EXPORTAR TODAS LAS FUNCIONES ==========
module.exports = {
  getCompanyStats,
  getCriticalDevices,
  getAllCompanyDevices,
  searchCVEInIncibe
};

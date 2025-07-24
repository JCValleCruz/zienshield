const express = require('express');

const router = express.Router();

// Simulación de base de datos de agentes
const mockAgents = new Map();

// Inicializar con el agente esperado
mockAgents.set('agent-windows-001', {
  agent_id: 'agent-windows-001',
  hostname: 'pc-axafone-jcvalle',
  tenant_id: 'demo_tenant',
  enrollment_time: new Date().toISOString(),
  last_seen: new Date().toISOString(),
  status: 'online',
  os_info: {
    system: 'Windows',
    release: '10',
    version: '10.0.19044',
    machine: 'AMD64'
  }
});

// Función para obtener IP pública (simulada)
const getPublicIP = () => {
  // En producción, esto se obtendría del agente o mediante geolocalización IP
  const publicIPs = [
    '194.164.172.92',
    '203.0.113.45',
    '198.51.100.78',
    '172.16.0.15'
  ];
  return publicIPs[Math.floor(Math.random() * publicIPs.length)];
};

// Función para generar métricas realistas
const generateRealisticMetrics = (agentId, hostname) => {
  const baseTime = Date.now();
  
  // Dominios más comunes por categoría
  const domainsByCategory = {
    work: ['office.com', 'outlook.com', 'sharepoint.com', 'teams.microsoft.com', 'google.com'],
    social: ['facebook.com', 'instagram.com', 'linkedin.com', 'twitter.com', 'whatsapp.com'],
    video: ['youtube.com', 'netflix.com', 'twitch.tv', 'vimeo.com', 'dailymotion.com'],
    shopping: ['amazon.com', 'mercadolibre.com', 'ebay.com', 'shopify.com', 'aliexpress.com'],
    news: ['cnn.com', 'bbc.com', 'reddit.com', 'news.google.com', 'medium.com'],
    streaming: ['spotify.com', 'apple.com', 'soundcloud.com', 'pandora.com', 'deezer.com'],
    gaming: ['steam.com', 'epic.com', 'battle.net', 'origin.com', 'uplay.com']
  };

  // Seleccionar dominios aleatorios
  const selectedDomains = {};
  const categories = Object.keys(domainsByCategory);
  
  // Agregar 3-7 dominios aleatorios
  const numDomains = Math.floor(Math.random() * 5) + 3;
  for (let i = 0; i < numDomains; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const domains = domainsByCategory[category];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    
    if (!selectedDomains[domain]) {
      // Datos realistas fijos por dominio
      const domainTransfers = {
        'google.com': '2.45',
        'youtube.com': '8.92',
        'facebook.com': '1.23',
        'office.com': '0.87',
        'netflix.com': '15.67',
        'amazon.com': '3.21',
        'spotify.com': '4.56',
        'teams.microsoft.com': '1.98'
      };
      
      selectedDomains[domain] = {
        connections: Math.floor(Math.random() * 10) + 1,
        processes: getRandomProcesses(),
        ports: getRandomPorts(),
        category: category,
        first_seen: new Date(baseTime - Math.random() * 3600000).toISOString(),
        last_seen: new Date().toISOString(),
        data_transfer_gb: domainTransfers[domain] || '0.45' // GB fijos realistas
      };
    }
  }

  // Generar procesos de navegadores
  const browsers = ['chrome', 'firefox', 'msedge', 'safari', 'opera'];
  const browserProcesses = [];
  const numBrowsers = Math.floor(Math.random() * 3) + 1;
  
  for (let i = 0; i < numBrowsers; i++) {
    const browser = browsers[Math.floor(Math.random() * browsers.length)];
    browserProcesses.push({
      browser: browser,
      pid: Math.floor(Math.random() * 10000) + 1000,
      name: `${browser}.exe`,
      cpu_percent: Math.random() * 25,
      memory_mb: Math.random() * 400 + 100
    });
  }

  // Métricas del sistema con patrones realistas
  const hourOfDay = new Date().getHours();
  const isWorkHours = hourOfDay >= 8 && hourOfDay <= 18;
  
  const baseCPU = isWorkHours ? 30 : 10;
  const baseMemory = isWorkHours ? 60 : 40;
  
  const systemMetrics = {
    cpu_percent: Math.max(0, Math.min(100, baseCPU + (Math.random() - 0.5) * 40)),
    memory_percent: Math.max(0, Math.min(100, baseMemory + (Math.random() - 0.5) * 30)),
    disk_usage: Math.max(40, Math.min(95, 70 + (Math.random() - 0.5) * 20)),
    network_sent: Math.random() * 1000000000,
    network_recv: Math.random() * 2000000000
  };

  // Calcular categorías
  const categoryStats = {};
  Object.values(selectedDomains).forEach(domain => {
    if (!categoryStats[domain.category]) {
      categoryStats[domain.category] = { domains: 0, connections: 0 };
    }
    categoryStats[domain.category].domains += 1;
    categoryStats[domain.category].connections += domain.connections;
  });

  return {
    agent_id: agentId,
    hostname: hostname,
    timestamp: new Date().toISOString(),
    session_duration_minutes: Math.random() * 480 + 30,
    total_connections: Object.values(selectedDomains).reduce((sum, d) => sum + d.connections, 0),
    total_domains: Object.keys(selectedDomains).length,
    active_browsers: browserProcesses.length,
    domain_stats: selectedDomains,
    browser_processes: browserProcesses,
    system_metrics: systemMetrics,
    public_ip: getPublicIP(),
    top_domains: Object.entries(selectedDomains)
      .map(([domain, data]) => [domain, data.connections])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10),
    domains_by_transfer: Object.entries(selectedDomains)
      .map(([domain, data]) => [domain, parseFloat(data.data_transfer_gb)])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10),
    category_summary: categoryStats,
    status: Math.random() > 0.05 ? 'online' : Math.random() > 0.7 ? 'warning' : 'offline',
    last_update: new Date().toISOString()
  };
};

const getRandomProcesses = () => {
  const processes = ['chrome.exe', 'firefox.exe', 'msedge.exe', 'outlook.exe', 'teams.exe'];
  const numProcesses = Math.floor(Math.random() * 3) + 1;
  const selected = [];
  
  for (let i = 0; i < numProcesses; i++) {
    const process = processes[Math.floor(Math.random() * processes.length)];
    if (!selected.includes(process)) {
      selected.push(process);
    }
  }
  
  return selected;
};

const getRandomPorts = () => {
  const commonPorts = [80, 443, 8080, 3000, 5000, 8443];
  const numPorts = Math.floor(Math.random() * 3) + 1;
  const selected = [];
  
  for (let i = 0; i < numPorts; i++) {
    const port = commonPorts[Math.floor(Math.random() * commonPorts.length)];
    if (!selected.includes(port)) {
      selected.push(port);
    }
  }
  
  return selected;
};

// Obtener lista de equipos monitoreados
router.get('/agents', async (req, res) => {
  try {
    console.log('📋 Solicitando lista de equipos monitoreados...');
    
    // Intentar obtener agentes reales enrolados
    let realAgents = [];
    try {
      const response = await fetch('http://localhost:3001/api/web-traffic/agents');
      const webTrafficData = await response.json();
      
      if (webTrafficData.success && webTrafficData.agents) {
        realAgents = webTrafficData.agents.map(agent => ({
          agent_id: agent.agent_id,
          hostname: agent.hostname,
          tenant_id: 'real_tenant',
          enrollment_time: new Date().toISOString(),
          last_seen: agent.last_seen || new Date().toISOString(),
          status: agent.status === 'active' ? 'online' : 'offline',
          os_info: agent.os_info || { system: 'Unknown', release: 'Unknown' }
        }));
        console.log(`✅ Encontrados ${realAgents.length} agentes reales enrolados`);
      }
    } catch (fetchError) {
      console.log('⚠️  No se pudieron obtener agentes reales:', fetchError.message);
    }
    
    // Combinar agentes reales con mock si es necesario
    const allAgents = realAgents.length > 0 ? realAgents : Array.from(mockAgents.values());
    
    const agents = allAgents.map(agent => ({
      ...agent,
      ...generateRealisticMetrics(agent.agent_id, agent.hostname)
    }));

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      total_agents: agents.length,
      agents: agents,
      source: realAgents.length > 0 ? 'real_agents' : 'mock_agents',
      summary: {
        online: agents.filter(a => a.status === 'online').length,
        warning: agents.filter(a => a.status === 'warning').length,
        offline: agents.filter(a => a.status === 'offline').length,
        total_connections: agents.reduce((sum, a) => sum + a.total_connections, 0),
        total_domains: agents.reduce((sum, a) => sum + a.total_domains, 0)
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo lista de equipos:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo lista de equipos',
      details: error.message
    });
  }
});

// Obtener métricas de un equipo específico
router.get('/agents/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    console.log(`📊 Solicitando métricas del equipo: ${agentId}`);

    const agent = mockAgents.get(agentId);
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Equipo no encontrado'
      });
    }

    const metrics = generateRealisticMetrics(agent.agent_id, agent.hostname);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      agent: {
        ...agent,
        ...metrics
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo métricas del equipo:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo métricas del equipo',
      details: error.message
    });
  }
});

// Obtener estadísticas históricas de red por dominio
router.get('/network-stats/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { hours = 24 } = req.query;
    
    console.log(`📈 Solicitando estadísticas de red para ${agentId} (${hours}h)`);

    // Generar datos históricos simulados
    const historicalData = [];
    const now = new Date();
    
    for (let i = parseInt(hours); i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      
      historicalData.push({
        timestamp: timestamp.toISOString(),
        connections: Math.floor(Math.random() * 20) + 5,
        domains: Math.floor(Math.random() * 8) + 3,
        bytes_sent: Math.random() * 100000000,
        bytes_received: Math.random() * 200000000,
        top_domains: [
          { domain: 'google.com', connections: Math.floor(Math.random() * 5) + 1 },
          { domain: 'office.com', connections: Math.floor(Math.random() * 4) + 1 },
          { domain: 'youtube.com', connections: Math.floor(Math.random() * 3) + 1 }
        ]
      });
    }

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      agent_id: agentId,
      period_hours: parseInt(hours),
      data: historicalData
    });

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas de red:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estadísticas de red',
      details: error.message
    });
  }
});

// Obtener análisis de tráfico por categorías
router.get('/traffic-analysis', async (req, res) => {
  try {
    console.log('📊 Solicitando análisis de tráfico por categorías...');

    // Generar análisis de tráfico simulado
    const categories = ['work', 'social', 'video', 'shopping', 'news', 'streaming', 'gaming', 'other'];
    const categoryAnalysis = categories.map(category => ({
      category,
      total_connections: Math.floor(Math.random() * 100) + 10,
      unique_domains: Math.floor(Math.random() * 20) + 3,
      total_agents: Math.floor(Math.random() * 5) + 1,
      avg_session_time: Math.floor(Math.random() * 120) + 15, // minutos
      bandwidth_mb: Math.floor(Math.random() * 500) + 50,
      top_domains: [
        `example1-${category}.com`,
        `example2-${category}.com`,
        `example3-${category}.com`
      ]
    }));

    const totalStats = {
      total_connections: categoryAnalysis.reduce((sum, cat) => sum + cat.total_connections, 0),
      total_domains: categoryAnalysis.reduce((sum, cat) => sum + cat.unique_domains, 0),
      total_bandwidth_mb: categoryAnalysis.reduce((sum, cat) => sum + cat.bandwidth_mb, 0),
      active_agents: mockAgents.size
    };

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      total_stats: totalStats,
      categories: categoryAnalysis,
      period: '24h'
    });

  } catch (error) {
    console.error('❌ Error obteniendo análisis de tráfico:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo análisis de tráfico',
      details: error.message
    });
  }
});

// Endpoint para alertas de equipos
router.get('/alerts', async (req, res) => {
  try {
    console.log('🚨 Solicitando alertas de equipos...');

    const alerts = [
      {
        id: 'alert-001',
        agent_id: 'agent-001',
        hostname: 'WS-CONTABILIDAD-01',
        type: 'high_cpu',
        severity: 'warning',
        message: 'Alto uso de CPU detectado (85%)',
        timestamp: new Date(Date.now() - 300000).toISOString(), // 5 minutos atrás
        resolved: false
      },
      {
        id: 'alert-002',
        agent_id: 'agent-002',
        hostname: 'WS-MARKETING-02',
        type: 'suspicious_domain',
        severity: 'high',
        message: 'Conexión a dominio sospechoso detectada',
        timestamp: new Date(Date.now() - 900000).toISOString(), // 15 minutos atrás
        resolved: false
      },
      {
        id: 'alert-003',
        agent_id: 'agent-001',
        hostname: 'WS-CONTABILIDAD-01',
        type: 'high_memory',
        severity: 'info',
        message: 'Uso de memoria por encima del 80%',
        timestamp: new Date(Date.now() - 1800000).toISOString(), // 30 minutos atrás
        resolved: true
      }
    ];

    const summary = {
      total: alerts.length,
      unresolved: alerts.filter(a => !a.resolved).length,
      by_severity: {
        high: alerts.filter(a => a.severity === 'high').length,
        warning: alerts.filter(a => a.severity === 'warning').length,
        info: alerts.filter(a => a.severity === 'info').length
      }
    };

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary,
      alerts: alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    });

  } catch (error) {
    console.error('❌ Error obteniendo alertas:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo alertas de equipos',
      details: error.message
    });
  }
});

module.exports = router;
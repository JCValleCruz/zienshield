const express = require('express');
const { getWebMetricsService } = require('../services/metricsService');

const router = express.Router();

// Obtener estadísticas generales de tráfico web
router.get('/stats', async (req, res) => {
  try {
    console.log('📊 Solicitando estadísticas de tráfico web...');
    
    const webService = getWebMetricsService();
    if (!webService) {
      return res.status(503).json({
        success: false,
        error: 'Servicio de métricas web no disponible aún',
        message: 'El servicio se está inicializando, intenta en unos segundos'
      });
    }

    const stats = await webService.getWebTrafficStats();

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: stats
    });

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas web:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estadísticas de tráfico web',
      details: error.message
    });
  }
});

// Obtener métricas de dominios
router.get('/domains', async (req, res) => {
  try {
    console.log('🌐 Solicitando métricas de dominios...');
    
    const webService = getWebMetricsService();
    if (!webService) {
      return res.status(503).json({
        success: false,
        error: 'Servicio de métricas web no disponible'
      });
    }

    const domainMetrics = await webService.getDomainMetrics();

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: domainMetrics
    });

  } catch (error) {
    console.error('❌ Error obteniendo métricas de dominios:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo métricas de dominios',
      details: error.message
    });
  }
});

// Obtener métricas de navegadores
router.get('/browsers', async (req, res) => {
  try {
    console.log('🌐 Solicitando métricas de navegadores...');
    
    const webService = getWebMetricsService();
    if (!webService) {
      return res.status(503).json({
        success: false,
        error: 'Servicio de métricas web no disponible'
      });
    }

    const browserMetrics = await webService.getBrowserMetrics();

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: browserMetrics
    });

  } catch (error) {
    console.error('❌ Error obteniendo métricas de navegadores:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo métricas de navegadores',
      details: error.message
    });
  }
});

// Obtener top dominios por categoría
router.get('/categories/:category', async (req, res) => {
  try {
    const category = req.params.category;
    console.log(`📊 Solicitando dominios de categoría: ${category}`);
    
    const webService = getWebMetricsService();
    if (!webService) {
      return res.status(503).json({
        success: false,
        error: 'Servicio de métricas web no disponible'
      });
    }

    const stats = await webService.getWebTrafficStats();
    
    // Filtrar dominios por categoría
    const categoryDomains = stats.topDomains.filter(domain => 
      domain.category === category
    );

    // Obtener stats de la categoría
    const categoryStats = stats.categoriesBreakdown.find(cat => 
      cat.category === category
    );

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        category: category,
        stats: categoryStats || { category, connections: 0, domains: 0, agents: 0 },
        domains: categoryDomains
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo métricas por categoría:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo métricas por categoría',
      details: error.message
    });
  }
});

// Obtener actividad reciente
router.get('/activity/recent', async (req, res) => {
  try {
    console.log('⏰ Solicitando actividad reciente...');
    
    const webService = getWebMetricsService();
    if (!webService) {
      return res.status(503).json({
        success: false,
        error: 'Servicio de métricas web no disponible'
      });
    }

    const stats = await webService.getWebTrafficStats();

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        recentActivity: stats.recentActivity || [],
        summary: stats.summary
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo actividad reciente:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo actividad reciente',
      details: error.message
    });
  }
});

// Endpoint para testear el agente (simular datos)
router.post('/test-data', async (req, res) => {
  try {
    console.log('🧪 Recibiendo datos de prueba...');
    
    // Datos de prueba simulados
    const testData = {
      timestamp: new Date().toISOString(),
      agent_id: 'test-agent',
      total_connections: 15,
      total_domains: 5,
      active_browsers: 2,
      domain_stats: {
        'youtube.com': { connections: 5, ports: [443, 80], category: 'video' },
        'facebook.com': { connections: 3, ports: [443], category: 'social' },
        'google.com': { connections: 4, ports: [443, 80], category: 'work' },
        'netflix.com': { connections: 2, ports: [443], category: 'video' },
        'github.com': { connections: 1, ports: [443], category: 'work' }
      },
      browser_processes: [
        { browser: 'chrome', pid: 1234, cpu_percent: 15.5 },
        { browser: 'firefox', pid: 5678, cpu_percent: 8.2 }
      ],
      categories_summary: {
        'video': { connections: 7, domains: 2 },
        'social': { connections: 3, domains: 1 },
        'work': { connections: 5, domains: 2 }
      }
    };

    // En un escenario real, esto vendría del agente
    res.json({
      success: true,
      message: 'Datos de prueba recibidos',
      data: testData
    });

  } catch (error) {
    console.error('❌ Error procesando datos de prueba:', error);
    res.status(500).json({
      success: false,
      error: 'Error procesando datos de prueba',
      details: error.message
    });
  }
});

// Endpoint para enrolar agentes
router.post('/enroll', async (req, res) => {
  try {
    console.log('🔗 Enrolando nuevo agente...');
    
    const {
      agent_id,
      hostname,
      os_info,
      enrollment_time,
      agent_version
    } = req.body;

    // Validar datos requeridos
    if (!agent_id || !hostname) {
      return res.status(400).json({
        success: false,
        error: 'agent_id y hostname son requeridos'
      });
    }

    // Registrar agente (en producción, guardar en base de datos)
    const agentInfo = {
      agent_id,
      hostname,
      os_info: os_info || {},
      enrollment_time: enrollment_time || new Date().toISOString(),
      agent_version: agent_version || '1.0.0',
      status: 'enrolled',
      last_seen: new Date().toISOString()
    };

    console.log(`✅ Agente enrolado: ${hostname} (${agent_id})`);

    res.json({
      success: true,
      message: 'Agente enrolado exitosamente',
      agent_info: agentInfo,
      server_config: {
        metrics_endpoint: '/api/web-traffic/metrics',
        collection_interval: 30,
        server_version: '1.0.0'
      }
    });

  } catch (error) {
    console.error('❌ Error en enrolamiento:', error);
    res.status(500).json({
      success: false,
      error: 'Error procesando enrolamiento',
      details: error.message
    });
  }
});

// Base de datos simple en memoria para agentes activos
const activeAgents = new Map();

// Endpoint para recibir métricas de agentes
router.post('/metrics', async (req, res) => {
  try {
    console.log('📊 Recibiendo métricas de agente...');
    
    const metrics = req.body;
    
    // Validar datos básicos
    if (!metrics.agent_id) {
      return res.status(400).json({
        success: false,
        error: 'agent_id es requerido'
      });
    }

    // Registrar/actualizar agente activo
    activeAgents.set(metrics.agent_id, {
      agent_id: metrics.agent_id,
      hostname: metrics.agent_id,
      status: 'active',
      last_seen: new Date().toISOString(),
      last_metrics: metrics,
      os_info: { 
        system: 'Unknown',
        release: 'Unknown'
      }
    });

    // Procesar métricas (en producción, guardar en base de datos)
    console.log(`📈 Métricas de ${metrics.agent_id}:`);
    console.log(`   - Conexiones: ${metrics.total_connections || 0}`);
    console.log(`   - Dominios: ${metrics.total_domains || 0}`);
    console.log(`   - Navegadores: ${metrics.active_browsers || 0}`);
    
    if (metrics.top_domains && metrics.top_domains.length > 0) {
      console.log(`   - Top dominio: ${metrics.top_domains[0][0]} (${metrics.top_domains[0][1]} conexiones)`);
    }

    // Procesar métricas para Prometheus
    const webService = getWebMetricsService();
    if (webService && webService.parser) {
      // Emitir evento para actualizar métricas Prometheus
      webService.parser.emit('webTrafficData', metrics);
      console.log('📊 Métricas enviadas al servicio Prometheus');
    } else {
      console.log('⚠️ Servicio de métricas web no disponible aún');
    }

    res.json({
      success: true,
      message: 'Métricas recibidas correctamente',
      timestamp: new Date().toISOString(),
      processed: {
        agent_id: metrics.agent_id,
        connections: metrics.total_connections || 0,
        domains: metrics.total_domains || 0
      }
    });

  } catch (error) {
    console.error('❌ Error procesando métricas:', error);
    res.status(500).json({
      success: false,
      error: 'Error procesando métricas',
      details: error.message
    });
  }
});

// Endpoint para obtener resumen de equipos con métricas web para dashboard
router.get('/dashboard-summary', async (req, res) => {
  try {
    console.log('📊 Solicitando resumen de equipos para dashboard...');
    
    const webService = getWebMetricsService();
    if (!webService) {
      return res.status(503).json({
        success: false,
        error: 'Servicio de métricas web no disponible'
      });
    }

    // Obtener estadísticas agregadas
    const stats = await webService.getWebTrafficStats();
    
    // Procesar agentes activos con sus métricas más recientes
    const equipos = Array.from(activeAgents.values()).map(agent => {
      const lastMetrics = agent.last_metrics || {};
      
      // Calcular tiempo desde última actividad
      const lastSeen = new Date(agent.last_seen);
      const now = new Date();
      const minutesAgo = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60));
      
      // Determinar estado del equipo
      let status = 'active';
      let statusColor = 'green';
      if (minutesAgo > 5) {
        status = 'warning';
        statusColor = 'yellow';
      }
      if (minutesAgo > 15) {
        status = 'offline';
        statusColor = 'red';
      }
      
      // Obtener top categorías
      const categories = lastMetrics.categories_summary || {};
      const topCategories = Object.entries(categories)
        .sort(([,a], [,b]) => (b.connections || 0) - (a.connections || 0))
        .slice(0, 3)
        .map(([category, data]) => ({
          name: category,
          connections: data.connections || 0
        }));
      
      // Obtener navegadores activos
      const browsers = lastMetrics.browser_processes || [];
      const browserSummary = browsers.reduce((acc, browser) => {
        const name = browser.browser || 'unknown';
        acc[name] = (acc[name] || 0) + (browser.process_count || 1);
        return acc;
      }, {});
      
      return {
        agent_id: agent.agent_id,
        hostname: agent.hostname || agent.agent_id,
        username: lastMetrics.username || 'unknown',
        os_info: agent.os_info || lastMetrics.os_info || { system: 'Unknown', release: 'Unknown' },
        status,
        status_color: statusColor,
        last_seen: agent.last_seen,
        minutes_ago: minutesAgo,
        metrics: {
          total_connections: lastMetrics.total_connections || 0,
          total_domains: lastMetrics.total_domains || 0,
          active_browsers: lastMetrics.active_browsers || 0,
          browser_types: Object.keys(browserSummary).length,
          top_categories: topCategories,
          browser_summary: browserSummary,
          top_domains: (lastMetrics.top_domains || []).slice(0, 5).map(([domain, connections]) => ({
            domain,
            connections,
            category: lastMetrics.domain_stats?.[domain]?.category || 'other'
          }))
        }
      };
    });

    // Agregar estadísticas globales
    const summary = {
      total_agents: equipos.length,
      active_agents: equipos.filter(e => e.status === 'active').length,
      warning_agents: equipos.filter(e => e.status === 'warning').length,
      offline_agents: equipos.filter(e => e.status === 'offline').length,
      total_connections: equipos.reduce((sum, e) => sum + e.metrics.total_connections, 0),
      total_domains: equipos.reduce((sum, e) => sum + e.metrics.total_domains, 0),
      total_browsers: equipos.reduce((sum, e) => sum + e.metrics.active_browsers, 0),
      last_updated: new Date().toISOString()
    };

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary,
      equipos: equipos.sort((a, b) => b.metrics.total_connections - a.metrics.total_connections)
    });

  } catch (error) {
    console.error('❌ Error obteniendo resumen de equipos:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo resumen de equipos',
      details: error.message
    });
  }
});

// Endpoint para listar agentes enrolados
router.get('/agents', async (req, res) => {
  try {
    console.log('📋 Solicitando lista de agentes...');
    
    // Combinar agentes mock con agentes reales que han enviado métricas
    const mockAgents = [
      {
        agent_id: 'ubuntu-server-001',
        hostname: 'ubuntu',
        status: 'active',
        last_seen: new Date().toISOString(),
        os_info: { system: 'Linux', release: '6.8.0-64-generic' }
      }
    ];

    // Agregar agentes activos que han enviado métricas
    const realAgents = Array.from(activeAgents.values()).map(agent => ({
      agent_id: agent.agent_id,
      hostname: agent.hostname,
      status: agent.status,
      last_seen: agent.last_seen,
      os_info: agent.os_info
    }));

    // Combinar sin duplicados
    const allAgents = [...mockAgents];
    realAgents.forEach(realAgent => {
      const exists = allAgents.some(agent => agent.agent_id === realAgent.agent_id);
      if (!exists) {
        allAgents.push(realAgent);
      }
    });

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      total_agents: allAgents.length,
      agents: allAgents
    });

  } catch (error) {
    console.error('❌ Error obteniendo agentes:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo lista de agentes',
      details: error.message
    });
  }
});

// Exportar también el Map de agentes activos
module.exports = router;
module.exports.activeAgents = activeAgents;
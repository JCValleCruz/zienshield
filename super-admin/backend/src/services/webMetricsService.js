const client = require('prom-client');
const WebTrafficParser = require('./webTrafficParser');

class WebMetricsService {
  constructor(register) {
    this.register = register || client.register;
    this.parser = new WebTrafficParser();
    
    // Crear métricas de Prometheus para tráfico web
    this.createWebMetrics();
    
    // Inicializar parser
    this.initializeParser();
  }

  createWebMetrics() {
    // 1. Conexiones totales por dominio
    this.domainConnectionsTotal = new client.Counter({
      name: 'zienshield_web_domain_connections_total',
      help: 'Total number of connections by domain',
      labelNames: ['domain', 'category', 'agent'],
      registers: [this.register]
    });

    // 2. Conexiones por categoría de sitio
    this.categoryConnectionsTotal = new client.Counter({
      name: 'zienshield_web_category_connections_total', 
      help: 'Total connections by website category',
      labelNames: ['category'],
      registers: [this.register]
    });

    // 3. Dominios únicos visitados
    this.uniqueDomainsGauge = new client.Gauge({
      name: 'zienshield_web_unique_domains',
      help: 'Number of unique domains being accessed',
      labelNames: ['agent'],
      registers: [this.register]
    });

    // 4. Navegadores activos por agente
    this.activeBrowsersGauge = new client.Gauge({
      name: 'zienshield_web_active_browsers',
      help: 'Number of active browsers',
      labelNames: ['agent', 'browser'],
      registers: [this.register]
    });

    // 5. Tiempo de sesión por dominio (simulado por ahora)
    this.domainSessionTime = new client.Histogram({
      name: 'zienshield_web_domain_session_seconds',
      help: 'Time spent on each domain in seconds',
      labelNames: ['domain', 'category', 'agent'],
      buckets: [60, 300, 900, 1800, 3600, 7200, 14400], // 1min, 5min, 15min, 30min, 1h, 2h, 4h
      registers: [this.register]
    });

    // 6. Top dominios por conexiones
    this.topDomainsGauge = new client.Gauge({
      name: 'zienshield_web_top_domain_rank',
      help: 'Ranking of top domains by connection count',
      labelNames: ['domain', 'category', 'rank'],
      registers: [this.register]
    });

    // 7. Actividad web por hora del día
    this.hourlyActivityGauge = new client.Gauge({
      name: 'zienshield_web_hourly_activity',
      help: 'Web activity by hour of day',
      labelNames: ['hour', 'agent'],
      registers: [this.register]
    });

    // 8. Puertos únicos por dominio
    this.domainPortsGauge = new client.Gauge({
      name: 'zienshield_web_domain_unique_ports',
      help: 'Number of unique ports used by domain',
      labelNames: ['domain', 'category'],
      registers: [this.register]
    });

    // 9. Agentes activos de monitoreo web
    this.activeWebAgentsGauge = new client.Gauge({
      name: 'zienshield_web_active_agents',
      help: 'Number of active web monitoring agents',
      registers: [this.register]
    });

    // 10. Rate de nuevas conexiones
    this.connectionRateGauge = new client.Gauge({
      name: 'zienshield_web_connection_rate',
      help: 'Rate of new web connections per minute',
      labelNames: ['agent'],
      registers: [this.register]
    });

    console.log('📊 Métricas web de Prometheus creadas');
  }

  async initializeParser() {
    try {
      // Configurar listeners del parser
      this.parser.on('webTrafficData', (data) => {
        this.updateMetricsFromTrafficData(data);
      });

      this.parser.on('aggregatedData', (stats) => {
        this.updateAggregatedMetrics(stats);
      });

      // Iniciar parser
      await this.parser.startWatching();

      // Limpiar datos antiguos cada hora
      setInterval(() => {
        this.parser.cleanupOldData(24); // 24 horas
      }, 60 * 60 * 1000);

      console.log('✅ Servicio de métricas web inicializado');

    } catch (error) {
      console.error('❌ Error inicializando parser de tráfico web:', error);
    }
  }

  updateMetricsFromTrafficData(data) {
    try {
      const agent = data.agent_id;
      const timestamp = new Date(data.timestamp);
      const hour = timestamp.getHours();

      // Actualizar métricas básicas por agente
      this.uniqueDomainsGauge.set(
        { agent }, 
        data.total_domains || 0
      );

      this.hourlyActivityGauge.set(
        { hour: hour.toString(), agent },
        data.total_connections || 0
      );

      // Actualizar métricas de navegadores
      if (data.browser_processes) {
        // Primero resetear métricas de navegadores para este agente
        const browserCounts = {};
        data.browser_processes.forEach(browser => {
          const browserName = browser.browser;
          browserCounts[browserName] = (browserCounts[browserName] || 0) + 1;
        });

        // Actualizar métricas
        Object.entries(browserCounts).forEach(([browser, count]) => {
          this.activeBrowsersGauge.set({ agent, browser }, count);
        });
      }

      // Actualizar métricas de dominios
      if (data.domain_stats) {
        Object.entries(data.domain_stats).forEach(([domain, stats]) => {
          const category = stats.category || 'other';
          const connections = stats.connections || 0;
          const ports = stats.ports ? stats.ports.length : 0;

          // Incrementar contador de conexiones
          this.domainConnectionsTotal.inc(
            { domain, category, agent },
            connections
          );

          // Actualizar puertos únicos
          this.domainPortsGauge.set(
            { domain, category },
            ports
          );

          // Simular tiempo de sesión (basado en número de conexiones)
          const estimatedSessionTime = connections * 30; // 30 segundos por conexión
          this.domainSessionTime.observe(
            { domain, category, agent },
            estimatedSessionTime
          );
        });
      }

      // Actualizar métricas de categorías
      if (data.categories_summary) {
        Object.entries(data.categories_summary).forEach(([category, stats]) => {
          this.categoryConnectionsTotal.inc(
            { category },
            stats.connections || 0
          );
        });
      }

      console.log(`📊 Métricas actualizadas para agente ${agent}`);

    } catch (error) {
      console.error('❌ Error actualizando métricas de tráfico:', error);
    }
  }

  updateAggregatedMetrics(stats) {
    try {
      // Actualizar número de agentes activos
      this.activeWebAgentsGauge.set(stats.summary.totalAgents || 0);

      // Actualizar ranking de top dominios
      if (stats.topDomains) {
        stats.topDomains.forEach((domainInfo, index) => {
          this.topDomainsGauge.set(
            {
              domain: domainInfo.domain,
              category: domainInfo.category,
              rank: (index + 1).toString()
            },
            domainInfo.connections
          );
        });
      }

      // Calcular rate de conexiones (aproximado)
      if (stats.recentActivity && stats.recentActivity.length > 1) {
        const recent = stats.recentActivity.slice(-5); // Últimos 5 puntos
        const totalConnections = recent.reduce((sum, point) => sum + point.connections, 0);
        const avgConnectionsPerMinute = totalConnections / 5; // Promedio

        // Actualizar por cada agente único en actividad reciente
        const agents = [...new Set(recent.map(point => point.agent))];
        agents.forEach(agent => {
          this.connectionRateGauge.set({ agent }, avgConnectionsPerMinute);
        });
      }

    } catch (error) {
      console.error('❌ Error actualizando métricas agregadas:', error);
    }
  }

  // Obtener estadísticas para API
  async getWebTrafficStats() {
    try {
      return this.parser.getAggregatedStats();
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas web:', error);
      return {
        summary: { totalAgents: 0, totalDomains: 0, totalCategories: 0 },
        topDomains: [],
        categoriesBreakdown: [],
        agentsSummary: []
      };
    }
  }

  // Método para obtener métricas específicas
  async getDomainMetrics() {
    const stats = await this.getWebTrafficStats();
    return {
      totalDomains: stats.summary.totalDomains,
      topDomains: stats.topDomains,
      categoriesBreakdown: stats.categoriesBreakdown
    };
  }

  async getBrowserMetrics() {
    const stats = await this.getWebTrafficStats();
    return {
      activeBrowsers: stats.summary.activeBrowsers,
      agentsSummary: stats.agentsSummary.map(agent => ({
        agent: agent.agent,
        browsers: agent.browsers,
        lastSeen: agent.lastSeen
      }))
    };
  }

  // Parar el servicio
  async stop() {
    if (this.parser) {
      await this.parser.stopWatching();
    }
    console.log('🛑 Servicio de métricas web detenido');
  }
}

module.exports = WebMetricsService;
const fs = require('fs').promises;
const path = require('path');
const { EventEmitter } = require('events');

class WebTrafficParser extends EventEmitter {
  constructor(logFilePath = '/home/gacel/zienshield-web-traffic.log') {
    super();
    this.logFilePath = logFilePath;
    this.lastProcessedSize = 0;
    this.isWatching = false;
    this.watchInterval = null;
    
    // Cache para datos agregados
    this.aggregatedData = {
      domainStats: new Map(),
      categoryStats: new Map(),
      browserStats: new Map(),
      agentStats: new Map(),
      timeSeriesData: []
    };
    
    // Categorías de sitios web (sincronizado con el agente)
    this.siteCategories = {
      'social': ['facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com', 'tiktok.com'],
      'video': ['youtube.com', 'netflix.com', 'twitch.tv', 'vimeo.com', 'dailymotion.com'],
      'work': ['office.com', 'google.com', 'gmail.com', 'slack.com', 'zoom.us'],
      'news': ['cnn.com', 'bbc.com', 'reddit.com', 'news.google.com'],
      'shopping': ['amazon.com', 'ebay.com', 'mercadolibre.com'],
      'streaming': ['spotify.com', 'apple.com', 'soundcloud.com']
    };
  }

  async startWatching() {
    if (this.isWatching) {
      console.log('⚠️ Parser ya está observando el archivo de logs');
      return;
    }

    console.log(`🔍 Iniciando parser de logs: ${this.logFilePath}`);
    this.isWatching = true;

    // Procesar logs existentes
    await this.processExistingLogs();

    // Observar cambios en el archivo cada 5 segundos
    this.watchInterval = setInterval(async () => {
      await this.checkForNewLogs();
    }, 5000);

    console.log('✅ Parser de logs iniciado correctamente');
  }

  async stopWatching() {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = null;
    }
    this.isWatching = false;
    console.log('🛑 Parser de logs detenido');
  }

  async processExistingLogs() {
    try {
      const stats = await fs.stat(this.logFilePath);
      this.lastProcessedSize = 0; // Procesar todo el archivo
      await this.processLogFile();
      this.lastProcessedSize = stats.size;
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('ℹ️ Archivo de logs no existe aún, esperando...');
      } else {
        console.error('❌ Error procesando logs existentes:', error);
      }
    }
  }

  async checkForNewLogs() {
    try {
      const stats = await fs.stat(this.logFilePath);
      
      if (stats.size > this.lastProcessedSize) {
        await this.processLogFile();
        this.lastProcessedSize = stats.size;
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('❌ Error verificando logs:', error);
      }
    }
  }

  async processLogFile() {
    try {
      const data = await fs.readFile(this.logFilePath, 'utf8');
      const lines = data.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        await this.processLogLine(line);
      }
    } catch (error) {
      console.error('❌ Error procesando archivo de logs:', error);
    }
  }

  async processLogLine(line) {
    try {
      // Buscar JSON en la línea
      const jsonMatch = line.match(/ZienShield-WebTraffic.*?: (.+)$/);
      if (!jsonMatch) return;

      const logData = JSON.parse(jsonMatch[1]);
      const webTrafficData = logData.zienshield_web_traffic;

      if (!webTrafficData) return;

      // Procesar datos
      await this.aggregateWebTrafficData(webTrafficData);
      
      // Emitir evento para listeners
      this.emit('webTrafficData', webTrafficData);
      this.emit('aggregatedData', this.getAggregatedStats());

    } catch (error) {
      console.error('❌ Error procesando línea de log:', line.substring(0, 100), error.message);
    }
  }

  async aggregateWebTrafficData(data) {
    const timestamp = new Date(data.timestamp);
    const agentId = data.agent_id;

    // Agregar datos del agente
    if (!this.aggregatedData.agentStats.has(agentId)) {
      this.aggregatedData.agentStats.set(agentId, {
        lastSeen: timestamp,
        totalConnections: 0,
        totalDomains: 0,
        browsers: new Set()
      });
    }

    const agentStats = this.aggregatedData.agentStats.get(agentId);
    agentStats.lastSeen = timestamp;
    agentStats.totalConnections += data.total_connections || 0;
    agentStats.totalDomains += data.total_domains || 0;

    // Procesar estadísticas de dominios
    if (data.domain_stats) {
      for (const [domain, stats] of Object.entries(data.domain_stats)) {
        if (!this.aggregatedData.domainStats.has(domain)) {
          this.aggregatedData.domainStats.set(domain, {
            totalConnections: 0,
            totalPorts: new Set(),
            category: stats.category || 'other',
            agents: new Set(),
            lastSeen: timestamp
          });
        }

        const domainData = this.aggregatedData.domainStats.get(domain);
        domainData.totalConnections += stats.connections || 0;
        domainData.agents.add(agentId);
        domainData.lastSeen = timestamp;
        
        // Agregar puertos únicos
        if (stats.ports) {
          stats.ports.forEach(port => domainData.totalPorts.add(port));
        }
      }
    }

    // Procesar estadísticas de categorías
    if (data.categories_summary) {
      for (const [category, stats] of Object.entries(data.categories_summary)) {
        if (!this.aggregatedData.categoryStats.has(category)) {
          this.aggregatedData.categoryStats.set(category, {
            totalConnections: 0,
            totalDomains: 0,
            agents: new Set()
          });
        }

        const categoryData = this.aggregatedData.categoryStats.get(category);
        categoryData.totalConnections += stats.connections || 0;
        categoryData.totalDomains += stats.domains || 0;
        categoryData.agents.add(agentId);
      }
    }

    // Procesar navegadores
    if (data.browser_processes) {
      data.browser_processes.forEach(browser => {
        const browserKey = `${agentId}-${browser.browser}`;
        this.aggregatedData.browserStats.set(browserKey, {
          agent: agentId,
          browser: browser.browser,
          pid: browser.pid,
          lastSeen: timestamp,
          ...browser
        });
        
        agentStats.browsers.add(browser.browser);
      });
    }

    // Agregar a serie temporal
    this.aggregatedData.timeSeriesData.push({
      timestamp: timestamp,
      agent: agentId,
      connections: data.total_connections,
      domains: data.total_domains,
      browsers: data.active_browsers
    });

    // Mantener solo los últimos 1000 puntos de datos
    if (this.aggregatedData.timeSeriesData.length > 1000) {
      this.aggregatedData.timeSeriesData = this.aggregatedData.timeSeriesData.slice(-1000);
    }
  }

  getAggregatedStats() {
    // Convertir Maps a objetos para JSON
    const stats = {
      summary: {
        totalAgents: this.aggregatedData.agentStats.size,
        totalDomains: this.aggregatedData.domainStats.size,
        totalCategories: this.aggregatedData.categoryStats.size,
        activeBrowsers: this.aggregatedData.browserStats.size,
        dataPoints: this.aggregatedData.timeSeriesData.length
      },
      topDomains: Array.from(this.aggregatedData.domainStats.entries())
        .sort(([,a], [,b]) => b.totalConnections - a.totalConnections)
        .slice(0, 10)
        .map(([domain, stats]) => ({
          domain,
          connections: stats.totalConnections,
          category: stats.category,
          agents: stats.agents.size,
          ports: stats.totalPorts.size
        })),
      categoriesBreakdown: Array.from(this.aggregatedData.categoryStats.entries())
        .map(([category, stats]) => ({
          category,
          connections: stats.totalConnections,
          domains: stats.totalDomains,
          agents: stats.agents.size
        })),
      agentsSummary: Array.from(this.aggregatedData.agentStats.entries())
        .map(([agent, stats]) => ({
          agent,
          connections: stats.totalConnections,
          domains: stats.totalDomains,
          browsers: Array.from(stats.browsers),
          lastSeen: stats.lastSeen
        })),
      recentActivity: this.aggregatedData.timeSeriesData.slice(-20)
    };

    return stats;
  }

  // Obtener métricas para Prometheus
  getPrometheusMetrics() {
    const metrics = [];
    const timestamp = Date.now();

    // Métricas por dominio
    for (const [domain, stats] of this.aggregatedData.domainStats) {
      metrics.push({
        name: 'zienshield_web_domain_connections_total',
        help: 'Total connections by domain',
        type: 'counter',
        values: [{
          value: stats.totalConnections,
          labels: { domain, category: stats.category },
          timestamp
        }]
      });
    }

    // Métricas por categoría
    for (const [category, stats] of this.aggregatedData.categoryStats) {
      metrics.push({
        name: 'zienshield_web_category_connections_total',
        help: 'Total connections by category',
        type: 'counter',
        values: [{
          value: stats.totalConnections,
          labels: { category },
          timestamp
        }]
      });
    }

    // Métricas por agente
    for (const [agent, stats] of this.aggregatedData.agentStats) {
      metrics.push({
        name: 'zienshield_web_agent_connections_total',
        help: 'Total connections by agent',
        type: 'counter',
        values: [{
          value: stats.totalConnections,
          labels: { agent },
          timestamp
        }]
      });
    }

    return metrics;
  }

  // Limpiar datos antiguos (llamar periódicamente)
  cleanupOldData(maxAgeHours = 24) {
    const cutoffTime = new Date(Date.now() - (maxAgeHours * 60 * 60 * 1000));
    
    // Limpiar dominios antiguos
    for (const [domain, stats] of this.aggregatedData.domainStats) {
      if (stats.lastSeen < cutoffTime) {
        this.aggregatedData.domainStats.delete(domain);
      }
    }

    // Limpiar navegadores antiguos
    for (const [browserKey, stats] of this.aggregatedData.browserStats) {
      if (stats.lastSeen < cutoffTime) {
        this.aggregatedData.browserStats.delete(browserKey);
      }
    }

    // Limpiar serie temporal antigua
    this.aggregatedData.timeSeriesData = this.aggregatedData.timeSeriesData
      .filter(point => point.timestamp > cutoffTime);

    console.log(`🧹 Datos antiguos limpiados (más de ${maxAgeHours}h)`);
  }
}

module.exports = WebTrafficParser;
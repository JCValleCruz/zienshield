const client = require('prom-client');

// Configurar registro por defecto
const register = client.register;

// Limpiar métricas existentes al inicializar
register.clear();

// Configurar métricas por defecto del sistema
client.collectDefaultMetrics({ 
  register,
  timeout: 5000,
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
  prefix: 'zienshield_'
});

// Métricas personalizadas de la aplicación
const httpRequestsTotal = new client.Counter({
  name: 'zienshield_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

const httpRequestDuration = new client.Histogram({
  name: 'zienshield_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register]
});

const databaseConnections = new client.Gauge({
  name: 'zienshield_database_connections_active',
  help: 'Number of active database connections',
  registers: [register]
});

const wazuhAgentsTotal = new client.Gauge({
  name: 'zienshield_wazuh_agents_total',
  help: 'Total number of Wazuh agents',
  labelNames: ['status'],
  registers: [register]
});

const companiesTotal = new client.Gauge({
  name: 'zienshield_companies_total',
  help: 'Total number of registered companies',
  labelNames: ['status'],
  registers: [register]
});

const alertsTotal = new client.Counter({
  name: 'zienshield_alerts_total',
  help: 'Total number of security alerts',
  labelNames: ['severity'],
  registers: [register]
});

const vulnerabilitiesTotal = new client.Gauge({
  name: 'zienshield_vulnerabilities_total',
  help: 'Total number of vulnerabilities',
  labelNames: ['severity'],
  registers: [register]
});

// Middleware para trackear métricas HTTP
const prometheusMiddleware = (req, res, next) => {
  const start = Date.now();
  
  // Interceptar el final de la respuesta
  const originalSend = res.send;
  res.send = function(data) {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    const method = req.method;
    const statusCode = res.statusCode.toString();
    
    // Incrementar contador de requests
    httpRequestsTotal.inc({ method, route, status_code: statusCode });
    
    // Observar duración de request
    httpRequestDuration.observe({ method, route, status_code: statusCode }, duration);
    
    // Llamar al método original
    originalSend.call(this, data);
  };
  
  next();
};

// Función para actualizar métricas de negocio
const updateBusinessMetrics = async () => {
  try {
    const { getDatabaseService } = require('../services/databaseService');
    const dbService = getDatabaseService();
    
    // Actualizar métricas de conexiones de BD
    const poolStats = dbService.getPoolStats();
    if (poolStats && !poolStats.error) {
      databaseConnections.set(poolStats.totalCount || 0);
    }
    
    // Actualizar métricas de empresas (la tabla companies no tiene columna status)
    try {
      const companiesResult = await dbService.query(`
        SELECT 
          COUNT(*) as total_companies
        FROM companies
      `);
      
      // Reset counters
      companiesTotal.reset();
      
      if (companiesResult.rows.length > 0) {
        companiesTotal.set({ status: 'active' }, parseInt(companiesResult.rows[0].total_companies));
      }
      
    } catch (dbError) {
      console.warn('⚠️ Error actualizando métricas de empresas:', dbError.message);
    }
    
    // Simular métricas de Wazuh (en un entorno real, esto vendría de la API de Wazuh)
    wazuhAgentsTotal.set({ status: 'active' }, 5);
    wazuhAgentsTotal.set({ status: 'inactive' }, 4);
    wazuhAgentsTotal.set({ status: 'pending' }, 0);
    
    // Simular métricas de vulnerabilidades
    vulnerabilitiesTotal.set({ severity: 'critical' }, 18);
    vulnerabilitiesTotal.set({ severity: 'high' }, 27);
    vulnerabilitiesTotal.set({ severity: 'medium' }, 78);
    vulnerabilitiesTotal.set({ severity: 'low' }, 101);
    
    console.log('📊 Métricas de negocio actualizadas para Prometheus');
    
  } catch (error) {
    console.error('❌ Error actualizando métricas de negocio:', error);
  }
};

// Endpoint principal de métricas de Prometheus
const getPrometheusMetrics = async (req, res) => {
  try {
    console.log('📊 Solicitadas métricas de Prometheus...');
    
    // Actualizar métricas de negocio antes de generar la respuesta
    await updateBusinessMetrics();
    
    // Generar métricas en formato Prometheus
    const metrics = await register.metrics();
    
    res.set('Content-Type', register.contentType);
    res.end(metrics);
    
    console.log('✅ Métricas de Prometheus enviadas correctamente');
    
  } catch (error) {
    console.error('❌ Error generando métricas de Prometheus:', error);
    
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
};

// Función para incrementar alertas (para usar desde otros controladores)
const incrementAlert = (severity) => {
  alertsTotal.inc({ severity });
};

// Inicializar actualización periódica de métricas de negocio
let metricsUpdateInterval;

const startMetricsCollection = () => {
  console.log('🚀 Iniciando recolección de métricas de Prometheus...');
  
  // Actualizar métricas cada 30 segundos
  metricsUpdateInterval = setInterval(async () => {
    await updateBusinessMetrics();
  }, 30000);
  
  // Actualización inicial
  setTimeout(updateBusinessMetrics, 5000);
};

const stopMetricsCollection = () => {
  if (metricsUpdateInterval) {
    clearInterval(metricsUpdateInterval);
    console.log('⏹️ Recolección de métricas de Prometheus detenida');
  }
};

module.exports = {
  getPrometheusMetrics,
  prometheusMiddleware,
  incrementAlert,
  startMetricsCollection,
  stopMetricsCollection,
  register
};
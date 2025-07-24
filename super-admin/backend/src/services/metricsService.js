const client = require('prom-client');
const WebMetricsService = require('./webMetricsService');

// Configurar registro de métricas por defecto
const register = new client.Registry();
client.collectDefaultMetrics({
  register,
  prefix: 'zienshield_',
});

// Inicializar servicio de métricas web
let webMetricsService = null;

// Métricas personalizadas de ZienShield

// 1. Contador de requests HTTP
const httpRequestsTotal = new client.Counter({
  name: 'zienshield_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

// 2. Duración de requests HTTP
const httpRequestDuration = new client.Histogram({
  name: 'zienshield_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  registers: [register]
});

// 3. Número de usuarios conectados actualmente
const activeUsers = new client.Gauge({
  name: 'zienshield_active_users',
  help: 'Number of currently active users',
  registers: [register]
});

// 4. Número de eventos de seguridad por segundo
const securityEventsPerSecond = new client.Gauge({
  name: 'zienshield_security_events_per_second',
  help: 'Number of security events per second from Wazuh',
  registers: [register]
});

// 5. Total de eventos de seguridad
const totalSecurityEvents = new client.Counter({
  name: 'zienshield_security_events_total',
  help: 'Total number of security events processed',
  registers: [register]
});

// 6. Número de empresas/tenants
const totalCompanies = new client.Gauge({
  name: 'zienshield_companies_total',
  help: 'Total number of companies/tenants',
  registers: [register]
});

// 7. Número de agentes conectados
const connectedAgents = new client.Gauge({
  name: 'zienshield_connected_agents',
  help: 'Number of connected Wazuh agents',
  registers: [register]
});

// 8. Métricas de base de datos
const dbConnections = new client.Gauge({
  name: 'zienshield_db_connections',
  help: 'Number of active database connections',
  registers: [register]
});

const dbQueryDuration = new client.Histogram({
  name: 'zienshield_db_query_duration_seconds',
  help: 'Database query duration in seconds',
  labelNames: ['query_type'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register]
});

// Middleware para métricas HTTP
const httpMetricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  // Incrementar contador de requests
  const route = req.route ? req.route.path : req.path;
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const labels = {
      method: req.method,
      route: route,
      status_code: res.statusCode
    };
    
    httpRequestsTotal.inc(labels);
    httpRequestDuration
      .labels({ method: req.method, route: route })
      .observe(duration);
  });
  
  next();
};

// Función para actualizar métricas personalizadas
const updateCustomMetrics = async () => {
  try {
    // Aquí puedes agregar lógica para actualizar métricas desde tu base de datos
    // Por ejemplo:
    
    // Simular datos por ahora - reemplazar con datos reales
    activeUsers.set(Math.floor(Math.random() * 50) + 10);
    securityEventsPerSecond.set(Math.floor(Math.random() * 100) + 5);
    totalCompanies.set(Math.floor(Math.random() * 10) + 3);
    connectedAgents.set(Math.floor(Math.random() * 200) + 50);
    dbConnections.set(Math.floor(Math.random() * 20) + 5);
    
    console.log('🔢 Métricas personalizadas actualizadas');
  } catch (error) {
    console.error('❌ Error actualizando métricas:', error);
  }
};

// Actualizar métricas cada 30 segundos
setInterval(updateCustomMetrics, 30000);
updateCustomMetrics(); // Ejecutar inmediatamente

// Inicializar servicio de métricas web
const initWebMetrics = async () => {
  try {
    webMetricsService = new WebMetricsService(register);
    console.log('✅ Servicio de métricas web inicializado');
  } catch (error) {
    console.error('❌ Error inicializando métricas web:', error);
  }
};

// Inicializar después de un delay para evitar conflictos
setTimeout(initWebMetrics, 5000);

module.exports = {
  register,
  httpMetricsMiddleware,
  metrics: {
    httpRequestsTotal,
    httpRequestDuration,
    activeUsers,
    securityEventsPerSecond,
    totalSecurityEvents,
    totalCompanies,
    connectedAgents,
    dbConnections,
    dbQueryDuration
  },
  updateCustomMetrics,
  getWebMetricsService: () => webMetricsService
};
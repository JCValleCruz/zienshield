// Almacenamiento en memoria para métricas de tráfico web
// En producción esto debería estar en Redis o base de datos
let trafficMetrics = {
  requests: {
    total: 0,
    methods: {
      GET: 0,
      POST: 0,
      PUT: 0,
      DELETE: 0,
      PATCH: 0,
      OPTIONS: 0
    },
    statusCodes: {
      '2xx': 0,
      '3xx': 0,
      '4xx': 0,
      '5xx': 0
    },
    endpoints: {},
    userAgents: {},
    ips: {},
    hourly: {}
  },
  bandwidth: {
    bytesIn: 0,
    bytesOut: 0
  },
  performance: {
    averageResponseTime: 0,
    slowestEndpoint: null,
    fastestEndpoint: null
  },
  realTime: {
    currentConnections: 0,
    requestsPerSecond: 0,
    lastMinuteRequests: []
  }
};

// Métricas de tráfico web
const getWebTrafficMetrics = async (req, res) => {
  try {
    console.log('📊 Obteniendo métricas de tráfico web...');

    // Calcular métricas derivadas
    const now = new Date();
    const currentHour = now.getHours();
    const lastMinute = now.getTime() - 60000;
    
    // Filtrar requests de la última minuta
    const recentRequests = trafficMetrics.realTime.lastMinuteRequests.filter(
      timestamp => timestamp > lastMinute
    );
    
    // Calcular requests por segundo
    const requestsPerSecond = recentRequests.length / 60;

    // Top endpoints más utilizados
    const topEndpoints = Object.entries(trafficMetrics.requests.endpoints)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([endpoint, count]) => ({ endpoint, requests: count }));

    // Top IPs
    const topIPs = Object.entries(trafficMetrics.requests.ips)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, requests: count }));

    // Top User Agents
    const topUserAgents = Object.entries(trafficMetrics.requests.userAgents)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([userAgent, count]) => ({ 
        userAgent: userAgent.substring(0, 50) + (userAgent.length > 50 ? '...' : ''), 
        requests: count 
      }));

    // Métricas por hora (últimas 24 horas)
    const hourlyData = [];
    for (let i = 0; i < 24; i++) {
      const hour = (currentHour - i + 24) % 24;
      hourlyData.unshift({
        hour: hour,
        requests: trafficMetrics.requests.hourly[hour] || 0
      });
    }

    // Calcular ratios de éxito
    const totalRequests = trafficMetrics.requests.total;
    const successRate = totalRequests > 0 ? 
      ((trafficMetrics.requests.statusCodes['2xx'] / totalRequests) * 100).toFixed(2) : 0;
    const errorRate = totalRequests > 0 ? 
      ((trafficMetrics.requests.statusCodes['4xx'] + trafficMetrics.requests.statusCodes['5xx']) / totalRequests * 100).toFixed(2) : 0;

    const metrics = {
      timestamp: new Date().toISOString(),
      overview: {
        totalRequests: trafficMetrics.requests.total,
        requestsPerSecond: parseFloat(requestsPerSecond.toFixed(2)),
        successRate: parseFloat(successRate),
        errorRate: parseFloat(errorRate),
        averageResponseTime: trafficMetrics.performance.averageResponseTime,
        uniqueIPs: Object.keys(trafficMetrics.requests.ips).length,
        uniqueEndpoints: Object.keys(trafficMetrics.requests.endpoints).length
      },
      methods: trafficMetrics.requests.methods,
      statusCodes: trafficMetrics.requests.statusCodes,
      bandwidth: {
        bytesIn: trafficMetrics.bandwidth.bytesIn,
        bytesOut: trafficMetrics.bandwidth.bytesOut,
        totalBytes: trafficMetrics.bandwidth.bytesIn + trafficMetrics.bandwidth.bytesOut,
        bytesInMB: (trafficMetrics.bandwidth.bytesIn / (1024 * 1024)).toFixed(2),
        bytesOutMB: (trafficMetrics.bandwidth.bytesOut / (1024 * 1024)).toFixed(2)
      },
      performance: {
        averageResponseTime: trafficMetrics.performance.averageResponseTime,
        slowestEndpoint: trafficMetrics.performance.slowestEndpoint,
        fastestEndpoint: trafficMetrics.performance.fastestEndpoint
      },
      realTime: {
        currentConnections: trafficMetrics.realTime.currentConnections,
        requestsPerSecond: parseFloat(requestsPerSecond.toFixed(2)),
        lastMinuteRequests: recentRequests.length
      },
      topEndpoints: topEndpoints,
      topIPs: topIPs,
      topUserAgents: topUserAgents,
      hourlyData: hourlyData
    };

    console.log('✅ Métricas de tráfico web obtenidas correctamente');
    
    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    console.error('❌ Error obteniendo métricas de tráfico web:', error);
    
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
};

// Middleware para trackear tráfico web (debe añadirse al servidor)
const trackWebTraffic = (req, res, next) => {
  const startTime = Date.now();
  
  // Incrementar contador total
  trafficMetrics.requests.total++;
  
  // Trackear método HTTP
  const method = req.method.toUpperCase();
  if (trafficMetrics.requests.methods[method] !== undefined) {
    trafficMetrics.requests.methods[method]++;
  }
  
  // Trackear endpoint
  const endpoint = req.path;
  trafficMetrics.requests.endpoints[endpoint] = (trafficMetrics.requests.endpoints[endpoint] || 0) + 1;
  
  // Trackear IP
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  trafficMetrics.requests.ips[ip] = (trafficMetrics.requests.ips[ip] || 0) + 1;
  
  // Trackear User Agent
  const userAgent = req.get('User-Agent') || 'unknown';
  trafficMetrics.requests.userAgents[userAgent] = (trafficMetrics.requests.userAgents[userAgent] || 0) + 1;
  
  // Trackear por hora
  const currentHour = new Date().getHours();
  trafficMetrics.requests.hourly[currentHour] = (trafficMetrics.requests.hourly[currentHour] || 0) + 1;
  
  // Trackear bandwidth (approximado)
  const requestSize = JSON.stringify(req.body || {}).length + (req.get('content-length') || 0);
  trafficMetrics.bandwidth.bytesIn += parseInt(requestSize) || 0;
  
  // Añadir timestamp para requests por segundo
  trafficMetrics.realTime.lastMinuteRequests.push(Date.now());
  
  // Limpiar requests antiguos (más de 1 minuto)
  const oneMinuteAgo = Date.now() - 60000;
  trafficMetrics.realTime.lastMinuteRequests = trafficMetrics.realTime.lastMinuteRequests.filter(
    timestamp => timestamp > oneMinuteAgo
  );

  // Interceptar respuesta para trackear status codes y response time
  const originalSend = res.send;
  res.send = function(data) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // Trackear status code
    const statusCode = res.statusCode;
    let statusCategory;
    if (statusCode >= 200 && statusCode < 300) statusCategory = '2xx';
    else if (statusCode >= 300 && statusCode < 400) statusCategory = '3xx';
    else if (statusCode >= 400 && statusCode < 500) statusCategory = '4xx';
    else if (statusCode >= 500) statusCategory = '5xx';
    
    if (statusCategory) {
      trafficMetrics.requests.statusCodes[statusCategory]++;
    }
    
    // Trackear response time
    const currentAvg = trafficMetrics.performance.averageResponseTime;
    const totalRequests = trafficMetrics.requests.total;
    trafficMetrics.performance.averageResponseTime = 
      ((currentAvg * (totalRequests - 1)) + responseTime) / totalRequests;
    
    // Trackear endpoints más lentos/rápidos
    if (!trafficMetrics.performance.slowestEndpoint || 
        responseTime > trafficMetrics.performance.slowestEndpoint.responseTime) {
      trafficMetrics.performance.slowestEndpoint = { endpoint, responseTime };
    }
    
    if (!trafficMetrics.performance.fastestEndpoint || 
        responseTime < trafficMetrics.performance.fastestEndpoint.responseTime) {
      trafficMetrics.performance.fastestEndpoint = { endpoint, responseTime };
    }
    
    // Trackear bandwidth de salida
    const responseSize = data ? data.length : 0;
    trafficMetrics.bandwidth.bytesOut += responseSize;
    
    // Llamar al método original
    originalSend.call(this, data);
  };
  
  next();
};

// Función para resetear métricas (útil para testing)
const resetMetrics = () => {
  trafficMetrics = {
    requests: {
      total: 0,
      methods: { GET: 0, POST: 0, PUT: 0, DELETE: 0, PATCH: 0, OPTIONS: 0 },
      statusCodes: { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 },
      endpoints: {},
      userAgents: {},
      ips: {},
      hourly: {}
    },
    bandwidth: { bytesIn: 0, bytesOut: 0 },
    performance: { averageResponseTime: 0, slowestEndpoint: null, fastestEndpoint: null },
    realTime: { currentConnections: 0, requestsPerSecond: 0, lastMinuteRequests: [] }
  };
};

module.exports = {
  getWebTrafficMetrics,
  trackWebTraffic,
  resetMetrics
};
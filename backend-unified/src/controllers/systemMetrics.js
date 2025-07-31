const os = require('os');
const fs = require('fs').promises;

// Métricas del sistema
const getServerMetrics = async (req, res) => {
  try {
    console.log('📊 Obteniendo métricas del servidor...');

    // Información básica del sistema
    const systemInfo = {
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      uptime: os.uptime(),
      loadavg: os.loadavg(),
      totalmem: os.totalmem(),
      freemem: os.freemem(),
      cpus: os.cpus().length,
      networkInterfaces: Object.keys(os.networkInterfaces())
    };

    // Memoria utilizada
    const memoryUsage = process.memoryUsage();
    
    // CPU usage (aproximado)
    const cpuUsage = process.cpuUsage();

    // Estadísticas del proceso Node.js
    const nodeStats = {
      version: process.version,
      pid: process.pid,
      uptime: process.uptime(),
      memoryUsage: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external,
        arrayBuffers: memoryUsage.arrayBuffers
      },
      cpuUsage: {
        user: cpuUsage.user,
        system: cpuUsage.system
      }
    };

    // Métricas del sistema operativo
    const osMetrics = {
      system: systemInfo,
      memory: {
        total: systemInfo.totalmem,
        free: systemInfo.freemem,
        used: systemInfo.totalmem - systemInfo.freemem,
        usage_percent: ((systemInfo.totalmem - systemInfo.freemem) / systemInfo.totalmem * 100).toFixed(2)
      },
      cpu: {
        count: systemInfo.cpus,
        loadavg: systemInfo.loadavg,
        model: os.cpus()[0]?.model || 'Unknown'
      },
      network: {
        interfaces: systemInfo.networkInterfaces.length,
        details: Object.entries(os.networkInterfaces()).reduce((acc, [name, interfaces]) => {
          acc[name] = interfaces.map(iface => ({
            family: iface.family,
            address: iface.address,
            internal: iface.internal
          }));
          return acc;
        }, {})
      }
    };

    // Respuesta final
    const metrics = {
      timestamp: new Date().toISOString(),
      server: {
        ...nodeStats,
        environment: process.env.NODE_ENV || 'development'
      },
      system: osMetrics,
      health: {
        status: 'healthy',
        uptime_seconds: Math.floor(process.uptime()),
        uptime_formatted: formatUptime(process.uptime())
      }
    };

    console.log('✅ Métricas del servidor obtenidas correctamente');
    
    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    console.error('❌ Error obteniendo métricas del servidor:', error);
    
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
};

// Función auxiliar para formatear tiempo de actividad
function formatUptime(uptimeSeconds) {
  const days = Math.floor(uptimeSeconds / (24 * 60 * 60));
  const hours = Math.floor((uptimeSeconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((uptimeSeconds % (60 * 60)) / 60);
  const seconds = Math.floor(uptimeSeconds % 60);
  
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

module.exports = {
  getServerMetrics
};
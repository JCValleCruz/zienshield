const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;

const execAsync = promisify(exec);

// Obtener métricas reales del servidor
const getServerMetrics = async (req, res) => {
  try {
    console.log('📊 Obteniendo métricas reales del servidor...');

    // Leer uptime del sistema
    const uptimeData = await fs.readFile('/proc/uptime', 'utf8');
    const uptimeSeconds = Math.floor(parseFloat(uptimeData.split(' ')[0]));

    // Leer load average del sistema
    const loadData = await fs.readFile('/proc/loadavg', 'utf8');
    const loadValues = loadData.split(' ').slice(0, 3).map(parseFloat);

    // Obtener número de cores CPU
    const { stdout: coresOutput } = await execAsync('nproc');
    const cpuCores = parseInt(coresOutput.trim());

    // Formatear uptime a días, horas, minutos
    const formatUptime = (seconds) => {
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      
      if (days > 0) {
        return `${days}d ${hours}h`;
      } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else {
        return `${minutes}m`;
      }
    };

    const serverMetrics = {
      uptime: {
        seconds: uptimeSeconds,
        formatted: formatUptime(uptimeSeconds)
      },
      loadAverage: loadValues,
      cpuCores: cpuCores,
      status: 'online',
      timestamp: new Date().toISOString()
    };

    console.log('✅ Métricas del servidor obtenidas:', {
      uptime: serverMetrics.uptime.formatted,
      loadAverage: serverMetrics.loadAverage[0],
      cores: serverMetrics.cpuCores
    });

    res.json({
      success: true,
      data: serverMetrics
    });

  } catch (error) {
    console.error('❌ Error obteniendo métricas del servidor:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo métricas del servidor',
      details: error.message
    });
  }
};

module.exports = {
  getServerMetrics
};

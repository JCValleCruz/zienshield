const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;

const execAsync = promisify(exec);

// Obtener métricas reales del servidor
const getServerMetrics = async (req, res) => {
  try {
    console.log('📊 Obteniendo métricas reales del servidor...');

    // 1. UPTIME Y LOAD AVERAGE
    const uptimeData = await fs.readFile('/proc/uptime', 'utf8');
    const uptimeSeconds = Math.floor(parseFloat(uptimeData.split(' ')[0]));

    const loadData = await fs.readFile('/proc/loadavg', 'utf8');
    const loadValues = loadData.split(' ').slice(0, 3).map(parseFloat);

    // 2. CPU INFORMATION
    const { stdout: coresOutput } = await execAsync('nproc');
    const cpuCores = parseInt(coresOutput.trim());

    // CPU Usage - usar top para obtener uso actual
    const { stdout: cpuOutput } = await execAsync("grep 'cpu ' /proc/stat | awk '{usage=($2+$4)*100/($2+$3+$4+$5)} END {print usage}'");
    const cpuUsage = Math.round(parseFloat(cpuOutput.trim()) || 0);

    // 3. MEMORY INFORMATION
    const memData = await fs.readFile('/proc/meminfo', 'utf8');
    const memLines = memData.split('\n');
    
    const getMemValue = (name) => {
      const line = memLines.find(l => l.startsWith(name));
      return line ? parseInt(line.match(/\d+/)[0]) * 1024 : 0; // Convertir de kB a bytes
    };

    const memTotal = getMemValue('MemTotal');
    const memFree = getMemValue('MemFree');
    const memAvailable = getMemValue('MemAvailable');
    const memUsed = memTotal - memAvailable;
    const memUsage = Math.round((memUsed / memTotal) * 100);

    // 4. DISK INFORMATION (del directorio raíz)
    const { stdout: diskOutput } = await execAsync("df / | tail -1 | awk '{print $2,$3,$4}'");
    const [diskTotal, diskUsed, diskFree] = diskOutput.trim().split(' ').map(n => parseInt(n) * 1024); // Convertir de kB a bytes
    const diskUsage = Math.round((diskUsed / diskTotal) * 100);

    // 5. NETWORK INFORMATION
    let networkStats = { interface: 'eth0', rx: 0, tx: 0, speed: '1Gbps' };
    try {
      // Obtener interface principal (que no sea lo)
      const { stdout: interfaceOutput } = await execAsync("ip route | grep default | awk '{print $5}' | head -1");
      const mainInterface = interfaceOutput.trim() || 'eth0';
      
      // Obtener estadísticas de red actuales
      const netData = await fs.readFile(`/proc/net/dev`, 'utf8');
      const netLines = netData.split('\n');
      const interfaceLine = netLines.find(line => line.includes(mainInterface + ':'));
      
      if (interfaceLine) {
        const stats = interfaceLine.split(':')[1].trim().split(/\s+/);
        const rxBytes = parseInt(stats[0]) || 0;
        const txBytes = parseInt(stats[8]) || 0;
        
        networkStats = {
          interface: mainInterface,
          rx: Math.round(rxBytes / (1024 * 1024)), // MB
          tx: Math.round(txBytes / (1024 * 1024)), // MB
          speed: '1Gbps'
        };
      }
    } catch (netError) {
      console.warn('⚠️ No se pudieron obtener estadísticas de red:', netError.message);
    }

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
      cpu: {
        usage: cpuUsage,
        cores: cpuCores,
        model: 'Linux CPU'
      },
      memory: {
        total: memTotal,
        used: memUsed,
        free: memAvailable,
        usage: memUsage
      },
      disk: {
        total: diskTotal,
        used: diskUsed,
        free: diskFree,
        usage: diskUsage,
        freeGB: Math.round(diskFree / (1024 * 1024 * 1024))
      },
      network: networkStats,
      uptime: {
        seconds: uptimeSeconds,
        formatted: formatUptime(uptimeSeconds)
      },
      loadAverage: loadValues,
      status: 'online',
      timestamp: new Date().toISOString()
    };

    console.log('✅ Métricas del servidor obtenidas:', {
      uptime: serverMetrics.uptime.formatted,
      cpu: `${serverMetrics.cpu.usage}%`,
      memory: `${serverMetrics.memory.usage}%`,
      disk: `${serverMetrics.disk.usage}%`,
      loadAverage: serverMetrics.loadAverage[0].toFixed(2)
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

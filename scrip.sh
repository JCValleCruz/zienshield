#!/bin/bash

# Script para añadir métricas reales del servidor al widget "Sistema"
# Ejecutar desde: /home/gacel/zienshield
# Uso: ./fix-server-metrics.sh

set -e  # Parar si hay algún error

echo "🔧 Configurando métricas reales del servidor para el widget Sistema..."

# Verificar que estamos en el directorio correcto
if [ ! -d "super-admin" ]; then
    echo "❌ Error: Ejecuta este script desde /home/gacel/zienshield"
    exit 1
fi

# 1. CREAR CONTROLADOR BACKEND
echo "📝 Creando controlador de métricas del servidor..."
mkdir -p super-admin/backend/src/controllers

cat > super-admin/backend/src/controllers/server-metrics.js << 'EOF'
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
EOF

echo "✅ Controlador server-metrics.js creado"

# 2. CREAR RUTA BACKEND
echo "📝 Creando ruta para métricas del servidor..."
mkdir -p super-admin/backend/src/routes

cat > super-admin/backend/src/routes/server-metrics.js << 'EOF'
const express = require('express');
const router = express.Router();
const { getServerMetrics } = require('../controllers/server-metrics');

// GET /api/system/server-metrics - Obtener métricas reales del servidor
router.get('/', getServerMetrics);

module.exports = router;
EOF

echo "✅ Ruta server-metrics.js creada"

# 3. ACTUALIZAR APP.JS PARA AÑADIR LA NUEVA RUTA
echo "📝 Actualizando app.js para incluir nueva ruta..."

# Buscar si ya existe la ruta
if ! grep -q "server-metrics" super-admin/backend/src/app.js; then
    # Añadir la nueva ruta antes de la línea de export
    sed -i '/module\.exports = app;/i\
// Rutas de métricas del servidor\
app.use('"'"'/api/system/server-metrics'"'"', require('"'"'./routes/server-metrics'"'"'));' super-admin/backend/src/app.js
    echo "✅ Ruta añadida a app.js"
else
    echo "⚠️  Ruta ya existe en app.js"
fi

# 4. ACTUALIZAR useSystemMetrics.ts
echo "📝 Actualizando useSystemMetrics.ts para usar datos reales del servidor..."

# Crear backup
cp super-admin/frontend/src/hooks/useSystemMetrics.ts super-admin/frontend/src/hooks/useSystemMetrics.ts.backup.$(date +%Y%m%d_%H%M%S)

cat > super-admin/frontend/src/hooks/useSystemMetrics.ts << 'EOF'
import { useState, useEffect, useCallback } from 'react';

export interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    model: string;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usage: number;
    freeGB: number;
  };
  network: {
    interface: string;
    rx: number;
    tx: number;
    speed: string;
  };
  events: {
    perSecond: number;
    total: number;
  };
  uptime: number;
  loadAverage: number[];
}

interface SystemMetricsResponse {
  success: boolean;
  data: SystemMetrics;
  timestamp: string;
  error?: string;
}

// Interface para los datos de eventos reales desde /api/stats
interface GlobalStatsResponse {
  success: boolean;
  data: {
    events: {
      perSecond: number;
      total: number;
      totalAlerts: number;
      hour: number;
    };
    wazuh: {
      status: string;
      version: string;
      last_check: string;
    };
    timestamp: string;
  };
  error?: string;
}

// Interface para métricas reales del servidor
interface ServerMetricsResponse {
  success: boolean;
  data: {
    uptime: {
      seconds: number;
      formatted: string;
    };
    loadAverage: number[];
    cpuCores: number;
    status: string;
    timestamp: string;
  };
  error?: string;
}

export const useSystemMetrics = () => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Función para obtener eventos reales desde el backend
  const fetchRealEventsData = async (): Promise<{ perSecond: number; total: number } | null> => {
    try {
      console.log('📊 Obteniendo eventos reales desde /api/stats...');
      
      const response = await fetch('http://194.164.172.92:3001/api/stats');
      
      if (!response.ok) {
        throw new Error(`Error en API: ${response.status}`);
      }

      const result: GlobalStatsResponse = await response.json();
      
      if (result.success && result.data.events) {
        console.log('✅ Eventos reales obtenidos:', {
          perSecond: result.data.events.perSecond,
          total: result.data.events.total,
          totalAlerts: result.data.events.totalAlerts
        });
        
        return {
          perSecond: result.data.events.perSecond || 0,
          total: result.data.events.total || 0
        };
      }
      
      throw new Error('Datos de eventos no encontrados en la respuesta');
      
    } catch (error) {
      console.warn('⚠️ No se pudieron obtener eventos reales, usando simulados:', error);
      return null;
    }
  };

  // NUEVA: Función para obtener métricas reales del servidor
  const fetchRealServerData = async (): Promise<{ uptime: number; loadAverage: number[]; cores: number } | null> => {
    try {
      console.log('🖥️ Obteniendo métricas reales del servidor desde /api/system/server-metrics...');
      
      const response = await fetch('http://194.164.172.92:3001/api/system/server-metrics');
      
      if (!response.ok) {
        throw new Error(`Error en API: ${response.status}`);
      }

      const result: ServerMetricsResponse = await response.json();
      
      if (result.success && result.data) {
        console.log('✅ Métricas del servidor obtenidas:', {
          uptime: result.data.uptime.formatted,
          loadAverage: result.data.loadAverage[0],
          cores: result.data.cpuCores
        });
        
        return {
          uptime: result.data.uptime.seconds,
          loadAverage: result.data.loadAverage,
          cores: result.data.cpuCores
        };
      }
      
      throw new Error('Datos del servidor no encontrados en la respuesta');
      
    } catch (error) {
      console.warn('⚠️ No se pudieron obtener métricas reales del servidor, usando simuladas:', error);
      return null;
    }
  };

  const fetchMetrics = useCallback(async () => {
    try {
      setError(null);
      
      // Obtener eventos reales del backend
      const realEvents = await fetchRealEventsData();
      
      // NUEVO: Obtener métricas reales del servidor
      const realServerData = await fetchRealServerData();
      
      // Generar métricas simuladas para el resto del sistema
      const mockData: SystemMetrics = {
        cpu: {
          usage: Math.floor(Math.random() * 40) + 20, // 20-60%
          cores: realServerData?.cores || 4,
          model: 'Intel Xeon E5-2673 v4'
        },
        memory: {
          total: 8192, // 8GB
          used: Math.floor(Math.random() * 3000) + 2000, // 2-5GB
          free: 0,
          usage: 0
        },
        disk: {
          total: 80000, // 80GB
          used: Math.floor(Math.random() * 20000) + 30000, // 30-50GB
          free: 0,
          usage: 0,
          freeGB: 0
        },
        network: {
          interface: 'eth0',
          rx: Math.floor(Math.random() * 1000) + 500,
          tx: Math.floor(Math.random() * 500) + 200,
          speed: '1Gbps'
        },
        events: realEvents || {
          perSecond: Math.floor(Math.random() * 50) + 10, // Fallback simulado
          total: Math.floor(Math.random() * 100000) + 50000
        },
        uptime: realServerData?.uptime || (86400 * 15), // Usar datos reales o fallback
        loadAverage: realServerData?.loadAverage || [
          Math.random() * 2,
          Math.random() * 2,
          Math.random() * 2
        ]
      };

      // Calcular campos derivados
      mockData.memory.free = mockData.memory.total - mockData.memory.used;
      mockData.memory.usage = Math.round((mockData.memory.used / mockData.memory.total) * 100);
      
      mockData.disk.free = mockData.disk.total - mockData.disk.used;
      mockData.disk.usage = Math.round((mockData.disk.used / mockData.disk.total) * 100);
      mockData.disk.freeGB = Math.round(mockData.disk.free / 1024);

      setMetrics(mockData);
      setLastUpdate(new Date());
      
      console.log('✅ Métricas del sistema actualizadas:', {
        eventsPerSecond: mockData.events.perSecond,
        eventsSource: realEvents ? 'Real (Wazuh)' : 'Simulado',
        uptime: realServerData ? `Real (${Math.floor(mockData.uptime/3600)}h)` : 'Simulado',
        loadAverage: realServerData ? `Real (${mockData.loadAverage[0]})` : 'Simulado',
        cpu: mockData.cpu.usage,
        memory: mockData.memory.usage
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      console.error('❌ Error obteniendo métricas:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Cargar métricas iniciales
    fetchMetrics();
    
    // Actualizar cada 30 segundos
    const interval = setInterval(fetchMetrics, 30000);
    
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  return {
    metrics,
    isLoading,
    error,
    lastUpdate,
    refresh: fetchMetrics
  };
};
EOF

echo "✅ useSystemMetrics.ts actualizado con datos reales del servidor"

# 5. VERIFICAR QUE APP.JS EXISTE
if [ ! -f "super-admin/backend/src/app.js" ]; then
    echo "⚠️  Archivo app.js no encontrado, creando estructura básica..."
    cat > super-admin/backend/src/app.js << 'EOF'
const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Rutas existentes
app.use('/api/companies', require('./routes/companies'));
app.use('/api/stats', require('./routes/stats'));

// Rutas de métricas del servidor
app.use('/api/system/server-metrics', require('./routes/server-metrics'));

module.exports = app;
EOF
    echo "✅ app.js creado con estructura básica"
fi

echo ""
echo "🎉 ¡Configuración completada!"
echo ""
echo "📋 Resumen de cambios:"
echo "  ✅ Controlador server-metrics.js creado"
echo "  ✅ Ruta /api/system/server-metrics añadida"
echo "  ✅ app.js actualizado"
echo "  ✅ useSystemMetrics.ts actualizado con datos reales"
echo ""
echo "🚀 Próximos pasos:"
echo "  1. Reiniciar el backend: pm2 restart zienshield-backend"
echo "  2. Probar el endpoint: curl http://194.164.172.92:3001/api/system/server-metrics"
echo "  3. El frontend se actualizará automáticamente cada 30 segundos"
echo ""
echo "📊 El widget 'Sistema' ahora mostrará:"
echo "  - Uptime real del servidor"
echo "  - Load Average real"
echo "  - Número de cores real"
echo "  - Eventos de Wazuh en tiempo real"

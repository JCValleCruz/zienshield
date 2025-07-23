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
    rx: number; // Transferencia actual de descarga en MB/s
    tx: number; // Transferencia actual de subida en MB/s
    rxBytes: number; // Total bytes descargados
    txBytes: number; // Total bytes subidos
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

// Interface para métricas reales del servidor (actualizada)
interface ServerMetricsResponse {
  success: boolean;
  data: {
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
      rx: number; // Transferencia actual descarga
      tx: number; // Transferencia actual subida
      rxBytes: number; // Total bytes descargados
      txBytes: number; // Total bytes subidos
      speed: string;
    };
    uptime: {
      seconds: number;
      formatted: string;
    };
    loadAverage: number[];
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

  // Función para obtener métricas reales del servidor (actualizada)
  const fetchRealServerData = async (): Promise<SystemMetrics | null> => {
    try {
      console.log('🖥️ Obteniendo métricas reales del servidor desde /api/system/server-metrics...');
      
      const response = await fetch('http://194.164.172.92:3001/api/system/server-metrics');
      
      if (!response.ok) {
        throw new Error(`Error en API: ${response.status}`);
      }

      const result: ServerMetricsResponse = await response.json();
      
      if (result.success && result.data) {
        console.log('✅ Métricas completas del servidor obtenidas:', {
          cpu: `${result.data.cpu.usage}%`,
          memory: `${result.data.memory.usage}%`,
          disk: `${result.data.disk.usage}%`,
          uptime: result.data.uptime.formatted,
          network: result.data.network.interface
        });
        
        // Retornar directamente los datos en formato SystemMetrics
        return {
          cpu: result.data.cpu,
          memory: result.data.memory,
          disk: result.data.disk,
          network: {
            ...result.data.network,
            rxBytes: result.data.network.rxBytes || 0,
            txBytes: result.data.network.txBytes || 0
          },
          events: {
            perSecond: 0, // Se llenará con eventos reales
            total: 0
          },
          uptime: result.data.uptime.seconds,
          loadAverage: result.data.loadAverage
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
      
      // Obtener métricas reales completas del servidor
      const realServerData = await fetchRealServerData();
      
      let finalMetrics: SystemMetrics;
      
      if (realServerData) {
        // Usar datos reales del servidor + eventos reales
        finalMetrics = {
          ...realServerData,
          events: realEvents || {
            perSecond: Math.floor(Math.random() * 50) + 10,
            total: Math.floor(Math.random() * 100000) + 50000
          }
        };
        
        console.log('✅ Usando métricas REALES del servidor:', {
          cpu: `${finalMetrics.cpu.usage}%`,
          memory: `${finalMetrics.memory.usage}%`,
          disk: `${finalMetrics.disk.usage}%`,
          network: finalMetrics.network.interface,
          events: realEvents ? 'Real (Wazuh)' : 'Simulado'
        });
        
      } else {
        // Fallback a datos simulados si no hay datos reales disponibles
        finalMetrics = {
          cpu: {
            usage: Math.floor(Math.random() * 40) + 20,
            cores: 4,
            model: 'Intel Xeon E5-2673 v4'
          },
          memory: {
            total: 8192,
            used: Math.floor(Math.random() * 3000) + 2000,
            free: 0,
            usage: 0
          },
          disk: {
            total: 80000,
            used: Math.floor(Math.random() * 20000) + 30000,
            free: 0,
            usage: 0,
            freeGB: 0
          },
          network: {
            interface: 'eth0',
            rx: Math.floor(Math.random() * 50) + 5, // Transferencia actual descarga MB/s
            tx: Math.floor(Math.random() * 25) + 2, // Transferencia actual subida MB/s
            rxBytes: Math.floor(Math.random() * 1000000) + 500000, // Total bytes descargados
            txBytes: Math.floor(Math.random() * 500000) + 200000,  // Total bytes subidos
            speed: '1Gbps'
          },
          events: realEvents || {
            perSecond: Math.floor(Math.random() * 50) + 10,
            total: Math.floor(Math.random() * 100000) + 50000
          },
          uptime: 86400 * 15,
          loadAverage: [Math.random() * 2, Math.random() * 2, Math.random() * 2]
        };

        // Calcular campos derivados para datos simulados
        finalMetrics.memory.free = finalMetrics.memory.total - finalMetrics.memory.used;
        finalMetrics.memory.usage = Math.round((finalMetrics.memory.used / finalMetrics.memory.total) * 100);
        
        finalMetrics.disk.free = finalMetrics.disk.total - finalMetrics.disk.used;
        finalMetrics.disk.usage = Math.round((finalMetrics.disk.used / finalMetrics.disk.total) * 100);
        finalMetrics.disk.freeGB = Math.round(finalMetrics.disk.free / 1024);
        
        console.log('⚠️ Usando métricas SIMULADAS (servidor no disponible)');
      }

      setMetrics(finalMetrics);
      setLastUpdate(new Date());
      
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

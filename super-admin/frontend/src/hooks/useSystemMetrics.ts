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

export const useSystemMetrics = () => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setError(null);
      
      // TODO: Implementar llamada real a la API cuando esté disponible
      // const response = await fetch('http://194.164.172.92:3001/api/system/metrics');
      // const data = await response.json();
      
      // Por ahora simulamos datos realistas
      const mockData: SystemMetrics = {
        cpu: {
          usage: Math.floor(Math.random() * 40) + 20, // 20-60%
          cores: 4,
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
        events: {
          perSecond: Math.floor(Math.random() * 50) + 10,
          total: Math.floor(Math.random() * 100000) + 50000
        },
        uptime: 86400 * 15, // 15 días
        loadAverage: [
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
      console.log('✅ Métricas del sistema actualizadas:', mockData);
      
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

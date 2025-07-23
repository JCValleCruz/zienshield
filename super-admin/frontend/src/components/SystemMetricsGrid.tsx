import React from 'react';
import { Cpu, HardDrive, MemoryStick, Network, Activity, RefreshCw, Server, Zap } from 'lucide-react';
import { useSystemMetrics } from '../hooks/useSystemMetrics';

const SystemMetricsGrid: React.FC = () => {
  const { metrics, isLoading, error, lastUpdate, refresh } = useSystemMetrics();

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 MB';
    const k = 1024;
    const sizes = ['MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return `${days}d ${hours}h`;
  };

  const getUsageColor = (usage: number): string => {
    if (usage < 50) return 'text-green-400';
    if (usage < 80) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getUsageBgColor = (usage: number): string => {
    if (usage < 50) return 'bg-green-500';
    if (usage < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Server className="h-5 w-5 text-red-400 mr-3" />
            <div>
              <h3 className="text-red-400 font-medium">Error de Monitoreo</h3>
              <p className="text-red-300 text-sm mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={refresh}
            className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors"
          >
            <RefreshCw className="h-4 w-4 text-red-400" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Información de estado en la parte superior */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">
            ZienSHIELD Server • Wazuh {metrics ? 'conectado' : 'desconectado'} • Auto-refresh: 30s
          </span>
          <div className="flex items-center space-x-1">
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-green-400">Operativo</span>
          </div>
        </div>
      </div>

      {/* Header compacto - solo icono y fecha */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Server className="h-4 w-4 mr-2 text-blue-400" />
          {lastUpdate && (
            <p className="text-xs text-slate-500">
              Actualizado: {lastUpdate.toLocaleTimeString('es-ES')}
            </p>
          )}
        </div>
      </div>

      {/* Grid Compacto - 4 columnas iguales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 1. RECURSOS DEL SISTEMA (CPU, RAM, Disco en uno) */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <div className="p-1.5 bg-blue-500/10 rounded-lg mr-2">
              <Server className="h-4 w-4 text-blue-400" />
            </div>
            <h3 className="text-white font-medium text-sm">Recursos</h3>
            {isLoading && (
              <div className="ml-auto animate-pulse h-1.5 w-1.5 bg-blue-400 rounded-full"></div>
            )}
          </div>
          
          <div className="space-y-3">
            {/* CPU Bar */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center">
                  <Cpu className="h-3 w-3 text-blue-400 mr-1" />
                  <span className="text-xs text-slate-400">CPU</span>
                </div>
                <span className={`text-xs font-semibold ${getUsageColor(metrics?.cpu.usage || 0)}`}>
                  {metrics?.cpu.usage || 0}%
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-1.5">
                <div 
                  className={`h-1.5 rounded-full transition-all duration-500 ${getUsageBgColor(metrics?.cpu.usage || 0)}`}
                  style={{ width: `${metrics?.cpu.usage || 0}%` }}
                ></div>
              </div>
            </div>

            {/* RAM Bar */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center">
                  <MemoryStick className="h-3 w-3 text-purple-400 mr-1" />
                  <span className="text-xs text-slate-400">RAM</span>
                </div>
                <span className={`text-xs font-semibold ${getUsageColor(metrics?.memory.usage || 0)}`}>
                  {metrics?.memory.usage || 0}%
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-1.5">
                <div 
                  className={`h-1.5 rounded-full transition-all duration-500 ${getUsageBgColor(metrics?.memory.usage || 0)}`}
                  style={{ width: `${metrics?.memory.usage || 0}%` }}
                ></div>
              </div>
            </div>

            {/* Disk Bar */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center">
                  <HardDrive className="h-3 w-3 text-green-400 mr-1" />
                  <span className="text-xs text-slate-400">Disco</span>
                </div>
                <span className={`text-xs font-semibold ${getUsageColor(metrics?.disk.usage || 0)}`}>
                  {metrics?.disk.usage || 0}%
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-1.5">
                <div 
                  className={`h-1.5 rounded-full transition-all duration-500 ${getUsageBgColor(metrics?.disk.usage || 0)}`}
                  style={{ width: `${metrics?.disk.usage || 0}%` }}
                ></div>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Libre: {metrics?.disk.freeGB || 0} GB
              </div>
            </div>
          </div>
        </div>

        {/* 2. RED - Velocidad de descarga y subida actual */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <div className="p-1.5 bg-cyan-500/10 rounded-lg mr-2">
              <Network className="h-4 w-4 text-cyan-400" />
            </div>
            <h3 className="text-white font-medium text-sm">Red</h3>
            {isLoading && (
              <div className="ml-auto animate-pulse h-1.5 w-1.5 bg-cyan-400 rounded-full"></div>
            )}
          </div>
          
          <div className="space-y-3">
            {/* Interface y velocidad máxima */}
            <div className="text-center">
              <div className="text-sm font-bold text-cyan-400">
                {metrics?.network.interface || 'eth0'}
              </div>
              <div className="text-xs text-slate-500">
                {metrics?.network.speed || '1Gbps'}
              </div>
            </div>

            {/* Transferencia de descarga actual */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center">
                  <div className="text-green-400 text-xs mr-1">↓</div>
                  <span className="text-xs text-slate-400">Descarga</span>
                </div>
                <span className="text-xs font-semibold text-green-400">
                  {(metrics?.network.rx || 0).toFixed(1)} MB/s
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-1.5">
                <div 
                  className="h-1.5 rounded-full transition-all duration-500 bg-green-500"
                  style={{ 
                    width: `${Math.min(Math.max((metrics?.network.rx || 0) / 50 * 100, 2), 100)}%` 
                  }}
                ></div>
              </div>
            </div>

            {/* Transferencia de subida actual */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center">
                  <div className="text-blue-400 text-xs mr-1">↑</div>
                  <span className="text-xs text-slate-400">Subida</span>
                </div>
                <span className="text-xs font-semibold text-blue-400">
                  {(metrics?.network.tx || 0).toFixed(1)} MB/s
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-1.5">
                <div 
                  className="h-1.5 rounded-full transition-all duration-500 bg-blue-500"
                  style={{ 
                    width: `${Math.min(Math.max((metrics?.network.tx || 0) / 25 * 100, 2), 100)}%` 
                  }}
                ></div>
              </div>
            </div>

            {/* Estado de la conexión */}
            <div className="flex items-center justify-between text-xs pt-1">
              <div className="flex items-center space-x-1">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-400">Online</span>
              </div>
              <span className="text-slate-500">Tiempo real</span>
            </div>
          </div>
        </div>

        {/* 3. EVENTS PER SECOND */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="p-1.5 bg-orange-500/10 rounded-lg mr-2">
                <Activity className="h-4 w-4 text-orange-400" />
              </div>
              <h3 className="text-white font-medium text-sm">Eventos</h3>
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-orange-400">
              {metrics?.events.perSecond || 0}
            </div>
            <div className="text-xs text-slate-400">eventos/segundo</div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Total procesados:</span>
                <span className="text-slate-300 font-medium">
                  {(metrics?.events.total || 0).toLocaleString('es-ES')}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-orange-400">En tiempo real</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. SISTEMA (Uptime + Load) */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="p-1.5 bg-emerald-500/10 rounded-lg mr-2">
                <Zap className="h-4 w-4 text-emerald-400" />
              </div>
              <h3 className="text-white font-medium text-sm">Sistema</h3>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-lg font-bold text-emerald-400">
                {formatUptime(metrics?.uptime || 0)}
              </div>
              <div className="text-xs text-slate-400">uptime</div>
            </div>
            <div className="border-t border-slate-700 pt-2">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Carga promedio:</span>
                <span className="text-violet-400 font-medium">
                  {metrics?.loadAverage[0]?.toFixed(2) || '0.00'}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                <span className="text-xs text-green-400">Online</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemMetricsGrid;

import React, { useState, useEffect } from 'react';
import { 
  Monitor, 
  Globe, 
  Wifi, 
  Clock, 
  User, 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  Loader,
  RefreshCw,
  Chrome,
  Smartphone
} from 'lucide-react';

interface WebEquipo {
  agent_id: string;
  hostname: string;
  username: string;
  os_info: {
    system: string;
    release: string;
    architecture?: string;
  };
  status: 'active' | 'warning' | 'offline';
  status_color: string;
  last_seen: string;
  minutes_ago: number;
  metrics: {
    total_connections: number;
    total_domains: number;
    active_browsers: number;
    browser_types: number;
    top_categories: Array<{
      name: string;
      connections: number;
    }>;
    browser_summary: Record<string, number>;
    top_domains: Array<{
      domain: string;
      connections: number;
      category: string;
    }>;
  };
}

interface WebMonitoringSummary {
  total_agents: number;
  active_agents: number;
  warning_agents: number;
  offline_agents: number;
  total_connections: number;
  total_domains: number;
  total_browsers: number;
  last_updated: string;
}

interface WebMonitoringData {
  success: boolean;
  timestamp: string;
  summary: WebMonitoringSummary;
  equipos: WebEquipo[];
}

const WebMonitoringGrid: React.FC = () => {
  const [data, setData] = useState<WebMonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchWebMonitoringData = async () => {
    try {
      const response = await fetch('http://194.164.172.92:3001/api/web-traffic/dashboard-summary');
      const result = await response.json();
      
      if (result.success) {
        setData(result);
        setError(null);
        setLastUpdate(new Date());
      } else {
        setError(result.error || 'Error obteniendo datos');
      }
    } catch (err) {
      setError('Error de conexión al servidor');
      console.error('Error fetching web monitoring data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebMonitoringData();
    
    // Actualizar cada 30 segundos
    const interval = setInterval(fetchWebMonitoringData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-400" />;
      case 'offline':
        return <AlertCircle className="h-4 w-4 text-red-400" />;
      default:
        return <Monitor className="h-4 w-4 text-gray-400" />;
    }
  };

  const getBrowserIcon = (browser: string) => {
    const browserLower = browser.toLowerCase();
    if (browserLower.includes('chrome')) return '🌐';
    if (browserLower.includes('firefox')) return '🦊';
    if (browserLower.includes('edge')) return '🔷';
    if (browserLower.includes('safari')) return '🧭';
    if (browserLower.includes('opera')) return '🅾️';
    return '🌐';
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'work': 'bg-blue-500/20 text-blue-300',
      'social': 'bg-purple-500/20 text-purple-300',
      'video': 'bg-red-500/20 text-red-300',
      'shopping': 'bg-green-500/20 text-green-300',
      'streaming': 'bg-pink-500/20 text-pink-300',
      'gaming': 'bg-orange-500/20 text-orange-300',
      'education': 'bg-cyan-500/20 text-cyan-300',
      'news': 'bg-yellow-500/20 text-yellow-300',
      'other': 'bg-gray-500/20 text-gray-300'
    };
    return colors[category] || colors['other'];
  };

  const formatTimeAgo = (minutes: number) => {
    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  if (loading) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <div className="flex items-center justify-center">
          <Loader className="animate-spin h-6 w-6 text-blue-400 mr-2" />
          <span className="text-slate-400">Cargando monitoreo web...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <div className="flex items-center text-red-400">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>Error: {error}</span>
        </div>
      </div>
    );
  }

  if (!data || data.equipos.length === 0) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <div className="text-center text-slate-400">
          <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No hay equipos monitoreando tráfico web actualmente</p>
          <p className="text-sm mt-2">Los equipos aparecerán aquí cuando ejecuten el monitor ZienShield</p>
        </div>
      </div>
    );
  }

  const { summary, equipos } = data;

  return (
    <div className="space-y-6">
      {/* Header con estadísticas globales */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Globe className="h-6 w-6 text-blue-400 mr-3" />
            <h3 className="text-lg font-semibold text-white">Monitoreo Web - Vista General</h3>
          </div>
          <div className="flex items-center text-sm text-slate-400">
            <RefreshCw className="h-4 w-4 mr-1" />
            {lastUpdate && `Actualizado ${formatTimeAgo(Math.floor((Date.now() - lastUpdate.getTime()) / 60000))}`}
          </div>
        </div>

        {/* Estadísticas globales en grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{summary.total_agents}</div>
            <div className="text-xs text-slate-400">Total Equipos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{summary.active_agents}</div>
            <div className="text-xs text-slate-400">Activos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">{summary.warning_agents}</div>
            <div className="text-xs text-slate-400">Warning</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400">{summary.offline_agents}</div>
            <div className="text-xs text-slate-400">Offline</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">{summary.total_connections}</div>
            <div className="text-xs text-slate-400">Conexiones</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">{summary.total_domains}</div>
            <div className="text-xs text-slate-400">Dominios</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-400">{summary.total_browsers}</div>
            <div className="text-xs text-slate-400">Navegadores</div>
          </div>
        </div>
      </div>

      {/* Grid de equipos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {equipos.map((equipo) => (
          <div key={equipo.agent_id} className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-slate-600 transition-colors">
            {/* Header del equipo */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                {getStatusIcon(equipo.status)}
                <div className="ml-3">
                  <h4 className="text-white font-medium">{equipo.hostname}</h4>
                  <p className="text-sm text-slate-400">{equipo.username}@{equipo.os_info.system}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">
                  <Clock className="inline h-3 w-3 mr-1" />
                  {formatTimeAgo(equipo.minutes_ago)}
                </div>
              </div>
            </div>

            {/* Métricas principales */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-400">{equipo.metrics.total_connections}</div>
                <div className="text-xs text-slate-400">Conexiones</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-400">{equipo.metrics.total_domains}</div>
                <div className="text-xs text-slate-400">Dominios</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-orange-400">{equipo.metrics.active_browsers}</div>
                <div className="text-xs text-slate-400">Navegadores</div>
              </div>
            </div>

            {/* Navegadores activos */}
            {Object.keys(equipo.metrics.browser_summary).length > 0 && (
              <div className="mb-4">
                <div className="text-sm text-slate-400 mb-2">Navegadores:</div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(equipo.metrics.browser_summary).map(([browser, count]) => (
                    <span key={browser} className="inline-flex items-center px-2 py-1 bg-slate-700 rounded-md text-xs text-slate-300">
                      {getBrowserIcon(browser)} {browser} ({count})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Top categorías */}
            {equipo.metrics.top_categories.length > 0 && (
              <div className="mb-4">
                <div className="text-sm text-slate-400 mb-2">Top Categorías:</div>
                <div className="space-y-1">
                  {equipo.metrics.top_categories.slice(0, 3).map((category) => (
                    <div key={category.name} className="flex items-center justify-between">
                      <span className={`px-2 py-1 rounded-md text-xs ${getCategoryColor(category.name)}`}>
                        {category.name}
                      </span>
                      <span className="text-xs text-slate-400">{category.connections}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top dominios */}
            {equipo.metrics.top_domains.length > 0 && (
              <div>
                <div className="text-sm text-slate-400 mb-2">Top Dominios:</div>
                <div className="space-y-1">
                  {equipo.metrics.top_domains.slice(0, 3).map((domain) => (
                    <div key={domain.domain} className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 truncate max-w-[150px]" title={domain.domain}>
                        {domain.domain}
                      </span>
                      <div className="flex items-center">
                        <span className={`px-1 py-0.5 rounded text-xs mr-2 ${getCategoryColor(domain.category)}`}>
                          {domain.category}
                        </span>
                        <span className="text-slate-400">{domain.connections}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer con ID del agente */}
            <div className="mt-4 pt-4 border-t border-slate-700">
              <div className="text-xs text-slate-500 truncate" title={equipo.agent_id}>
                ID: {equipo.agent_id}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WebMonitoringGrid;
import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Globe, 
  Clock, 
  Zap,
  Shield,
  AlertTriangle,
  Activity,
  Wifi,
  Users
} from 'lucide-react';

interface CategoryData {
  category: string;
  total_connections: number;
  unique_domains: number;
  total_agents: number;
  avg_session_time: number;
  bandwidth_mb: number;
  top_domains: string[];
}

interface TrafficAnalysisData {
  total_stats: {
    total_connections: number;
    total_domains: number;
    total_bandwidth_mb: number;
    active_agents: number;
  };
  categories: CategoryData[];
  period: string;
}

interface NetworkTrafficAnalysisProps {
  selectedAgent?: string;
}

const NetworkTrafficAnalysis: React.FC<NetworkTrafficAnalysisProps> = ({ selectedAgent }) => {
  const [trafficData, setTrafficData] = useState<TrafficAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');

  useEffect(() => {
    loadTrafficAnalysis();
  }, [timeRange, selectedAgent]);

  const loadTrafficAnalysis = async () => {
    setLoading(true);
    try {
      const url = selectedAgent 
        ? `http://194.164.172.92:3001/api/equipment/network-stats/${selectedAgent}?hours=${timeRange.replace('h', '')}`
        : `http://194.164.172.92:3001/api/equipment/traffic-analysis`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setTrafficData(data);
      }
    } catch (error) {
      console.error('Error loading traffic analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      work: 'text-blue-400 bg-blue-900/20 border-blue-500/30',
      social: 'text-pink-400 bg-pink-900/20 border-pink-500/30',
      video: 'text-red-400 bg-red-900/20 border-red-500/30',
      shopping: 'text-green-400 bg-green-900/20 border-green-500/30',
      news: 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30',
      streaming: 'text-purple-400 bg-purple-900/20 border-purple-500/30',
      gaming: 'text-orange-400 bg-orange-900/20 border-orange-500/30',
      other: 'text-gray-400 bg-gray-900/20 border-gray-500/30'
    };
    return colors[category as keyof typeof colors] || colors.other;
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      work: Globe,
      social: Users,
      video: Activity,
      shopping: Zap,
      news: BarChart3,
      streaming: Wifi,
      gaming: Shield,
      other: AlertTriangle
    };
    return icons[category as keyof typeof icons] || AlertTriangle;
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
        <span className="ml-2 text-gray-400">Cargando análisis de tráfico...</span>
      </div>
    );
  }

  if (!trafficData) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-300 mb-2">No hay datos disponibles</h3>
        <p className="text-gray-400">No se pudieron cargar los datos de análisis de tráfico</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con controles */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white mb-2">Análisis de Tráfico de Red</h3>
          <p className="text-gray-400">
            {selectedAgent ? `Análisis específico del agente` : 'Análisis global por categorías'}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="1h">Última hora</option>
            <option value="6h">Últimas 6 horas</option>
            <option value="24h">Últimas 24 horas</option>
            <option value="7d">Última semana</option>
          </select>
        </div>
      </div>

      {/* Estadísticas generales */}
      {trafficData.total_stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-blue-900/20 rounded-xl p-6 border border-blue-500/30">
            <div className="flex items-center justify-between mb-4">
              <Activity className="w-8 h-8 text-blue-400" />
              <span className="text-sm text-gray-400">Total</span>
            </div>
            <div className="text-3xl font-bold text-blue-400 mb-2">
              {trafficData.total_stats.total_connections.toLocaleString()}
            </div>
            <div className="text-gray-300">Conexiones</div>
          </div>

          <div className="bg-green-900/20 rounded-xl p-6 border border-green-500/30">
            <div className="flex items-center justify-between mb-4">
              <Globe className="w-8 h-8 text-green-400" />
              <span className="text-sm text-gray-400">Únicos</span>
            </div>
            <div className="text-3xl font-bold text-green-400 mb-2">
              {trafficData.total_stats.total_domains.toLocaleString()}
            </div>
            <div className="text-gray-300">Dominios</div>
          </div>

          <div className="bg-purple-900/20 rounded-xl p-6 border border-purple-500/30">
            <div className="flex items-center justify-between mb-4">
              <Zap className="w-8 h-8 text-purple-400" />
              <span className="text-sm text-gray-400">Bandwidth</span>
            </div>
            <div className="text-3xl font-bold text-purple-400 mb-2">
              {formatBytes(trafficData.total_stats.total_bandwidth_mb * 1024 * 1024)}
            </div>
            <div className="text-gray-300">Transferido</div>
          </div>

          <div className="bg-orange-900/20 rounded-xl p-6 border border-orange-500/30">
            <div className="flex items-center justify-between mb-4">
              <Shield className="w-8 h-8 text-orange-400" />
              <span className="text-sm text-gray-400">Activos</span>
            </div>
            <div className="text-3xl font-bold text-orange-400 mb-2">
              {trafficData.total_stats.active_agents}
            </div>
            <div className="text-gray-300">Agentes</div>
          </div>
        </div>
      )}

      {/* Análisis por categorías */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {trafficData.categories?.map((category) => {
          const IconComponent = getCategoryIcon(category.category);
          const colorClasses = getCategoryColor(category.category);
          
          return (
            <div key={category.category} className={`rounded-xl border p-6 ${colorClasses}`}>
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <IconComponent className="w-6 h-6" />
                  <h4 className="text-lg font-semibold text-white capitalize">
                    {category.category === 'other' ? 'Otros' : category.category}
                  </h4>
                </div>
                <div className="text-xs px-2 py-1 rounded-full bg-gray-800/50 text-gray-300">
                  {category.total_agents} agente{category.total_agents !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Métricas principales */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-2xl font-bold text-white">
                    {category.total_connections.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-400">Conexiones</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">
                    {category.unique_domains}
                  </div>
                  <div className="text-sm text-gray-400">Dominios</div>
                </div>
              </div>

              {/* Estadísticas adicionales */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400 flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    Tiempo promedio
                  </span>
                  <span className="text-white font-medium">
                    {formatTime(category.avg_session_time)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400 flex items-center">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    Bandwidth
                  </span>
                  <span className="text-white font-medium">
                    {formatBytes(category.bandwidth_mb * 1024 * 1024)}
                  </span>
                </div>
              </div>

              {/* Top dominios */}
              <div className="mt-4 pt-4 border-t border-gray-700/50">
                <h5 className="text-sm font-medium text-gray-400 mb-2">Top Dominios</h5>
                <div className="space-y-1">
                  {category.top_domains?.slice(0, 3).map((domain, index) => (
                    <div key={index} className="text-xs text-gray-300 truncate">
                      {index + 1}. {domain}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Gráfico de barras comparativo */}
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/30">
        <h4 className="text-lg font-semibold text-white mb-4">Comparativa de Categorías</h4>
        <div className="space-y-3">
          {trafficData.categories?.sort((a, b) => b.total_connections - a.total_connections).map((category) => {
            const maxConnections = Math.max(...trafficData.categories.map(c => c.total_connections));
            const percentage = (category.total_connections / maxConnections) * 100;
            const colorClasses = getCategoryColor(category.category);
            
            return (
              <div key={category.category} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300 capitalize">
                    {category.category === 'other' ? 'Otros' : category.category}
                  </span>
                  <span className="text-white font-medium">
                    {category.total_connections.toLocaleString()} conexiones
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-1000 ${colorClasses.split(' ')[1]}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default NetworkTrafficAnalysis;
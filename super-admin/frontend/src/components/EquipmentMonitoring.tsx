import React, { useState, useEffect, useCallback } from 'react';
import { 
  Monitor, 
  Cpu, 
  HardDrive, 
  Wifi, 
  Activity, 
  Globe, 
  Filter, 
  Search, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  PieChart,
  TrendingUp,
  Network,
  Zap,
  Users
} from 'lucide-react';
import NetworkTrafficAnalysis from './NetworkTrafficAnalysis';
import WebMonitoringGrid from './WebMonitoringGrid';

interface SystemMetrics {
  cpu_percent: number;
  memory_percent: number;
  disk_usage: number;
  network_sent: number;
  network_recv: number;
}

interface DomainStats {
  [domain: string]: {
    connections: number;
    processes: string[];
    ports: number[];
    category: string;
    last_seen: string;
  };
}

interface AgentData {
  agent_id: string;
  hostname: string;
  timestamp: string;
  session_duration_minutes: number;
  total_connections: number;
  total_domains: number;
  active_browsers: number;
  domain_stats: DomainStats;
  browser_processes: Array<{
    browser: string;
    pid: number;
    name: string;
    cpu_percent: number;
    memory_mb: number;
  }>;
  system_metrics: SystemMetrics;
  public_ip?: string;
  top_domains: Array<[string, number]>;
  domains_by_transfer?: Array<[string, number]>;
  category_summary: {
    [category: string]: {
      domains: number;
      connections: number;
    };
  };
  status?: 'online' | 'offline' | 'warning';
  last_update?: string;
}

interface EquipmentMonitoringProps {
  user: {
    tenant_id?: string | null;
    company_name?: string | null;
  };
}

const EquipmentMonitoring: React.FC<EquipmentMonitoringProps> = ({ user }) => {
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline' | 'warning'>('all');
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'traffic' | 'webmonitoring'>('overview');

  // Mock data para demostración
  const generateMockAgent = (id: string, hostname: string): AgentData => {
    const mockDomains = {
      'google.com': { connections: 5, processes: ['chrome.exe'], ports: [443, 80], category: 'work', last_seen: new Date().toISOString() },
      'youtube.com': { connections: 3, processes: ['chrome.exe'], ports: [443], category: 'video', last_seen: new Date().toISOString() },
      'facebook.com': { connections: 2, processes: ['firefox.exe'], ports: [443], category: 'social', last_seen: new Date().toISOString() },
      'office.com': { connections: 4, processes: ['msedge.exe'], ports: [443], category: 'work', last_seen: new Date().toISOString() },
      'netflix.com': { connections: 1, processes: ['chrome.exe'], ports: [443], category: 'video', last_seen: new Date().toISOString() }
    };

    return {
      agent_id: id,
      hostname,
      timestamp: new Date().toISOString(),
      session_duration_minutes: Math.random() * 480 + 60, // 1-8 horas
      total_connections: Math.floor(Math.random() * 20) + 5,
      total_domains: Object.keys(mockDomains).length,
      active_browsers: Math.floor(Math.random() * 3) + 1,
      domain_stats: mockDomains,
      browser_processes: [
        { browser: 'chrome', pid: 1234, name: 'chrome.exe', cpu_percent: Math.random() * 30, memory_mb: Math.random() * 500 + 200 },
        { browser: 'firefox', pid: 5678, name: 'firefox.exe', cpu_percent: Math.random() * 20, memory_mb: Math.random() * 300 + 150 }
      ],
      system_metrics: {
        cpu_percent: Math.random() * 100,
        memory_percent: Math.random() * 100,
        disk_usage: Math.random() * 100,
        network_sent: Math.random() * 1000000000,
        network_recv: Math.random() * 1000000000
      },
      top_domains: Object.entries(mockDomains).map(([domain, data]) => [domain, data.connections]),
      category_summary: {
        work: { domains: 2, connections: 9 },
        video: { domains: 2, connections: 4 },
        social: { domains: 1, connections: 2 }
      },
      status: Math.random() > 0.1 ? 'online' : Math.random() > 0.5 ? 'warning' : 'offline',
      last_update: new Date().toISOString()
    };
  };

  const loadAgentsData = useCallback(async () => {
    setLoading(true);
    try {
      // Llamada a la API real
      const response = await fetch('http://194.164.172.92:3001/api/equipment/agents');
      const data = await response.json();
      
      if (data.success) {
        // Solo usar datos reales de la API
        setAgents(data.agents);
        console.log('✅ Agentes cargados desde API:', data.agents.length);
      } else {
        console.error('❌ Error from API:', data.error);
        // No mostrar datos mock, solo mensaje de error
        setAgents([]);
      }
    } catch (error) {
      console.error('❌ Error connecting to API:', error);
      // No mostrar datos mock, solo mensaje de error  
      setAgents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAgentsData();
  }, [loadAgentsData]);

  // Auto-refresh cada 30 segundos (comentado por petición del usuario)
  // useEffect(() => {
  //   if (!autoRefresh) return;
  //   
  //   const interval = setInterval(() => {
  //     loadAgentsData();
  //   }, 30000);

  //   return () => clearInterval(interval);
  // }, [autoRefresh, loadAgentsData]);

  // Filtrar agentes
  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.hostname.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agent.agent_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Componente de velocímetro
  const SpeedometerGauge = ({ value, max, label, unit, color }: {
    value: number;
    max: number;
    label: string;
    unit: string;
    color: string;
  }) => {
    const percentage = Math.min((value / max) * 100, 100);
    const rotation = (percentage / 100) * 180; // 180 grados para semicírculo
    
    const getColor = () => {
      if (percentage < 50) return 'text-green-400';
      if (percentage < 80) return 'text-yellow-400';
      return 'text-red-400';
    };

    return (
      <div className="relative w-20 h-20 mx-auto">
        {/* Etiqueta arriba */}
        <div className="text-center mb-1">
          <div className="text-xs text-gray-400">{label}</div>
        </div>
        {/* Semicírculo base */}
        <div className="absolute inset-0 top-3">
          <svg viewBox="0 0 100 50" className="w-full h-full">
            <path
              d="M 10 40 A 30 30 0 0 1 90 40"
              fill="none"
              stroke="rgb(55, 65, 81)"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <path
              d="M 10 40 A 30 30 0 0 1 90 40"
              fill="none"
              stroke={color}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${percentage * 1.26} 126`}
              className="transition-all duration-1000"
            />
          </svg>
          {/* Aguja */}
          <div 
            className="absolute top-6 left-1/2 w-0.5 h-4 bg-white origin-bottom transform -translate-x-1/2 transition-transform duration-1000"
            style={{ transform: `translateX(-50%) rotate(${rotation - 90}deg)` }}
          />
        </div>
      </div>
    );
  };

  // Componente de tarjeta de agente
  const AgentCard = ({ agent }: { agent: AgentData }) => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'online': return 'border-green-500/30 bg-green-900/10';
        case 'warning': return 'border-yellow-500/30 bg-yellow-900/10';
        case 'offline': return 'border-red-500/30 bg-red-900/10';
        default: return 'border-gray-500/30 bg-gray-900/10';
      }
    };

    const getStatusIcon = (status: string) => {
      switch (status) {
        case 'online': return <CheckCircle className="w-4 h-4 text-green-400" />;
        case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
        case 'offline': return <AlertTriangle className="w-4 h-4 text-red-400" />;
        default: return <Clock className="w-4 h-4 text-gray-400" />;
      }
    };

    return (
      <div className={`rounded-xl border p-6 ${getStatusColor(agent.status || 'online')} backdrop-blur-sm`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Monitor className="w-6 h-6 text-blue-400" />
            <div>
              <h3 className="text-lg font-semibold text-white">{agent.hostname}</h3>
              <p className="text-sm text-gray-400">{agent.agent_id}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(agent.status || 'online')}
            <span className="text-sm text-gray-300 capitalize">{agent.status}</span>
          </div>
        </div>

        {/* Velocímetros del sistema */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <SpeedometerGauge
            value={agent.system_metrics.cpu_percent}
            max={100}
            label="CPU"
            unit="%"
            color="rgb(59, 130, 246)"
          />
          <SpeedometerGauge
            value={agent.system_metrics.memory_percent}
            max={100}
            label="RAM"
            unit="%"
            color="rgb(16, 185, 129)"
          />
          <SpeedometerGauge
            value={agent.system_metrics.disk_usage}
            max={100}
            label="Disco"
            unit="%"
            color="rgb(245, 158, 11)"
          />
        </div>

        {/* Métricas de red */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <Network className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-gray-300">Conexiones</span>
            </div>
            <div className="text-xl font-bold text-white">{agent.total_connections}</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <Globe className="w-4 h-4 text-green-400" />
              <span className="text-sm text-gray-300">Dominios</span>
            </div>
            <div className="text-xl font-bold text-white">{agent.total_domains}</div>
          </div>
        </div>

        {/* Dominios por transferencia */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Dominios por Transferencia</h4>
          <div className="space-y-1">
            {(agent.domains_by_transfer || agent.top_domains).slice(0, 3).map(([domain, value]) => (
              <div key={domain} className="flex justify-between items-center text-sm">
                <span className="text-gray-300 truncate">{domain}</span>
                <span className="text-green-400 font-medium">
                  {agent.domains_by_transfer ? `${value} GB` : `${value}`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* IP Pública */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-300 mb-2">IP Pública</h4>
          <div className="bg-gray-800/50 rounded-lg p-2">
            <span className="text-blue-400 font-mono text-sm">
              {agent.public_ip || '194.164.172.92'}
            </span>
          </div>
        </div>

        {/* Tiempo de sesión */}
        <div className="text-xs text-gray-400">
          Sesión: {Math.floor(agent.session_duration_minutes / 60)}h {Math.floor(agent.session_duration_minutes % 60)}m
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400">Seguimiento en tiempo real de agentes desplegados</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={loadAgentsData}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2 inline" />
            Actualizar
          </button>
        </div>
      </div>

      {/* Pestañas de navegación */}
      <div className="flex items-center space-x-1 bg-gray-800/50 rounded-lg p-1 border border-gray-700/30">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all ${
            activeTab === 'overview'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
          }`}
        >
          <Monitor className="w-4 h-4" />
          <span>Vista General</span>
        </button>
        <button
          onClick={() => setActiveTab('traffic')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all ${
            activeTab === 'traffic'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Análisis de Tráfico</span>
        </button>
        <button
          onClick={() => setActiveTab('webmonitoring')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all ${
            activeTab === 'webmonitoring'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Monitoreo Web</span>
        </button>
      </div>

      {/* Contenido según pestaña activa */}
      {activeTab === 'traffic' ? (
        <NetworkTrafficAnalysis />
      ) : activeTab === 'webmonitoring' ? (
        <WebMonitoringGrid />
      ) : (
        <>
      {/* Filtros */}
      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/30">
        <div className="flex flex-wrap items-center gap-4">
          {/* Búsqueda */}
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por hostname o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Filtro de estado */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="all">Todos los estados</option>
              <option value="online">En línea</option>
              <option value="warning">Advertencia</option>
              <option value="offline">Desconectado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Estadísticas generales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-blue-900/20 rounded-xl p-6 border border-blue-500/30">
          <div className="flex items-center justify-between mb-4">
            <Monitor className="w-8 h-8 text-blue-400" />
            <span className="text-sm text-gray-400">Total</span>
          </div>
          <div className="text-4xl font-bold text-blue-400 mb-2">{agents.length}</div>
          <div className="text-gray-300">Equipos</div>
        </div>

        <div className="bg-green-900/20 rounded-xl p-6 border border-green-500/30">
          <div className="flex items-center justify-between mb-4">
            <CheckCircle className="w-8 h-8 text-green-400" />
            <span className="text-sm text-gray-400">Estado</span>
          </div>
          <div className="text-4xl font-bold text-green-400 mb-2">
            {agents.filter(a => a.status === 'online').length}
          </div>
          <div className="text-gray-300">En línea</div>
        </div>

        <div className="bg-yellow-900/20 rounded-xl p-6 border border-yellow-500/30">
          <div className="flex items-center justify-between mb-4">
            <AlertTriangle className="w-8 h-8 text-yellow-400" />
            <span className="text-sm text-gray-400">Alertas</span>
          </div>
          <div className="text-4xl font-bold text-yellow-400 mb-2">
            {agents.filter(a => a.status === 'warning').length}
          </div>
          <div className="text-gray-300">Advertencias</div>
        </div>

        <div className="bg-purple-900/20 rounded-xl p-6 border border-purple-500/30">
          <div className="flex items-center justify-between mb-4">
            <Activity className="w-8 h-8 text-purple-400" />
            <span className="text-sm text-gray-400">Actividad</span>
          </div>
          <div className="text-4xl font-bold text-purple-400 mb-2">
            {agents.reduce((sum, agent) => sum + agent.total_connections, 0)}
          </div>
          <div className="text-gray-300">Conexiones</div>
        </div>
      </div>

      {/* Grid de equipos */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
          <span className="ml-2 text-gray-400">Cargando equipos...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredAgents.map((agent) => (
            <AgentCard key={agent.agent_id} agent={agent} />
          ))}
        </div>
      )}

        {/* Mensaje si no hay equipos */}
        {!loading && filteredAgents.length === 0 && (
          <div className="text-center py-12">
            <Monitor className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No se encontraron equipos</h3>
            <p className="text-gray-400">
              {searchTerm || statusFilter !== 'all' 
                ? 'Prueba a ajustar los filtros de búsqueda' 
                : 'No hay agentes desplegados en este momento'
              }
            </p>
          </div>
        )}
        </>
      )}
    </div>
  );
};

export default EquipmentMonitoring;
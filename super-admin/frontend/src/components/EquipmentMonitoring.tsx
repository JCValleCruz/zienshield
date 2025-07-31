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
  Users,
  Eye
} from 'lucide-react';

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
  private_ip?: string;
  firewall_active?: boolean;
  antivirus_active?: boolean;
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


  const loadAgentsData = useCallback(async () => {
    setLoading(true);
    try {
      // Llamada a la API real para obtener agentes de Wazuh
      const response = await fetch(`http://194.164.172.92:3001/api/wazuh/agents/${user.tenant_id}`);
      const data = await response.json();
      
      if (data.success && data.data && data.data.agents) {
        // Mapear datos de Wazuh a formato del componente
        const mappedAgents = data.data.agents.map((agent: any) => ({
          agent_id: agent.id,
          hostname: agent.name || `Agent-${agent.id}`,
          timestamp: new Date().toISOString(),
          session_duration_minutes: 0, // Calcular desde last_keep_alive
          total_connections: 0,
          total_domains: 0,
          active_browsers: 0,
          domain_stats: {},
          browser_processes: [],
          system_metrics: {
            cpu_percent: 0,
            memory_percent: 0,
            disk_usage: 0,
            network_sent: 0,
            network_recv: 0
          },
          top_domains: [],
          category_summary: {},
          status: agent.status === 'active' ? 'online' : 'offline',
          last_update: agent.last_keep_alive || new Date().toISOString(),
          private_ip: agent.ip || 'N/A',
          public_ip: agent.registerIP || 'N/A',
          firewall_active: false,
          antivirus_active: false
        }));
        
        setAgents(mappedAgents);
        console.log('✅ Agentes Wazuh cargados:', mappedAgents.length);
      } else {
        console.error('❌ Error from Wazuh API:', data.error);
        setAgents([]);
      }
    } catch (error) {
      console.error('❌ Error connecting to Wazuh API:', error);
      setAgents([]);
    } finally {
      setLoading(false);
    }
  }, [user.tenant_id]);

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
      <div className="relative w-16 h-16 mx-auto">
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
      <div className={`rounded-xl border p-4 ${getStatusColor(agent.status || 'online')} backdrop-blur-sm`}>
        {/* Header compacto */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Monitor className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="text-sm font-semibold text-white truncate">{agent.hostname}</h3>
              <p className="text-xs text-gray-400">{agent.agent_id}</p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            {getStatusIcon(agent.status || 'online')}
          </div>
        </div>

        {/* Velocímetros del sistema compactos */}
        <div className="grid grid-cols-3 gap-1 mb-4">
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

        {/* Barras de velocidad de red */}
        <div className="mb-3">
          <div className="bg-gray-800/50 rounded-lg p-2">
            <div className="flex items-center justify-between text-xs text-gray-300 mb-1">
              <span>🔼 Upload</span>
              <span>{(agent.system_metrics.network_sent / 1024 / 1024).toFixed(1)} MB/s</span>
            </div>
            <div className="bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((agent.system_metrics.network_sent / 10000000) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-2 mt-1">
            <div className="flex items-center justify-between text-xs text-gray-300 mb-1">
              <span>🔽 Download</span>
              <span>{(agent.system_metrics.network_recv / 1024 / 1024).toFixed(1)} MB/s</span>
            </div>
            <div className="bg-gray-700 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((agent.system_metrics.network_recv / 10000000) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* IPs y Seguridad */}
        <div className="mb-3">
          {/* IPs */}
          <div className="grid grid-cols-2 gap-1 mb-2">
            <div className="bg-gray-800/50 rounded p-1">
              <div className="text-xs text-gray-400">IP Privada</div>
              <div className="text-xs text-blue-400 font-mono">{agent.private_ip || '192.168.1.100'}</div>
            </div>
            <div className="bg-gray-800/50 rounded p-1">
              <div className="text-xs text-gray-400">IP Pública</div>
              <div className="text-xs text-green-400 font-mono">{agent.public_ip || '194.164.172.92'}</div>
            </div>
          </div>
          
          {/* Indicadores de Seguridad */}
          <div className="grid grid-cols-2 gap-1">
            <div className="bg-gray-800/50 rounded p-1 flex items-center justify-between">
              <span className="text-xs text-gray-300">🛡️ Firewall</span>
              <div className={`w-2 h-2 rounded-full ${agent.firewall_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
            </div>
            <div className="bg-gray-800/50 rounded p-1 flex items-center justify-between">
              <span className="text-xs text-gray-300">🦠 Antivirus</span>
              <div className={`w-2 h-2 rounded-full ${agent.antivirus_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
            </div>
          </div>
        </div>

        {/* Métricas Especiales para pc-axafone-jvalle (Prometheus) */}
        {agent.hostname === 'pc-axafone-jvalle' && (
          <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-2 mb-2">
            <div className="text-xs text-purple-400 mb-1">📊 Prometheus Metrics</div>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div className="text-gray-300">Uptime: 2d 14h</div>
              <div className="text-gray-300">Temp: 45°C</div>
              <div className="text-gray-300">Processes: 234</div>
              <div className="text-gray-300">Load: 1.2</div>
            </div>
          </div>
        )}

        {/* Info de sesión */}
        <div className="text-xs text-gray-400 text-center">
          {Math.floor(agent.session_duration_minutes / 60)}h {Math.floor(agent.session_duration_minutes % 60)}m online
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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

    </div>
  );
};

export default EquipmentMonitoring;
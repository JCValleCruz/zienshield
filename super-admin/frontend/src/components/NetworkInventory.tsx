import React, { useState, useEffect } from 'react';
import { 
  Network, 
  Wifi, 
  Monitor, 
  Shield, 
  Activity, 
  Globe, 
  Router, 
  Cable,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  MapPin,
  Server,
  Home,
  Building
} from 'lucide-react';

interface NetworkInfo {
  private_ip: string;
  subnet: string;
  gateway: string;
  dns_servers: string[];
  interface_name: string;
  interface_type: string;
  link_speed_mbps: number;
  mac_address: string;
  dhcp_enabled: boolean;
  connection_type: string;
}

interface NetworkClassification {
  type: 'vpn' | 'office' | 'remote' | 'unknown';
  description: string;
}

interface AgentNetworkData {
  agent_id: string;
  hostname: string;
  public_ip: string;
  network_info: NetworkInfo;
  network_classification: NetworkClassification;
  status: string;
  last_update: string;
  system_metrics: {
    cpu_percent: number;
    memory_percent: number;
  };
}

interface NetworkInventoryProps {
  user: {
    tenant_id?: string | null;
    company_name?: string | null;
  };
}

interface NetworkGroup {
  subnet: string;
  public_ip: string;
  network_type: string;
  description: string;
  agents: AgentNetworkData[];
  gateway: string;
  dns_servers: string[];
}

const NetworkInventory: React.FC<NetworkInventoryProps> = ({ user }) => {
  const [agents, setAgents] = useState<AgentNetworkData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grouped' | 'list'>('grouped');

  useEffect(() => {
    loadNetworkData();
    const interval = setInterval(loadNetworkData, 30000); // Actualizar cada 30 segundos
    return () => clearInterval(interval);
  }, []);

  const loadNetworkData = async () => {
    try {
      console.log('Loading network data...');
      
      // Get token from localStorage
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://194.164.172.92:3002/api/equipment/agents', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Network data response:', data);
      
      if (data.success && data.agents) {
        console.log(`Loaded ${data.agents.length} agents`);
        setAgents(data.agents);
      } else {
        console.log('No agents found or API error');
      }
    } catch (error) {
      console.error('Error loading network data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Agrupar agentes por subnet y IP pública
  const networkGroups: NetworkGroup[] = React.useMemo(() => {
    const groups = new Map<string, NetworkGroup>();
    
    agents.forEach(agent => {
      const key = `${agent.network_info.subnet}-${agent.public_ip}`;
      
      if (!groups.has(key)) {
        groups.set(key, {
          subnet: agent.network_info.subnet,
          public_ip: agent.public_ip,
          network_type: agent.network_classification.type,
          description: agent.network_classification.description,
          agents: [],
          gateway: agent.network_info.gateway,
          dns_servers: agent.network_info.dns_servers
        });
      }
      
      groups.get(key)!.agents.push(agent);
    });
    
    return Array.from(groups.values()).sort((a, b) => {
      // Ordenar por tipo de red: oficina -> vpn -> remoto
      const typeOrder = { office: 0, vpn: 1, remote: 2, unknown: 3 };
      return typeOrder[a.network_type as keyof typeof typeOrder] - typeOrder[b.network_type as keyof typeof typeOrder];
    });
  }, [agents]);

  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  const getNetworkTypeIcon = (type: string) => {
    switch (type) {
      case 'office': return <Building className="w-5 h-5 text-blue-400" />;
      case 'vpn': return <Shield className="w-5 h-5 text-green-400" />;
      case 'remote': return <Home className="w-5 h-5 text-orange-400" />;
      default: return <Globe className="w-5 h-5 text-gray-400" />;
    }
  };

  const getNetworkTypeColor = (type: string) => {
    switch (type) {
      case 'office': return 'border-blue-500 bg-blue-500/10';
      case 'vpn': return 'border-green-500 bg-green-500/10';
      case 'remote': return 'border-orange-500 bg-orange-500/10';
      default: return 'border-gray-500 bg-gray-500/10';
    }
  };

  const getConnectionIcon = (connectionType: string) => {
    return connectionType === 'wired' ? 
      <Cable className="w-4 h-4 text-blue-400" /> : 
      <Wifi className="w-4 h-4 text-green-400" />;
  };

  const formatSpeed = (speedMbps: number) => {
    if (speedMbps >= 1000) {
      return `${speedMbps / 1000} Gbps`;
    }
    return `${speedMbps} Mbps`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center space-y-4 text-slate-300">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="text-lg">Cargando inventario de red...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400">Equipos agrupados por topología de red</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-gray-800/50 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grouped')}
              className={`px-3 py-1 rounded transition-all ${
                viewMode === 'grouped'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Network className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded transition-all ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Monitor className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={loadNetworkData}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Estadísticas globales */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/30">
          <div className="flex items-center space-x-3">
            <Network className="w-8 h-8 text-blue-400" />
            <div>
              <div className="text-2xl font-bold text-white">{networkGroups.length}</div>
              <div className="text-sm text-gray-400">Redes Detectadas</div>
            </div>
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/30">
          <div className="flex items-center space-x-3">
            <Building className="w-8 h-8 text-blue-400" />
            <div>
              <div className="text-2xl font-bold text-white">
                {networkGroups.filter(g => g.network_type === 'office').length}
              </div>
              <div className="text-sm text-gray-400">Redes de Oficina</div>
            </div>
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/30">
          <div className="flex items-center space-x-3">
            <Shield className="w-8 h-8 text-green-400" />
            <div>
              <div className="text-2xl font-bold text-white">
                {networkGroups.filter(g => g.network_type === 'vpn').length}
              </div>
              <div className="text-sm text-gray-400">Conexiones VPN</div>
            </div>
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/30">
          <div className="flex items-center space-x-3">
            <Home className="w-8 h-8 text-orange-400" />
            <div>
              <div className="text-2xl font-bold text-white">
                {networkGroups.filter(g => g.network_type === 'remote').length}
              </div>
              <div className="text-sm text-gray-400">Trabajo Remoto</div>
            </div>
          </div>
        </div>
      </div>

      {/* Vista agrupada por red */}
      {viewMode === 'grouped' && (
        <div className="space-y-4">
          {networkGroups.length === 0 && !loading && (
            <div className="text-center py-12">
              <Network className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-300 mb-2">No hay equipos conectados</h3>
              <p className="text-gray-400">No se encontraron agentes de red activos</p>
            </div>
          )}
          {networkGroups.map((group) => {
            const groupKey = `${group.subnet}-${group.public_ip}`;
            const isExpanded = expandedGroups.has(groupKey);
            
            return (
              <div key={groupKey} className={`rounded-xl border-2 ${getNetworkTypeColor(group.network_type)}`}>
                {/* Group Header */}
                <div 
                  className="p-4 cursor-pointer hover:bg-gray-700/20 transition-colors"
                  onClick={() => toggleGroup(groupKey)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {getNetworkTypeIcon(group.network_type)}
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-semibold text-white">{group.description}</h3>
                          <span className="px-2 py-1 bg-gray-700 text-xs text-gray-300 rounded">
                            {group.agents.length} equipos
                          </span>
                        </div>
                        <div className="text-sm text-gray-400 mt-1">
                          <span className="mr-4">Subnet: {group.subnet}</span>
                          <span className="mr-4">IP Pública: {group.public_ip}</span>
                          <span>Gateway: {group.gateway}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-400">
                        {group.agents.filter(a => a.status === 'online').length} online
                      </span>
                      {isExpanded ? 
                        <ChevronDown className="w-5 h-5 text-gray-400" /> : 
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      }
                    </div>
                  </div>
                </div>

                {/* Group Content */}
                {isExpanded && (
                  <div className="border-t border-gray-700/50">
                    <div className="p-4">
                      <div className="grid gap-4">
                        {group.agents.map((agent) => (
                          <div key={agent.agent_id} className="bg-gray-800/30 rounded-lg p-4">
                            <div className="grid grid-cols-6 gap-4 items-center">
                              <div className="flex items-center space-x-3">
                                <Monitor className="w-5 h-5 text-blue-400" />
                                <div>
                                  <div className="font-medium text-white">{agent.hostname}</div>
                                  <div className="text-xs text-gray-400">{agent.agent_id}</div>
                                </div>
                              </div>
                              
                              <div>
                                <div className="text-sm text-gray-300">{agent.network_info.private_ip}</div>
                                <div className="text-xs text-gray-400">IP Privada</div>
                              </div>
                              
                              <div>
                                <div className="flex items-center space-x-1">
                                  {getConnectionIcon(agent.network_info.connection_type)}
                                  <span className="text-sm text-gray-300">{agent.network_info.interface_name}</span>
                                </div>
                                <div className="text-xs text-gray-400">
                                  {formatSpeed(agent.network_info.link_speed_mbps)}
                                </div>
                              </div>
                              
                              <div>
                                <div className="text-sm text-gray-300">
                                  {agent.network_info.dns_servers[0]}
                                </div>
                                <div className="text-xs text-gray-400">DNS Principal</div>
                              </div>
                              
                              <div>
                                <div className="text-sm text-gray-300">{agent.network_info.mac_address}</div>
                                <div className="text-xs text-gray-400">MAC Address</div>
                              </div>
                              
                              <div className="flex items-center justify-end space-x-2">
                                <div className={`w-3 h-3 rounded-full ${
                                  agent.status === 'online' ? 'bg-green-400' : 
                                  agent.status === 'warning' ? 'bg-yellow-400' : 'bg-red-400'
                                }`}></div>
                                <span className="text-sm text-gray-300 capitalize">{agent.status}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Vista de lista */}
      {viewMode === 'list' && (
        <div className="bg-gray-800/50 rounded-xl border border-gray-700/30 overflow-hidden">
          {agents.length === 0 && !loading && (
            <div className="text-center py-12">
              <Monitor className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-300 mb-2">No hay equipos conectados</h3>
              <p className="text-gray-400">No se encontraron agentes de red activos</p>
            </div>
          )}
          {agents.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Equipo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Red</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">IP Privada</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">IP Pública</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Gateway</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Interfaz</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Velocidad</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {agents.map((agent) => (
                  <tr key={agent.agent_id} className="hover:bg-gray-700/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-3">
                        <Monitor className="w-4 h-4 text-blue-400" />
                        <div>
                          <div className="text-sm font-medium text-white">{agent.hostname}</div>
                          <div className="text-xs text-gray-400">{agent.agent_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        {getNetworkTypeIcon(agent.network_classification.type)}
                        <span className="text-sm text-gray-300">{agent.network_classification.description}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">{agent.network_info.private_ip}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">{agent.public_ip}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">{agent.network_info.gateway}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        {getConnectionIcon(agent.network_info.connection_type)}
                        <span className="text-sm text-gray-300">{agent.network_info.interface_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {formatSpeed(agent.network_info.link_speed_mbps)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          agent.status === 'online' ? 'bg-green-400' : 
                          agent.status === 'warning' ? 'bg-yellow-400' : 'bg-red-400'
                        }`}></div>
                        <span className="text-sm text-gray-300 capitalize">{agent.status}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NetworkInventory;
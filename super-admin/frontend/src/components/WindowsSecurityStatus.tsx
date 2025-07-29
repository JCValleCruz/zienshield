import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, Clock, Activity, Zap, Target, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';

interface WindowsAgent {
  id: string;
  name: string;
  ip: string;
  os: {
    name: string;
    version: string;
    platform: string;
  };
  status: string;
  last_keep_alive: string;
  groups: string[];
  version: string;
}

interface FirewallProfile {
  enabled: boolean | null;
  status: string;
}

interface FirewallStatus {
  hasData: boolean;
  profiles: {
    domain: FirewallProfile;
    private: FirewallProfile;
    public: FirewallProfile;
  };
  rules: {
    total: number;
    enabled: number;
    disabled: number;
    blocking: number;
    allowing: number;
  };
  overall_status: string;
  last_updated: string;
  error?: string;
}

interface DefenderThreat {
  name: string;
  severity: string;
  action: string;
  timestamp: string;
  path: string;
}

interface DefenderStatus {
  hasData: boolean;
  real_time_protection: { enabled: boolean | null; status: string };
  cloud_protection: { enabled: boolean | null; status: string };
  signature_version: string | null;
  last_scan: {
    type: string | null;
    start_time: string | null;
    result: string | null;
    threats_found: number;
  };
  threats: {
    total_detected: number;
    quarantined: number;
    removed: number;
    allowed: number;
    recent_threats: DefenderThreat[];
  };
  overall_status: string;
  health_score: number;
  last_updated: string;
  error?: string;
}

interface SecurityRecommendation {
  type: string;
  severity: string;
  title: string;
  description: string;
  action: string;
}

interface WindowsSecurityData {
  agent_id: string;
  timestamp: string;
  firewall: FirewallStatus;
  defender: DefenderStatus;
  overall_security_score: number;
  security_level: string;
  recommendations: SecurityRecommendation[];
  summary: {
    firewall_enabled: string[];
    defender_enabled: boolean | null;
    recent_threats: number;
    last_updated: string;
  };
}

interface WindowsSecurityStatusProps {
  tenantId: string;
}

const WindowsSecurityStatus: React.FC<WindowsSecurityStatusProps> = ({ tenantId }) => {
  const [agents, setAgents] = useState<WindowsAgent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [securityData, setSecurityData] = useState<WindowsSecurityData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFirewallDetails, setShowFirewallDetails] = useState(false);
  const [showDefenderDetails, setShowDefenderDetails] = useState(false);
  const [showAllThreats, setShowAllThreats] = useState(false);
  const [showAllRecommendations, setShowAllRecommendations] = useState(false);

  useEffect(() => {
    loadWindowsAgents();
  }, [tenantId]);

  const loadWindowsAgents = async (retryCount = 0) => {
    try {
      setLoading(true);
      setError(null);
      
      const url = tenantId 
        ? `http://194.164.172.92:3001/api/windows-security/agents?tenant_id=${tenantId}`
        : 'http://194.164.172.92:3001/api/windows-security/agents';
      
      console.log(`🔍 Loading Windows agents from: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📋 Windows agents response:', data);
      
      if (data.success) {
        setAgents(data.agents || []);
        if (data.agents && data.agents.length > 0) {
          setSelectedAgent(data.agents[0].id);
          console.log(`✅ Loaded ${data.agents.length} Windows agents`);
        } else {
          console.log('⚠️ No Windows agents found for tenant');
        }
      } else {
        throw new Error(data.error || 'Failed to load Windows agents');
      }
    } catch (err) {
      console.error('❌ Error loading Windows agents:', err);
      
      const error = err as Error;
      
      // Retry logic for network errors
      if (retryCount < 2 && (error.name === 'TypeError' || error.name === 'AbortError' || error.message.includes('fetch'))) {
        console.log(`🔄 Retrying... (${retryCount + 1}/2)`);
        setTimeout(() => loadWindowsAgents(retryCount + 1), 2000);
        return;
      }
      
      setError(`Error de conexión: ${error.message}`);
      setAgents([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSecurityStatus = async (agentId: string, retryCount = 0) => {
    if (!agentId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const url = `http://194.164.172.92:3001/api/windows-security/status/${agentId}`;
      console.log(`🔒 Loading security status from: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('🛡️ Security status response:', data);
      
      if (data.success) {
        setSecurityData(data.security_status);
        console.log('✅ Security status loaded successfully');
      } else {
        throw new Error(data.error || 'Failed to load security status');
      }
    } catch (err) {
      console.error('❌ Error loading security status:', err);
      
      const error = err as Error;
      
      // Retry logic for network errors
      if (retryCount < 1 && (error.name === 'TypeError' || error.name === 'AbortError' || error.message.includes('fetch'))) {
        console.log(`🔄 Retrying security status... (${retryCount + 1}/1)`);
        setTimeout(() => loadSecurityStatus(agentId, retryCount + 1), 3000);
        return;
      }
      
      setError(`Error cargando estado de seguridad: ${error.message}`);
      setSecurityData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedAgent) {
      loadSecurityStatus(selectedAgent);
    }
  }, [selectedAgent]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'enabled':
      case 'protected':
      case 'fully_protected':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'disabled':
      case 'vulnerable':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'partially_protected':
      case 'partial_protection':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'enabled':
      case 'protected':
      case 'fully_protected':
        return 'text-green-400';
      case 'disabled':
      case 'vulnerable':
        return 'text-red-400';
      case 'partially_protected':
      case 'partial_protection':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  const getSecurityLevelColor = (level: string) => {
    switch (level) {
      case 'excellent':
        return 'bg-green-900 text-green-200 border-green-500';
      case 'good':
        return 'bg-blue-900 text-blue-200 border-blue-500';
      case 'moderate':
        return 'bg-yellow-900 text-yellow-200 border-yellow-500';
      case 'poor':
        return 'bg-orange-900 text-orange-200 border-orange-500';
      case 'critical':
        return 'bg-red-900 text-red-200 border-red-500';
      default:
        return 'bg-gray-900 text-gray-200 border-gray-500';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-900 text-red-200 border-red-500';
      case 'high':
        return 'bg-orange-900 text-orange-200 border-orange-500';
      case 'medium':
        return 'bg-yellow-900 text-yellow-200 border-yellow-500';
      case 'low':
        return 'bg-blue-900 text-blue-200 border-blue-500';
      default:
        return 'bg-gray-900 text-gray-200 border-gray-500';
    }
  };

  if (loading && !securityData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="text-gray-300">Cargando estado de seguridad Windows...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <XCircle className="w-6 h-6 text-red-400" />
          <div>
            <h3 className="text-lg font-semibold text-red-300">Error de Conexión</h3>
            <p className="text-red-200">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!loading && agents.length === 0) {
    return (
      <div className="text-center py-12">
        <Shield className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Sin Agentes Windows</h3>
        <p className="text-gray-400 mb-4">No se encontraron agentes Windows activos para este tenant</p>
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 max-w-md mx-auto">
          <h4 className="text-blue-300 font-medium mb-2">¿Cómo solucionarlo?</h4>
          <ul className="text-sm text-blue-200 text-left space-y-1">
            <li>• Verificar que los agentes Wazuh estén instalados en equipos Windows</li>
            <li>• Confirmar que los agentes pertenezcan al grupo <code className="bg-blue-800 px-1 rounded">zs_{tenantId?.replace(/-/g, '_')}</code></li>
            <li>• Revisar conectividad de red entre agentes y servidor Wazuh</li>
          </ul>
        </div>
        <button
          onClick={() => loadWindowsAgents()}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Agent Selector */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center">
            <Shield className="w-6 h-6 mr-3 text-blue-400" />
            Estado de Seguridad Windows
          </h2>
          <div className="flex items-center space-x-4">
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="">Seleccionar agente...</option>
              {agents.map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} ({agent.ip})
                </option>
              ))}
            </select>
            <div className="flex space-x-2">
              <button
                onClick={() => loadWindowsAgents()}
                disabled={loading}
                className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white px-3 py-2 rounded-lg transition-colors text-sm"
                title="Recargar lista de agentes"
              >
                🔄 Agentes
              </button>
              <button
                onClick={() => selectedAgent && loadSecurityStatus(selectedAgent)}
                disabled={loading || !selectedAgent}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {loading ? 'Cargando...' : '🛡️ Actualizar Estado'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {securityData && (
        <>
          {/* Compact Security Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Overall Security Score */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide">Puntuación</h3>
                  <div className="flex items-baseline mt-1">
                    <div className="text-2xl font-bold text-white">
                      {securityData.overall_security_score}
                    </div>
                    <div className="text-sm text-gray-400 ml-1">/100</div>
                  </div>
                  <div className={`mt-2 px-2 py-1 rounded text-xs font-medium border ${getSecurityLevelColor(securityData.security_level)}`}>
                    {securityData.security_level.toUpperCase()}
                  </div>
                </div>
                <div className="text-right">
                  <Target className="w-6 h-6 text-blue-400 mb-2" />
                  <div className={`w-12 h-2 rounded-full ${securityData.overall_security_score >= 80 ? 'bg-green-500' : securityData.overall_security_score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                </div>
              </div>
            </div>

            {/* Windows Firewall */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide">Firewall</h3>
                  <div className="flex items-center mt-1">
                    {getStatusIcon(securityData.firewall.overall_status)}
                    <div className={`text-sm font-semibold ml-2 ${getStatusColor(securityData.firewall.overall_status)}`}>
                      {securityData.summary.firewall_enabled.length}/3 Activos
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {securityData.summary.firewall_enabled.join(', ') || 'Ninguno'}
                  </div>
                </div>
                <button
                  onClick={() => setShowFirewallDetails(!showFirewallDetails)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {showFirewallDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Windows Defender */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide">Defender</h3>
                  <div className="flex items-center mt-1">
                    {getStatusIcon(securityData.defender.overall_status)}
                    <div className={`text-sm font-semibold ml-2 ${getStatusColor(securityData.defender.overall_status)}`}>
                      {securityData.summary.defender_enabled ? 'Activo' : 'Inactivo'}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Salud: {securityData.defender.health_score}/100
                  </div>
                </div>
                <button
                  onClick={() => setShowDefenderDetails(!showDefenderDetails)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {showDefenderDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Threats Summary */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide">Amenazas</h3>
                  <div className="flex items-center mt-1">
                    <AlertTriangle className={`w-4 h-4 ${securityData.summary.recent_threats > 0 ? 'text-red-400' : 'text-green-400'}`} />
                    <div className={`text-lg font-bold ml-2 ${securityData.summary.recent_threats > 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {securityData.summary.recent_threats}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {securityData.summary.recent_threats > 0 ? 'Detectadas recientemente' : 'Sin amenazas'}
                  </div>
                </div>
                {securityData.defender.threats.recent_threats.length > 0 && (
                  <button
                    onClick={() => setShowAllThreats(!showAllThreats)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {showAllThreats ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Threat List */}
          {showAllThreats && securityData.defender.threats.recent_threats.length > 0 && (
            <div className="bg-red-900/10 border border-red-500/20 rounded-lg p-4">
              <h4 className="text-red-300 font-medium mb-3 text-sm">Amenazas Recientes</h4>
              <div className="space-y-2">
                {securityData.defender.threats.recent_threats.slice(0, 3).map((threat, index) => (
                  <div key={index} className="flex items-center justify-between bg-red-900/20 rounded p-2 text-sm">
                    <div>
                      <span className="text-white font-medium">{threat.name}</span>
                      <span className="text-red-300 ml-2">({threat.severity})</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {threat.action}
                    </div>
                  </div>
                ))}
                {securityData.defender.threats.recent_threats.length > 3 && (
                  <div className="text-center text-xs text-gray-400 pt-2">
                    +{securityData.defender.threats.recent_threats.length - 3} amenazas más
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Data Status Warning */}
          {securityData && !securityData.firewall.hasData && !securityData.defender.hasData && (
            <div className="bg-orange-900/10 border border-orange-500/20 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <AlertTriangle className="w-5 h-5 text-orange-400 mr-2" />
                <h4 className="text-orange-300 font-medium text-sm">Sin Datos de Seguridad</h4>
              </div>
              <p className="text-orange-200 text-sm mb-3">
                No se pudieron obtener datos reales de Windows Firewall y Defender desde este agente.
              </p>
              <div className="bg-orange-900/20 rounded p-3 text-xs">
                <p className="text-orange-100 mb-2">Posibles causas:</p>
                <ul className="text-orange-200 space-y-1 ml-4">
                  <li>• Los eventos de seguridad de Windows no están siendo enviados a Wazuh</li>
                  <li>• El agente necesita configuración adicional para recopilar logs de seguridad</li>
                  <li>• Los eventos son muy antiguos (más de 7 días para Defender, 24h para Firewall)</li>
                  <li>• Permisos insuficientes en el agente para acceder a logs de seguridad</li>
                </ul>
              </div>
            </div>
          )}

          {/* Quick Recommendations */}
          {securityData.recommendations.length > 0 && (
            <div className="bg-yellow-900/10 border border-yellow-500/20 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-yellow-300 font-medium text-sm flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Recomendaciones Críticas ({securityData.recommendations.filter(r => r.severity === 'critical' || r.severity === 'high').length})
                </h4>
                <button
                  onClick={() => setShowAllRecommendations(!showAllRecommendations)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {showAllRecommendations ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
              
              <div className="space-y-2">
                {securityData.recommendations
                  .filter(r => r.severity === 'critical' || r.severity === 'high')
                  .slice(0, showAllRecommendations ? undefined : 2)
                  .map((rec, index) => (
                    <div key={index} className={`border rounded p-3 text-sm ${getSeverityColor(rec.severity)}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h5 className="font-medium">{rec.title}</h5>
                          <p className="text-xs opacity-80 mt-1">{rec.description}</p>
                        </div>
                        <span className="text-xs px-2 py-1 rounded border ml-2">
                          {rec.severity.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                
                {!showAllRecommendations && securityData.recommendations.filter(r => r.severity === 'critical' || r.severity === 'high').length > 2 && (
                  <div className="text-center text-xs text-gray-400 pt-2">
                    +{securityData.recommendations.filter(r => r.severity === 'critical' || r.severity === 'high').length - 2} recomendaciones más
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Firewall Details - Expandible */}
          {showFirewallDetails && (
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center">
                <Zap className="w-4 h-4 mr-2 text-yellow-400" />
                Detalles del Firewall
              </h3>
              
              {securityData.firewall.hasData ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {Object.entries(securityData.firewall.profiles).map(([profileName, profile]) => (
                      <div key={profileName} className="bg-gray-700/30 rounded p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-white text-sm font-medium capitalize">{profileName}</span>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(profile.status)}
                            <span className={`text-xs ${getStatusColor(profile.status)}`}>
                              {profile.enabled === true ? 'ON' : 
                               profile.enabled === false ? 'OFF' : '?'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {securityData.firewall.rules.total > 0 && (
                    <div className="bg-gray-700/20 rounded p-3">
                      <h4 className="text-white text-sm font-medium mb-2">Reglas</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div className="text-center">
                          <div className="text-gray-400">Total</div>
                          <div className="text-white font-bold">{securityData.firewall.rules.total}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-400">Activas</div>
                          <div className="text-green-400 font-bold">{securityData.firewall.rules.enabled}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-400">Bloqueo</div>
                          <div className="text-red-400 font-bold">{securityData.firewall.rules.blocking}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-400">Permiso</div>
                          <div className="text-blue-400 font-bold">{securityData.firewall.rules.allowing}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-400 text-sm">
                  <p>Sin datos del firewall</p>
                  {securityData.firewall.error && (
                    <p className="text-red-400 text-xs mt-1">{securityData.firewall.error}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Windows Defender Details - Expandible */}
          {showDefenderDetails && (
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center">
                <Shield className="w-4 h-4 mr-2 text-green-400" />
                Detalles del Defender
              </h3>
              
              {securityData.defender.hasData ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-gray-700/30 rounded p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-white text-sm font-medium">Tiempo Real</span>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(securityData.defender.real_time_protection.status)}
                          <span className={`text-xs ${getStatusColor(securityData.defender.real_time_protection.status)}`}>
                            {securityData.defender.real_time_protection.enabled ? 'ON' : 'OFF'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-700/30 rounded p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-white text-sm font-medium">Nube</span>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(securityData.defender.cloud_protection.status)}
                          <span className={`text-xs ${getStatusColor(securityData.defender.cloud_protection.status)}`}>
                            {securityData.defender.cloud_protection.enabled ? 'ON' : 'OFF'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-700/30 rounded p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-white text-sm font-medium">Salud</span>
                        <div className="flex items-center space-x-1">
                          <Activity className="w-3 h-3 text-blue-400" />
                          <span className="text-blue-400 text-xs font-semibold">
                            {securityData.defender.health_score}/100
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {securityData.defender.signature_version && (
                    <div className="bg-gray-700/20 rounded p-3">
                      <div className="text-xs">
                        <span className="text-gray-400">Definiciones:</span>
                        <span className="text-white ml-2 font-mono">{securityData.defender.signature_version}</span>
                      </div>
                    </div>
                  )}

                  {securityData.defender.last_scan?.result && (
                    <div className="bg-gray-700/20 rounded p-3">
                      <div className="text-xs">
                        <span className="text-gray-400">Último Escaneo:</span>
                        <span className="text-white ml-2">{securityData.defender.last_scan.type}</span>
                        <span className={`ml-2 ${securityData.defender.last_scan.result === 'completed' ? 'text-green-400' : 'text-yellow-400'}`}>
                          ({securityData.defender.last_scan.result})
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-400 text-sm">
                  <p>Sin datos de Windows Defender</p>
                  {securityData.defender.error && (
                    <p className="text-red-400 text-xs mt-1">{securityData.defender.error}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Footer Info */}
          <div className="text-center text-xs text-gray-500 mt-6">
            Última actualización: {new Date(securityData.timestamp).toLocaleString()}
          </div>
        </>
      )}
    </div>
  );
};

export default WindowsSecurityStatus;
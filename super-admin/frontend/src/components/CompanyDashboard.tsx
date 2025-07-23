import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, Clock, TrendingUp, Users, FileText, Monitor, BarChart3, Settings, Home, LogOut, ChevronDown, ChevronRight, Plus, List } from 'lucide-react';

interface User {
  id: string;
  email: string;
  role: string;
  name: string;
  tenant_id?: string | null;
  company_name?: string | null;
  company_id?: number;
  sector?: string;
  wazuh_group?: string;
}

interface CompanyDashboardProps {
  user: User;
  onLogout: () => void;
}

interface Device {
  id: string;
  name: string;
  ip: string;
  os: string;
  status: 'active' | 'disconnected' | 'pending';
  last_seen: string;
  vulnerabilities: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  criticality_score: number;
  group?: string;
}

// NUEVAS INTERFACES PARA INVENTARIO
interface InventoryDevice {
  id: string;
  name: string;
  ip: string;
  os: string;
  os_version: string;
  architecture: string;
  hardware: {
    ram: string;
    cpu: string;
    cores: number;
  };
  network: {
    mac_address: string;
    interface_type: string;
    adapter_name: string;
    ttl: string;
    interface_status: string;
    speed: string;
    gateway: string;
    dns: string;
  };
  status: 'active' | 'disconnected' | 'pending';
  last_seen: string;
  last_seen_text: string;
  vulnerabilities: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  criticality_score: number;
  group: string;
  version: string;
  manager_host: string;
  node_name: string;
  date_add: string;
  error?: string;
}

interface InventoryStats {
  total: number;
  active: number;
  disconnected: number;
  pending: number;
  critical_vulnerabilities: number;
  high_vulnerabilities: number;
}

interface InventoryData {
  devices: InventoryDevice[];
  stats: InventoryStats;
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
  filters: {
    search: string;
    status: string;
    sortBy: string;
    sortOrder: string;
  };
}

const CompanyDashboard: React.FC<CompanyDashboardProps> = ({ user, onLogout }) => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [deviceSubMenuOpen, setDeviceSubMenuOpen] = useState(false);

  // NUEVOS ESTADOS PARA INVENTARIO
  const [inventoryData, setInventoryData] = useState<InventoryData | null>(null);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryFilters, setInventoryFilters] = useState({
    page: 1,
    limit: 20,
    search: '',
    sortBy: 'name',
    sortOrder: 'asc',
    status: 'all'
  });
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<InventoryDevice | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [nextRefresh, setNextRefresh] = useState<Date | null>(null);

  // Configuración del sector basada en los datos del usuario
  const getSectorConfig = (sector: string) => {
    const configs = {
      'TELECOM': {
        label: 'Telecomunicaciones',
        icon: '??',
        criticalChecks: ['network_security', 'data_protection', 'service_availability'],
        color: 'text-blue-400',
        complianceLabel: 'Cumplimiento RGPD + Telecom'
      },
      'LEGAL': {
        label: 'Legal',
        icon: '??',
        criticalChecks: ['client_confidentiality', 'document_encryption', 'legal_retention'],
        color: 'text-purple-400',
        complianceLabel: 'Cumplimiento RGPD Legal'
      },
      'HEALTH': {
        label: 'Sanitario',
        icon: '??',
        criticalChecks: ['patient_data_encryption', 'gdpr_health_compliance', 'backup_patient_data'],
        color: 'text-green-400',
        complianceLabel: 'Cumplimiento RGPD Sanitario'
      },
      'RETAIL': {
        label: 'Retail',
        icon: '??',
        criticalChecks: ['payment_security', 'pci_compliance', 'customer_data_protection'],
        color: 'text-yellow-400',
        complianceLabel: 'Cumplimiento PCI-DSS'
      },
      'FINANCE': {
        label: 'Finanzas',
        icon: '??',
        criticalChecks: ['financial_data_protection', 'audit_compliance', 'transaction_security'],
        color: 'text-emerald-400',
        complianceLabel: 'Cumplimiento Financiero'
      },
      'TECH': {
        label: 'Tecnología',
        icon: '??',
        criticalChecks: ['source_code_protection', 'ip_security', 'development_security'],
        color: 'text-cyan-400',
        complianceLabel: 'Cumplimiento ISO 27001'
      },
      'DEFAULT': {
        label: 'General',
        icon: '???',
        criticalChecks: ['basic_security', 'access_control', 'data_backup'],
        color: 'text-gray-400',
        complianceLabel: 'Cumplimiento ISO 27001'
      }
    };
    return configs[sector as keyof typeof configs] || configs.DEFAULT;
  };

  const currentSector = getSectorConfig(user.sector || 'DEFAULT');

  // Estado que se carga con datos reales
  const [dashboardData, setDashboardData] = useState({
    securityStatus: 'good', // good, warning, critical
    threatsBlocked: 23,
    criticalIssues: 2,
    compliance: 85,
    connectedDevices: 15,
    totalDevices: 17,
    lastUpdate: '2 min ago',
    urgentActions: [
      'Actualizar 2 equipos con vulnerabilidades críticas',
      'Revisar accesos fallidos en recepción'
    ],
    vulnerabilities: {
      critical: 'N/A',
      high: 'N/A',
      medium: 'N/A',
      low: 'N/A'
    },
    devices: [] as Device[]
  });

  // Componente para mostrar vulnerabilidades de un dispositivo
  const DeviceVulnerabilities = ({ vulnerabilities }: { vulnerabilities: any }) => {
    return (
      <div className="flex items-center space-x-2 mt-2">
        {/* Críticas */}
        {vulnerabilities.critical > 0 && (
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-xs text-red-400 font-medium">{vulnerabilities.critical}</span>
          </div>
        )}
        
        {/* Altas */}
        {vulnerabilities.high > 0 && (
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            <span className="text-xs text-orange-400 font-medium">{vulnerabilities.high}</span>
          </div>
        )}
        
        {/* Medias */}
        {vulnerabilities.medium > 0 && (
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-xs text-blue-400 font-medium">{vulnerabilities.medium}</span>
          </div>
        )}
        
        {/* Bajas */}
        {vulnerabilities.low > 0 && (
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-xs text-green-400 font-medium">{vulnerabilities.low}</span>
          </div>
        )}
        
        {/* Si no hay vulnerabilidades */}
        {vulnerabilities.critical === 0 && vulnerabilities.high === 0 && vulnerabilities.medium === 0 && vulnerabilities.low === 0 && (
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-xs text-green-400 font-medium">Seguro</span>
          </div>
        )}
      </div>
    );
  };

  // NUEVA FUNCIÓN: Cargar datos reales de la empresa
  const loadCompanyData = async () => {
    try {
      setIsLoading(true);

      if (!user.tenant_id) {
        console.warn('?? No hay tenant_id disponible');
        setIsLoading(false);
        return;
      }

      console.log(`?? Cargando datos reales para: ${user.company_name} (${user.tenant_id})`);

      // Cargar estadísticas generales
      const statsResponse = await fetch(`http://194.164.172.92:3001/api/company/${user.tenant_id}/stats`);
      
      // Cargar dispositivos críticos
      const devicesResponse = await fetch(`http://194.164.172.92:3001/api/company/${user.tenant_id}/devices/critical`);
      
      if (statsResponse.ok) {
        const statsResult = await statsResponse.json();
        
        if (statsResult.success && statsResult.data) {
          console.log('? Datos reales cargados:', statsResult.data);
          
          // ACTUALIZAR solo con datos reales
          setDashboardData(prev => ({
            ...prev,
            vulnerabilities: {
              critical: statsResult.data.vulnerabilities.critical,
              high: statsResult.data.vulnerabilities.high,
              medium: statsResult.data.vulnerabilities.medium,
              low: statsResult.data.vulnerabilities.low
            },
            connectedDevices: statsResult.data.agents.active,
            totalDevices: statsResult.data.agents.total,
            compliance: statsResult.data.compliance.percentage,
            threatsBlocked: statsResult.data.alerts.total,
            criticalIssues: statsResult.data.agents.inactive,
            lastUpdate: new Date().toLocaleString('es-ES', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })
          }));

          // Actualizar estado de seguridad basado en datos reales
          const activePercentage = statsResult.data.agents.total > 0 ? 
            (statsResult.data.agents.active / statsResult.data.agents.total) * 100 : 0;
          
          const hasCriticalVulns = statsResult.data.vulnerabilities.critical !== 'N/A' && 
            Number(statsResult.data.vulnerabilities.critical) > 0;

          let newStatus = 'good';
          if (activePercentage < 50 || hasCriticalVulns) {
            newStatus = 'critical';
          } else if (activePercentage < 80 || 
                     (statsResult.data.vulnerabilities.high !== 'N/A' && Number(statsResult.data.vulnerabilities.high) > 50)) {
            newStatus = 'warning';
          }

          setDashboardData(prev => ({
            ...prev,
            securityStatus: newStatus
          }));
        }
      }
      
      // Cargar dispositivos críticos reales
      if (devicesResponse.ok) {
        const devicesResult = await devicesResponse.json();
        
        if (devicesResult.success && devicesResult.data && devicesResult.data.devices) {
          console.log('? Dispositivos críticos cargados:', devicesResult.data.devices);
          
          setDashboardData(prev => ({
            ...prev,
            devices: devicesResult.data.devices
          }));
        }
      }

    } catch (error) {
      console.error('? Error cargando datos de empresa:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // NUEVA FUNCIÓN PARA CARGAR INVENTARIO COMPLETO
  const loadInventory = async () => {
    if (!user.tenant_id) return;

    try {
      setInventoryLoading(true);
      
      const params = new URLSearchParams({
        page: inventoryFilters.page.toString(),
        limit: inventoryFilters.limit.toString(),
        search: inventoryFilters.search,
        sortBy: inventoryFilters.sortBy,
        sortOrder: inventoryFilters.sortOrder,
        status: inventoryFilters.status
      });

      console.log(`?? Cargando inventario completo para: ${user.company_name}`);
      
      const response = await fetch(`http://194.164.172.92:3001/api/company/${user.tenant_id}/devices?${params}`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          console.log('? Inventario cargado:', result.data);
          setInventoryData(result.data);
          
          // Actualizar timestamps para el auto-refresh
          const now = new Date();
          setLastRefresh(now);
          setNextRefresh(new Date(now.getTime() + 2 * 60 * 1000)); // +2 minutos
        }
      } else {
        console.error('? Error cargando inventario:', response.status);
      }
    } catch (error) {
      console.error('? Error cargando inventario:', error);
    } finally {
      setInventoryLoading(false);
    }
  };

  // FUNCIÓN PARA RENDERIZAR LA VISTA DE INVENTARIO
  const renderInventoryContent = () => {
    if (inventoryLoading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center space-y-4 text-slate-300">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="text-lg">Cargando inventario de dispositivos...</span>
          </div>
        </div>
      );
    }

    if (!inventoryData) {
      return (
        <div className="text-center py-12">
          <Monitor className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Cargar Inventario</h3>
          <p className="text-gray-400 mb-6">Haz clic para cargar el inventario completo de dispositivos</p>
          <button
            onClick={loadInventory}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Cargar Inventario
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Estadísticas del Inventario */}
        <div className="grid grid-cols-6 gap-4 mb-8">
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="text-2xl font-bold text-blue-400">{inventoryData.stats.total}</div>
            <div className="text-gray-300 text-sm">Total Dispositivos</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="text-2xl font-bold text-green-400">{inventoryData.stats.active}</div>
            <div className="text-gray-300 text-sm">Activos</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="text-2xl font-bold text-red-400">{inventoryData.stats.disconnected}</div>
            <div className="text-gray-300 text-sm">Desconectados</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="text-2xl font-bold text-yellow-400">{inventoryData.stats.pending}</div>
            <div className="text-gray-300 text-sm">Pendientes</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="text-2xl font-bold text-red-500">{inventoryData.stats.critical_vulnerabilities}</div>
            <div className="text-gray-300 text-sm">Vuln. Críticas</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="text-2xl font-bold text-orange-500">{inventoryData.stats.high_vulnerabilities}</div>
            <div className="text-gray-300 text-sm">Vuln. Altas</div>
          </div>
        </div>

        {/* Filtros y Búsqueda */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex flex-wrap items-center gap-4">
            {/* Búsqueda */}
            <div className="flex-1 min-w-64">
              <input
                type="text"
                placeholder="Buscar por nombre, IP o SO..."
                value={inventoryFilters.search}
                onChange={(e) => setInventoryFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Filtro por Estado */}
            <select
              value={inventoryFilters.status}
              onChange={(e) => setInventoryFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
              className="bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="disconnected">Desconectados</option>
              <option value="pending">Pendientes</option>
            </select>

            {/* Ordenar por */}
            <select
              value={inventoryFilters.sortBy}
              onChange={(e) => setInventoryFilters(prev => ({ ...prev, sortBy: e.target.value }))}
              className="bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="name">Nombre</option>
              <option value="ip">IP</option>
              <option value="os">Sistema Operativo</option>
              <option value="status">Estado</option>
              <option value="criticality_score">Criticidad</option>
              <option value="last_seen">Última Conexión</option>
            </select>

            {/* Orden */}
            <select
              value={inventoryFilters.sortOrder}
              onChange={(e) => setInventoryFilters(prev => ({ ...prev, sortOrder: e.target.value }))}
              className="bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="asc">Ascendente</option>
              <option value="desc">Descendente</option>
            </select>

            {/* Botón Aplicar Filtros */}
            <button
              onClick={loadInventory}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Aplicar
            </button>

            {/* Botón Refrescar */}
            <button
              onClick={loadInventory}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              Actualizar
            </button>

            {/* Indicador de Auto-refresh */}
            {lastRefresh && (
              <div className="flex flex-col text-xs text-gray-400">
                <span>Última actualización: {lastRefresh.toLocaleTimeString('es-ES')}</span>
                {nextRefresh && (
                  <span>Próxima actualización: {nextRefresh.toLocaleTimeString('es-ES')}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tabla de Dispositivos */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="text-left p-4 text-gray-300 font-semibold">Dispositivo</th>
                  <th className="text-left p-4 text-gray-300 font-semibold">Estado</th>
                  <th className="text-left p-4 text-gray-300 font-semibold">Sistema</th>
                  <th className="text-left p-4 text-gray-300 font-semibold">Hardware</th>
                  <th className="text-left p-4 text-gray-300 font-semibold">Vulnerabilidades</th>
                  <th className="text-left p-4 text-gray-300 font-semibold">Última Conexión</th>
                  <th className="text-center p-4 text-gray-300 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {inventoryData.devices.map((device) => (
                  <tr key={device.id} className="border-t border-gray-700 hover:bg-gray-700/50">
                    <td className="p-4">
                      <div>
                        <div className="font-semibold text-white">{device.name}</div>
                        <div className="text-sm text-gray-400">IP: {device.ip}</div>
                        <div className="text-xs text-gray-500">ID: {device.id}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${
                          device.status === 'active' ? 'bg-green-400 animate-pulse' :
                          device.status === 'disconnected' ? 'bg-red-400' : 'bg-yellow-400'
                        }`}></div>
                        <span className={`text-sm font-medium ${
                          device.status === 'active' ? 'text-green-400' :
                          device.status === 'disconnected' ? 'text-red-400' : 'text-yellow-400'
                        }`}>
                          {device.status === 'active' ? 'Activo' :
                           device.status === 'disconnected' ? 'Desconectado' : 'Pendiente'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <div className="text-white text-sm">{device.os}</div>
                        <div className="text-gray-400 text-xs">{device.architecture}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-gray-300">
                        <div>RAM: {device.hardware.ram}</div>
                        <div>CPU: {device.hardware.cores} cores</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <DeviceVulnerabilities vulnerabilities={device.vulnerabilities} />
                      <div className="text-xs text-gray-400 mt-1">
                        Score: {device.criticality_score}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-gray-300">{device.last_seen_text}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedDevice(device);
                            setShowDeviceModal(true);
                          }}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 transition-colors"
                        >
                          Ver Detalles
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {inventoryData.pagination.pages > 1 && (
            <div className="bg-gray-700 px-6 py-4 flex items-center justify-between">
              <div className="text-sm text-gray-300">
                Mostrando {((inventoryData.pagination.page - 1) * inventoryData.pagination.limit) + 1} - {Math.min(inventoryData.pagination.page * inventoryData.pagination.limit, inventoryData.pagination.total)} de {inventoryData.pagination.total} dispositivos
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setInventoryFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={!inventoryData.pagination.has_prev}
                  className="bg-gray-600 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-500 transition-colors"
                >
                  Anterior
                </button>
                
                <div className="flex items-center space-x-2">
                  {Array.from({ length: Math.min(5, inventoryData.pagination.pages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => setInventoryFilters(prev => ({ ...prev, page }))}
                        className={`px-3 py-2 rounded ${
                          page === inventoryData.pagination.page
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                        } transition-colors`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setInventoryFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={!inventoryData.pagination.has_next}
                  className="bg-gray-600 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-500 transition-colors"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // MODAL DE DETALLES DEL DISPOSITIVO
  const DeviceModal = ({ device, onClose }: { device: InventoryDevice | null; onClose: () => void }) => {
    if (!device) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-xl p-6 w-[95vw] h-[95vh] m-4 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Detalles del Dispositivo</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {/* Información Básica */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-blue-400 mb-3">Información Básica</h3>
              <div>
                <span className="text-gray-400">Nombre:</span>
                <span className="text-white ml-2 font-medium">{device.name}</span>
              </div>
              <div>
                <span className="text-gray-400">ID Agente:</span>
                <span className="text-white ml-2">{device.id}</span>
              </div>
              <div>
                <span className="text-gray-400">Estado:</span>
                <span className={`ml-2 font-medium ${
                  device.status === 'active' ? 'text-green-400' :
                  device.status === 'disconnected' ? 'text-red-400' : 'text-yellow-400'
                }`}>
                  {device.status === 'active' ? 'Activo' :
                   device.status === 'disconnected' ? 'Desconectado' : 'Pendiente'}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Grupo:</span>
                <span className="text-white ml-2">{device.group}</span>
              </div>
              <div>
                <span className="text-gray-400">Última conexión:</span>
                <span className="text-white ml-2">{device.last_seen_text}</span>
              </div>
            </div>

            {/* Sistema y Hardware */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-green-400 mb-3">Sistema y Hardware</h3>
              <div>
                <span className="text-gray-400">SO:</span>
                <span className="text-white ml-2">{device.os}</span>
              </div>
              <div>
                <span className="text-gray-400">Arquitectura:</span>
                <span className="text-white ml-2">{device.architecture}</span>
              </div>
              <div>
                <span className="text-gray-400">RAM:</span>
                <span className="text-white ml-2">{device.hardware.ram}</span>
              </div>
              <div>
                <span className="text-gray-400">CPU:</span>
                <span className="text-white ml-2">{device.hardware.cpu}</span>
              </div>
              <div>
                <span className="text-gray-400">Núcleos:</span>
                <span className="text-white ml-2">{device.hardware.cores}</span>
              </div>
            </div>

            {/* Red - NUEVA COLUMNA */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-orange-400 mb-3">Red</h3>
              <div>
                <span className="text-gray-400">IP:</span>
                <span className="text-white ml-2">{device.ip}</span>
              </div>
              <div>
                <span className="text-gray-400">MAC Address:</span>
                <span className="text-white ml-2">{device.network.mac_address}</span>
              </div>
              <div>
                <span className="text-gray-400">Velocidad:</span>
                <span className="text-white ml-2">{device.network.speed}</span>
              </div>
              <div>
                <span className="text-gray-400">Interfaz:</span>
                <span className="text-white ml-2">{device.network.interface_type}</span>
              </div>
              <div>
                <span className="text-gray-400">Gateway:</span>
                <span className="text-white ml-2">{device.network.gateway}</span>
              </div>
              <div>
                <span className="text-gray-400">DNS:</span>
                <span className="text-white ml-2">{device.network.dns}</span>
              </div>
              <div>
                <span className="text-gray-400">Adaptador:</span>
                <span className="text-white ml-2">{device.network.adapter_name}</span>
              </div>
            </div>
          </div>

         {/* Vulnerabilidades */}
         <div className="mt-6">
           <h3 className="text-lg font-semibold text-red-400 mb-3">Vulnerabilidades</h3>
           <div className="grid grid-cols-4 gap-4">
             <div className="bg-red-900/20 p-4 rounded-lg border border-red-500/30">
               <div className="text-2xl font-bold text-red-400">{device.vulnerabilities.critical}</div>
               <div className="text-red-300 text-sm">Críticas</div>
             </div>
             <div className="bg-orange-900/20 p-4 rounded-lg border border-orange-500/30">
               <div className="text-2xl font-bold text-orange-400">{device.vulnerabilities.high}</div>
               <div className="text-orange-300 text-sm">Altas</div>
             </div>
             <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/30">
               <div className="text-2xl font-bold text-blue-400">{device.vulnerabilities.medium}</div>
               <div className="text-blue-300 text-sm">Medias</div>
             </div>
             <div className="bg-green-900/20 p-4 rounded-lg border border-green-500/30">
               <div className="text-2xl font-bold text-green-400">{device.vulnerabilities.low}</div>
               <div className="text-green-300 text-sm">Bajas</div>
             </div>
           </div>
           <div className="mt-4 text-center">
             <span className="text-gray-400">Score de Criticidad:</span>
             <span className="text-white ml-2 text-xl font-bold">{device.criticality_score}</span>
           </div>
         </div>

         {/* Información Técnica */}
         <div className="mt-6 pt-4 border-t border-gray-700">
           <h3 className="text-lg font-semibold text-purple-400 mb-3">Información Técnica</h3>
           <div className="grid grid-cols-2 gap-4 text-sm">
             <div>
               <span className="text-gray-400">Manager Host:</span>
               <span className="text-white ml-2">{device.manager_host}</span>
             </div>
             <div>
               <span className="text-gray-400">Node Name:</span>
               <span className="text-white ml-2">{device.node_name}</span>
             </div>
             <div>
               <span className="text-gray-400">Fecha de Registro:</span>
               <span className="text-white ml-2">{device.date_add}</span>
             </div>
             <div>
               <span className="text-gray-400">Última Actividad:</span>
               <span className="text-white ml-2">{new Date(device.last_seen).toLocaleString('es-ES')}</span>
             </div>
           </div>
         </div>

         {device.error && (
           <div className="mt-4 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
             <span className="text-red-400 font-medium">Error: </span>
             <span className="text-red-300">{device.error}</span>
           </div>
         )}

         <div className="mt-6 flex justify-end space-x-3">
           <button
             onClick={onClose}
             className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
           >
             Cerrar
           </button>
           <button
             onClick={() => {
               console.log('Acción en dispositivo:', device.id);
             }}
             className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
           >
             Gestionar Dispositivo
           </button>
         </div>
       </div>
     </div>
   );
 };

 // MODIFICADO: Cargar datos reales al inicializar
 useEffect(() => {
   loadCompanyData();
 }, [user.tenant_id]);

// Cargar inventario automáticamente cuando se navega a la sección
useEffect(() => {
  if (activeSection === 'dispositivos-inventario' && user.tenant_id) {
    loadInventory();
  }
}, [activeSection, user.tenant_id]);

// Auto-refresh cada 2 minutos cuando estamos en la sección de inventario
useEffect(() => {
  let refreshInterval: NodeJS.Timeout;
  
  if (activeSection === 'dispositivos-inventario' && user.tenant_id) {
    console.log('🔄 Iniciando auto-refresh del inventario cada 2 minutos...');
    
    refreshInterval = setInterval(() => {
      console.log('🔄 Auto-refresh: Actualizando inventario...');
      loadInventory();
    }, 2 * 60 * 1000); // 2 minutos = 120,000 ms
  }

  return () => {
    if (refreshInterval) {
      console.log('🛑 Deteniendo auto-refresh del inventario');
      clearInterval(refreshInterval);
    }
  };
}, [activeSection, user.tenant_id]);

 const getStatusColor = (status: string) => {
   switch(status) {
     case 'good': return 'text-green-400 bg-green-900/20 border-green-500/30';
     case 'warning': return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30';
     case 'critical': return 'text-red-400 bg-red-900/20 border-red-500/30';
     default: return 'text-gray-400 bg-gray-900/20 border-gray-500/30';
   }
 };

 const getStatusIcon = (status: string) => {
   switch(status) {
     case 'good': return <CheckCircle className="w-8 h-8" />;
     case 'warning': return <AlertTriangle className="w-8 h-8" />;
     case 'critical': return <AlertTriangle className="w-8 h-8" />;
     default: return <Shield className="w-8 h-8" />;
   }
 };

 const getStatusMessage = (status: string) => {
   switch(status) {
     case 'good': return 'Su empresa está PROTEGIDA';
     case 'warning': return 'Requiere ATENCIÓN';
     case 'critical': return 'ACCIÓN INMEDIATA requerida';
     default: return 'Verificando estado...';
   }
 };

 // MODIFICADO: Menú lateral con submenú para dispositivos
 const menuItems = [
   { id: 'dashboard', label: 'Dashboard', icon: Home },
   { 
     id: 'dispositivos', 
     label: 'Dispositivos', 
     icon: Monitor,
     hasSubmenu: true,
     submenu: [
       { id: 'dispositivos-agregar', label: 'Agregar Dispositivo', icon: Plus },
       { id: 'dispositivos-inventario', label: 'Inventario de Dispositivos', icon: List }
     ]
   },
   { id: 'analisis', label: 'Análisis', icon: BarChart3 },
   { id: 'reportes', label: 'Reportes', icon: FileText },
   { id: 'configuracion', label: 'Configuración', icon: Settings }
 ];

 const handleMenuClick = (itemId: string) => {
   if (itemId === 'dispositivos') {
     setDeviceSubMenuOpen(!deviceSubMenuOpen);
   } else {
     setActiveSection(itemId);
     // Cerrar submenú si seleccionamos otra sección principal
     if (!itemId.startsWith('dispositivos-')) {
       setDeviceSubMenuOpen(false);
     }
   }
 };

 const renderContent = () => {
   if (activeSection === 'dashboard') {
     return (
       <>
         {/* Estado Principal - Semáforo */}
         <div className={`rounded-xl p-8 mb-8 border-2 ${getStatusColor(dashboardData.securityStatus)}`}>
           <div className="flex items-center justify-between">
             <div className="flex items-center space-x-4">
               {getStatusIcon(dashboardData.securityStatus)}
               <div>
                 <h2 className="text-2xl font-bold">
                   {getStatusMessage(dashboardData.securityStatus)}
                 </h2>
                 <p className="text-lg opacity-80">
                   {dashboardData.connectedDevices}/{dashboardData.totalDevices} equipos protegidos
                 </p>
               </div>
             </div>
             <div className="text-right">
               <div className="text-3xl font-bold">
                 {dashboardData.compliance}%
               </div>
               <div className="opacity-80">{currentSector.complianceLabel}</div>
             </div>
           </div>
         </div>

         {/* Métricas Principales - 4 en fila */}
         <div className="grid grid-cols-4 gap-6 mb-8">
           {/* Amenazas Bloqueadas */}
           <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
             <div className="flex items-center justify-between mb-4">
               <Shield className="w-8 h-8 text-blue-400" />
               <span className="text-sm text-gray-400">Últimas 24h</span>
             </div>
             <div className="text-4xl font-bold text-blue-400 mb-2">
               {dashboardData.threatsBlocked}
             </div>
             <div className="text-gray-300 text-lg">Amenazas bloqueadas</div>
             <div className="text-sm text-green-400 mt-2">
               ZienSHIELD protección activa
             </div>
           </div>

           {/* Equipos con Problemas */}
           <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
             <div className="flex items-center justify-between mb-4">
               <AlertTriangle className="w-8 h-8 text-orange-400" />
               <span className="text-sm text-gray-400">Críticos</span>
             </div>
             <div className="text-4xl font-bold text-orange-400 mb-2">
               {dashboardData.criticalIssues}
             </div>
             <div className="text-gray-300 text-lg">Equipos necesitan atención</div>
             <div className="text-sm text-orange-400 mt-2">
               Requiere acción hoy
             </div>
           </div>

           {/* Equipos Conectados */}
           <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
             <div className="flex items-center justify-between mb-4">
               <Users className="w-8 h-8 text-green-400" />
               <span className="text-sm text-gray-400">Activos</span>
             </div>
             <div className="text-4xl font-bold text-green-400 mb-2">
               {dashboardData.connectedDevices}
             </div>
             <div className="text-gray-300 text-lg">Equipos protegidos</div>
             <div className="text-sm text-green-400 mt-2">
               {dashboardData.totalDevices > 0 ? Math.round((dashboardData.connectedDevices / dashboardData.totalDevices) * 100) : 0}% cobertura
             </div>
           </div>

           {/* Cumplimiento */}
           <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
             <div className="flex items-center justify-between mb-4">
               <FileText className={`w-8 h-8 ${currentSector.color}`} />
               <span className="text-sm text-gray-400">{currentSector.label}</span>
             </div>
             <div className={`text-4xl font-bold ${currentSector.color} mb-2`}>
               {dashboardData.compliance}%
             </div>
             <div className="text-gray-300 text-lg">{currentSector.complianceLabel}</div>
             <div className={`text-sm ${currentSector.color} mt-2`}>
               Nivel actual de cumplimiento
             </div>
           </div>
         </div>

         {/* MODIFICADO: Desglose de Vulnerabilidades CVE - DATOS REALES */}
         <div className="bg-gray-800 rounded-xl border border-gray-700 mb-8">
           <div className="grid grid-cols-4 divide-x divide-gray-700">
             <div className="p-6 text-center">
               <div className="text-4xl font-bold text-red-400 mb-2">
                 {dashboardData.vulnerabilities.critical}
               </div>
               <div className="text-gray-300 text-lg">Critical - Severity</div>
               {dashboardData.vulnerabilities.critical !== 'N/A' && Number(dashboardData.vulnerabilities.critical) > 0 && (
                 <div className="text-xs text-red-400 mt-1">Acción inmediata</div>
               )}
             </div>
             <div className="p-6 text-center">
               <div className="text-4xl font-bold text-orange-400 mb-2">
                 {dashboardData.vulnerabilities.high}
               </div>
               <div className="text-gray-300 text-lg">High - Severity</div>
               {dashboardData.vulnerabilities.high !== 'N/A' && Number(dashboardData.vulnerabilities.high) > 0 && (
                 <div className="text-xs text-orange-400 mt-1">Prioridad alta</div>
               )}
             </div>
             <div className="p-6 text-center">
               <div className="text-4xl font-bold text-blue-400 mb-2">
                 {dashboardData.vulnerabilities.medium}
               </div>
               <div className="text-gray-300 text-lg">Medium - Severity</div>
               {dashboardData.vulnerabilities.medium !== 'N/A' && Number(dashboardData.vulnerabilities.medium) > 0 && (
                 <div className="text-xs text-blue-400 mt-1">Revisar pronto</div>
               )}
             </div>
             <div className="p-6 text-center">
               <div className="text-4xl font-bold text-green-400 mb-2">
                 {dashboardData.vulnerabilities.low}
               </div>
               <div className="text-gray-300 text-lg">Low - Severity</div>
               {dashboardData.vulnerabilities.low !== 'N/A' && Number(dashboardData.vulnerabilities.low) > 0 && (
                 <div className="text-xs text-green-400 mt-1">Bajo riesgo</div>
               )}
             </div>
           </div>
         </div>

         {/* Dispositivos Críticos Reales - TOP 4 */}
         <div className="grid grid-cols-4 gap-6 mb-8">
           {dashboardData.devices.slice(0, 4).map((device, index) => (
             <div key={device.id || index} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
               <div className="flex items-center justify-between mb-4">
                 <Monitor className="w-8 h-8 text-blue-400" />
                 {/* Indicador de estado del dispositivo REAL */}
                 <div className="flex items-center space-x-1">
                   <div className={`w-2 h-2 rounded-full ${device.status === "active" ? "bg-green-400 animate-pulse" : "bg-red-400"}`}></div>
                   <span className={`text-xs ${device.status === "active" ? "text-green-400" : "text-red-400"}`}>
                     {device.status === "active" ? "Online" : "Offline"}
                   </span>
                 </div>
               </div>
               
               {/* Nombre del dispositivo */}
               <div className="text-lg font-bold text-white mb-2">
                 {device.name}
               </div>
               
               {/* Información del dispositivo */}
               <div className="text-gray-300 text-sm mb-1">IP: {device.ip}</div>
               <div className="text-gray-300 text-sm mb-3">{device.os || 'Sistema desconocido'}</div>
               
               {/* Vulnerabilidades del dispositivo REALES */}
               <DeviceVulnerabilities vulnerabilities={device.vulnerabilities} />
               
               {/* Score de criticidad */}
               <div className="mt-2 text-xs text-gray-400">
                 Score: {device.criticality_score}
               </div>
             </div>
           ))}
           
           {/* Rellenar espacios vacíos si hay menos de 4 dispositivos */}
           {Array.from({ length: Math.max(0, 4 - dashboardData.devices.length) }).map((_, index) => (
             <div key={`empty-${index}`} className="bg-gray-800 rounded-xl p-6 border border-gray-700 opacity-50">
               <div className="flex items-center justify-center h-full">
                 <div className="text-center text-gray-500">
                   <Monitor className="w-8 h-8 mx-auto mb-2 opacity-50" />
                   <div className="text-sm">Sin dispositivos</div>
                 </div>
               </div>
             </div>
           ))}
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           {/* Columna Izquierda - Acciones Urgentes */}
           <div className="space-y-6">
             <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
               <div className="flex items-center mb-4">
                 <Clock className="w-6 h-6 text-red-400 mr-3" />
                 <h3 className="text-xl font-bold text-white">
                   Acciones Requeridas HOY
                 </h3>
               </div>
               <div className="space-y-3">
                 {dashboardData.urgentActions.map((action, index) => (
                   <div key={index} className="flex items-center p-3 bg-red-900/20 rounded-lg border border-red-500/30">
                     <AlertTriangle className="w-5 h-5 text-red-400 mr-3 flex-shrink-0" />
                     <span className="text-red-200 text-sm">{action}</span>
                     <button className="ml-auto px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors">
                       Resolver
                     </button>
                   </div>
                 ))}
               </div>
             </div>
           </div>

           {/* Columna Derecha - Botones de Acción */}
           <div className="space-y-6">
             <div className="space-y-4">
               <button 
                 onClick={loadCompanyData}
                 className="w-full bg-blue-600 text-white p-6 rounded-xl text-left hover:bg-blue-700 transition-colors"
               >
                 <TrendingUp className="w-8 h-8 mb-3" />
                 <h4 className="font-bold text-lg mb-2">Actualizar Datos</h4>
                 <p className="opacity-90">Obtener información actualizada</p>
               </button>
               
               <button 
                 onClick={() => setActiveSection('dispositivos-inventario')}
                 className="w-full bg-green-600 text-white p-6 rounded-xl text-left hover:bg-green-700 transition-colors"
               >
                 <Users className="w-8 h-8 mb-3" />
                 <h4 className="font-bold text-lg mb-2">Inventario de Dispositivos</h4>
                 <p className="opacity-90">Ver todos los equipos protegidos</p>
               </button>
               
               <button className="w-full bg-purple-600 text-white p-6 rounded-xl text-left hover:bg-purple-700 transition-colors">
                 <FileText className="w-8 h-8 mb-3" />
                 <h4 className="font-bold text-lg mb-2">{currentSector.complianceLabel}</h4>
                 <p className="opacity-90">Verificar estado legal</p>
               </button>
             </div>
           </div>
         </div>
       </>
     );
   } else if (activeSection === 'dispositivos-inventario') {
     return renderInventoryContent();
   } else if (activeSection === 'dispositivos-agregar') {
     return (
       <div className="flex items-center justify-center h-96">
         <div className="text-center">
           <div className="text-6xl mb-4">??</div>
           <h2 className="text-2xl font-bold text-white mb-2">
             Agregar Dispositivo
           </h2>
           <p className="text-gray-400">
             Enrolar nuevo dispositivo a ZienSHIELD
           </p>
         </div>
       </div>
     );
   } else {
     return (
       <div className="flex items-center justify-center h-96">
         <div className="text-center">
           <div className="text-6xl mb-4">??</div>
           <h2 className="text-2xl font-bold text-white mb-2">
             Sección en Desarrollo
           </h2>
           <p className="text-gray-400">
             {menuItems.find(item => item.id === activeSection)?.label} estará disponible pronto
           </p>
         </div>
       </div>
     );
   }
 };

 if (isLoading) {
   return (
     <div className="min-h-screen bg-gray-900 flex items-center justify-center">
       <div className="flex flex-col items-center space-y-4 text-slate-300">
         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
         <span className="text-lg">Cargando panel de {user.company_name}...</span>
       </div>
     </div>
   );
 }

 return (
   <div className="min-h-screen bg-gray-900 flex">
     {/* Sidebar */}
     <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
       {/* Logo */}
       <div className="p-6 border-b border-gray-700">
         <div className="flex items-center">
           <Shield className="w-8 h-8 text-blue-500 mr-3" />
           <span className="text-xl font-bold text-white">ZienSHIELD</span>
         </div>
       </div>

       {/* Navigation */}
       <nav className="flex-1 p-4">
         <div className="space-y-2">
           {menuItems.map((item) => {
             const Icon = item.icon;
             return (
               <div key={item.id}>
                 <button
                   onClick={() => handleMenuClick(item.id)}
                   className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-colors ${
                     activeSection === item.id
                       ? 'bg-blue-600 text-white'
                       : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                   }`}
                 >
                   <div className="flex items-center">
                     <Icon className="w-5 h-5 mr-3" />
                     {item.label}
                   </div>
                   {item.hasSubmenu && (
                     deviceSubMenuOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                   )}
                 </button>

                 {/* Submenú de dispositivos */}
                 {item.hasSubmenu && deviceSubMenuOpen && (
                   <div className="ml-6 mt-2 space-y-1">
                     {item.submenu?.map((subItem) => {
                       const SubIcon = subItem.icon;
                       return (
                         <button
                           key={subItem.id}
                           onClick={() => handleMenuClick(subItem.id)}
                           className={`w-full flex items-center px-4 py-2 rounded-lg text-left transition-colors ${
                             activeSection === subItem.id
                               ? 'bg-blue-500 text-white'
                               : 'text-gray-400 hover:bg-gray-600 hover:text-white'
                           }`}
                         >
                           <SubIcon className="w-4 h-4 mr-3" />
                           {subItem.label}
                         </button>
                       );
                     })}
                   </div>
                 )}
               </div>
             );
           })}
         </div>
       </nav>

       {/* Footer */}
       <div className="p-4 border-t border-gray-700">
         <div className="text-sm text-gray-400 mb-4">
           <p>{user.company_name}</p>
            <p>Tenant: {user.tenant_id}</p>
         </div>
         <button
           onClick={onLogout}
           className="w-full flex items-center justify-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
         >
           <LogOut className="w-4 h-4 mr-2" />
           Cerrar Sesión
         </button>
       </div>
     </div>

     {/* Main Content */}
     <div className="flex-1 flex flex-col">
       {/* Header */}
       <div className="bg-gray-800 border-b border-gray-700 p-6">
         <div className="flex items-center justify-between">
           <div>
             <h1 className="text-2xl font-bold text-white">
               {menuItems.find(item => item.id === activeSection)?.label || 
                menuItems.find(item => item.submenu?.find(sub => sub.id === activeSection))?.submenu?.find(sub => sub.id === activeSection)?.label || 
                'Dashboard'}
             </h1>
           </div>
           <p className="text-gray-400">
             Última actualización: {dashboardData.lastUpdate}
           </p>
         </div>
       </div>

       {/* Content Area */}
       <div className="flex-1 p-6">
         {renderContent()}
       </div>
     </div>

     {/* Modal de Detalles del Dispositivo */}
     {showDeviceModal && (
       <DeviceModal
         device={selectedDevice}
         onClose={() => {
           setShowDeviceModal(false);
           setSelectedDevice(null);
         }}
       />
     )}
   </div>
 );
};

export default CompanyDashboard;

                
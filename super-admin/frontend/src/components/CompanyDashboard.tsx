import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, Clock, TrendingUp, Users, FileText, Monitor, BarChart3, Settings, Home, LogOut, ChevronDown, ChevronRight, Plus, List, Activity, Bell, Target, Bug, FolderCheck } from 'lucide-react';

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
  const [analysisSubMenuOpen, setAnalysisSubMenuOpen] = useState(false);

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

  // Estados para el módulo de Análisis
  const [analysisData, setAnalysisData] = useState({
    resumen: {
      totalAlertas24h: 0,
      maxSeveridad: 0,
      cvesCriticas: 0,
      accionesAutomaticas: 0,
      evolucionAlertas: [] as { date: string; count: number; }[],
      distribucionSeveridad: [] as { name: string; value: number; }[],
      // Datos adicionales para el mosaico completo
      alertasHoy: 0,
      alertasAyer: 0,
      tendenciaAlertas: 0, // % cambio
      topThreatCountries: [] as { country: string; count: number; }[],
      topAttackTypes: [] as { type: string; count: number; }[],
      dispositivosComprometidos: 0,
      dispositivosTotal: 0,
      vulnerabilidadesCriticas: 0,
      vulnerabilidadesAltas: 0,
      cambiosArchivos24h: 0,
      reglasMasActivas: [] as { name: string; disparos: number; }[],
      tiempoRespuestaPromedio: 0,
      eficienciaDeteccion: 0,
      scoreSeguridad: 0,
      incidentesResueltos: 0,
      incidentesPendientes: 0
    },
    alertas: {
      volumenHoraDia: [] as { day: number; hour: number; count: number; }[],
      topReglas: [] as { rule: string; count: number; severity: number; }[]
    },
    riesgo: {
      nivelRiesgo: 0,
      accionesResponse: [] as { accion: string; timestamp: string; estado: string; }[],
      roi: 0
    },
    vulnerabilidades: {
      distribucionCVSS: [] as { score: string; count: number; }[],
      hostsConCVE: [] as { host: string; cves: number; criticidad: string; }[],
      tendenciaVulns: [] as { fecha: string; count: number; }[]
    },
    integridad: {
      cambiosCriticos: 0,
      cambiosDetalle: [] as { archivo: string; tipo: string; timestamp: string; }[],
      actividad15d: [] as { fecha: string; cambios: number; }[]
    }
  });
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [dataTransition, setDataTransition] = useState(false);
  const [selectedVulnDevice, setSelectedVulnDevice] = useState('all');
  const [selectedFIMDevice, setSelectedFIMDevice] = useState('all');
  const [selectedFIMUser, setSelectedFIMUser] = useState('all');

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

  // COMPONENTE GRÁFICO DE BARRAS DE AMENAZAS POR PAÍS
  const ThreatCountryChart = ({ threatData }: { threatData: any[] }) => {
    // Ordenar países por número de ataques (descendente) y tomar los primeros 8
    const sortedThreatData = [...threatData]
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Obtener el valor máximo para calcular porcentajes
    const maxCount = sortedThreatData.length > 0 ? sortedThreatData[0].count : 1;

    if (sortedThreatData.length === 0) {
      return (
        <div className="flex items-center justify-center h-48 text-gray-400">
          <div className="text-center">
            <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No hay datos de amenazas disponibles</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {sortedThreatData.map((threat, index) => {
          // Calcular porcentaje respecto al máximo (asegurar que esté entre 5% y 100%)
          const percentage = Math.max(5, (threat.count / maxCount) * 100);
          
          // Colores según posición en el ranking
          const getBarColor = (index: number) => {
            if (index === 0) return 'bg-red-500'; // El más peligroso
            if (index === 1) return 'bg-orange-500';
            if (index === 2) return 'bg-yellow-500';
            if (index <= 4) return 'bg-blue-500';
            return 'bg-green-500'; // Los menos peligrosos
          };

          const getBorderColor = (index: number) => {
            if (index === 0) return 'border-red-500/30';
            if (index === 1) return 'border-orange-500/30';
            if (index === 2) return 'border-yellow-500/30';
            if (index <= 4) return 'border-blue-500/30';
            return 'border-green-500/30';
          };

          return (
            <div key={threat.country} className="space-y-2">
              {/* Encabezado del país */}
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <span className={`inline-block w-3 h-3 rounded-full ${getBarColor(index)}`}></span>
                  <span className="text-gray-300 font-medium text-sm">
                    {threat.country}
                  </span>
                  <span className="text-xs text-gray-500">
                    #{index + 1}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-white font-bold text-sm">
                    {threat.count.toLocaleString()}
                  </span>
                  <span className="text-gray-400 text-xs ml-1">ataques</span>
                </div>
              </div>

              {/* Barra de progreso */}
              <div className="relative">
                <div className={`w-full bg-gray-700 rounded-full h-3 border ${getBorderColor(index)}`}>
                  <div 
                    className={`${getBarColor(index)} h-3 rounded-full transition-all duration-1000 ease-out relative overflow-hidden`}
                    style={{ width: `${percentage}%` }}
                  >
                    {/* Efecto de brillo animado */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                  </div>
                </div>
                
                {/* Porcentaje relativo */}
                <div className="absolute right-2 top-0 h-3 flex items-center">
                  <span className="text-xs text-gray-300 font-medium">
                    {percentage.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Resumen estadístico */}
        <div className="mt-6 pt-4 border-t border-gray-700">
          <div className="grid grid-cols-3 gap-4 text-center text-xs">
            <div>
              <div className="text-white font-bold text-lg">
                {sortedThreatData.reduce((sum, threat) => sum + threat.count, 0).toLocaleString()}
              </div>
              <div className="text-gray-400">Total Ataques</div>
            </div>
            <div>
              <div className="text-white font-bold text-lg">
                {sortedThreatData.length}
              </div>
              <div className="text-gray-400">Países Activos</div>
            </div>
            <div>
              <div className="text-white font-bold text-lg">
                {maxCount.toLocaleString()}
              </div>
              <div className="text-gray-400">País Top</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // COMPONENTE KPI CON SEMÁFORO
  const KPICard = ({ title, value, thresholds, icon: Icon, unit = '' }: { 
    title: string; 
    value: number; 
    thresholds: { green: number; amber: number }; 
    icon: any; 
    unit?: string;
  }) => {
    const getKPIColor = () => {
      if (value <= thresholds.green) return { bg: 'bg-green-900/20', border: 'border-green-500/30', text: 'text-green-400' };
      if (value <= thresholds.amber) return { bg: 'bg-yellow-900/20', border: 'border-yellow-500/30', text: 'text-yellow-400' };
      return { bg: 'bg-red-900/20', border: 'border-red-500/30', text: 'text-red-400' };
    };

    const colors = getKPIColor();

    return (
      <div className={`${colors.bg} rounded-xl p-6 border ${colors.border}`}>
        <div className="flex items-center justify-between mb-4">
          <Icon className={`w-8 h-8 ${colors.text}`} />
          <span className="text-sm text-gray-400">Tiempo real</span>
        </div>
        <div className={`text-4xl font-bold ${colors.text} mb-2`}>
          {value}{unit}
        </div>
        <div className="text-gray-300 text-lg">{title}</div>
      </div>
    );
  };

  // FUNCIÓN PARA CARGAR DATOS DE ANÁLISIS DESDE WAZUH CON TRANSICIÓN SUAVE
  const loadAnalysisData = async (isRefresh = false) => {
    if (!user.tenant_id) return;

    try {
      // Solo mostrar loading en carga inicial, no en refresh
      if (!isRefresh) {
        setAnalysisLoading(true);
      } else {
        setDataTransition(true);
      }
      
      console.log(`📊 Cargando datos de análisis para: ${user.company_name}`);
      
      // Simular llamadas a Wazuh API (se conectarán a endpoints reales)
      const alertsResponse = await fetch(`http://194.164.172.92:3001/api/company/${user.tenant_id}/analysis/alerts`);
      const vulnResponse = await fetch(`http://194.164.172.92:3001/api/company/${user.tenant_id}/analysis/vulnerabilities`);
      
      // Por ahora, usar datos simulados hasta implementar los endpoints
      const mockData = {
        resumen: {
          totalAlertas24h: Math.floor(Math.random() * 500) + 50,
          maxSeveridad: Math.floor(Math.random() * 16) + 1,
          cvesCriticas: Math.floor(Math.random() * 5),
          accionesAutomaticas: Math.floor(Math.random() * 20) + 5,
          evolucionAlertas: Array.from({length: 30}, (_, i) => ({
            date: new Date(Date.now() - (29-i) * 24 * 60 * 60 * 1000).toISOString(),
            count: Math.floor(Math.random() * 100) + 10
          })),
          distribucionSeveridad: [
            { name: 'Crítica (12-16)', value: Math.floor(Math.random() * 10) + 1 },
            { name: 'Alta (8-11)', value: Math.floor(Math.random() * 50) + 10 },
            { name: 'Media (4-7)', value: Math.floor(Math.random() * 100) + 20 },
            { name: 'Baja (1-3)', value: Math.floor(Math.random() * 200) + 50 }
          ],
          // Datos adicionales para el mosaico completo
          alertasHoy: Math.floor(Math.random() * 200) + 50,
          alertasAyer: Math.floor(Math.random() * 180) + 40,
          tendenciaAlertas: (Math.random() - 0.5) * 50, // -25% a +25%
          topThreatCountries: [
            { country: 'China', count: Math.floor(Math.random() * 100) + 50 },
            { country: 'Rusia', count: Math.floor(Math.random() * 80) + 40 },
            { country: 'Brasil', count: Math.floor(Math.random() * 60) + 30 },
            { country: 'EE.UU.', count: Math.floor(Math.random() * 40) + 20 },
            { country: 'India', count: Math.floor(Math.random() * 30) + 10 }
          ],
          topAttackTypes: [
            { type: 'Brute Force', count: Math.floor(Math.random() * 150) + 50 },
            { type: 'SQL Injection', count: Math.floor(Math.random() * 100) + 30 },
            { type: 'XSS', count: Math.floor(Math.random() * 80) + 20 },
            { type: 'DDoS', count: Math.floor(Math.random() * 60) + 15 },
            { type: 'Malware', count: Math.floor(Math.random() * 40) + 10 }
          ],
          dispositivosComprometidos: Math.floor(Math.random() * 5),
          dispositivosTotal: Math.floor(Math.random() * 20) + 15,
          vulnerabilidadesCriticas: Math.floor(Math.random() * 8) + 2,
          vulnerabilidadesAltas: Math.floor(Math.random() * 25) + 10,
          cambiosArchivos24h: Math.floor(Math.random() * 50) + 10,
          reglasMasActivas: [
            { name: 'SSH Brute Force', disparos: Math.floor(Math.random() * 200) + 100 },
            { name: 'Web Attack', disparos: Math.floor(Math.random() * 150) + 80 },
            { name: 'Login Failed', disparos: Math.floor(Math.random() * 120) + 60 }
          ],
          tiempoRespuestaPromedio: Math.floor(Math.random() * 300) + 60, // segundos
          eficienciaDeteccion: Math.floor(Math.random() * 20) + 85, // %
          scoreSeguridad: Math.floor(Math.random() * 15) + 80, // 80-95
          incidentesResueltos: Math.floor(Math.random() * 10) + 5,
          incidentesPendientes: Math.floor(Math.random() * 3)
        },
        alertas: {
          volumenHoraDia: Array.from({length: 7 * 24}, (_, i) => ({
            day: Math.floor(i / 24),
            hour: i % 24,
            count: Math.floor(Math.random() * 50)
          })),
          topReglas: Array.from({length: 20}, (_, i) => ({
            rule: `Regla de seguridad ${i + 1}`,
            count: Math.floor(Math.random() * 100) + 10,
            severity: Math.floor(Math.random() * 16) + 1
          })).sort((a, b) => b.count - a.count)
        },
        riesgo: {
          nivelRiesgo: Math.floor(Math.random() * 30) + 70,
          accionesResponse: Array.from({length: 10}, (_, i) => ({
            accion: `Acción de respuesta ${i + 1}`,
            timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
            estado: Math.random() > 0.5 ? 'Completado' : 'En proceso'
          })),
          roi: Math.floor(Math.random() * 200) + 150
        },
        vulnerabilidades: {
          distribucionCVSS: [
            { score: '9.0-10.0', count: Math.floor(Math.random() * 5) + 1 },
            { score: '7.0-8.9', count: Math.floor(Math.random() * 15) + 5 },
            { score: '4.0-6.9', count: Math.floor(Math.random() * 30) + 10 },
            { score: '0.1-3.9', count: Math.floor(Math.random() * 50) + 20 }
          ],
          hostsConCVE: Array.from({length: 8}, (_, i) => ({
            host: `Host-${i + 1}`,
            cves: Math.floor(Math.random() * 15) + 1,
            criticidad: Math.random() > 0.7 ? 'Alta' : Math.random() > 0.4 ? 'Media' : 'Baja'
          })),
          tendenciaVulns: Array.from({length: 30}, (_, i) => ({
            fecha: new Date(Date.now() - (29-i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            count: Math.floor(Math.random() * 20) + 5
          }))
        },
        integridad: {
          cambiosCriticos: Math.floor(Math.random() * 8) + 2,
          cambiosDetalle: Array.from({length: 15}, (_, i) => ({
            archivo: `/path/to/file${i + 1}.conf`,
            tipo: Math.random() > 0.5 ? 'Modificado' : 'Eliminado',
            timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString()
          })),
          actividad15d: Array.from({length: 15}, (_, i) => ({
            fecha: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            cambios: Math.floor(Math.random() * 30) + 5
          }))
        }
      };
      
      // Aplicar transición suave si es refresh
      if (isRefresh) {
        await new Promise(resolve => setTimeout(resolve, 200)); // Pequeña pausa para transición
      }
      
      setAnalysisData(prev => ({
        ...prev,
        ...mockData
      }));
      
      console.log('✅ Datos de análisis cargados');
      
    } catch (error) {
      console.error('❌ Error cargando datos de análisis:', error);
    } finally {
      setAnalysisLoading(false);
      setDataTransition(false);
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

// Cargar datos de análisis cuando se navega a cualquier sección de análisis
useEffect(() => {
  if (activeSection.startsWith('analisis-') && user.tenant_id) {
    loadAnalysisData();
  }
}, [activeSection, user.tenant_id]);

// Auto-refresh cada 30 segundos para las secciones de análisis
useEffect(() => {
  let analysisRefreshInterval: NodeJS.Timeout;
  
  if (activeSection.startsWith('analisis-') && user.tenant_id) {
    console.log('📊 Iniciando auto-refresh del análisis cada 30 segundos...');
    
    analysisRefreshInterval = setInterval(() => {
      console.log('📊 Auto-refresh: Actualizando datos de análisis...');
      loadAnalysisData(true); // isRefresh = true para transición suave
    }, 30 * 1000); // 30 segundos
  }

  return () => {
    if (analysisRefreshInterval) {
      console.log('🛑 Deteniendo auto-refresh del análisis');
      clearInterval(analysisRefreshInterval);
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
   { 
    id: 'analisis', 
    label: 'Análisis', 
    icon: BarChart3,
    hasSubmenu: true,
    submenu: [
      { id: 'analisis-resumen', label: 'Resumen', icon: Activity },
      { id: 'analisis-alertas', label: 'Alertas y Eventos', icon: Bell },
      { id: 'analisis-riesgo', label: 'Riesgo & Respuesta', icon: Target },
      { id: 'analisis-vulnerabilidades', label: 'Vulnerabilidades', icon: Bug },
      { id: 'analisis-integridad', label: 'Integridad de Archivos', icon: FolderCheck }
    ]
  },
   { id: 'reportes', label: 'Reportes', icon: FileText },
   { id: 'configuracion', label: 'Configuración', icon: Settings }
 ];

 const handleMenuClick = (itemId: string) => {
   if (itemId === 'dispositivos') {
     setDeviceSubMenuOpen(!deviceSubMenuOpen);
   } else if (itemId === 'analisis') {
     setAnalysisSubMenuOpen(!analysisSubMenuOpen);
   } else {
     setActiveSection(itemId);
     // Cerrar submenús si seleccionamos otra sección principal
     if (!itemId.startsWith('dispositivos-')) {
       setDeviceSubMenuOpen(false);
     }
     if (!itemId.startsWith('analisis-')) {
       setAnalysisSubMenuOpen(false);
     }
   }
 };

 // FUNCIÓN PARA RENDERIZAR ANÁLISIS CON LAS 5 SUBSECCIONES
  const renderAnalysisContent = () => {
    if (analysisLoading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center space-y-4 text-slate-300">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="text-lg">Cargando análisis de seguridad...</span>
          </div>
        </div>
      );
    }

    switch (activeSection) {
      case 'analisis-resumen':
        return renderResumenEjecutivo();
      case 'analisis-alertas':
        return renderAlertasEventos();
      case 'analisis-riesgo':
        return renderRiesgoRespuesta();
      case 'analisis-vulnerabilidades':
        return renderVulnerabilidades();
      case 'analisis-integridad':
        return renderIntegridadArchivos();
      default:
        return (
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Módulo de Análisis</h3>
            <p className="text-gray-400 mb-6">Selecciona una sección de análisis del menú lateral</p>
          </div>
        );
    }
  };

  // 1. RESUMEN - VISTA COMPLETA TIPO MOSAICO
  const renderResumenEjecutivo = () => {
    const { resumen } = analysisData;
    
    return (
      <div className={`space-y-6 transition-opacity duration-300 ${dataTransition ? 'opacity-70' : 'opacity-100'}`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-400">
              Actualización automática cada 30 segundos
            </div>
            {dataTransition && (
              <div className="flex items-center space-x-2 text-blue-400">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <span className="text-xs">Actualizando...</span>
              </div>
            )}
          </div>
        </div>

        {/* MOSAICO PRINCIPAL - PANORAMA COMPLETO */}
        <div className="grid grid-cols-12 gap-4 mb-8">
          
          {/* Score de Seguridad General */}
          <div className="col-span-3 bg-gradient-to-br from-blue-900/40 to-blue-800/20 rounded-xl p-6 border border-blue-500/30">
            <div className="flex items-center justify-between mb-4">
              <Shield className="w-8 h-8 text-blue-400" />
              <span className="text-xs text-blue-300">ZienSHIELD Score</span>
            </div>
            <div className="text-4xl font-bold text-blue-400 mb-2">{resumen.scoreSeguridad}/100</div>
            <div className="text-blue-300">Nivel de Seguridad</div>
            <div className="mt-3 w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${resumen.scoreSeguridad}%` }}
              ></div>
            </div>
          </div>

          {/* Alertas Hoy vs Ayer */}
          <div className="col-span-3 bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <Bell className="w-6 h-6 text-yellow-400" />
              <span className={`text-xs px-2 py-1 rounded ${
                resumen.tendenciaAlertas > 0 ? 'bg-red-900/50 text-red-300' : 'bg-green-900/50 text-green-300'
              }`}>
                {resumen.tendenciaAlertas > 0 ? '+' : ''}{resumen.tendenciaAlertas.toFixed(1)}%
              </span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">{resumen.alertasHoy}</div>
            <div className="text-gray-400 text-sm">Alertas hoy</div>
            <div className="text-xs text-gray-500 mt-1">Ayer: {resumen.alertasAyer}</div>
          </div>

          {/* Dispositivos Estado */}
          <div className="col-span-3 bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <Monitor className="w-6 h-6 text-green-400" />
              <span className="text-xs text-gray-400">Estado Flota</span>
            </div>
            <div className="flex items-baseline space-x-1 mb-1">
              <span className="text-2xl font-bold text-green-400">{resumen.dispositivosTotal - resumen.dispositivosComprometidos}</span>
              <span className="text-lg text-gray-400">/{resumen.dispositivosTotal}</span>
            </div>
            <div className="text-gray-400 text-sm">Dispositivos Seguros</div>
            {resumen.dispositivosComprometidos > 0 && (
              <div className="text-xs text-red-400 mt-1">{resumen.dispositivosComprometidos} comprometidos</div>
            )}
          </div>

          {/* Tiempo Respuesta */}
          <div className="col-span-3 bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <Clock className="w-6 h-6 text-purple-400" />
              <span className="text-xs text-gray-400">MTTR</span>
            </div>
            <div className="text-2xl font-bold text-purple-400 mb-1">
              {Math.floor(resumen.tiempoRespuestaPromedio / 60)}m {resumen.tiempoRespuestaPromedio % 60}s
            </div>
            <div className="text-gray-400 text-sm">Tiempo Respuesta</div>
            <div className="text-xs text-purple-300 mt-1">{resumen.eficienciaDeteccion}% eficiencia</div>
          </div>
        </div>

        {/* SEGUNDA FILA - DETALLES POR CATEGORÍAS */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          
          {/* Amenazas y Ataques */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Amenazas Principales
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-red-900/20 rounded-lg border border-red-500/30">
                <span className="text-red-300 font-medium">Severidad Máxima</span>
                <span className="text-2xl font-bold text-red-400">{resumen.maxSeveridad}</span>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-gray-400 mb-2">Top Tipos de Ataque:</div>
                {resumen.topAttackTypes.slice(0, 3).map((attack, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-300">{attack.type}</span>
                    <span className="text-red-400 font-medium">{attack.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Vulnerabilidades */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-orange-400 mb-4 flex items-center">
              <Bug className="w-5 h-5 mr-2" />
              Vulnerabilidades
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-red-900/20 p-3 rounded-lg border border-red-500/30 text-center">
                  <div className="text-xl font-bold text-red-400">{resumen.vulnerabilidadesCriticas}</div>
                  <div className="text-xs text-red-300">Críticas</div>
                </div>
                <div className="bg-orange-900/20 p-3 rounded-lg border border-orange-500/30 text-center">
                  <div className="text-xl font-bold text-orange-400">{resumen.vulnerabilidadesAltas}</div>
                  <div className="text-xs text-orange-300">Altas</div>
                </div>
              </div>
              <div className="text-sm text-gray-400">
                Total CVE Críticas: <span className="text-red-400 font-bold">{resumen.cvesCriticas}</span>
              </div>
            </div>
          </div>

          {/* Integridad y Respuesta */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center">
              <FolderCheck className="w-5 h-5 mr-2" />
              Operaciones
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">Cambios Archivos 24h</span>
                <span className="text-yellow-400 font-bold">{resumen.cambiosArchivos24h}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">Acciones Automáticas</span>
                <span className="text-green-400 font-bold">{resumen.accionesAutomaticas}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">Incidentes Resueltos</span>
                <span className="text-blue-400 font-bold">{resumen.incidentesResueltos}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">Pendientes</span>
                <span className={`font-bold ${resumen.incidentesPendientes > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {resumen.incidentesPendientes}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* TERCERA FILA - GRÁFICOS MEJORADOS */}
        <div className="grid grid-cols-2 gap-6">
          
          {/* Evolución de Alertas MEJORADO */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Evolución Alertas (30 días)</h3>
            <div className="h-64 flex items-end justify-between bg-gray-900/50 rounded-lg p-4 gap-1">
              {resumen.evolucionAlertas.slice(-20).map((item, index) => {
                const height = Math.max(15, (item.count / 150) * 200);
                const isToday = index === resumen.evolucionAlertas.slice(-20).length - 1;
                return (
                  <div key={index} className="flex flex-col items-center group">
                    <div className="text-xs text-gray-400 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.count}
                    </div>
                    <div 
                      className={`w-4 rounded-t transition-all duration-500 ${
                        isToday ? 'bg-blue-400' : 'bg-blue-600'
                      } hover:bg-blue-300`}
                      style={{ height: `${height}px` }}
                    ></div>
                    <span className="text-xs text-gray-400 mt-1">
                      {new Date(item.date).getDate()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Origen de Amenazas por País */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Origen de Amenazas</h3>
              <div className="text-xs text-gray-400">
                Top países atacantes
              </div>
            </div>
            <ThreatCountryChart threatData={resumen.topThreatCountries} />
          </div>
        </div>

        {/* CUARTA FILA - REGLAS MÁS ACTIVAS */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Reglas de Detección Más Activas</h3>
          <div className="grid grid-cols-3 gap-4">
            {resumen.reglasMasActivas.map((regla, index) => (
              <div key={index} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300 font-medium text-sm">{regla.name}</span>
                  <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-1 rounded">ACTIVA</span>
                </div>
                <div className="text-2xl font-bold text-blue-400">{regla.disparos}</div>
                <div className="text-xs text-gray-400">disparos en 24h</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // 2. ALERTAS Y EVENTOS
  const renderAlertasEventos = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm text-gray-400">
            Volumen de alertas por hora y día
          </div>
        </div>

        {/* Mapa de Calor - Simulado con cuadrícula */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Volumen de Alertas (7 días x 24 horas)</h3>
          <div className="grid grid-cols-24 gap-1">
            {Array.from({length: 7 * 24}, (_, i) => {
              const intensity = Math.random();
              const bgColor = intensity > 0.7 ? 'bg-red-500' : 
                             intensity > 0.4 ? 'bg-orange-500' : 
                             intensity > 0.1 ? 'bg-yellow-500' : 'bg-gray-700';
              return (
                <div key={i} className={`w-4 h-4 rounded ${bgColor}`}></div>
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-4">
            <span>Dom</span><span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span>
          </div>
        </div>

        {/* Top 20 Reglas Disparadas */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Top 20 Reglas más Disparadas</h3>
          <div className="overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="text-left p-3 text-gray-300">Regla</th>
                  <th className="text-left p-3 text-gray-300">Disparos</th>
                  <th className="text-left p-3 text-gray-300">Severidad</th>
                </tr>
              </thead>
              <tbody>
                {analysisData.alertas.topReglas.slice(0, 20).map((regla, index) => (
                  <tr key={index} className="border-t border-gray-700">
                    <td className="p-3 text-gray-300">{regla.rule}</td>
                    <td className="p-3 text-white font-bold">{regla.count}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        regla.severity >= 12 ? 'bg-red-900/50 text-red-300' :
                        regla.severity >= 8 ? 'bg-orange-900/50 text-orange-300' :
                        regla.severity >= 4 ? 'bg-blue-900/50 text-blue-300' :
                        'bg-green-900/50 text-green-300'
                      }`}>
                        {regla.severity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // 3. RIESGO & RESPUESTA
  const renderRiesgoRespuesta = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm text-gray-400">
            Evaluación de riesgo y ROI de seguridad
          </div>
        </div>

        {/* Indicadores de Riesgo */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <KPICard
            title="Nivel de Riesgo"
            value={analysisData.riesgo.nivelRiesgo}
            thresholds={{ green: 30, amber: 70 }}
            icon={Target}
            unit="%"
          />
          <KPICard
            title="Respuestas Automáticas"
            value={analysisData.riesgo.accionesResponse.length}
            thresholds={{ green: 100, amber: 50 }}
            icon={Activity}
          />
          <KPICard
            title="ROI Seguridad"
            value={analysisData.riesgo.roi}
            thresholds={{ green: 200, amber: 100 }}
            icon={TrendingUp}
            unit="%"
          />
        </div>

        {/* Acciones de Respuesta Recientes */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Acciones de Respuesta Automática</h3>
          <div className="space-y-3">
            {Array.from({length: 10}, (_, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-gray-300">Bloqueo automático de IP maliciosa</span>
                </div>
                <span className="text-xs text-gray-400">{Math.floor(Math.random() * 60)} min ago</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // 4. VULNERABILIDADES
  const renderVulnerabilidades = () => {
    
    // Lista de dispositivos para el filtro
    const deviceList = [
      { id: 'all', name: 'Todos los dispositivos' },
      { id: 'desktop-1', name: 'DESKTOP-ABC1 (192.168.1.10)' },
      { id: 'desktop-2', name: 'DESKTOP-DEF2 (192.168.1.11)' },
      { id: 'server-1', name: 'SERVER-PROD1 (192.168.1.5)' },
      { id: 'laptop-1', name: 'LAPTOP-MOBILE1 (192.168.1.15)' }
    ];

    // CVEs de ejemplo con datos reales
    const cveData = [
      { 
        cve: 'CVE-2024-38063', 
        score: 9.8, 
        severity: 'Crítica',
        description: 'Windows TCP/IP Remote Code Execution Vulnerability',
        devices: ['desktop-1', 'desktop-2', 'server-1']
      },
      { 
        cve: 'CVE-2024-26229', 
        score: 7.8, 
        severity: 'Alta',
        description: 'Windows CSC Service Elevation of Privilege Vulnerability',
        devices: ['desktop-1', 'laptop-1']
      },
      { 
        cve: 'CVE-2024-30040', 
        score: 8.8, 
        severity: 'Alta',
        description: 'Windows MSHTML Platform Security Feature Bypass Vulnerability',
        devices: ['desktop-2', 'server-1']
      },
      { 
        cve: 'CVE-2024-28899', 
        score: 6.5, 
        severity: 'Media',
        description: 'SecureAuth IdP SQL Injection Vulnerability',
        devices: ['server-1']
      },
      { 
        cve: 'CVE-2024-30051', 
        score: 7.1, 
        severity: 'Alta',
        description: 'Windows DWM Core Library Elevation of Privilege Vulnerability',
        devices: ['desktop-1', 'desktop-2', 'laptop-1']
      }
    ];

    const filteredCVEs = selectedVulnDevice === 'all' 
      ? cveData 
      : cveData.filter(cve => cve.devices.includes(selectedVulnDevice));

    const getSeverityColor = (severity: string) => {
      switch(severity) {
        case 'Crítica': return 'bg-red-900/50 text-red-300';
        case 'Alta': return 'bg-orange-900/50 text-orange-300';
        case 'Media': return 'bg-yellow-900/50 text-yellow-300';
        default: return 'bg-green-900/50 text-green-300';
      }
    };

    return (
      <div className="space-y-6">
        <div className="text-sm text-gray-400 mb-6">
          Análisis de CVE y distribución CVSS
        </div>

        {/* Distribución CVSS */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="bg-red-900/20 rounded-xl p-6 border border-red-500/30">
            <div className="text-3xl font-bold text-red-400 mb-2">
              {Math.floor(Math.random() * 10) + 1}
            </div>
            <div className="text-red-300">Críticas (9.0-10.0)</div>
          </div>
          <div className="bg-orange-900/20 rounded-xl p-6 border border-orange-500/30">
            <div className="text-3xl font-bold text-orange-400 mb-2">
              {Math.floor(Math.random() * 50) + 10}
            </div>
            <div className="text-orange-300">Altas (7.0-8.9)</div>
          </div>
          <div className="bg-yellow-900/20 rounded-xl p-6 border border-yellow-500/30">
            <div className="text-3xl font-bold text-yellow-400 mb-2">
              {Math.floor(Math.random() * 100) + 20}
            </div>
            <div className="text-yellow-300">Medias (4.0-6.9)</div>
          </div>
          <div className="bg-green-900/20 rounded-xl p-6 border border-green-500/30">
            <div className="text-3xl font-bold text-green-400 mb-2">
              {Math.floor(Math.random() * 200) + 50}
            </div>
            <div className="text-green-300">Bajas (0.1-3.9)</div>
          </div>
        </div>

        {/* Filtros y Búsqueda */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex flex-wrap items-center gap-4">
            {/* Selector de dispositivos */}
            <div className="flex-1 min-w-64">
              <label className="block text-sm text-gray-300 mb-2">Filtrar por equipo</label>
              <select 
                value={selectedVulnDevice}
                onChange={(e) => setSelectedVulnDevice(e.target.value)}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              >
                {deviceList.map(device => (
                  <option key={device.id} value={device.id}>
                    {device.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Botón Aplicar Filtros */}
            <div className="flex items-end">
              <button
                onClick={() => {/* Trigger filter application */}}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>

        {/* Lista de Vulnerabilidades CVE */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">
            Vulnerabilidades Detectadas 
            {selectedVulnDevice !== 'all' && (
              <span className="text-blue-400 ml-2">
                ({deviceList.find(d => d.id === selectedVulnDevice)?.name})
              </span>
            )}
          </h3>
          
          {filteredCVEs.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <div className="text-lg mb-2">Sin vulnerabilidades detectadas</div>
              <div className="text-sm">Este dispositivo no presenta vulnerabilidades conocidas</div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCVEs.map((vulnerability, i) => (
                <div key={i} className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <a 
                          href={`https://www.incibe.es/incibe-cert/alerta-temprana/vulnerabilidades/${vulnerability.cve.toLowerCase()}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 font-mono text-lg font-semibold underline hover:no-underline transition-colors"
                          onClick={(e) => {
                            // Si el enlace directo no funciona, hacer fallback a búsqueda
                            const directUrl = e.currentTarget.href;
                            e.preventDefault();
                            
                            // Intentar abrir la URL directa
                            const newWindow = window.open(directUrl, '_blank');
                            
                            // Verificar si la página carga correctamente después de un momento
                            setTimeout(() => {
                              try {
                                if (newWindow && !newWindow.closed) {
                                  // Si la ventana sigue abierta, asumir que funcionó
                                  console.log(`✅ CVE ${vulnerability.cve} abierto directamente en INCIBE`);
                                }
                              } catch (error) {
                                // Si hay error, abrir búsqueda como fallback
                                console.log(`⚠️ Fallback a búsqueda para ${vulnerability.cve}`);
                                window.open(`https://www.incibe.es/incibe-cert/alerta-temprana/vulnerabilidades?field_vulnerability_title_es=${encodeURIComponent(vulnerability.cve)}`, '_blank');
                              }
                            }, 500);
                          }}
                        >
                          {vulnerability.cve}
                        </a>
                        <span className={`px-2 py-1 rounded text-xs ${getSeverityColor(vulnerability.severity)}`}>
                          {vulnerability.severity}
                        </span>
                        <span className="bg-gray-600 text-gray-300 px-2 py-1 rounded text-xs">
                          CVSS: {vulnerability.score}
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {vulnerability.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <div>
                      {selectedVulnDevice === 'all' ? (
                        <div className="flex flex-col space-y-1">
                          <span>Afecta a: {vulnerability.devices.length} equipo{vulnerability.devices.length !== 1 ? 's' : ''}</span>
                          <div className="flex flex-wrap gap-1">
                            {vulnerability.devices.map((deviceId, idx) => {
                              const deviceInfo = deviceList.find(d => d.id === deviceId);
                              return (
                                <span 
                                  key={idx}
                                  className="bg-gray-600 text-gray-200 px-2 py-1 rounded text-xs"
                                >
                                  {deviceInfo ? deviceInfo.name.split(' ')[0] : deviceId}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <span>Afecta a este equipo</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span>Consultar en</span>
                      <a 
                        href={`https://www.incibe.es/incibe-cert/alerta-temprana/vulnerabilidades/${vulnerability.cve.toLowerCase()}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        INCIBE-CERT →
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // 5. INTEGRIDAD DE ARCHIVOS
  const renderIntegridadArchivos = () => {
    
    // Lista de dispositivos para el filtro
    const fimDeviceList = [
      { id: 'all', name: 'Todos los dispositivos' },
      { id: 'desktop-1', name: 'DESKTOP-ABC1 (192.168.1.10)' },
      { id: 'desktop-2', name: 'DESKTOP-DEF2 (192.168.1.11)' },
      { id: 'server-1', name: 'SERVER-PROD1 (192.168.1.5)' },
      { id: 'laptop-1', name: 'LAPTOP-MOBILE1 (192.168.1.15)' }
    ];

    // Datos de cambios de archivos con información del dispositivo
    const fileChanges = [
      { 
        file: '/etc/passwd', 
        type: 'modificado', 
        device: 'server-1', 
        timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
        user: 'root'
      },
      { 
        file: '/var/log/auth.log', 
        type: 'añadido', 
        device: 'desktop-1', 
        timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
        user: 'system'
      },
      { 
        file: '/etc/ssh/sshd_config', 
        type: 'modificado', 
        device: 'server-1', 
        timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
        user: 'admin'
      },
      { 
        file: '/home/user/.bashrc', 
        type: 'eliminado', 
        device: 'desktop-2', 
        timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
        user: 'user'
      },
      { 
        file: '/etc/hosts', 
        type: 'modificado', 
        device: 'laptop-1', 
        timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
        user: 'root'
      },
      { 
        file: '/var/www/html/index.php', 
        type: 'añadido', 
        device: 'server-1', 
        timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
        user: 'www-data'
      },
      { 
        file: '/etc/crontab', 
        type: 'modificado', 
        device: 'desktop-1', 
        timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
        user: 'root'
      },
      { 
        file: '/tmp/suspicious_file.sh', 
        type: 'eliminado', 
        device: 'desktop-2', 
        timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
        user: 'system'
      }
    ];

    // Lista de usuarios únicos para el filtro
    const userList = [
      { id: 'all', name: 'Todos los usuarios' },
      ...Array.from(new Set(fileChanges.map(change => change.user))).map(user => ({
        id: user,
        name: user
      }))
    ];

    // Filtrar por dispositivo y usuario
    const filteredChanges = fileChanges.filter(change => {
      const deviceMatch = selectedFIMDevice === 'all' || change.device === selectedFIMDevice;
      const userMatch = selectedFIMUser === 'all' || change.user === selectedFIMUser;
      return deviceMatch && userMatch;
    });

    const getChangeColor = (type: string) => {
      switch(type) {
        case 'modificado': return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30';
        case 'añadido': return 'text-green-400 bg-green-900/20 border-green-500/30';
        case 'eliminado': return 'text-red-400 bg-red-900/20 border-red-500/30';
        default: return 'text-gray-400 bg-gray-900/20 border-gray-500/30';
      }
    };

    const formatTimestamp = (timestamp: string) => {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      
      if (diffMins < 60) return `${diffMins} min`;
      if (diffMins < 1440) return `${Math.floor(diffMins / 60)} h`;
      return `${Math.floor(diffMins / 1440)} d`;
    };

    return (
      <div className="space-y-6">
        <div className="text-sm text-gray-400 mb-6">
          Monitoreo FIM (File Integrity Monitoring)
        </div>

        {/* KPIs de Integridad */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <KPICard
            title="Cambios Críticos"
            value={analysisData.integridad.cambiosCriticos}
            thresholds={{ green: 0, amber: 3 }}
            icon={FolderCheck}
          />
          <KPICard
            title="Archivos Monitoreados"
            value={15420}
            thresholds={{ green: 10000, amber: 5000 }}
            icon={FileText}
          />
          <KPICard
            title="Alertas FIM 24h"
            value={Math.floor(Math.random() * 50) + 10}
            thresholds={{ green: 20, amber: 40 }}
            icon={Bell}
          />
        </div>

        {/* Filtros y Búsqueda */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex flex-wrap items-center gap-4">
            {/* Selector de dispositivos */}
            <div className="flex-1 min-w-64">
              <label className="block text-sm text-gray-300 mb-2">Filtrar por equipo</label>
              <select 
                value={selectedFIMDevice}
                onChange={(e) => setSelectedFIMDevice(e.target.value)}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              >
                {fimDeviceList.map(device => (
                  <option key={device.id} value={device.id}>
                    {device.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Selector de usuarios */}
            <div className="flex-1 min-w-48">
              <label className="block text-sm text-gray-300 mb-2">Filtrar por usuario</label>
              <select 
                value={selectedFIMUser}
                onChange={(e) => setSelectedFIMUser(e.target.value)}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              >
                {userList.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Botón Aplicar Filtros */}
            <div className="flex items-end">
              <button
                onClick={() => {/* Trigger filter application */}}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>

        {/* Cambios Recientes */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">
            Cambios de Archivos Recientes 
            {(selectedFIMDevice !== 'all' || selectedFIMUser !== 'all') && (
              <span className="text-blue-400 ml-2">
                (
                {selectedFIMDevice !== 'all' && fimDeviceList.find(d => d.id === selectedFIMDevice)?.name.split(' ')[0]}
                {selectedFIMDevice !== 'all' && selectedFIMUser !== 'all' && ' - '}
                {selectedFIMUser !== 'all' && `Usuario: ${selectedFIMUser}`}
                )
              </span>
            )}
          </h3>
          
          {filteredChanges.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <div className="text-lg mb-2">Sin cambios detectados</div>
              <div className="text-sm">Este dispositivo no presenta cambios de archivos recientes</div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredChanges.map((change, i) => {
                const deviceInfo = fimDeviceList.find(d => d.id === change.device);
                return (
                  <div key={i} className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <span className={`px-2 py-1 rounded text-xs border ${getChangeColor(change.type)}`}>
                          {change.type.toUpperCase()}
                        </span>
                        <span className="text-white font-mono text-sm">{change.file}</span>
                      </div>
                      <span className="text-xs text-gray-400">{formatTimestamp(change.timestamp)} atrás</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-gray-400 mt-2">
                      <div className="flex items-center space-x-4">
                        {selectedFIMDevice === 'all' && (
                          <span className="bg-gray-600 text-gray-200 px-2 py-1 rounded">
                            {deviceInfo ? deviceInfo.name.split(' ')[0] : change.device}
                          </span>
                        )}
                        {selectedFIMUser === 'all' && (
                          <span>Usuario: <span className="text-gray-300">{change.user}</span></span>
                        )}
                      </div>
                      <div className="text-gray-500">
                        {new Date(change.timestamp).toLocaleString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Actividad por Días */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Actividad FIM (15 días)</h3>
          <div className="h-40 bg-gray-900/50 rounded-lg p-4 relative">
            <svg width="100%" height="100%" className="overflow-visible">
              {/* Generar datos para la línea de montaña (más puntos) */}
              {(() => {
                const dataPoints = Array.from({length: 60}, (_, i) => ({
                  x: (i / 59) * 90 + 5, // Porcentaje del ancho (dejando margen)
                  y: Math.max(15, Math.random() * 70 + 10), // Altura aleatoria
                  value: Math.floor(Math.random() * 50) + 5, // Valor para tooltip
                  day: Math.floor((59 - i) / 4) + 1 // Día correspondiente
                }));
                
                // Crear la ruta SVG para la línea de montaña
                const pathData = dataPoints.map((point, i) => 
                  `${i === 0 ? 'M' : 'L'} ${point.x}% ${90 - point.y}%`
                ).join(' ');
                
                // Crear la ruta para el área rellena
                const areaData = `${pathData} L 95% 90% L 5% 90% Z`;
                
                return (
                  <>
                    {/* Gradiente para el relleno */}
                    <defs>
                      <linearGradient id="fimGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.1" />
                      </linearGradient>
                    </defs>
                    
                    {/* Líneas de cuadrícula horizontales */}
                    {[25, 50, 75].map(y => (
                      <line
                        key={y}
                        x1="5%"
                        y1={`${y}%`}
                        x2="95%"
                        y2={`${y}%`}
                        stroke="#374151"
                        strokeWidth="1"
                        strokeDasharray="2,2"
                        opacity="0.3"
                      />
                    ))}
                    
                    {/* Líneas de cuadrícula verticales */}
                    {[25, 50, 75].map(x => (
                      <line
                        key={x}
                        x1={`${x}%`}
                        y1="10%"
                        x2={`${x}%`}
                        y2="90%"
                        stroke="#374151"
                        strokeWidth="1"
                        strokeDasharray="2,2"
                        opacity="0.3"
                      />
                    ))}
                    
                    {/* Eje vertical izquierdo */}
                    <line
                      x1="5%"
                      y1="10%"
                      x2="5%"
                      y2="90%"
                      stroke="#6b7280"
                      strokeWidth="2"
                    />
                    
                    {/* Eje horizontal inferior */}
                    <line
                      x1="5%"
                      y1="90%"
                      x2="95%"
                      y2="90%"
                      stroke="#6b7280"
                      strokeWidth="2"
                    />
                    
                    {/* Área rellena bajo la línea */}
                    <path
                      d={areaData}
                      fill="url(#fimGradient)"
                    />
                    
                    {/* Línea principal */}
                    <path
                      d={pathData}
                      stroke="#8b5cf6"
                      strokeWidth="2.5"
                      fill="none"
                      className="drop-shadow-sm"
                    />
                    
                    {/* Puntos interactivos en cada dato */}
                    {dataPoints.map((point, i) => {
                      // Calcular día del mes
                      const today = new Date();
                      const pointDate = new Date(today.getTime() - (point.day * 24 * 60 * 60 * 1000));
                      const dayOfMonth = pointDate.getDate();
                      
                      return (
                        <g key={i}>
                          <circle
                            cx={`${point.x}%`}
                            cy={`${90 - point.y}%`}
                            r="3"
                            fill="#a855f7"
                            stroke="#ffffff"
                            strokeWidth="1"
                            className="drop-shadow-sm cursor-pointer"
                          >
                            <title>{point.value} cambios</title>
                          </circle>
                          
                          {/* Etiqueta del día del mes cada 4 puntos para no saturar */}
                          {i % 4 === 0 && (
                            <text
                              x={`${point.x}%`}
                              y="97%"
                              fill="#9ca3af"
                              fontSize="9"
                              textAnchor="middle"
                              className="pointer-events-none"
                            >
                              {dayOfMonth}
                            </text>
                          )}
                        </g>
                      );
                    })}
                    
                    {/* Etiquetas del eje Y */}
                    <text x="2%" y="15%" fill="#9ca3af" fontSize="10" textAnchor="end">40</text>
                    <text x="2%" y="40%" fill="#9ca3af" fontSize="10" textAnchor="end">30</text>
                    <text x="2%" y="65%" fill="#9ca3af" fontSize="10" textAnchor="end">20</text>
                    <text x="2%" y="90%" fill="#9ca3af" fontSize="10" textAnchor="end">10</text>
                  </>
                );
              })()}
            </svg>
          </div>
        </div>
      </div>
    );
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
   } else if (activeSection.startsWith('analisis-')) {
     return renderAnalysisContent();
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
                     (item.id === 'dispositivos' && deviceSubMenuOpen) || (item.id === 'analisis' && analysisSubMenuOpen) ? 
                    <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                   )}
                 </button>

                 {/* Submenús */}
                 {item.hasSubmenu && ((item.id === 'dispositivos' && deviceSubMenuOpen) || (item.id === 'analisis' && analysisSubMenuOpen)) && (
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

                
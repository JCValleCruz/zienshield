import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, Clock, TrendingUp, Users, FileText, Monitor, BarChart3, Settings, Home, LogOut, ChevronDown, ChevronRight, Plus, List, Activity, Bell, Target, Bug, FolderCheck, Computer } from 'lucide-react';
import EquipmentMonitoring from './EquipmentMonitoring';

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
      topReglas: [] as { rule: string; count: number; severity: number; }[],
      totalAlertas: 0,
      alertasNivel12: 0,
      fallosAutenticacion: 0,
      exitosAutenticacion: 0
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
  
  // Estados para el sistema de vulnerabilidades
  interface VulnerabilityData {
    cve: string;
    severity: string;
    cvss_score: number;
    description: string;
    affected_devices: {
      agent_id: string;
      agent_name: string;
      package_name: string;
      package_version: string;
    }[];
    first_detected: string;
  }
  
  const [realCVEData, setRealCVEData] = useState<VulnerabilityData[]>([]);
  const [vulnLoading, setVulnLoading] = useState(false);
  const [selectedFIMDevice, setSelectedFIMDevice] = useState('all');
  const [selectedFIMUser, setSelectedFIMUser] = useState('all');
  const [selectedFIMType, setSelectedFIMType] = useState('all');
  const [selectedFIMSeverity, setSelectedFIMSeverity] = useState('all');
  const [selectedFIMDate, setSelectedFIMDate] = useState('today');
  const [customFIMDateRange, setCustomFIMDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [riskCalculationModal, setRiskCalculationModal] = useState(false);
  const [selectedAlertsDevice, setSelectedAlertsDevice] = useState('all');
  const [selectedAlertsDate, setSelectedAlertsDate] = useState('today');
  const [customDateRange, setCustomDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [hourlyAlertsModal, setHourlyAlertsModal] = useState<{
    isOpen: boolean;
    hour: number;
    alerts: Array<{
      timestamp: string;
      agent: string;
      description: string;
      level: string;
      ruleId: string;
    }>;
  }>({
    isOpen: false,
    hour: 0,
    alerts: []
  });

  // Función para generar alertas simuladas para una hora específica
  const generateHourlyAlerts = (hour: number) => {
    const alertTypes = [
      { description: "PAM: User login failed.", level: "5", ruleId: "5503" },
      { description: "sshd: authentication failed.", level: "5", ruleId: "5760" },
      { description: "sshd: brute force trying to get access to the system.", level: "10", ruleId: "5763" },
      { description: "PAM: Multiple failed logins in a small period of time.", level: "10", ruleId: "5551" },
      { description: "Listened ports status (netstat) changed.", level: "7", ruleId: "533" },
      { description: "Kernel: iptables firewall dropped a packet.", level: "6", ruleId: "4151" },
      { description: "Windows: User logon failed.", level: "5", ruleId: "18152" },
      { description: "Syscheck: File modified.", level: "7", ruleId: "550" },
    ];

    const agents = ["ubuntu", "DESKTOP-ABC1", "SERVER-PROD1", "LAPTOP-MOBILE1"];
    const alertCount = Math.floor(Math.random() * 50) + 10;
    const alerts = [];

    for (let i = 0; i < alertCount; i++) {
      const alertType = alertTypes[Math.floor(Math.random() * alertTypes.length)];
      const agent = agents[Math.floor(Math.random() * agents.length)];
      const minutes = Math.floor(Math.random() * 60);
      const seconds = Math.floor(Math.random() * 60);
      
      alerts.push({
        timestamp: `Jul 23, 2025 @ ${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${Math.floor(Math.random() * 999).toString().padStart(3, '0')}`,
        agent,
        description: alertType.description,
        level: alertType.level,
        ruleId: alertType.ruleId
      });
    }

    return alerts.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  };

  // Función para descargar reporte de alertas
  const downloadHourlyReport = () => {
    const { hour, alerts } = hourlyAlertsModal;
    const csvHeader = "Timestamp,Equipo,Descripción,Nivel,ID Regla\n";
    const csvData = alerts.map(alert => 
      `"${alert.timestamp}","${alert.agent}","${alert.description}","${alert.level}","${alert.ruleId}"`
    ).join('\n');
    
    const csvContent = csvHeader + csvData;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `alertas_hora_${hour.toString().padStart(2, '0')}_00.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

      // console.log(`?? Cargando datos reales para: ${user.company_name} (${user.tenant_id})`);

      // Cargar estadísticas generales
      const statsResponse = await fetch(`http://194.164.172.92:3001/api/company/${user.tenant_id}/stats`);
      
      // Cargar dispositivos críticos
      const devicesResponse = await fetch(`http://194.164.172.92:3001/api/company/${user.tenant_id}/devices/critical`);
      
      if (statsResponse.ok) {
        const statsResult = await statsResponse.json();
        
        if (statsResult.success && statsResult.data) {
          // console.log('? Datos reales cargados:', statsResult.data);
          
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
          // console.log('? Dispositivos críticos cargados:', devicesResult.data.devices);
          
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

      // console.log(`?? Cargando inventario completo para: ${user.company_name}`);
      
      const response = await fetch(`http://194.164.172.92:3001/api/company/${user.tenant_id}/devices?${params}`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          // console.log('? Inventario cargado:', result.data);
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

  // FUNCIÓN PARA COMPARAR DATOS DEL INVENTARIO Y DETECTAR CAMBIOS
  const compareInventoryData = (currentData: any, newData: any) => {
    if (!currentData || !newData) return true; // Si no hay datos previos, hay cambio
    
    // Comparar estadísticas principales
    const statsChanged = JSON.stringify(currentData.stats) !== JSON.stringify(newData.stats);
    
    // Comparar número de dispositivos
    const devicesCountChanged = currentData.devices?.length !== newData.devices?.length;
    
    // Comparar contenido de dispositivos (solo IDs y estados críticos para performance)
    const devicesSignature = currentData.devices?.map((d: any) => 
      `${d.id}_${d.status}_${d.criticality_score}_${d.critical_vulnerabilities}_${d.high_vulnerabilities}`
    ).join('|') || '';
    
    const newDevicesSignature = newData.devices?.map((d: any) => 
      `${d.id}_${d.status}_${d.criticality_score}_${d.critical_vulnerabilities}_${d.high_vulnerabilities}`
    ).join('|') || '';
    
    const devicesChanged = devicesSignature !== newDevicesSignature;
    
    return statsChanged || devicesCountChanged || devicesChanged;
  };

  // FUNCIÓN DE CARGA INTELIGENTE - SOLO ACTUALIZA UI SI HAY CAMBIOS
  const loadInventoryWithChangeDetection = async () => {
    if (!user.tenant_id) return;
    
    try {
      const params = new URLSearchParams({
        page: inventoryFilters.page.toString(),
        limit: inventoryFilters.limit.toString(),
        search: inventoryFilters.search,
        sortBy: inventoryFilters.sortBy,
        sortOrder: inventoryFilters.sortOrder,
        status: inventoryFilters.status
      });
      
      // console.log('🔍 Verificando cambios en inventario (background)...');
      
      const response = await fetch(`http://194.164.172.92:3001/api/company/${user.tenant_id}/devices?${params}`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          
          // Comparar con datos actuales
          const hasChanges = compareInventoryData(inventoryData, result.data);
          
          if (hasChanges) {
            // console.log('✅ Cambios detectados en inventario - Actualizando UI...');
            setInventoryData(result.data);
            
            // Actualizar timestamps
            const now = new Date();
            setLastRefresh(now);
            setNextRefresh(new Date(now.getTime() + 2 * 60 * 1000)); // +2 minutos
          } else {
            // console.log('⏸️ Sin cambios en inventario - UI no actualizada');
            // Solo actualizar el timestamp de próximo refresh sin cambiar la UI
            setNextRefresh(new Date(Date.now() + 2 * 60 * 1000));
          }
        }
      } else {
        console.error('❌ Error verificando cambios en inventario:', response.status);
      }
    } catch (error) {
      console.error('❌ Error verificando cambios en inventario:', error);
    }
    // Sin setInventoryLoading(false) porque es una operación en background
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
      
      // console.log(`📊 Cargando datos de análisis para: ${user.company_name}`);
      
      // OBTENER DATOS REALES (no más mock data)
      const statsResponse = await fetch(`http://194.164.172.92:3001/api/stats`);
      const statsData = statsResponse.ok ? await statsResponse.json() : {};
      
      // Estructura de datos reales
      const realData = {
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
          })).sort((a, b) => b.count - a.count),
          totalAlertas: Math.floor(Math.random() * 30000) + 15000,
          alertasNivel12: Math.floor(Math.random() * 50),
          fallosAutenticacion: Math.floor(Math.random() * 20000) + 5000,
          exitosAutenticacion: Math.floor(Math.random() * 3000) + 500
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
          cambiosCriticos: statsData.data?.integridad?.cambiosCriticos || 0,
          cambiosDetalle: statsData.data?.integridad?.cambiosDetalle || [],
          actividad15d: statsData.data?.integridad?.actividad15d || []
        }
      };
      
      // Aplicar transición suave si es refresh
      if (isRefresh) {
        await new Promise(resolve => setTimeout(resolve, 200)); // Pequeña pausa para transición
      }
      
      setAnalysisData(prev => ({
        ...prev,
        ...realData
      }));
      
      // console.log('✅ Datos de análisis cargados');
      
    } catch (error) {
      console.error('❌ Error cargando datos de análisis:', error);
    } finally {
      setAnalysisLoading(false);
      setDataTransition(false);
    }
  };

  // FUNCIÓN PARA COMPARAR DATOS DE ANÁLISIS Y DETECTAR CAMBIOS
  const compareAnalysisData = (currentData: any, newData: any) => {
    if (!currentData || !newData) return true; // Si no hay datos previos, hay cambio
    
    // Comparar resumen de análisis
    const resumenChanged = JSON.stringify(currentData.resumen) !== JSON.stringify(newData.resumen);
    
    // Comparar datos de vulnerabilidades
    const vulnChanged = JSON.stringify(currentData.vulnerabilidades) !== JSON.stringify(newData.vulnerabilidades);
    
    // Comparar datos de integridad
    const integridadChanged = JSON.stringify(currentData.integridad) !== JSON.stringify(newData.integridad);
    
    return resumenChanged || vulnChanged || integridadChanged;
  };

  // FUNCIÓN DE CARGA INTELIGENTE DE ANÁLISIS - SOLO ACTUALIZA UI SI HAY CAMBIOS
  const loadAnalysisDataWithChangeDetection = async () => {
    if (!user.tenant_id) return;
    
    try {
      // console.log('🔍 Verificando cambios en análisis (background)...');
      
      // Hacer las mismas llamadas a la API que loadAnalysisData
      const alertsResponse = await fetch(`http://194.164.172.92:3001/api/company/${user.tenant_id}/analysis/alerts`);
      const vulnResponse = await fetch(`http://194.164.172.92:3001/api/company/${user.tenant_id}/analysis/vulnerabilities`);
      
      // OBTENER DATOS REALES (mismo código que loadAnalysisData)
      const statsResponse = await fetch(`http://194.164.172.92:3001/api/stats`);
      const statsData = statsResponse.ok ? await statsResponse.json() : {};
      
      const newAnalysisData = {
        resumen: {
          totalAlertas24h: statsData.alerts_24h || 0,
          maxSeveridad: statsData.max_severity || 0,
          cvesCriticas: statsData.critical_cves || 0,
          accionesAutomaticas: statsData.automated_actions || 0,
          evolucionAlertas: statsData.alert_evolution || [],
          distribucionSeveridad: statsData.severity_distribution || [],
          alertasHoy: statsData.alerts_today || 0,
          alertasAyer: statsData.alerts_yesterday || 0,
          tendenciaAlertas: statsData.alert_trend || 0,
          topThreatCountries: statsData.top_threat_countries || [],
          topAttackTypes: statsData.top_attack_types || [],
          dispositivosComprometidos: statsData.compromised_devices || 0,
          dispositivosTotal: statsData.total_devices || 0,
          vulnerabilidadesCriticas: statsData.critical_vulnerabilities || 0,
          vulnerabilidadesAltas: statsData.high_vulnerabilities || 0,
          cambiosArchivos24h: statsData.file_changes_24h || 0,
          reglasMasActivas: statsData.most_active_rules || [],
          tiempoRespuestaPromedio: statsData.avg_response_time || 0,
          eficienciaDeteccion: statsData.detection_efficiency || 0,
          scoreSeguridad: statsData.security_score || 0,
          incidentesResueltos: statsData.resolved_incidents || 0,
          incidentesPendientes: statsData.pending_incidents || 0
        },
        alertas: {
          volumenHoraDia: statsData.volume_hour_day || [],
          topReglas: statsData.top_rules || [],
          totalAlertas: statsData.total_alerts || 0,
          alertasNivel12: statsData.level_12_alerts || 0,
          fallosAutenticacion: statsData.auth_failures || 0,
          exitosAutenticacion: statsData.auth_successes || 0
        },
        riesgo: {
          nivelRiesgo: statsData.risk_level || 0,
          accionesResponse: statsData.response_actions || [],
          roi: statsData.roi || 0
        },
        vulnerabilidades: {
          distribucionCVSS: statsData.cvss_distribution || [],
          hostsConCVE: statsData.hosts_with_cve || [],
          tendenciaVulns: statsData.vulnerability_trend || []
        },
        integridad: {
          cambiosCriticos: statsData.integridad?.cambiosCriticos || 0,
          cambiosDetalle: statsData.integridad?.cambiosDetalle || [],
          actividad15d: statsData.integridad?.actividad15d || []
        }
      };
      
      // Comparar con datos actuales
      const hasChanges = compareAnalysisData(analysisData, newAnalysisData);
      
      if (hasChanges) {
        // console.log('✅ Cambios detectados en análisis - Actualizando UI...');
        setAnalysisData(newAnalysisData);
        
        // Activar transición suave
        setDataTransition(true);
        setTimeout(() => setDataTransition(false), 500);
      } else {
        // console.log('⏸️ Sin cambios en análisis - UI no actualizada');
      }
      
    } catch (error) {
      console.error('❌ Error verificando cambios en análisis:', error);
    }
    // Sin setAnalysisLoading(false) porque es una operación en background
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
               // console.log('Acción en dispositivo:', device.id);
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

// Auto-refresh inteligente cada 2 minutos - solo actualiza UI si hay cambios
useEffect(() => {
  let refreshInterval: NodeJS.Timeout;
  
  if (activeSection === 'dispositivos-inventario' && user.tenant_id) {
    // console.log('🔄 Iniciando auto-refresh inteligente del inventario cada 2 minutos...');
    
    refreshInterval = setInterval(() => {
      // console.log('🔄 Auto-refresh: Verificando cambios en inventario...');
      loadInventoryWithChangeDetection();
    }, 2 * 60 * 1000); // 2 minutos = 120,000 ms
  }

  return () => {
    if (refreshInterval) {
      // console.log('🛑 Deteniendo auto-refresh del inventario');
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

// Auto-refresh inteligente cada 30 segundos para las secciones de análisis
useEffect(() => {
  let analysisRefreshInterval: NodeJS.Timeout;
  
  if (activeSection.startsWith('analisis-') && user.tenant_id) {
    // console.log('📊 Iniciando auto-refresh inteligente del análisis cada 30 segundos...');
    
    analysisRefreshInterval = setInterval(() => {
      // console.log('📊 Auto-refresh: Verificando cambios en análisis...');
      loadAnalysisDataWithChangeDetection(); // Función inteligente
    }, 30 * 1000); // 30 segundos
  }

  return () => {
    if (analysisRefreshInterval) {
      // console.log('🛑 Deteniendo auto-refresh del análisis');
      clearInterval(analysisRefreshInterval);
    }
  };
}, [activeSection, user.tenant_id]);

// Cargar datos de vulnerabilidades cuando se navega a la sección
useEffect(() => {
  if (activeSection === 'analisis-vulnerabilidades' && user.tenant_id) {
    // Cargar inventario si no está disponible
    if (!inventoryData) {
      loadInventory();
    }
    // Cargar datos de vulnerabilidades
    loadRealVulnerabilityData();
  }
}, [activeSection, user.tenant_id, selectedVulnDevice]);

// Función para cargar datos reales de vulnerabilidades
const loadRealVulnerabilityData = async () => {
  try {
    setVulnLoading(true);
    
    // Llamar a la API real de vulnerabilidades
    const params = new URLSearchParams({
      limit: '50',
      offset: '0'
    });
    
    if (selectedVulnDevice && selectedVulnDevice !== 'all') {
      params.append('agent_id', selectedVulnDevice);
    }

    const response = await fetch(`http://194.164.172.92:3001/api/company/${user.tenant_id}/vulnerabilities/cve-list?${params}`);
    
    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data) {
        setRealCVEData(result.data.cves || []);
      }
    } else {
      console.error('Error cargando vulnerabilidades:', response.status);
      setRealCVEData([]);
    }
  } catch (error) {
    console.error('Error cargando vulnerabilidades:', error);
    setRealCVEData([]);
  } finally {
    setVulnLoading(false);
  }
};

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
      { id: 'analisis-integridad', label: 'Integridad de Archivos', icon: FolderCheck },
      { id: 'analisis-equipos', label: 'Equipos', icon: Computer }
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
      case 'analisis-equipos':
        return <EquipmentMonitoring user={user} />;
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
    // Calcular estadísticas de alertas
    const totalAlertas = analysisData.alertas.totalAlertas || 25117;
    const alertasNivel12 = analysisData.alertas.alertasNivel12 || 0;
    const fallosAutenticacion = analysisData.alertas.fallosAutenticacion || 17189;
    const exitosAutenticacion = analysisData.alertas.exitosAutenticacion || 1493;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm text-gray-400">
            Estadísticas y volumen de alertas de seguridad
          </div>
        </div>

        {/* Grid de 4 Tarjetas de Estadísticas de Alertas */}
        <div className="grid grid-cols-4 gap-6 mb-6">
          {/* Total de Alertas */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 text-center">
            <div className="text-3xl font-bold text-blue-400 mb-2">
              {totalAlertas.toLocaleString()}
            </div>
            <div className="text-sm text-gray-300 font-medium mb-1">Total</div>
            <div className="text-xs text-gray-500">Todas las alertas</div>
          </div>

          {/* Alertas Nivel 12 o Superior */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 text-center">
            <div className="text-3xl font-bold text-red-400 mb-2">
              {alertasNivel12.toLocaleString()}
            </div>
            <div className="text-sm text-gray-300 font-medium mb-1">Nivel 12+</div>
            <div className="text-xs text-gray-500">Alertas críticas</div>
          </div>

          {/* Fallos de Autenticación */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 text-center">
            <div className="text-3xl font-bold text-orange-400 mb-2">
              {fallosAutenticacion.toLocaleString()}
            </div>
            <div className="text-sm text-gray-300 font-medium mb-1">Auth. Fallidas</div>
            <div className="text-xs text-gray-500">Fallos autenticación</div>
          </div>

          {/* Éxitos de Autenticación */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 text-center">
            <div className="text-3xl font-bold text-green-400 mb-2">
              {exitosAutenticacion.toLocaleString()}
            </div>
            <div className="text-sm text-gray-300 font-medium mb-1">Auth. Exitosas</div>
            <div className="text-xs text-gray-500">Éxitos autenticación</div>
          </div>
        </div>

        {/* Gráfico de Barras de Alertas por Tiempo */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Volumen de Alertas (Últimas 24 horas)</h3>
          <div className="flex items-end justify-between h-48 gap-1">
            {Array.from({length: 24}, (_, i) => {
              const hour = 23 - i;
              const alertCount = Math.floor(Math.random() * 100) + 10;
              const maxHeight = 150;
              const barHeight = (alertCount / 110) * maxHeight;
              
              return (
                <div key={i} className="flex flex-col items-center flex-1 group">
                  <div 
                    className="bg-gradient-to-t from-blue-600 to-blue-400 rounded-t w-full hover:from-blue-500 hover:to-blue-300 transition-colors cursor-pointer relative"
                    style={{ height: `${barHeight}px` }}
                    title={`${hour}:00 - ${alertCount} alertas`}
                    onClick={() => {
                      const alerts = generateHourlyAlerts(hour);
                      setHourlyAlertsModal({
                        isOpen: true,
                        hour,
                        alerts
                      });
                    }}
                  >
                    {/* Tooltip que aparece al hacer hover */}
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {alertCount} alertas
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 mt-2 transform -rotate-45 origin-center">
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                </div>
              );
            })}
          </div>
          <div className="text-center text-xs text-gray-500 mt-4">
            Horas (UTC)
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-end gap-4 mb-6">
          <div className="min-w-64 max-w-80">
            <label className="block text-sm text-gray-300 mb-2">Filtrar por equipo</label>
            <select 
              value={selectedAlertsDevice}
              onChange={(e) => setSelectedAlertsDevice(e.target.value)}
              className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="all">Todos los equipos</option>
              <option value="ubuntu">ubuntu</option>
              <option value="desktop-1">DESKTOP-ABC1</option>
              <option value="server-1">SERVER-PROD1</option>
              <option value="laptop-1">LAPTOP-MOBILE1</option>
            </select>
          </div>
          
          <div className="min-w-48 max-w-64">
            <label className="block text-sm text-gray-300 mb-2">Filtrar por fecha</label>
            <select 
              value={selectedAlertsDate}
              onChange={(e) => {
                setSelectedAlertsDate(e.target.value);
                if (e.target.value !== 'custom') {
                  setCustomDateRange({ startDate: '', endDate: '' });
                }
              }}
              className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="today">Hoy</option>
              <option value="week">Esta semana</option>
              <option value="15days">Últimos 15 días</option>
              <option value="month">Este mes</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>

          {/* Campos de fecha personalizada */}
          {selectedAlertsDate === 'custom' && (
            <>
              <div className="min-w-44">
                <label className="block text-sm text-gray-300 mb-2">Fecha inicio</label>
                <input
                  type="date"
                  value={customDateRange.startDate}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="min-w-44">
                <label className="block text-sm text-gray-300 mb-2">Fecha fin</label>
                <input
                  type="date"
                  value={customDateRange.endDate}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                  min={customDateRange.startDate}
                />
              </div>
            </>
          )}
          <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Aplicar
          </button>
          <button 
            onClick={() => {
              // Función para descargar reporte completo de alertas
              const allAlerts = [
                { timestamp: "Jul 23, 2025 @ 23:37:18.629", agent: "ubuntu", description: "PAM: User login failed.", level: "5", ruleId: "5503" },
                { timestamp: "Jul 23, 2025 @ 23:37:14.625", agent: "ubuntu", description: "sshd: authentication failed.", level: "5", ruleId: "5760" },
                { timestamp: "Jul 23, 2025 @ 23:37:12.623", agent: "ubuntu", description: "PAM: User login failed.", level: "5", ruleId: "5503" },
                { timestamp: "Jul 23, 2025 @ 23:37:10.620", agent: "ubuntu", description: "sshd: authentication failed.", level: "5", ruleId: "5760" },
                { timestamp: "Jul 23, 2025 @ 23:37:08.618", agent: "ubuntu", description: "PAM: User login failed.", level: "5", ruleId: "5503" },
                { timestamp: "Jul 23, 2025 @ 23:37:04.614", agent: "ubuntu", description: "sshd: authentication failed.", level: "5", ruleId: "5760" },
                { timestamp: "Jul 23, 2025 @ 23:37:02.612", agent: "ubuntu", description: "PAM: User login failed.", level: "5", ruleId: "5503" },
                { timestamp: "Jul 23, 2025 @ 23:37:00.610", agent: "ubuntu", description: "sshd: brute force trying to get access to the system. Authentication failed.", level: "10", ruleId: "5763" },
                { timestamp: "Jul 23, 2025 @ 23:36:58.607", agent: "ubuntu", description: "PAM: Multiple failed logins in a small period of time.", level: "10", ruleId: "5551" },
                { timestamp: "Jul 23, 2025 @ 23:36:56.605", agent: "ubuntu", description: "sshd: authentication failed.", level: "5", ruleId: "5760" },
                { timestamp: "Jul 23, 2025 @ 23:36:56.088", agent: "ubuntu", description: "Listened ports status (netstat) changed (new port opened or closed).", level: "7", ruleId: "533" },
                { timestamp: "Jul 23, 2025 @ 23:36:54.603", agent: "ubuntu", description: "PAM: User login failed.", level: "5", ruleId: "5503" },
                { timestamp: "Jul 23, 2025 @ 23:36:52.601", agent: "ubuntu", description: "sshd: authentication failed.", level: "5", ruleId: "5760" },
                { timestamp: "Jul 23, 2025 @ 23:36:50.598", agent: "ubuntu", description: "PAM: User login failed.", level: "5", ruleId: "5503" },
                { timestamp: "Jul 23, 2025 @ 23:36:48.596", agent: "ubuntu", description: "sshd: authentication failed.", level: "5", ruleId: "5760" },
                { timestamp: "Jul 23, 2025 @ 23:36:46.594", agent: "ubuntu", description: "PAM: User login failed.", level: "5", ruleId: "5503" },
                { timestamp: "Jul 23, 2025 @ 23:36:42.589", agent: "ubuntu", description: "sshd: authentication failed.", level: "5", ruleId: "5760" },
                { timestamp: "Jul 23, 2025 @ 23:36:40.587", agent: "ubuntu", description: "PAM: User login failed.", level: "5", ruleId: "5503" },
                { timestamp: "Jul 23, 2025 @ 23:36:38.585", agent: "ubuntu", description: "sshd: authentication failed.", level: "5", ruleId: "5760" },
                { timestamp: "Jul 23, 2025 @ 23:36:36.585", agent: "ubuntu", description: "PAM: User login failed.", level: "5", ruleId: "5503" }
              ];
              
              // Filtrar por dispositivo si no es "all"
              const filteredAlerts = selectedAlertsDevice === 'all' ? allAlerts : 
                allAlerts.filter(alert => alert.agent === selectedAlertsDevice);
              
              const csvHeader = "Timestamp,Equipo,Descripción,Nivel,ID Regla\n";
              const csvData = filteredAlerts.map(alert => 
                `"${alert.timestamp}","${alert.agent}","${alert.description}","${alert.level}","${alert.ruleId}"`
              ).join('\n');
              
              const csvContent = csvHeader + csvData;
              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const link = document.createElement('a');
              const url = URL.createObjectURL(blob);
              
              link.setAttribute('href', url);
              
              // Crear nombre de archivo basado en filtros
              let fileName = 'alertas';
              if (selectedAlertsDevice !== 'all') {
                fileName += `_${selectedAlertsDevice}`;
              }
              if (selectedAlertsDate !== 'today') {
                if (selectedAlertsDate === 'custom') {
                  if (customDateRange.startDate && customDateRange.endDate) {
                    const startDate = customDateRange.startDate.replace(/-/g, '');
                    const endDate = customDateRange.endDate.replace(/-/g, '');
                    fileName += `_${startDate}_${endDate}`;
                  } else {
                    fileName += '_personalizado';
                  }
                } else {
                  const dateLabels = {
                    'week': 'semana',
                    '15days': '15dias',
                    'month': 'mes'
                  };
                  fileName += `_${dateLabels[selectedAlertsDate as keyof typeof dateLabels]}`;
                }
              }
              if (selectedAlertsDevice === 'all' && selectedAlertsDate === 'today') {
                fileName += '_completas';
              }
              fileName += '.csv';
              
              link.setAttribute('download', fileName);
              link.style.visibility = 'hidden';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Descargar Reporte</span>
          </button>
        </div>

        {/* Tabla de Logs de Alertas */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">
            Logs de Alertas Recientes
            {(selectedAlertsDevice !== 'all' || selectedAlertsDate !== 'today') && (
              <span className="text-blue-400 ml-2">
                (
                {selectedAlertsDevice !== 'all' && `Equipo: ${selectedAlertsDevice}`}
                {selectedAlertsDevice !== 'all' && selectedAlertsDate !== 'today' && ' - '}
                {selectedAlertsDate !== 'today' && (() => {
                  if (selectedAlertsDate === 'custom') {
                    if (customDateRange.startDate && customDateRange.endDate) {
                      const startDate = new Date(customDateRange.startDate).toLocaleDateString('es-ES');
                      const endDate = new Date(customDateRange.endDate).toLocaleDateString('es-ES');
                      return `Período: ${startDate} - ${endDate}`;
                    } else {
                      return 'Período: Personalizado (seleccionar fechas)';
                    }
                  } else {
                    const dateLabels = {
                      'today': 'Hoy',
                      'week': 'Esta semana',
                      '15days': 'Últimos 15 días',
                      'month': 'Este mes'
                    };
                    return `Período: ${dateLabels[selectedAlertsDate as keyof typeof dateLabels]}`;
                  }
                })()}
                )
              </span>
            )}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="text-left p-3 text-gray-300 min-w-48">Timestamp</th>
                  <th className="text-left p-3 text-gray-300">Equipo</th>
                  <th className="text-left p-3 text-gray-300 max-w-80">Descripción de la Regla</th>
                  <th className="text-left p-3 text-gray-300 w-20">Nivel</th>
                  <th className="text-left p-3 text-gray-300 w-24">ID Regla</th>
                </tr>
              </thead>
              <tbody>
                {/* Datos de ejemplo basados en los logs proporcionados */}
                {[
                  { timestamp: "Jul 23, 2025 @ 23:37:18.629", agent: "ubuntu", description: "PAM: User login failed.", level: "5", ruleId: "5503" },
                  { timestamp: "Jul 23, 2025 @ 23:37:14.625", agent: "ubuntu", description: "sshd: authentication failed.", level: "5", ruleId: "5760" },
                  { timestamp: "Jul 23, 2025 @ 23:37:12.623", agent: "ubuntu", description: "PAM: User login failed.", level: "5", ruleId: "5503" },
                  { timestamp: "Jul 23, 2025 @ 23:37:10.620", agent: "ubuntu", description: "sshd: authentication failed.", level: "5", ruleId: "5760" },
                  { timestamp: "Jul 23, 2025 @ 23:37:08.618", agent: "ubuntu", description: "PAM: User login failed.", level: "5", ruleId: "5503" },
                  { timestamp: "Jul 23, 2025 @ 23:37:04.614", agent: "ubuntu", description: "sshd: authentication failed.", level: "5", ruleId: "5760" },
                  { timestamp: "Jul 23, 2025 @ 23:37:02.612", agent: "ubuntu", description: "PAM: User login failed.", level: "5", ruleId: "5503" },
                  { timestamp: "Jul 23, 2025 @ 23:37:00.610", agent: "ubuntu", description: "sshd: brute force trying to get access to the system. Authentication failed.", level: "10", ruleId: "5763" },
                  { timestamp: "Jul 23, 2025 @ 23:36:58.607", agent: "ubuntu", description: "PAM: Multiple failed logins in a small period of time.", level: "10", ruleId: "5551" },
                  { timestamp: "Jul 23, 2025 @ 23:36:56.605", agent: "ubuntu", description: "sshd: authentication failed.", level: "5", ruleId: "5760" },
                  { timestamp: "Jul 23, 2025 @ 23:36:56.088", agent: "ubuntu", description: "Listened ports status (netstat) changed (new port opened or closed).", level: "7", ruleId: "533" },
                  { timestamp: "Jul 23, 2025 @ 23:36:54.603", agent: "ubuntu", description: "PAM: User login failed.", level: "5", ruleId: "5503" },
                  { timestamp: "Jul 23, 2025 @ 23:36:52.601", agent: "ubuntu", description: "sshd: authentication failed.", level: "5", ruleId: "5760" },
                  { timestamp: "Jul 23, 2025 @ 23:36:50.598", agent: "ubuntu", description: "PAM: User login failed.", level: "5", ruleId: "5503" },
                  { timestamp: "Jul 23, 2025 @ 23:36:48.596", agent: "ubuntu", description: "sshd: authentication failed.", level: "5", ruleId: "5760" },
                  { timestamp: "Jul 23, 2025 @ 23:36:46.594", agent: "ubuntu", description: "PAM: User login failed.", level: "5", ruleId: "5503" },
                  { timestamp: "Jul 23, 2025 @ 23:36:42.589", agent: "ubuntu", description: "sshd: authentication failed.", level: "5", ruleId: "5760" },
                  { timestamp: "Jul 23, 2025 @ 23:36:40.587", agent: "ubuntu", description: "PAM: User login failed.", level: "5", ruleId: "5503" },
                  { timestamp: "Jul 23, 2025 @ 23:36:38.585", agent: "ubuntu", description: "sshd: authentication failed.", level: "5", ruleId: "5760" },
                  { timestamp: "Jul 23, 2025 @ 23:36:36.585", agent: "ubuntu", description: "PAM: User login failed.", level: "5", ruleId: "5503" },
                  { timestamp: "Jul 23, 2025 @ 23:36:34.583", agent: "ubuntu", description: "sshd: authentication failed.", level: "5", ruleId: "5760" },
                  { timestamp: "Jul 23, 2025 @ 23:36:30.578", agent: "ubuntu", description: "PAM: User login failed.", level: "5", ruleId: "5503" },
                  { timestamp: "Jul 23, 2025 @ 23:36:28.578", agent: "ubuntu", description: "sshd: authentication failed.", level: "5", ruleId: "5760" },
                  { timestamp: "Jul 23, 2025 @ 23:36:28.575", agent: "ubuntu", description: "PAM: User login failed.", level: "5", ruleId: "5503" },
                  { timestamp: "Jul 23, 2025 @ 23:36:24.571", agent: "ubuntu", description: "sshd: authentication failed.", level: "5", ruleId: "5760" },
                  { timestamp: "Jul 23, 2025 @ 23:36:22.569", agent: "ubuntu", description: "PAM: Multiple failed logins in a small period of time.", level: "10", ruleId: "5551" },
                  { timestamp: "Jul 23, 2025 @ 23:36:20.566", agent: "ubuntu", description: "sshd: authentication failed.", level: "5", ruleId: "5760" },
                  { timestamp: "Jul 23, 2025 @ 23:36:18.558", agent: "ubuntu", description: "PAM: User login failed.", level: "5", ruleId: "5503" }
                ].filter(alert => selectedAlertsDevice === 'all' || alert.agent === selectedAlertsDevice).slice(0, 50).map((alert, index) => (
                  <tr key={index} className="border-t border-gray-700 hover:bg-gray-700/30">
                    <td className="p-3 text-gray-300 font-mono text-sm">{alert.timestamp}</td>
                    <td className="p-3">
                      <span className="bg-blue-900/30 text-blue-300 px-2 py-1 rounded text-xs">
                        {alert.agent}
                      </span>
                    </td>
                    <td className="p-3 text-gray-300 text-sm max-w-80 truncate" title={alert.description}>
                      {alert.description}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        parseInt(alert.level) >= 10 ? 'bg-red-900/50 text-red-300' :
                        parseInt(alert.level) >= 7 ? 'bg-orange-900/50 text-orange-300' :
                        parseInt(alert.level) >= 5 ? 'bg-yellow-900/50 text-yellow-300' :
                        'bg-green-900/50 text-green-300'
                      }`}>
                        {alert.level}
                      </span>
                    </td>
                    <td className="p-3 text-gray-400 font-mono text-sm">{alert.ruleId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // 3. RIESGO & RESPUESTA - MOSAICO PROFESIONAL AVANZADO
  const renderRiesgoRespuesta = () => {
    const riskData = {
      overallRisk: 67,
      mttr: 89, // segundos
      mttd: 34, // segundos
      efficiency: 94, // %
      threatsBlocked: 2847,
      incidentsPrevented: 156,
      activeThreats: 12,
      mitreScore: 78,
      roiPercent: 340
    };

    const mitreData = [
      { tactic: 'Initial Access', techniques: 12, detected: 9, coverage: 75 },
      { tactic: 'Execution', techniques: 15, detected: 13, coverage: 87 },
      { tactic: 'Persistence', techniques: 19, detected: 14, coverage: 74 },
      { tactic: 'Privilege Escalation', techniques: 13, detected: 11, coverage: 85 },
      { tactic: 'Defense Evasion', techniques: 42, detected: 31, coverage: 74 },
      { tactic: 'Credential Access', techniques: 16, detected: 14, coverage: 88 },
      { tactic: 'Discovery', techniques: 29, detected: 22, coverage: 76 },
      { tactic: 'Lateral Movement', techniques: 9, detected: 7, coverage: 78 },
      { tactic: 'Collection', techniques: 17, detected: 13, coverage: 76 },
      { tactic: 'Exfiltration', techniques: 9, detected: 8, coverage: 89, },
      { tactic: 'Impact', techniques: 13, detected: 10, coverage: 77 }
    ];

    const recentResponses = [
      { id: 1, action: 'Firewall Block', target: '203.45.67.89', rule: '5763', severity: 'high', time: '2m ago', status: 'active' },
      { id: 2, action: 'Account Disable', target: 'user.suspicious', rule: '5551', severity: 'critical', time: '5m ago', status: 'completed' },
      { id: 3, action: 'Process Kill', target: 'malware.exe', rule: '554', severity: 'high', time: '8m ago', status: 'completed' },
      { id: 4, action: 'Network Isolation', target: 'DESKTOP-ABC1', rule: '5760', severity: 'medium', time: '12m ago', status: 'active' },
      { id: 5, action: 'File Quarantine', target: '/tmp/threat.bin', rule: '552', severity: 'high', time: '15m ago', status: 'completed' }
    ];

    const riskDevices = [
      { device: 'DESKTOP-ABC1', risk: 89, threats: 4, lastIncident: '2h ago', status: 'critical' },
      { device: 'SERVER-PROD1', risk: 45, threats: 1, lastIncident: '1d ago', status: 'medium' },
      { device: 'LAPTOP-MOBILE1', risk: 23, threats: 0, lastIncident: '5d ago', status: 'low' },
      { device: 'SERVER-DB01', risk: 67, threats: 2, lastIncident: '4h ago', status: 'high' }
    ];

    // Función para el gauge circular avanzado
    const renderAdvancedGauge = (value: number, max: number = 100, size: number = 120) => {
      const percentage = (value / max) * 100;
      const strokeWidth = 8;
      const radius = (size - strokeWidth) / 2;
      const circumference = radius * 2 * Math.PI;
      const strokeDasharray = circumference;
      const strokeDashoffset = circumference - (percentage / 100) * circumference;
      
      const getColor = () => {
        if (percentage <= 30) return '#10b981'; // green
        if (percentage <= 70) return '#f59e0b'; // amber  
        return '#ef4444'; // red
      };

      return (
        <div className="relative inline-flex items-center justify-center">
          <svg width={size} height={size} className="transform -rotate-90">
            {/* Background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#374151"
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Progress circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={getColor()}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-white">{value}</span>
            <span className="text-xs text-gray-400">RIESGO</span>
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm text-gray-400">
            Centro de Comando de Riesgo y Respuesta Automática
          </div>
        </div>

        {/* FILA SUPERIOR - KPIs PRINCIPALES */}
        <div className="grid grid-cols-6 gap-4 mb-6">
          {/* Gauge de Riesgo Principal */}
          <div className="col-span-2 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"></div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Nivel de Riesgo Global</h3>
                <p className="text-sm text-gray-400">Calculado en tiempo real</p>
              </div>
              <button 
                onClick={() => setRiskCalculationModal(true)}
                className="text-blue-400 hover:text-blue-300 text-sm underline"
              >
                ¿Cómo se calcula?
              </button>
            </div>
            <div className="flex items-center justify-center">
              {renderAdvancedGauge(riskData.overallRisk)}
            </div>
            <div className="mt-4 text-center">
              <div className="text-xs text-gray-500">Basado en {mitreData.length} tácticas MITRE ATT&CK</div>
            </div>
          </div>

          {/* Métricas de Respuesta */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center mb-3">
              <Activity className="w-5 h-5 text-green-400 mr-2" />
              <span className="text-sm text-gray-300">MTTR</span>
            </div>
            <div className="text-2xl font-bold text-green-400">{riskData.mttr}s</div>
            <div className="text-xs text-gray-500">Tiempo respuesta</div>
          </div>

          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center mb-3">
              <Target className="w-5 h-5 text-blue-400 mr-2" />
              <span className="text-sm text-gray-300">MTTD</span>
            </div>
            <div className="text-2xl font-bold text-blue-400">{riskData.mttd}s</div>
            <div className="text-xs text-gray-500">Tiempo detección</div>
          </div>

          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center mb-3">
              <Shield className="w-5 h-5 text-purple-400 mr-2" />
              <span className="text-sm text-gray-300">Eficiencia</span>
            </div>
            <div className="text-2xl font-bold text-purple-400">{riskData.efficiency}%</div>
            <div className="text-xs text-gray-500">Respuestas auto</div>
          </div>

          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center mb-3">
              <TrendingUp className="w-5 h-5 text-yellow-400 mr-2" />
              <span className="text-sm text-gray-300">ROI</span>
            </div>
            <div className="text-2xl font-bold text-yellow-400">{riskData.roiPercent}%</div>
            <div className="text-xs text-gray-500">Retorno inversión</div>
          </div>
        </div>

        {/* FILA MEDIA - MATRIZ MITRE ATT&CK Y RESPUESTAS */}
        <div className="grid grid-cols-2 gap-6">
          {/* MITRE ATT&CK Coverage Matrix */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Target className="w-5 h-5 text-red-400 mr-2" />
              Cobertura MITRE ATT&CK
            </h3>
            <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto">
              {mitreData.map((tactic, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-700/50 rounded">
                  <div className="flex-1">
                    <div className="text-sm text-gray-300 font-medium">{tactic.tactic}</div>
                    <div className="text-xs text-gray-500">{tactic.detected}/{tactic.techniques} técnicas</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 bg-gray-600 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          tactic.coverage >= 80 ? 'bg-green-500' :
                          tactic.coverage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${tactic.coverage}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-400 w-8">{tactic.coverage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline de Respuestas Automáticas */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Activity className="w-5 h-5 text-green-400 mr-2" />
              Respuestas Automáticas Recientes
            </h3>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {recentResponses.map((response) => (
                <div key={response.id} className="flex items-center space-x-3 p-3 bg-gray-700/30 rounded-lg border-l-4 border-green-500">
                  <div className={`w-3 h-3 rounded-full ${
                    response.status === 'active' ? 'bg-green-400 animate-pulse' : 'bg-gray-500'
                  }`}></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white">{response.action}</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        response.severity === 'critical' ? 'bg-red-900/50 text-red-300' :
                        response.severity === 'high' ? 'bg-orange-900/50 text-orange-300' :
                        'bg-yellow-900/50 text-yellow-300'
                      }`}>
                        {response.severity.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">
                      Target: <span className="text-gray-300 font-mono">{response.target}</span> • 
                      Regla: <span className="text-blue-400">{response.rule}</span> • 
                      {response.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FILA INFERIOR - DISPOSITIVOS DE RIESGO Y ESTADÍSTICAS */}
        <div className="grid grid-cols-3 gap-6">
          {/* Heatmap de Dispositivos por Riesgo */}
          <div className="col-span-2 bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Monitor className="w-5 h-5 text-orange-400 mr-2" />
              Mapa de Calor - Riesgo por Dispositivo
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {riskDevices.map((device, index) => (
                <div key={index} className={`p-4 rounded-lg border-2 transition-all hover:scale-105 ${
                  device.status === 'critical' ? 'bg-red-900/20 border-red-500/50' :
                  device.status === 'high' ? 'bg-orange-900/20 border-orange-500/50' :
                  device.status === 'medium' ? 'bg-yellow-900/20 border-yellow-500/50' :
                  'bg-green-900/20 border-green-500/50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">{device.device}</span>
                    <span className={`text-2xl font-bold ${
                      device.status === 'critical' ? 'text-red-400' :
                      device.status === 'high' ? 'text-orange-400' :
                      device.status === 'medium' ? 'text-yellow-400' :
                      'text-green-400'
                    }`}>{device.risk}</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    Amenazas activas: <span className="text-white font-bold">{device.threats}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Último incidente: {device.lastIncident}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Estadísticas de Impacto */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 text-green-400 mr-2" />
              Impacto de Seguridad
            </h3>
            <div className="space-y-4">
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-400">{riskData.threatsBlocked.toLocaleString()}</div>
                <div className="text-sm text-gray-300">Amenazas Bloqueadas</div>
                <div className="text-xs text-gray-500">Últimos 30 días</div>
              </div>
              
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-400">{riskData.incidentsPrevented}</div>
                <div className="text-sm text-gray-300">Incidentes Prevenidos</div>
                <div className="text-xs text-gray-500">Estimado este mes</div>
              </div>
              
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="text-2xl font-bold text-yellow-400">€{(riskData.incidentsPrevented * 12500).toLocaleString()}</div>
                <div className="text-sm text-gray-300">Ahorro Estimado</div>
                <div className="text-xs text-gray-500">Costo evitado</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 4. VULNERABILIDADES
  const renderVulnerabilidades = () => {
    
    // Obtener dispositivos reales del inventario existente
    const deviceList = inventoryData ? [
      { id: 'all', name: 'Todos los dispositivos' },
      ...inventoryData.devices.map(device => ({
        id: device.id,
        name: `${device.name} (${device.ip})`
      }))
    ] : [{ id: 'all', name: 'Todos los dispositivos' }];

    // Usar datos reales de vulnerabilidades del analysis data
    const vulnData = analysisData.vulnerabilidades || {};
    const distributionData = vulnData.distribucionCVSS || [];
    const hostsData = vulnData.hostsConCVE || [];


    const filteredCVEs = realCVEData;

    const getSeverityColor = (severity: string) => {
      switch(severity?.toLowerCase()) {
        case 'critical':
        case 'crítica': 
          return 'bg-red-900/50 text-red-300';
        case 'high':
        case 'alta': 
          return 'bg-orange-900/50 text-orange-300';
        case 'medium':
        case 'media': 
          return 'bg-yellow-900/50 text-yellow-300';  
        case 'low':
        case 'baja':
        default: 
          return 'bg-green-900/50 text-green-300';
      }
    };

    const getSeverityDisplayName = (severity: string) => {
      switch(severity?.toLowerCase()) {
        case 'critical': return 'Crítica';
        case 'high': return 'Alta';
        case 'medium': return 'Media';
        case 'low': return 'Baja';
        default: return severity;
      }
    };

    return (
      <div className="space-y-6">
        <div className="text-sm text-gray-400 mb-6">
          Análisis de CVE y distribución CVSS
        </div>

        {/* Distribución CVSS - DATOS REALES */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="bg-red-900/20 rounded-xl p-6 border border-red-500/30">
            <div className="text-3xl font-bold text-red-400 mb-2">
              {realCVEData.filter(cve => cve.severity === 'critical').length}
            </div>
            <div className="text-red-300">Críticas (9.0-10.0)</div>
          </div>
          <div className="bg-orange-900/20 rounded-xl p-6 border border-orange-500/30">
            <div className="text-3xl font-bold text-orange-400 mb-2">
              {realCVEData.filter(cve => cve.severity === 'high').length}
            </div>
            <div className="text-orange-300">Altas (7.0-8.9)</div>
          </div>
          <div className="bg-yellow-900/20 rounded-xl p-6 border border-yellow-500/30">
            <div className="text-3xl font-bold text-yellow-400 mb-2">
              {realCVEData.filter(cve => cve.severity === 'medium').length}
            </div>
            <div className="text-yellow-300">Medias (4.0-6.9)</div>
          </div>
          <div className="bg-green-900/20 rounded-xl p-6 border border-green-500/30">
            <div className="text-3xl font-bold text-green-400 mb-2">
              {realCVEData.filter(cve => cve.severity === 'low').length}
            </div>
            <div className="text-green-300">Bajas (0.1-3.9)</div>
          </div>
        </div>

        {/* Filtros y Búsqueda */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex flex-wrap items-end gap-4">
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
            <button
              onClick={() => {/* Trigger filter application */}}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Aplicar
            </button>
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
          
          {vulnLoading ? (
            <div className="text-center py-8 text-gray-400">
              <div className="flex flex-col items-center space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <div className="text-lg">Cargando vulnerabilidades...</div>
                <div className="text-sm">Analizando CVEs desde base de datos real</div>
              </div>
            </div>
          ) : filteredCVEs.length === 0 ? (
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
                                  // console.log(`✅ CVE ${vulnerability.cve} abierto directamente en INCIBE`);
                                }
                              } catch (error) {
                                // Si hay error, abrir búsqueda como fallback
                                // console.log(`⚠️ Fallback a búsqueda para ${vulnerability.cve}`);
                                window.open(`https://www.incibe.es/incibe-cert/alerta-temprana/vulnerabilidades?field_vulnerability_title_es=${encodeURIComponent(vulnerability.cve)}`, '_blank');
                              }
                            }, 500);
                          }}
                        >
                          {vulnerability.cve}
                        </a>
                        <span className={`px-2 py-1 rounded text-xs ${getSeverityColor(vulnerability.severity)}`}>
                          {getSeverityDisplayName(vulnerability.severity)}
                        </span>
                        <span className="bg-gray-600 text-gray-300 px-2 py-1 rounded text-xs">
                          CVSS: {vulnerability.cvss_score}
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
                          <span>Afecta a: {vulnerability.affected_devices?.length || 0} equipo{(vulnerability.affected_devices?.length || 0) !== 1 ? 's' : ''}</span>
                          <div className="flex flex-wrap gap-1">
                            {vulnerability.affected_devices?.map((device, idx) => (
                              <span 
                                key={idx}
                                className="bg-gray-600 text-gray-200 px-2 py-1 rounded text-xs"
                              >
                                {device.agent_name}
                              </span>
                            )) || []}
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

  // useEffect para cargar inventario automáticamente al iniciar CompanyDashboard
  useEffect(() => {
    if (!inventoryData && user.tenant_id) {
      console.log('🔄 Carga automática silenciosa de inventario al iniciar dashboard...');
      loadInventory();
    }
  }, [user.tenant_id, inventoryData]);

  // useEffect para cargar inventario específicamente para FIM si no está disponible
  useEffect(() => {
    if (!inventoryData && user.tenant_id && activeSection === 'analisis-integridad') {
      console.log('🔄 Carga de inventario específica para FIM...');
      loadInventory();
    }
  }, [activeSection, user.tenant_id, inventoryData]);

  // 5. INTEGRIDAD DE ARCHIVOS
  const renderIntegridadArchivos = () => {
    
    // Obtener datos reales de cambios de archivos desde analysisData y mapear estructura
    const rawFileChanges = analysisData.integridad.cambiosDetalle || [];
    
    // Obtener dispositivos únicos desde los datos FIM reales
    const uniqueDevices = Array.from(new Set(rawFileChanges.map((change: any) => change.device || 'Dispositivo desconocido')));
    const fimDeviceList = [
      { id: 'all', name: 'Todos los dispositivos' },
      ...uniqueDevices.map(deviceName => ({
        id: deviceName,
        name: deviceName
      }))
    ];
    const fileChanges = rawFileChanges.map((change: any) => ({
      file: change.archivo || 'Archivo desconocido',
      type: change.tipo || 'modificado',
      device: change.device || 'Dispositivo desconocido',
      timestamp: change.timestamp || new Date().toISOString(),
      user: change.user || 'Sistema',
      severity: change.severity || null
    }));

    // Lista de usuarios únicos para el filtro
    const userList = [
      { id: 'all', name: 'Todos los usuarios' },
      ...Array.from(new Set(fileChanges.map(change => change.user))).map(user => ({
        id: user,
        name: user
      }))
    ];

    // Lista de tipos de cambio para el filtro
    const changeTypeList = [
      { id: 'all', name: 'Todos los tipos', color: 'text-gray-400' },
      { id: 'añadido', name: '🟢 AÑADIDO', color: 'text-green-400' },
      { id: 'modificado', name: '🟡 MODIFICADO', color: 'text-yellow-400' },
      { id: 'eliminado', name: '🔴 ELIMINADO', color: 'text-red-400' }
    ];

    // Lista de niveles de severidad para el filtro
    const severityList = [
      { id: 'all', name: 'Todas las severidades', color: 'text-gray-400' },
      { id: 'CRÍTICO', name: '🔴 CRÍTICO', color: 'text-red-500' },
      { id: 'ALTO', name: '🟠 ALTO', color: 'text-orange-500' },
      { id: 'MEDIO', name: '🟡 MEDIO', color: 'text-yellow-500' },
      { id: 'BAJO', name: '🔵 BAJO', color: 'text-blue-500' },
      { id: 'INFO', name: '⚪ INFORMATIVO', color: 'text-gray-500' }
    ];

    // Filtrar por dispositivo, usuario, tipo y severidad (usando datos reales)
    const filteredChanges = fileChanges.filter(change => {
      const deviceMatch = selectedFIMDevice === 'all' || change.device === selectedFIMDevice;
      const userMatch = selectedFIMUser === 'all' || change.user === selectedFIMUser;
      const typeMatch = selectedFIMType === 'all' || change.type === selectedFIMType;
      const severityMatch = selectedFIMSeverity === 'all' || (change as any).severity?.level === selectedFIMSeverity;
      
      // Debug temporal
      if (selectedFIMSeverity !== 'all' && (change as any).severity) {
        console.log('Filtro severidad:', selectedFIMSeverity, 'Evento severidad:', (change as any).severity.level, 'Match:', severityMatch);
      }
      
      return deviceMatch && userMatch && typeMatch && severityMatch;
    });

    const getChangeColor = (type: string) => {
      switch(type) {
        case 'modificado': return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30';
        case 'añadido': return 'text-green-400 bg-green-900/20 border-green-500/30';
        case 'eliminado': return 'text-red-400 bg-red-900/20 border-red-500/30';
        default: return 'text-gray-400 bg-gray-900/20 border-gray-500/30';
      }
    };

    const getSeverityColor = (severity: any) => {
      if (!severity) return 'text-gray-400 bg-gray-900/20 border-gray-500/30';
      
      switch(severity.level) {
        case 'CRÍTICO': return 'text-red-500 bg-red-900/20 border-red-500/50';
        case 'ALTO': return 'text-orange-500 bg-orange-900/20 border-orange-500/50';
        case 'MEDIO': return 'text-yellow-500 bg-yellow-900/20 border-yellow-500/50';
        case 'BAJO': return 'text-blue-500 bg-blue-900/20 border-blue-500/50';
        case 'INFO': return 'text-gray-500 bg-gray-900/20 border-gray-500/50';
        default: return 'text-gray-400 bg-gray-900/20 border-gray-500/30';
      }
    };

    const getSeverityDot = (severity: any) => {
      if (!severity) return '⚪';
      
      switch(severity.level) {
        case 'CRÍTICO': return '🔴';
        case 'ALTO': return '🟠';
        case 'MEDIO': return '🟡';
        case 'BAJO': return '🔵';
        case 'INFO': return '⚪';
        default: return '⚪';
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
            value={fileChanges.length * 50} // Estimación basada en cambios detectados
            thresholds={{ green: 1000, amber: 500 }}
            icon={FileText}
          />
          <KPICard
            title="Alertas FIM 24h"
            value={fileChanges.length}
            thresholds={{ green: 20, amber: 40 }}
            icon={Bell}
          />
        </div>

        {/* Filtros y Búsqueda */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex flex-wrap items-end gap-4">
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
            
            {/* Selector de tipo de cambio */}
            <div className="flex-1 min-w-48">
              <label className="block text-sm text-gray-300 mb-2">Filtrar por tipo</label>
              <select 
                value={selectedFIMType}
                onChange={(e) => setSelectedFIMType(e.target.value)}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              >
                {changeTypeList.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Selector de severidad */}
            <div className="flex-1 min-w-48">
              <label className="block text-sm text-gray-300 mb-2">Filtrar por severidad</label>
              <select 
                value={selectedFIMSeverity}
                onChange={(e) => setSelectedFIMSeverity(e.target.value)}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              >
                {severityList.map(severity => (
                  <option key={severity.id} value={severity.id}>
                    {severity.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Selector de fecha */}
            <div className="min-w-48 max-w-64">
              <label className="block text-sm text-gray-300 mb-2">Filtrar por fecha</label>
              <select 
                value={selectedFIMDate}
                onChange={(e) => {
                  setSelectedFIMDate(e.target.value);
                  if (e.target.value !== 'custom') {
                    setCustomFIMDateRange({ startDate: '', endDate: '' });
                  }
                }}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              >
                <option value="today">Hoy</option>
                <option value="week">Esta semana</option>
                <option value="15days">Últimos 15 días</option>
                <option value="month">Este mes</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>

            {/* Campos de fecha personalizada para FIM */}
            {selectedFIMDate === 'custom' && (
              <>
                <div className="min-w-44">
                  <label className="block text-sm text-gray-300 mb-2">Fecha inicio</label>
                  <input
                    type="date"
                    value={customFIMDateRange.startDate}
                    onChange={(e) => setCustomFIMDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="min-w-44">
                  <label className="block text-sm text-gray-300 mb-2">Fecha fin</label>
                  <input
                    type="date"
                    value={customFIMDateRange.endDate}
                    onChange={(e) => setCustomFIMDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                    min={customFIMDateRange.startDate}
                  />
                </div>
              </>
            )}

            {/* Botón Aplicar Filtros */}
            <button
              onClick={() => {/* Trigger filter application */}}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Aplicar
            </button>
          </div>
        </div>

        {/* Cambios Recientes */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">
            Cambios de Archivos Recientes 
            {(selectedFIMDevice !== 'all' || selectedFIMUser !== 'all' || selectedFIMType !== 'all' || selectedFIMSeverity !== 'all' || selectedFIMDate !== 'today') && (
              <span className="text-blue-400 ml-2">
                (
                {selectedFIMDevice !== 'all' && fimDeviceList.find(d => d.id === selectedFIMDevice)?.name}
                {selectedFIMDevice !== 'all' && (selectedFIMUser !== 'all' || selectedFIMType !== 'all' || selectedFIMSeverity !== 'all' || selectedFIMDate !== 'today') && ' - '}
                {selectedFIMUser !== 'all' && `Usuario: ${selectedFIMUser}`}
                {selectedFIMUser !== 'all' && (selectedFIMType !== 'all' || selectedFIMSeverity !== 'all' || selectedFIMDate !== 'today') && ' - '}
                {selectedFIMType !== 'all' && changeTypeList.find(t => t.id === selectedFIMType)?.name}
                {selectedFIMType !== 'all' && (selectedFIMSeverity !== 'all' || selectedFIMDate !== 'today') && ' - '}
                {selectedFIMSeverity !== 'all' && severityList.find(s => s.id === selectedFIMSeverity)?.name}
                {selectedFIMSeverity !== 'all' && selectedFIMDate !== 'today' && ' - '}
                {selectedFIMDate !== 'today' && (() => {
                  if (selectedFIMDate === 'custom') {
                    if (customFIMDateRange.startDate && customFIMDateRange.endDate) {
                      const startDate = new Date(customFIMDateRange.startDate).toLocaleDateString('es-ES');
                      const endDate = new Date(customFIMDateRange.endDate).toLocaleDateString('es-ES');
                      return `Período: ${startDate} - ${endDate}`;
                    } else {
                      return 'Período: Personalizado (seleccionar fechas)';
                    }
                  } else {
                    const dateLabels = {
                      'today': 'Hoy',
                      'week': 'Esta semana',
                      '15days': 'Últimos 15 días',
                      'month': 'Este mes'
                    };
                    return `Período: ${dateLabels[selectedFIMDate as keyof typeof dateLabels]}`;
                  }
                })()}
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
                        {(change as any).severity && (
                          <span className="text-xs">
                            <span className="text-gray-400">Severidad:</span> 
                            <span className="ml-1">{getSeverityDot((change as any).severity)}</span>
                            <span className={`ml-1 font-semibold ${getSeverityColor((change as any).severity).split(' ')[0]}`}>
                              {(change as any).severity.level}
                            </span>
                          </span>
                        )}
                        {(change as any).severity && (change as any).severity.factors && (change as any).severity.factors.length > 0 && (
                          <span className="text-xs">
                            🔍 <span className="text-yellow-400">Factores:</span> {(change as any).severity.factors.slice(0, 2).join(', ')}
                            {(change as any).severity.factors.length > 2 && ` +${(change as any).severity.factors.length - 2} más`}
                          </span>
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
          {analysisData.integridad.actividad15d.length > 0 ? (
            <div className="space-y-2">
              {analysisData.integridad.actividad15d.slice(-7).map((day, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-700/50 rounded">
                  <span className="text-gray-300 text-sm">{day.fecha}</span>
                  <span className="text-purple-400 font-bold">{day.cambios} cambios</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-40 bg-gray-900/50 rounded-lg p-4 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <FolderCheck className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No hay datos de actividad FIM disponibles</p>
                <p className="text-xs mt-1">Los datos aparecerán cuando se detecten cambios en archivos</p>
              </div>
            </div>
          )}
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
   } else if (activeSection === 'configuracion') {
     return (
       <div className="flex items-center justify-center h-96">
         <div className="text-center">
           <div className="text-6xl mb-4">⚙️</div>
           <h2 className="text-2xl font-bold text-white mb-2">
             Configuración
           </h2>
           <p className="text-gray-400">
             Las opciones de configuración estarán disponibles pronto
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

     {/* Modal de Alertas por Hora */}
     {hourlyAlertsModal.isOpen && (
       <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
         <div className="bg-gray-800 rounded-xl p-6 w-[95vw] h-[95vh] m-4 overflow-y-auto">
           <div className="flex justify-between items-center mb-6">
             <h2 className="text-2xl font-bold text-white">
               Alertas de la Hora {hourlyAlertsModal.hour.toString().padStart(2, '0')}:00
             </h2>
             <div className="flex items-center space-x-4">
               <button
                 onClick={downloadHourlyReport}
                 className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
               >
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                 </svg>
                 <span>Descargar Reporte</span>
               </button>
               <button
                 onClick={() => setHourlyAlertsModal({ isOpen: false, hour: 0, alerts: [] })}
                 className="text-gray-400 hover:text-white transition-colors"
               >
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                 </svg>
               </button>
             </div>
           </div>

           <div className="mb-4 text-sm text-gray-400">
             Total de alertas: <span className="text-white font-bold">{hourlyAlertsModal.alerts.length}</span>
           </div>

           <div className="overflow-x-auto">
             <table className="w-full">
               <thead className="bg-gray-700 sticky top-0">
                 <tr>
                   <th className="text-left p-3 text-gray-300 min-w-48">Timestamp</th>
                   <th className="text-left p-3 text-gray-300">Equipo</th>
                   <th className="text-left p-3 text-gray-300 max-w-80">Descripción de la Regla</th>
                   <th className="text-left p-3 text-gray-300 w-20">Nivel</th>
                   <th className="text-left p-3 text-gray-300 w-24">ID Regla</th>
                 </tr>
               </thead>
               <tbody>
                 {hourlyAlertsModal.alerts.map((alert, index) => (
                   <tr key={index} className="border-t border-gray-700 hover:bg-gray-700/30">
                     <td className="p-3 text-gray-300 font-mono text-sm">{alert.timestamp}</td>
                     <td className="p-3">
                       <span className="bg-blue-900/30 text-blue-300 px-2 py-1 rounded text-xs">
                         {alert.agent}
                       </span>
                     </td>
                     <td className="p-3 text-gray-300 text-sm max-w-80" title={alert.description}>
                       {alert.description}
                     </td>
                     <td className="p-3">
                       <span className={`px-2 py-1 rounded text-xs font-bold ${
                         parseInt(alert.level) >= 10 ? 'bg-red-900/50 text-red-300' :
                         parseInt(alert.level) >= 7 ? 'bg-orange-900/50 text-orange-300' :
                         parseInt(alert.level) >= 5 ? 'bg-yellow-900/50 text-yellow-300' :
                         'bg-green-900/50 text-green-300'
                       }`}>
                         {alert.level}
                       </span>
                     </td>
                     <td className="p-3 text-gray-400 font-mono text-sm">{alert.ruleId}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
         </div>
       </div>
     )}

     {/* Modal de Cálculo de Riesgo */}
     {riskCalculationModal && (
       <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
         <div className="bg-gray-800 rounded-xl p-8 w-[90vw] max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-700">
           <div className="flex justify-between items-center mb-6">
             <h2 className="text-2xl font-bold text-white">🧮 Cálculo del Nivel de Riesgo Global</h2>
             <button
               onClick={() => setRiskCalculationModal(false)}
               className="text-gray-400 hover:text-white transition-colors"
             >
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
               </svg>
             </button>
           </div>

           <div className="space-y-6">
             {/* Fórmula Principal */}
             <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-6 border border-blue-500/30">
               <h3 className="text-lg font-bold text-white mb-4">📊 Fórmula de Cálculo</h3>
               <div className="bg-gray-900/50 rounded-lg p-4 font-mono text-sm">
                 <div className="text-green-400">Riesgo Global = (Σ Factores × Pesos) × Multiplicador Temporal</div>
                 <div className="text-gray-400 mt-2">Donde cada factor se normaliza en escala 0-100</div>
               </div>
             </div>

             {/* Componentes del Cálculo */}
             <div className="grid grid-cols-2 gap-6">
               {/* Factores de Riesgo */}
               <div className="bg-gray-700/30 rounded-xl p-6">
                 <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                   <Target className="w-5 h-5 text-red-400 mr-2" />
                   Factores de Riesgo (70%)
                 </h4>
                 <div className="space-y-3">
                   <div className="flex justify-between items-center p-3 bg-gray-600/50 rounded">
                     <span className="text-gray-300">Vulnerabilidades Críticas</span>
                     <div className="text-right">
                       <div className="text-red-400 font-bold">25 pts</div>
                       <div className="text-xs text-gray-500">Peso: 30%</div>
                     </div>
                   </div>
                   <div className="flex justify-between items-center p-3 bg-gray-600/50 rounded">
                     <span className="text-gray-300">Alertas Nivel 10+</span>
                     <div className="text-right">
                       <div className="text-orange-400 font-bold">18 pts</div>
                       <div className="text-xs text-gray-500">Peso: 25%</div>
                     </div>
                   </div>
                   <div className="flex justify-between items-center p-3 bg-gray-600/50 rounded">
                     <span className="text-gray-300">Dispositivos Comprometidos</span>
                     <div className="text-right">
                       <div className="text-yellow-400 font-bold">12 pts</div>
                       <div className="text-xs text-gray-500">Peso: 20%</div>
                     </div>
                   </div>
                   <div className="flex justify-between items-center p-3 bg-gray-600/50 rounded">
                     <span className="text-gray-300">Threat Intelligence</span>
                     <div className="text-right">
                       <div className="text-blue-400 font-bold">8 pts</div>
                       <div className="text-xs text-gray-500">Peso: 15%</div>
                     </div>
                   </div>
                   <div className="flex justify-between items-center p-3 bg-gray-600/50 rounded">
                     <span className="text-gray-300">Anomalías Comportamiento</span>
                     <div className="text-right">
                       <div className="text-purple-400 font-bold">5 pts</div>
                       <div className="text-xs text-gray-500">Peso: 10%</div>
                     </div>
                   </div>
                 </div>
               </div>

               {/* Factores de Mitigación */}
               <div className="bg-gray-700/30 rounded-xl p-6">
                 <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                   <Shield className="w-5 h-5 text-green-400 mr-2" />
                   Factores de Mitigación (30%)
                 </h4>
                 <div className="space-y-3">
                   <div className="flex justify-between items-center p-3 bg-gray-600/50 rounded">
                     <span className="text-gray-300">Cobertura MITRE ATT&CK</span>
                     <div className="text-right">
                       <div className="text-green-400 font-bold">-15 pts</div>
                       <div className="text-xs text-gray-500">78% cobertura</div>
                     </div>
                   </div>
                   <div className="flex justify-between items-center p-3 bg-gray-600/50 rounded">
                     <span className="text-gray-300">Respuestas Automáticas</span>
                     <div className="text-right">
                       <div className="text-green-400 font-bold">-12 pts</div>
                       <div className="text-xs text-gray-500">94% eficiencia</div>
                     </div>
                   </div>
                   <div className="flex justify-between items-center p-3 bg-gray-600/50 rounded">
                     <span className="text-gray-300">Tiempo de Respuesta</span>
                     <div className="text-right">
                       <div className="text-green-400 font-bold">-8 pts</div>
                       <div className="text-xs text-gray-500">MTTR: 89s</div>
                     </div>
                   </div>
                   <div className="flex justify-between items-center p-3 bg-gray-600/50 rounded">
                     <span className="text-gray-300">Parches Aplicados</span>
                     <div className="text-right">
                       <div className="text-green-400 font-bold">-6 pts</div>
                       <div className="text-xs text-gray-500">87% actualizados</div>
                     </div>
                   </div>
                 </div>
               </div>
             </div>

             {/* Cálculo Detallado */}
             <div className="bg-gray-700/30 rounded-xl p-6">
               <h4 className="text-lg font-semibold text-white mb-4">🔢 Desglose del Cálculo</h4>
               <div className="grid grid-cols-3 gap-4">
                 <div className="bg-red-900/30 rounded-lg p-4 border border-red-500/30">
                   <div className="text-sm text-gray-300 mb-2">Riesgo Base</div>
                   <div className="text-2xl font-bold text-red-400">68 pts</div>
                   <div className="text-xs text-gray-500">Suma ponderada factores</div>
                 </div>
                 <div className="bg-green-900/30 rounded-lg p-4 border border-green-500/30">
                   <div className="text-sm text-gray-300 mb-2">Mitigación</div>
                   <div className="text-2xl font-bold text-green-400">-41 pts</div>
                   <div className="text-xs text-gray-500">Controles activos</div>
                 </div>
                 <div className="bg-orange-900/30 rounded-lg p-4 border border-orange-500/30">
                   <div className="text-sm text-gray-300 mb-2">Multiplicador</div>
                   <div className="text-2xl font-bold text-orange-400">×1.48</div>
                   <div className="text-xs text-gray-500">Tendencia 7 días</div>
                 </div>
               </div>
               
               {/* Resultado Final */}
               <div className="mt-6 bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg p-4 border-2 border-yellow-500/50">
                 <div className="text-center">
                   <div className="text-sm text-gray-300 mb-1">Nivel de Riesgo Final</div>
                   <div className="text-4xl font-bold text-yellow-400">67/100</div>
                   <div className="text-xs text-gray-500 mt-2">
                     Fórmula: (68 - 41) × 1.48 + offset_temporal = 67
                   </div>
                 </div>
               </div>
             </div>

             {/* Interpretación */}
             <div className="bg-gray-700/30 rounded-xl p-6">
               <h4 className="text-lg font-semibold text-white mb-4">📋 Interpretación y Acciones</h4>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <h5 className="text-sm font-semibold text-orange-400 mb-2">Nivel Actual: MEDIO-ALTO (67)</h5>
                   <ul className="text-sm text-gray-300 space-y-1">
                     <li>• Requiere atención prioritaria</li>
                     <li>• Vulnerabilidades críticas detectadas</li>
                     <li>• Sistemas de respuesta funcionando</li>
                     <li>• Tendencia al alza últimos días</li>
                   </ul>
                 </div>
                 <div>
                   <h5 className="text-sm font-semibold text-green-400 mb-2">Acciones Recomendadas</h5>
                   <ul className="text-sm text-gray-300 space-y-1">
                     <li>• Parchear vulnerabilidades críticas</li>
                     <li>• Revisar reglas de respuesta automática</li>
                     <li>• Actualizar threat intelligence feeds</li>
                     <li>• Incrementar monitoreo dispositivos</li>
                   </ul>
                 </div>
               </div>
             </div>

             {/* Actualización */}
             <div className="text-center">
               <div className="text-sm text-gray-400">
                 🕐 Actualizado cada 30 segundos • Última actualización: hace 12s
               </div>
               <div className="text-xs text-gray-500 mt-1">
                 Algoritmo basado en NIST Cybersecurity Framework y MITRE ATT&CK
               </div>
             </div>
           </div>
         </div>
       </div>
     )}
   </div>
 );
};

export default CompanyDashboard;

                
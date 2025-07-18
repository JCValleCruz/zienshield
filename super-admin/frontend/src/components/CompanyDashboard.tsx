import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, Clock, TrendingUp, Users, FileText, Monitor, BarChart3, Settings, Home, LogOut } from 'lucide-react';

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

const CompanyDashboard: React.FC<CompanyDashboardProps> = ({ user, onLogout }) => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);

  // Configuración del sector basada en los datos del usuario
  const getSectorConfig = (sector: string) => {
    const configs = {
      'TELECOM': {
        label: 'Telecomunicaciones',
        icon: '📡',
        criticalChecks: ['network_security', 'data_protection', 'service_availability'],
        color: 'text-blue-400',
        complianceLabel: 'Cumplimiento RGPD + Telecom'
      },
      'LEGAL': {
        label: 'Legal',
        icon: '⚖️',
        criticalChecks: ['client_confidentiality', 'document_encryption', 'legal_retention'],
        color: 'text-purple-400',
        complianceLabel: 'Cumplimiento RGPD Legal'
      },
      'HEALTH': {
        label: 'Sanitario',
        icon: '🏥',
        criticalChecks: ['patient_data_encryption', 'gdpr_health_compliance', 'backup_patient_data'],
        color: 'text-green-400',
        complianceLabel: 'Cumplimiento RGPD Sanitario'
      },
      'RETAIL': {
        label: 'Retail',
        icon: '🛒',
        criticalChecks: ['payment_security', 'pci_compliance', 'customer_data_protection'],
        color: 'text-yellow-400',
        complianceLabel: 'Cumplimiento PCI-DSS'
      },
      'FINANCE': {
        label: 'Finanzas',
        icon: '💰',
        criticalChecks: ['financial_data_protection', 'audit_compliance', 'transaction_security'],
        color: 'text-emerald-400',
        complianceLabel: 'Cumplimiento Financiero'
      },
      'TECH': {
        label: 'Tecnología',
        icon: '💻',
        criticalChecks: ['source_code_protection', 'ip_security', 'development_security'],
        color: 'text-cyan-400',
        complianceLabel: 'Cumplimiento ISO 27001'
      },
      'DEFAULT': {
        label: 'General',
        icon: '🛡️',
        criticalChecks: ['basic_security', 'access_control', 'data_backup'],
        color: 'text-gray-400',
        complianceLabel: 'Cumplimiento ISO 27001'
      }
    };
    return configs[sector as keyof typeof configs] || configs.DEFAULT;
  };

  const currentSector = getSectorConfig(user.sector || 'DEFAULT');

  // Datos simulados que se integrarán con Wazuh API
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
      critical: 6,
      high: 278,
      medium: 493,
      low: 39
    },
    devices: [
      { name: 'SERVIDOR-PRINCIPAL', ip: '192.168.1.100', os: 'Ubuntu 22.04 LTS' },
      { name: 'PC-ADMINISTRACION', ip: '192.168.1.101', os: 'Windows 11 Pro' },
      { name: 'PC-VENTAS', ip: '192.168.1.102', os: 'Windows 10 Pro' },
      { name: 'PC-SOPORTE', ip: '192.168.1.103', os: 'Windows 10 Pro' }
    ]
  });

  // Simular carga de datos
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      // Aquí se integrará con Wazuh API
      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
    };
    loadData();
  }, []);

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

  // Menú lateral
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'dispositivos', label: 'Dispositivos', icon: Monitor },
    { id: 'analisis', label: 'Análisis', icon: BarChart3 },
    { id: 'reportes', label: 'Reportes', icon: FileText },
    { id: 'configuracion', label: 'Configuración', icon: Settings }
  ];

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
                ↓ 15% vs. ayer
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
                {Math.round((dashboardData.connectedDevices / dashboardData.totalDevices) * 100)}% cobertura
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
                ↑ 5% este mes
              </div>
            </div>
          </div>

          {/* Desglose de Vulnerabilidades CVE */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 mb-8">
            <div className="grid grid-cols-4 divide-x divide-gray-700">
              <div className="p-6 text-center">
                <div className="text-4xl font-bold text-red-400 mb-2">
                  {dashboardData.vulnerabilities.critical}
                </div>
                <div className="text-gray-300 text-lg">Critical - Severity</div>
              </div>
              <div className="p-6 text-center">
                <div className="text-4xl font-bold text-orange-400 mb-2">
                  {dashboardData.vulnerabilities.high}
                </div>
                <div className="text-gray-300 text-lg">High - Severity</div>
              </div>
              <div className="p-6 text-center">
                <div className="text-4xl font-bold text-blue-400 mb-2">
                  {dashboardData.vulnerabilities.medium}
                </div>
                <div className="text-gray-300 text-lg">Medium - Severity</div>
              </div>
              <div className="p-6 text-center">
                <div className="text-4xl font-bold text-green-400 mb-2">
                  {dashboardData.vulnerabilities.low}
                </div>
                <div className="text-gray-300 text-lg">Low - Severity</div>
              </div>
            </div>
          </div>

          {/* Últimos Dispositivos Conectados */}
          <div className="grid grid-cols-4 gap-6 mb-8">
            {dashboardData.devices.map((device, index) => (
              <div key={index} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <Monitor className="w-8 h-8 text-blue-400" />
                </div>
                <div className="text-xl font-bold text-white mb-2">
                  {device.name}
                </div>
                <div className="text-gray-300 text-sm mb-1">IP: {device.ip}</div>
                <div className="text-gray-300 text-sm">{device.os}</div>
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
                <button className="w-full bg-blue-600 text-white p-6 rounded-xl text-left hover:bg-blue-700 transition-colors">
                  <TrendingUp className="w-8 h-8 mb-3" />
                  <h4 className="font-bold text-lg mb-2">Ver Reporte Semanal</h4>
                  <p className="opacity-90">Reporte completo para tu seguro</p>
                </button>
                
                <button className="w-full bg-green-600 text-white p-6 rounded-xl text-left hover:bg-green-700 transition-colors">
                  <Users className="w-8 h-8 mb-3" />
                  <h4 className="font-bold text-lg mb-2">Inventario de Dispositivos</h4>
                  <p className="opacity-90">Gestionar equipos protegidos</p>
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
    } else {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-6xl mb-4">🚧</div>
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
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center px-4 py-3 rounded-lg text-left transition-colors ${
                    activeSection === item.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700">
          <div className="text-sm text-gray-400 mb-4">
            <p>{user.company_name}</p>
            <p>Sector: {currentSector.icon} {currentSector.label}</p>
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
                {menuItems.find(item => item.id === activeSection)?.label || 'Dashboard'}
              </h1>
              <p className="text-gray-400">
                {user.company_name} • {user.email}
              </p>
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
    </div>
  );
};

export default CompanyDashboard;

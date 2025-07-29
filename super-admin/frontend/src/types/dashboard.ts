export interface User {
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

export interface CompanyDashboardProps {
  user: User;
  onLogout: () => void;
}

export interface Device {
  id: string;
  name: string;
  ip: string;
  os: string | { name?: string; platform?: string; version?: string; build?: string; major?: string; minor?: string; uname?: string; };
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

export interface InventoryDevice {
  id: string;
  name: string;
  ip: string;
  os: string | { name?: string; platform?: string; version?: string; build?: string; major?: string; minor?: string; uname?: string; };
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

export interface InventoryStats {
  total: number;
  active: number;
  disconnected: number;
  pending: number;
  critical_vulnerabilities: number;
  high_vulnerabilities: number;
}

export interface InventoryData {
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

export interface MenuItem {
  id: string;
  label: string;
  icon: any;
  submenu?: MenuItem[];
}

export interface VulnerabilityData {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface AnalysisData {
  resumen: {
    totalAlertas24h: number;
    maxSeveridad: number;
    cvesCriticas: number;
    accionesAutomaticas: number;
    evolucionAlertas: { date: string; count: number; }[];
    distribucionSeveridad: { name: string; value: number; }[];
    alertasHoy: number;
    alertasAyer: number;
    tendenciaAlertas: number;
    topThreatCountries: { country: string; count: number; }[];
    topAttackTypes: { type: string; count: number; }[];
    dispositivosComprometidos: number;
    dispositivosTotal: number;
    vulnerabilidadesCriticas: number;
    vulnerabilidadesAltas: number;
    cambiosArchivos24h: number;
    reglasMasActivas: { name: string; disparos: number; }[];
    tiempoRespuestaPromedio: number;
    eficienciaDeteccion: number;
    scoreSeguridad: number;
  };
  vulnerabilidades: {
    distribucionCVSS: { score: string; count: number; }[];
    hostsConCVE: { host: string; cves: number; criticidad: string; }[];
    tendenciaVulns: { fecha: string; count: number; }[];
  };
}

export interface DashboardFilters {
  page: number;
  limit: number;
  search: string;
  sortBy: string;
  sortOrder: string;
  status: string;
}

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type DeviceStatus = 'active' | 'disconnected' | 'pending';
export type SectionId = 'dashboard' | 'dispositivos-inventario' | 'dispositivos-agregar' | 'analisis-resumen' | 'analisis-alertas' | 'analisis-riesgo' | 'analisis-vulnerabilidades' | 'analisis-integridad' | 'analisis-equipos' | 'analisis-seguridad-windows' | 'red-mapa' | 'red-trafico' | 'red-monitoreo' | 'reportes' | 'configuracion';
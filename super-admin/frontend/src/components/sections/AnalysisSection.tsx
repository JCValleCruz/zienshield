import React, { useState, useEffect } from 'react';
import { BarChart3, Shield, Bell, Monitor, AlertTriangle, TrendingUp, Users, Clock, Target, Bug, FileText, FolderCheck } from 'lucide-react';
import EquipmentMonitoring from '../EquipmentMonitoring';
import WindowsSecurityStatus from '../WindowsSecurityStatus';
import { User, AnalysisData, InventoryData } from '../../types/dashboard';

// Interface para datos de vulnerabilidades
interface VulnerabilityData {
  cve: string;
  severity: string;
  cvss_score: number;
  description: string;
  affected_devices?: {
    agent_id: string;
    agent_name: string;
    package_name: string;
    package_version: string;
  }[];
  first_detected: string;
  // Datos enriquecidos de CVE Services
  enriched_data?: {
    affected_products?: {
      vendor: string;
      product: string;
      versions: string[];
      platforms?: string[];
    }[];
    references?: {
      url: string;
      source: string;
      tags?: string[];
    }[];
    cwe_ids?: string[];
    cvss_vector?: string;
    published_date?: string;
    last_modified?: string;
    assignee_org?: string;
  };
}

interface AnalysisSectionProps {
  activeSection: string;
  analysisData: AnalysisData;
  analysisLoading: boolean;
  dataTransition: boolean;
  selectedVulnDevice: string;
  setSelectedVulnDevice: (device: string) => void;
  inventoryData: InventoryData | null;
  user: User;
}

const AnalysisSection: React.FC<AnalysisSectionProps> = ({
  activeSection,
  analysisData,
  analysisLoading,
  dataTransition,
  selectedVulnDevice,
  setSelectedVulnDevice,
  inventoryData,
  user
}) => {
  
  // Estados para vulnerabilidades
  const [realCVEData, setRealCVEData] = useState<VulnerabilityData[]>([]);
  const [vulnLoading, setVulnLoading] = useState(false);
  const [enrichmentCache, setEnrichmentCache] = useState<Map<string, any>>(new Map());

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
          const cves = result.data.cves || [];
          setRealCVEData(cves);
          
          // Enriquecer datos CVE de forma asíncrona (no bloquear UI)
          enrichCVEsAsync(cves);
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

  // Función para enriquecer datos CVE con CVE Services API
  const enrichCVEData = async (cveId: string) => {
    // Verificar cache primero
    if (enrichmentCache.has(cveId)) {
      return enrichmentCache.get(cveId);
    }

    try {
      // Llamar a CVE Services API
      const response = await fetch(`https://cveawg.mitre.org/api/cve/${cveId}`);
      
      if (response.ok) {
        const cveRecord = await response.json();
        
        // Extraer información relevante del registro CVE
        const enrichedData = {
          affected_products: extractAffectedProducts(cveRecord),
          references: extractReferences(cveRecord),
          cwe_ids: extractCWEIds(cveRecord),
          cvss_vector: extractCVSSVector(cveRecord),
          published_date: cveRecord.cveMetadata?.datePublished,
          last_modified: cveRecord.cveMetadata?.dateUpdated,
          assignee_org: cveRecord.cveMetadata?.assignerOrgId
        };

        // Guardar en cache
        setEnrichmentCache(prev => new Map(prev.set(cveId, enrichedData)));
        
        return enrichedData;
      }
    } catch (error) {
      console.error(`Error enriqueciendo CVE ${cveId}:`, error);
    }
    
    return null;
  };

  // Funciones auxiliares para extraer datos del CVE Record
  const extractAffectedProducts = (cveRecord: any) => {
    const products: any[] = [];
    
    try {
      const containers = cveRecord.containers?.cna?.affected || [];
      
      containers.forEach((affected: any) => {
        if (affected.vendor && affected.product) {
          products.push({
            vendor: affected.vendor,
            product: affected.product,
            versions: affected.versions?.map((v: any) => v.version) || [],
            platforms: affected.platforms || []
          });
        }
      });
    } catch (error) {
      console.error('Error extrayendo productos afectados:', error);
    }
    
    return products;
  };

  const extractReferences = (cveRecord: any) => {
    try {
      return cveRecord.containers?.cna?.references?.map((ref: any) => ({
        url: ref.url,
        source: ref.source || 'Unknown',
        tags: ref.tags || []
      })) || [];
    } catch (error) {
      return [];
    }
  };

  const extractCWEIds = (cveRecord: any) => {
    try {
      const problemTypes = cveRecord.containers?.cna?.problemTypes || [];
      const cweIds: string[] = [];
      
      problemTypes.forEach((pt: any) => {
        pt.descriptions?.forEach((desc: any) => {
          if (desc.cweId) {
            cweIds.push(desc.cweId);
          }
        });
      });
      
      return cweIds;
    } catch (error) {
      return [];
    }
  };

  const extractCVSSVector = (cveRecord: any) => {
    try {
      const metrics = cveRecord.containers?.cna?.metrics || [];
      for (const metric of metrics) {
        if (metric.cvssV3_1?.vectorString) {
          return metric.cvssV3_1.vectorString;
        } else if (metric.cvssV3_0?.vectorString) {
          return metric.cvssV3_0.vectorString;
        }
      }
    } catch (error) {
      return undefined;
    }
  };

  // Función para enriquecer CVEs de forma asíncrona
  const enrichCVEsAsync = async (cves: VulnerabilityData[]) => {
    // Procesar en lotes pequeños para no sobrecargar la API
    const batchSize = 3;
    const batches = [];
    
    for (let i = 0; i < cves.length; i += batchSize) {
      batches.push(cves.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      // Procesar cada lote con un pequeño delay
      const enrichmentPromises = batch.map(async (cve) => {
        const enrichedData = await enrichCVEData(cve.cve);
        
        if (enrichedData) {
          // Actualizar el CVE específico con datos enriquecidos
          setRealCVEData(prev => 
            prev.map(prevCve => 
              prevCve.cve === cve.cve 
                ? { ...prevCve, enriched_data: enrichedData }
                : prevCve
            )
          );
        }
      });

      // Esperar que termine el lote actual
      await Promise.all(enrichmentPromises);
      
      // Pequeño delay entre lotes para ser respetuosos con la API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  // useEffect para cargar vulnerabilidades cuando sea necesario
  useEffect(() => {
    if (activeSection === 'analisis-vulnerabilidades' && user.tenant_id) {
      loadRealVulnerabilityData();
    }
  }, [activeSection, user.tenant_id, selectedVulnDevice]);

  // Placeholder para las funciones render que moveremos desde CompanyDashboard
  const renderResumenEjecutivo = () => {
    return <div>Resumen Ejecutivo - Por implementar</div>;
  };

  const renderAlertasEventos = () => {
    return <div>Alertas y Eventos - Por implementar</div>;
  };

  const renderRiesgoRespuesta = () => {
    return <div>Riesgo y Respuesta - Por implementar</div>;
  };

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

    // Filtrar CVEs por dispositivo seleccionado
    const filteredCVEs = realCVEData.filter(cve => {
      if (selectedVulnDevice === 'all') return true;
      return cve.affected_devices?.some(device => device.agent_id === selectedVulnDevice);
    });

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
        <div className="space-y-6 mb-8">
          {/* CVEs Únicos */}
          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-3">CVEs Únicos Detectados</h4>
            <div className="grid grid-cols-4 gap-6">
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
          </div>

          {/* Total de Instancias por Equipos */}
          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-3">Total de Instancias de Vulnerabilidades por Equipos</h4>
            <div className="grid grid-cols-4 gap-6">
              <div className="bg-red-900/20 rounded-xl p-6 border border-red-500/30">
                <div className="text-3xl font-bold text-red-400 mb-2">
                  {inventoryData?.devices.reduce((sum, device) => sum + (device.vulnerabilities?.critical || 0), 0) || 0}
                </div>
                <div className="text-red-300">Críticas (9.0-10.0)</div>
              </div>
              <div className="bg-orange-900/20 rounded-xl p-6 border border-orange-500/30">
                <div className="text-3xl font-bold text-orange-400 mb-2">
                  {inventoryData?.devices.reduce((sum, device) => sum + (device.vulnerabilities?.high || 0), 0) || 0}
                </div>
                <div className="text-orange-300">Altas (7.0-8.9)</div>
              </div>
              <div className="bg-yellow-900/20 rounded-xl p-6 border border-yellow-500/30">
                <div className="text-3xl font-bold text-yellow-400 mb-2">
                  {inventoryData?.devices.reduce((sum, device) => sum + (device.vulnerabilities?.medium || 0), 0) || 0}
                </div>
                <div className="text-yellow-300">Medias (4.0-6.9)</div>
              </div>
              <div className="bg-green-900/20 rounded-xl p-6 border border-green-500/30">
                <div className="text-3xl font-bold text-green-400 mb-2">
                  {inventoryData?.devices.reduce((sum, device) => sum + (device.vulnerabilities?.low || 0), 0) || 0}
                </div>
                <div className="text-green-300">Bajas (0.1-3.9)</div>
              </div>
            </div>
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
              onClick={loadRealVulnerabilityData}
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

                      {/* Datos enriquecidos de CVE Services */}
                      {vulnerability.enriched_data && (
                        <div className="mt-4 space-y-3">
                          {/* Productos afectados */}
                          {vulnerability.enriched_data.affected_products && vulnerability.enriched_data.affected_products.length > 0 && (
                            <div className="bg-gray-800/50 rounded-lg p-3">
                              <h5 className="text-yellow-400 font-semibold text-sm mb-2">🎯 Software Afectado:</h5>
                              <div className="space-y-2">
                                {vulnerability.enriched_data.affected_products.map((product, idx) => (
                                  <div key={idx} className="text-xs">
                                    <span className="text-blue-300 font-medium">{product.vendor}</span>
                                    <span className="text-gray-300 mx-1">→</span>
                                    <span className="text-white">{product.product}</span>
                                    {product.versions.length > 0 && (
                                      <div className="ml-2 mt-1">
                                        <span className="text-gray-400">Versiones: </span>
                                        <span className="text-orange-300 text-xs">{product.versions.slice(0, 3).join(', ')}</span>
                                        {product.versions.length > 3 && <span className="text-gray-500"> +{product.versions.length - 3} más</span>}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* CWE IDs */}
                          {vulnerability.enriched_data.cwe_ids && vulnerability.enriched_data.cwe_ids.length > 0 && (
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-400 text-xs">🔍 CWE:</span>
                              {vulnerability.enriched_data.cwe_ids.map((cwe, idx) => (
                                <a 
                                  key={idx}
                                  href={`https://cwe.mitre.org/data/definitions/${cwe.replace('CWE-', '')}.html`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-purple-900/30 text-purple-300 px-2 py-1 rounded text-xs hover:bg-purple-800/50 transition-colors"
                                >
                                  {cwe}
                                </a>
                              ))}
                            </div>
                          )}

                          {/* Vector CVSS */}
                          {vulnerability.enriched_data.cvss_vector && (
                            <div className="bg-red-900/20 rounded p-2">
                              <span className="text-red-400 text-xs font-medium">⚡ CVSS Vector: </span>
                              <code className="text-red-300 text-xs font-mono">{vulnerability.enriched_data.cvss_vector}</code>
                            </div>
                          )}

                          {/* Fechas */}
                          {(vulnerability.enriched_data.published_date || vulnerability.enriched_data.last_modified) && (
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              {vulnerability.enriched_data.published_date && (
                                <span>📅 Publicado: {new Date(vulnerability.enriched_data.published_date).toLocaleDateString('es-ES')}</span>
                              )}
                              {vulnerability.enriched_data.assignee_org && (
                                <span>🏢 Asignado por: {vulnerability.enriched_data.assignee_org}</span>
                              )}
                            </div>
                          )}

                          {/* Referencias */}
                          {vulnerability.enriched_data.references && vulnerability.enriched_data.references.length > 0 && (
                            <div className="bg-blue-900/20 rounded-lg p-3">
                              <h5 className="text-blue-400 font-semibold text-sm mb-2">🔗 Referencias:</h5>
                              <div className="space-y-1 max-h-20 overflow-y-auto">
                                {vulnerability.enriched_data.references.slice(0, 3).map((ref, idx) => (
                                  <div key={idx} className="text-xs">
                                    <a 
                                      href={ref.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-300 hover:text-blue-200 underline break-all"
                                    >
                                      {ref.url.length > 50 ? `${ref.url.substring(0, 50)}...` : ref.url}
                                    </a>
                                    {ref.source && (
                                      <span className="text-gray-500 ml-2">({ref.source})</span>
                                    )}
                                  </div>
                                ))}
                                {vulnerability.enriched_data.references.length > 3 && (
                                  <div className="text-xs text-gray-500">
                                    +{vulnerability.enriched_data.references.length - 3} referencias más
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Indicador de carga para enriquecimiento */}
                      {!vulnerability.enriched_data && (
                        <div className="mt-2 text-xs text-gray-500 flex items-center">
                          <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-400 mr-2"></div>
                          Cargando información detallada...
                        </div>
                      )}
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

  const renderIntegridadArchivos = () => {
    return <div>Integridad de Archivos - Por implementar</div>;
  };

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
    case 'analisis-seguridad-windows':
      return <WindowsSecurityStatus tenantId={user.tenant_id || ''} />;
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

export default AnalysisSection;
import React, { useState } from 'react';
import { FolderCheck, Users, FileText } from 'lucide-react';
import { InventoryData } from '../../types/dashboard';

interface FileChange {
  file: string;
  type: string;
  device: string;
  timestamp: string;
  user: string;
  severity?: {
    level: string;
    factors?: string[];
  } | null;
}

interface IntegridadData {
  cambiosCriticos: number;
  cambiosDetalle: any[];
  actividad15d: { fecha: string; cambios: number }[];
}

interface IntegridadArchivosSectionProps {
  analysisData: {
    integridad: IntegridadData;
  };
  inventoryData: InventoryData | null;
  inventoryLoading: boolean;
  analysisLoading: boolean;
}

const IntegridadArchivosSection: React.FC<IntegridadArchivosSectionProps> = ({
  analysisData,
  inventoryData,
  inventoryLoading,
  analysisLoading
}) => {
  // Estados para filtros FIM
  const [selectedFIMDevice, setSelectedFIMDevice] = useState('all');
  const [selectedFIMUser, setSelectedFIMUser] = useState('all');
  const [selectedFIMType, setSelectedFIMType] = useState('all');
  const [selectedFIMSeverity, setSelectedFIMSeverity] = useState('all');
  const [selectedFIMDate, setSelectedFIMDate] = useState('today');
  const [customFIMDateRange, setCustomFIMDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  // Obtener datos reales de cambios de archivos desde analysisData y mapear estructura
  // Verificar si tenemos datos de integridad
  
  const rawFileChanges = analysisData.integridad.cambiosDetalle || [];
  const hasData = rawFileChanges.length > 0;
  
  // SOLUCIÓN: Usar inventoryData como caché persistente de dispositivos enrolados
  // Si inventoryData está disponible, usar esos dispositivos; sino, usar los únicos de FIM
  const fimDeviceList = inventoryData ? [
    { id: 'all', name: 'Todos los dispositivos' },
    ...inventoryData.devices.map(device => ({
      id: device.name || device.id,
      name: `${device.name} (${device.ip})`
    }))
  ] : [
    { id: 'all', name: 'Todos los dispositivos' },
    ...Array.from(new Set(rawFileChanges.map((change: any) => change.device || 'Dispositivo desconocido'))).map(deviceName => ({
      id: deviceName,
      name: deviceName
    }))
  ];

  const fileChanges: FileChange[] = rawFileChanges.map((change: any) => ({
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
    const severityMatch = selectedFIMSeverity === 'all' || change.severity?.level === selectedFIMSeverity;
    
    return deviceMatch && userMatch && typeMatch && severityMatch;
  });

  // Cambios filtrados listos para mostrar

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

  // Mostrar mensaje de carga si no hay inventario disponible
  if (!inventoryData && inventoryLoading) {
    return (
      <div className="text-center py-12">
        <FolderCheck className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Cargando dispositivos enrolados</h3>
        <p className="text-gray-400 mb-6">Obteniendo caché de dispositivos para FIM...</p>
        <div className="flex items-center justify-center space-x-2 text-blue-400">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
          <span className="text-sm">Cargando...</span>
        </div>
      </div>
    );
  }

  // Mostrar loading state si analysis está cargando
  if (analysisLoading) {
    return (
      <div className="space-y-6">
        <div className="text-sm text-gray-400 mb-6">
          Monitoreo FIM (File Integrity Monitoring)
        </div>
        
        {/* Loading state con skeleton */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="animate-pulse bg-gray-600 h-8 w-8 rounded"></div>
                <div className="animate-pulse bg-gray-600 h-4 w-16 rounded"></div>
              </div>
              <div className="animate-pulse bg-gray-600 h-8 w-12 rounded mb-2"></div>
              <div className="animate-pulse bg-gray-600 h-4 w-24 rounded mb-2"></div>
              <div className="animate-pulse bg-gray-600 h-3 w-20 rounded"></div>
            </div>
          ))}
        </div>
        
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center space-y-4 text-slate-300">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <span className="text-lg">Cargando datos de integridad de archivos...</span>
              <span className="text-sm text-gray-400">Consultando eventos FIM de agentes Wazuh</span>
              <div className="mt-4 bg-gray-700 rounded-full w-64 h-2">
                <div className="bg-blue-500 h-2 rounded-full animate-pulse w-3/4"></div>
              </div>
              <span className="text-xs text-gray-500">Esto puede tardar unos segundos...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mostrar mensaje cuando no hay datos disponibles (pero la carga ha terminado)
  if (!analysisLoading && !hasData) {
    return (
      <div className="space-y-6">
        <div className="text-sm text-gray-400 mb-6">
          Monitoreo FIM (File Integrity Monitoring)
        </div>
        
        {/* Estado sin datos */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center space-y-4 text-slate-300">
              <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-lg">Sin cambios FIM detectados</span>
              <span className="text-sm text-gray-400">No se han registrado modificaciones de archivos recientes</span>
              <div className="text-xs text-gray-500 mt-4">
                Los datos se actualizan automáticamente cada minuto
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-gray-400">
          Monitoreo FIM (File Integrity Monitoring)
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-400">Datos en tiempo real</span>
          </div>
          {hasData && (
            <div className="text-xs text-gray-400">
              {rawFileChanges.length} cambios detectados
            </div>
          )}
        </div>
      </div>

      {/* KPIs de Integridad - Datos Reales */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {(() => {
          // 1. Equipo con más actividad crítica + alta
          const deviceActivity: Record<string, { critical: number; high: number; total: number }> = {};
          fileChanges.forEach(change => {
            const device = change.device;
            if (!deviceActivity[device]) {
              deviceActivity[device] = { critical: 0, high: 0, total: 0 };
            }
            deviceActivity[device].total++;
            if (change.severity?.level === 'CRÍTICO') deviceActivity[device].critical++;
            if (change.severity?.level === 'ALTO') deviceActivity[device].high++;
          });
          
          const topDevice = Object.entries(deviceActivity)
            .map(([device, stats]) => ({ device, score: stats.critical * 3 + stats.high * 2, ...stats }))
            .sort((a, b) => b.score - a.score)[0];

          // 2. Usuario más activo
          const userActivity: Record<string, number> = {};
          fileChanges.forEach(change => {
            const user = change.user;
            userActivity[user] = (userActivity[user] || 0) + 1;
          });
          
          const topUser = Object.entries(userActivity)
            .sort(([,a], [,b]) => (b as number) - (a as number))[0];

          // 3. Archivo más modificado
          const fileActivity: Record<string, number> = {};
          fileChanges.forEach(change => {
            const file = change.file;
            fileActivity[file] = (fileActivity[file] || 0) + 1;
          });
          
          const topFile = Object.entries(fileActivity)
            .sort(([,a], [,b]) => (b as number) - (a as number))[0];

          return (
            <>
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <FolderCheck className="w-8 h-8 text-red-400" />
                  <span className="text-xs text-gray-400">Equipo más crítico</span>
                </div>
                <div className="text-2xl font-bold text-red-400 mb-2">
                  {topDevice ? `${topDevice.critical + topDevice.high}` : '0'}
                </div>
                <div className="text-gray-300 text-sm mb-2">
                  {topDevice ? topDevice.device : 'Sin actividad'}
                </div>
                <div className="text-xs text-gray-500">
                  {topDevice ? `${topDevice.critical} críticos, ${topDevice.high} altos` : 'No hay cambios críticos'}
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <Users className="w-8 h-8 text-yellow-400" />
                  <span className="text-xs text-gray-400">Usuario más activo</span>
                </div>
                <div className="text-2xl font-bold text-yellow-400 mb-2">
                  {topUser ? String(topUser[1]) : '0'}
                </div>
                <div className="text-gray-300 text-sm mb-2">
                  {topUser ? String(topUser[0]) : 'Sin actividad'}
                </div>
                <div className="text-xs text-gray-500">
                  {topUser ? 'cambios de archivos' : 'No hay cambios registrados'}
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <FileText className="w-8 h-8 text-blue-400" />
                  <span className="text-xs text-gray-400">Archivo más modificado</span>
                </div>
                <div className="text-2xl font-bold text-blue-400 mb-2">
                  {topFile ? String(topFile[1]) : '0'}
                </div>
                <div className="text-gray-300 text-sm mb-2 truncate" title={topFile ? String(topFile[0]) : 'Sin modificaciones'}>
                  {topFile ? String(topFile[0]) : 'Sin modificaciones'}
                </div>
                <div className="text-xs text-gray-500">
                  {topFile ? 'modificaciones detectadas' : 'No hay archivos modificados'}
                </div>
              </div>
            </>
          );
        })()}
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
                      {change.severity && (
                        <span className="text-xs">
                          <span className="text-gray-400">Severidad:</span> 
                          <span className="ml-1">{getSeverityDot(change.severity)}</span>
                          <span className={`ml-1 font-semibold ${getSeverityColor(change.severity).split(' ')[0]}`}>
                            {change.severity.level}
                          </span>
                        </span>
                      )}
                      {change.severity && change.severity.factors && change.severity.factors.length > 0 && (
                        <span className="text-xs">
                          🔍 <span className="text-yellow-400">Factores:</span> {change.severity.factors.slice(0, 2).join(', ')}
                          {change.severity.factors.length > 2 && ` +${change.severity.factors.length - 2} más`}
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

export default IntegridadArchivosSection;
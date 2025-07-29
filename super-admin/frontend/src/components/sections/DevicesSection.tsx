import React from 'react';
import { InventoryDevice, InventoryData, User } from '../../types/dashboard';
import { formatOSInfo } from '../../utils/formatters';

interface DevicesSectionProps {
  activeSection: string;
  inventoryData: InventoryData | null;
  inventoryLoading: boolean;
  inventoryFilters: any;
  setInventoryFilters: (filters: any) => void;
  onApplyFilters: () => void;
  setShowDeviceModal: (show: boolean) => void;
  setSelectedDevice: (device: InventoryDevice | null) => void;
  user: User;
}

const DevicesSection: React.FC<DevicesSectionProps> = ({
  activeSection,
  inventoryData,
  inventoryLoading,
  inventoryFilters,
  setInventoryFilters,
  onApplyFilters,
  setShowDeviceModal,
  setSelectedDevice,
  user
}) => {
  
  // Estado para almacenar todos los dispositivos originales
  const [allDevices, setAllDevices] = React.useState<InventoryDevice[]>([]);
  const [filteredDevices, setFilteredDevices] = React.useState<InventoryDevice[]>([]);
  
  // Cuando llegan nuevos datos del backend, actualizar el estado local
  React.useEffect(() => {
    if (inventoryData?.devices) {
      setAllDevices(inventoryData.devices);
      setFilteredDevices(inventoryData.devices);
    }
  }, [inventoryData]);
  
  // Función para aplicar filtros localmente
  const applyLocalFilters = () => {
    if (!allDevices.length) return;
    
    let filtered = [...allDevices];
    
    // Filtrar por búsqueda (nombre, IP, OS)
    if (inventoryFilters.search.trim()) {
      const searchTerm = inventoryFilters.search.toLowerCase().trim();
      filtered = filtered.filter(device => 
        device.name.toLowerCase().includes(searchTerm) ||
        device.ip.toLowerCase().includes(searchTerm) ||
        (typeof device.os === 'string' ? device.os.toLowerCase().includes(searchTerm) :
         device.os?.name?.toLowerCase().includes(searchTerm) ||
         device.os?.platform?.toLowerCase().includes(searchTerm))
      );
    }
    
    // Filtrar por estado
    if (inventoryFilters.status !== 'all') {
      filtered = filtered.filter(device => device.status === inventoryFilters.status);
    }
    
    // Ordenar
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (inventoryFilters.sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'ip':
          aValue = a.ip;
          bValue = b.ip;
          break;
        case 'os':
          aValue = typeof a.os === 'string' ? a.os.toLowerCase() : (a.os?.name || a.os?.platform || '').toLowerCase();
          bValue = typeof b.os === 'string' ? b.os.toLowerCase() : (b.os?.name || b.os?.platform || '').toLowerCase();
          break;
        case 'last_seen':
          aValue = new Date(a.last_seen).getTime();
          bValue = new Date(b.last_seen).getTime();
          break;
        case 'criticality_score':
          aValue = a.criticality_score || 0;
          bValue = b.criticality_score || 0;
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }
      
      if (inventoryFilters.sortOrder === 'desc') {
        return aValue < bValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });
    
    setFilteredDevices(filtered);
  };
  
  // Calcular estadísticas basadas en dispositivos filtrados
  const getFilteredStats = () => {
    if (!filteredDevices.length) {
      return {
        total: 0,
        active: 0,
        disconnected: 0,
        pending: 0,
        critical_vulnerabilities: 0,
        high_vulnerabilities: 0
      };
    }
    
    return {
      total: filteredDevices.length,
      active: filteredDevices.filter(d => d.status === 'active').length,
      disconnected: filteredDevices.filter(d => d.status === 'disconnected').length,
      pending: filteredDevices.filter(d => d.status === 'pending').length,
      critical_vulnerabilities: filteredDevices.reduce((sum, d) => sum + (d.vulnerabilities?.critical || 0), 0),
      high_vulnerabilities: filteredDevices.reduce((sum, d) => sum + (d.vulnerabilities?.high || 0), 0)
    };
  };
  
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
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-6xl mb-4">📱</div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Sin datos de inventario
            </h2>
            <p className="text-gray-400">
              No hay información de dispositivos disponible
            </p>
          </div>
        </div>
      );
    }
    
    if (!inventoryData.devices || inventoryData.devices.length === 0) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-6xl mb-4">📱</div>
            <h2 className="text-2xl font-bold text-white mb-2">
              No hay dispositivos
            </h2>
            <p className="text-gray-400">
              No se encontraron dispositivos en el inventario
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Estadísticas */}
        <div className="grid grid-cols-6 gap-4 mb-8">
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="text-2xl font-bold text-blue-400">{getFilteredStats().total}</div>
            <div className="text-gray-300 text-sm">Total Dispositivos</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="text-2xl font-bold text-green-400">{getFilteredStats().active}</div>
            <div className="text-gray-300 text-sm">Activos</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="text-2xl font-bold text-yellow-400">{getFilteredStats().disconnected}</div>
            <div className="text-gray-300 text-sm">Desconectados</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="text-2xl font-bold text-gray-400">{getFilteredStats().pending}</div>
            <div className="text-gray-300 text-sm">Pendientes</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="text-2xl font-bold text-red-400">{getFilteredStats().critical_vulnerabilities}</div>
            <div className="text-gray-300 text-sm">Vulns Críticas</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="text-2xl font-bold text-orange-400">{getFilteredStats().high_vulnerabilities}</div>
            <div className="text-gray-300 text-sm">Vulns Altas</div>
          </div>
        </div>

        {/* Controles de filtrado */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <input
              type="text"
              placeholder="Buscar dispositivos..."
              value={inventoryFilters.search}
              onChange={(e) => setInventoryFilters({ ...inventoryFilters, search: e.target.value, page: 1 })}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
            <select
              value={inventoryFilters.status}
              onChange={(e) => setInventoryFilters({ ...inventoryFilters, status: e.target.value, page: 1 })}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="disconnected">Desconectados</option>
              <option value="pending">Pendientes</option>
            </select>
            <select
              value={inventoryFilters.sortBy}
              onChange={(e) => setInventoryFilters({ ...inventoryFilters, sortBy: e.target.value })}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="name">Nombre</option>
              <option value="ip">IP</option>
              <option value="os">OS</option>
              <option value="last_seen">Última conexión</option>
              <option value="criticality_score">Criticidad</option>
            </select>
            <button
              onClick={applyLocalFilters}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Aplicar
            </button>
            <button
              onClick={() => {
                setInventoryFilters({
                  page: 1,
                  limit: 20,
                  search: '',
                  sortBy: 'name',
                  sortOrder: 'asc',
                  status: 'all'
                });
                setFilteredDevices(allDevices);
              }}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Limpiar
            </button>
          </div>
        </div>

        {/* Tabla de Dispositivos */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Dispositivo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">IP</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Sistema</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Vulnerabilidades</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Última conexión</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredDevices.map((device, index) => (
                  <tr key={device.id || index} className="hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-white">{device.name}</div>
                          <div className="text-xs text-gray-500">ID: {device.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        device.status === 'active' ? 'bg-green-900/20 text-green-400 border border-green-500/30' :
                        device.status === 'disconnected' ? 'bg-red-900/20 text-red-400 border border-red-500/30' :
                        'bg-yellow-900/20 text-yellow-400 border border-yellow-500/30'
                      }`}>
                        {device.status === 'active' ? 'Activo' : 
                         device.status === 'disconnected' ? 'Desconectado' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{device.ip}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">
                        {formatOSInfo(device.os)}
                      </div>
                      <div className="text-sm text-gray-400">{device.architecture}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-1">
                        {device.vulnerabilities.critical > 0 && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-900/20 text-red-400 border border-red-500/30">
                            {device.vulnerabilities.critical} C
                          </span>
                        )}
                        {device.vulnerabilities.high > 0 && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-900/20 text-orange-400 border border-orange-500/30">
                            {device.vulnerabilities.high} H
                          </span>
                        )}
                        {device.vulnerabilities.medium > 0 && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-900/20 text-yellow-400 border border-yellow-500/30">
                            {device.vulnerabilities.medium} M
                          </span>
                        )}
                        {device.vulnerabilities.low > 0 && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-900/20 text-blue-400 border border-blue-500/30">
                            {device.vulnerabilities.low} L
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {device.last_seen_text}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedDevice(device);
                          setShowDeviceModal(true);
                        }}
                        className="text-blue-400 hover:text-blue-300 mr-4"
                      >
                        Ver detalles
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Información de filtros aplicados */}
        <div className="flex items-center justify-between bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="text-sm text-gray-400">
            {filteredDevices.length === allDevices.length ? (
              `Mostrando ${filteredDevices.length} dispositivos`
            ) : (
              `Mostrando ${filteredDevices.length} de ${allDevices.length} dispositivos (filtrados)`
            )}
          </div>
          <div className="text-sm text-gray-500">
            {inventoryFilters.search && (
              <span className="mr-4">Búsqueda: "{inventoryFilters.search}"</span>
            )}
            {inventoryFilters.status !== 'all' && (
              <span className="mr-4">Estado: {inventoryFilters.status}</span>
            )}
            <span>Ordenado por: {inventoryFilters.sortBy}</span>
          </div>
        </div>
      </div>
    );
  };

  switch (activeSection) {
    case 'dispositivos-inventario':
      return renderInventoryContent();
    case 'dispositivos-agregar':
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-6xl mb-4">➕</div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Agregar Dispositivo
            </h2>
            <p className="text-gray-400">
              Funcionalidad de agregar dispositivo próximamente
            </p>
          </div>
        </div>
      );
    default:
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-gray-300 mb-2">Sección Dispositivos</h3>
            <p className="text-gray-400">Selecciona una opción del menú</p>
          </div>
        </div>
      );
  }
};

export default DevicesSection;
import React, { useState, useEffect } from 'react';
import { Bell, ChevronDown, Monitor, Shield, Activity, Target, TrendingUp } from 'lucide-react';
import { User, InventoryData, AnalysisData } from '../../types/dashboard';

interface AnalysisAlertsSectionProps {
  user: User;
  inventoryData: InventoryData | null;
  inventoryLoading: boolean;
  analysisData: AnalysisData;
  loadInventory: () => void;
}

interface HourlyAlertsModal {
  isOpen: boolean;
  hour: number;
  alerts: Array<{ timestamp: string; agent: string; description: string; level: string; ruleId: string; }>;
}

const AnalysisAlertsSection: React.FC<AnalysisAlertsSectionProps> = ({
  user,
  inventoryData,
  inventoryLoading,
  analysisData,
  loadInventory
}) => {
  // Estados para filtros y datos
  const [selectedAlertsDevice, setSelectedAlertsDevice] = useState('all');
  const [selectedAlertsDate, setSelectedAlertsDate] = useState('today');
  const [customDateRange, setCustomDateRange] = useState({ startDate: '', endDate: '' });
  const [hourlyAlertsModal, setHourlyAlertsModal] = useState<HourlyAlertsModal>({
    isOpen: false,
    hour: 0,
    alerts: []
  });

  // useEffect para cargar inventario específicamente para Alertas y Eventos si no está disponible
  useEffect(() => {
    if (!inventoryData && user.tenant_id) {
      console.log('🔄 Carga de inventario específica para Alertas y Eventos...');
      loadInventory();
    }
  }, [inventoryData, user.tenant_id, loadInventory]);

  // Función para generar alertas por hora cuando se hace clic en el gráfico
  const generateHourlyAlerts = (hour: number) => {
    if (!inventoryData || inventoryData.devices.length === 0) {
      return [{ timestamp: "Sin datos", agent: "Sin dispositivos", description: "Cargar inventario", level: "0", ruleId: "0000" }];
    }

    // Validación: no generar alertas para horas futuras
    const currentHour = new Date().getHours();
    if (hour > currentHour) {
      return [{ timestamp: "Sin datos", agent: "Hora futura", description: "No hay datos para horas futuras", level: "0", ruleId: "0000" }];
    }

    const deviceNames = inventoryData.devices.map(d => d.name);
    const alertTypes = [
      { description: "PAM: User login failed.", level: "5", ruleId: "5503", type: "auth_fail" },
      { description: "sshd: authentication failed.", level: "5", ruleId: "5760", type: "auth_fail" },
      { description: "sshd: brute force trying to get access to the system.", level: "10", ruleId: "5763", type: "critical" },
      { description: "PAM: Multiple failed logins in a small period of time.", level: "10", ruleId: "5551", type: "critical" },
      { description: "Listened ports status changed.", level: "7", ruleId: "533", type: "normal" },
      { description: "Syscheck: File modified.", level: "7", ruleId: "550", type: "normal" },
      { description: "Windows: User logon successful.", level: "3", ruleId: "18149", type: "auth_success" }
    ];

    const alerts = [];
    const now = new Date();
    const targetHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour);
    
    // Generar entre 3 y 8 alertas para esa hora
    const alertCount = 3 + Math.floor(Math.random() * 6);
    
    for (let i = 0; i < alertCount; i++) {
      const device = deviceNames[Math.floor(Math.random() * deviceNames.length)];
      const alertType = alertTypes[Math.floor(Math.random() * alertTypes.length)];
      const minutes = Math.floor(Math.random() * 60);
      const seconds = Math.floor(Math.random() * 60);
      const milliseconds = Math.floor(Math.random() * 1000);
      
      const timestamp = new Date(targetHour.getTime() + minutes * 60000 + seconds * 1000 + milliseconds);
      
      alerts.push({
        timestamp: timestamp.toLocaleString('en-US', {
          month: 'short', day: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit', second: '2-digit',
          hour12: false
        }).replace(',', ' @') + `.${milliseconds.toString().padStart(3, '0')}`,
        agent: device,
        description: alertType.description,
        level: alertType.level,
        ruleId: alertType.ruleId
      });
    }
    
    return alerts.sort((a, b) => new Date(b.timestamp.replace(' @', ', ')).getTime() - new Date(a.timestamp.replace(' @', ', ')).getTime());
  };

  // Mostrar mensaje de carga si no hay inventario disponible
  if (!inventoryData && inventoryLoading) {
    return (
      <div className="text-center py-12">
        <Bell className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Cargando dispositivos enrolados</h3>
        <p className="text-gray-400 mb-6">Obteniendo caché de dispositivos para Alertas y Eventos...</p>
        <div className="flex items-center justify-center space-x-2 text-blue-400">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
          <span className="text-sm">Cargando...</span>
        </div>
      </div>
    );
  }

  // Función para generar datos coherentes según filtros de fecha y dispositivo
  const generateCoherentData = (dateFilter: string, deviceFilter: string) => {
    // Obtener hora actual para filtrar datos de "hoy"
    const currentHour = new Date().getHours();
    const fullDayHours = [45, 32, 28, 15, 8, 12, 22, 38, 55, 67, 78, 89, 92, 85, 78, 82, 95, 88, 75, 65, 58, 52, 48, 41];
    
    // Obtener día actual de la semana (0 = Lunes, 6 = Domingo)
    const today = new Date();
    const currentDayOfWeek = (today.getDay() + 6) % 7; // Convertir Dom=0 a Lun=0
    const fullWeekDays = [245, 198, 287, 156, 234, 198, 145]; // Lun, Mar, Mié, Jue, Vie, Sáb, Dom
    
    // Obtener información del mes actual
    const currentDayOfMonth = today.getDate(); // Día del mes (1-31)
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate(); // Total días del mes
    const fullMonthDays = Array.from({length: daysInMonth}, (_, i) => 80 + (i % 7) * 15 + Math.sin(i/3) * 20);
    
    const baseData = {
      today: { 
        // Solo mostrar datos hasta la hora actual para evitar datos de horas futuras
        hours: fullDayHours.slice(0, currentHour + 1),
        total: 0, nivel12: 0, fallos: 0, exitos: 0
      },
      week: {
        // Mostrar todas las barras de la semana pero solo con datos hasta el día actual
        days: fullWeekDays.map((value, index) => index <= currentDayOfWeek ? value : 0),
        total: 0, nivel12: 0, fallos: 0, exitos: 0
      },
      month: {
        // Mostrar todos los días del mes pero solo con datos hasta el día actual
        days: fullMonthDays.map((value, index) => (index + 1) <= currentDayOfMonth ? value : 0),
        total: 0, nivel12: 0, fallos: 0, exitos: 0
      },
      '15days': {
        // Mostrar últimos 15 días pero solo con datos hasta hoy
        days: Array.from({length: 15}, (_, i) => {
          const dayDate = new Date();
          dayDate.setDate(dayDate.getDate() - (14 - i));
          const isToday = dayDate.toDateString() === today.toDateString();
          const isFuture = dayDate > today;
          return isFuture ? 0 : 95 - i * 3 + (i % 3) * 8;
        }),
        total: 0, nivel12: 0, fallos: 0, exitos: 0
      }
    };

    // Calcular totales basados en los datos del gráfico
    let currentData: { total: number; nivel12: number; fallos: number; exitos: number; hours?: number[]; days?: number[] };
    switch(dateFilter) {
      case 'today':
        currentData = baseData.today;
        currentData.total = (currentData as any).hours.reduce((sum: number, val: number) => sum + val, 0);
        currentData.nivel12 = Math.floor(currentData.total * 0.02); // 2% críticas
        currentData.fallos = Math.floor(currentData.total * 0.75); // 75% fallos
        currentData.exitos = Math.floor(currentData.total * 0.23); // 23% éxitos
        break;
      case 'week':
        currentData = baseData.week;
        currentData.total = (currentData as any).days.reduce((sum: number, val: number) => sum + val, 0);
        currentData.nivel12 = Math.floor(currentData.total * 0.025);
        currentData.fallos = Math.floor(currentData.total * 0.72);
        currentData.exitos = Math.floor(currentData.total * 0.25);
        break;
      case 'month':
        currentData = baseData.month;
        currentData.total = (currentData as any).days.reduce((sum: number, val: number) => sum + val, 0);
        currentData.nivel12 = Math.floor(currentData.total * 0.03);
        currentData.fallos = Math.floor(currentData.total * 0.70);
        currentData.exitos = Math.floor(currentData.total * 0.27);
        break;
      case '15days':
        currentData = baseData['15days'];
        currentData.total = (currentData as any).days.reduce((sum: number, val: number) => sum + val, 0);
        currentData.nivel12 = Math.floor(currentData.total * 0.028);
        currentData.fallos = Math.floor(currentData.total * 0.73);
        currentData.exitos = Math.floor(currentData.total * 0.24);
        break;
      case 'custom':
        // Para rango personalizado, generar datos basados en la diferencia de días
        if (customDateRange.startDate && customDateRange.endDate) {
          const start = new Date(customDateRange.startDate);
          const end = new Date(customDateRange.endDate);
          const diffTime = Math.abs(end.getTime() - start.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          const customDays = Array.from({length: Math.min(diffDays, 31)}, (_, i) => 60 + (i % 5) * 12 + Math.floor(i/3) * 3);
          
          currentData = {
            days: customDays,
            total: customDays.reduce((sum, val) => sum + val, 0),
            nivel12: 0, fallos: 0, exitos: 0
          };
          currentData.nivel12 = Math.floor(currentData.total * 0.026);
          currentData.fallos = Math.floor(currentData.total * 0.74);
          currentData.exitos = Math.floor(currentData.total * 0.234);
        } else {
          currentData = { days: [0], total: 0, nivel12: 0, fallos: 0, exitos: 0 };
        }
        break;
      default:
        currentData = baseData.today;
    }

    // Generar logs de alertas coherentes
    const generateCoherentLogs = () => {
      if (!inventoryData || inventoryData.devices.length === 0) {
        return [{ timestamp: "Sin datos", agent: "Sin dispositivos", description: "Cargar inventario", level: "0", ruleId: "0000" }];
      }
      
      const deviceNames = inventoryData.devices.map(d => d.name);
      const alertTypes = [
        { description: "PAM: User login failed.", level: "5", ruleId: "5503", type: "auth_fail" },
        { description: "sshd: authentication failed.", level: "5", ruleId: "5760", type: "auth_fail" },
        { description: "sshd: brute force trying to get access to the system.", level: "10", ruleId: "5763", type: "critical" },
        { description: "PAM: Multiple failed logins in a small period of time.", level: "10", ruleId: "5551", type: "critical" },
        { description: "Listened ports status changed.", level: "7", ruleId: "533", type: "normal" },
        { description: "Syscheck: File modified.", level: "7", ruleId: "550", type: "normal" },
        { description: "Windows: User logon successful.", level: "3", ruleId: "18149", type: "auth_success" }
      ];
      
      const logs = [];
      const now = new Date();
      
      // Filtrar dispositivos según selección
      const targetDevices = deviceFilter === 'all' ? deviceNames : [deviceFilter];
      
      // Distribuir alertas según las estadísticas calculadas
      const authFailCount = currentData.fallos;
      const authSuccessCount = currentData.exitos;
      const criticalCount = currentData.nivel12;
      const totalCount = currentData.total;
      
      let logIndex = 0;
      
      // Generar logs de fallos de autenticación
      const authFailsPerDevice = Math.ceil(authFailCount / targetDevices.length);
      for (let device of targetDevices) {
        for (let i = 0; i < authFailsPerDevice && logIndex < totalCount; i++) {
          const hoursBack = logIndex * (dateFilter === 'today' ? 0.8 : dateFilter === 'week' ? 24 : 48);
          const timestamp = new Date(now.getTime() - hoursBack * 60 * 60 * 1000);
          const authFailAlert = alertTypes.find(a => a.type === 'auth_fail') || alertTypes[0];
          
          logs.push({
            timestamp: timestamp.toLocaleString('en-US', {
              month: 'short', day: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit', second: '2-digit',
              hour12: false
            }).replace(',', ' @') + `.${((logIndex * 13) % 999).toString().padStart(3, '0')}`,
            agent: device,
            description: authFailAlert.description,
            level: authFailAlert.level,
            ruleId: authFailAlert.ruleId
          });
          logIndex++;
        }
      }
      
      // Generar logs de éxitos de autenticación
      const authSuccessPerDevice = Math.ceil(authSuccessCount / targetDevices.length);
      for (let device of targetDevices) {
        for (let i = 0; i < authSuccessPerDevice && logIndex < totalCount; i++) {
          const hoursBack = logIndex * (dateFilter === 'today' ? 0.8 : dateFilter === 'week' ? 24 : 48);
          const timestamp = new Date(now.getTime() - hoursBack * 60 * 60 * 1000);
          const authSuccessAlert = alertTypes.find(a => a.type === 'auth_success') || alertTypes[6];
          
          logs.push({
            timestamp: timestamp.toLocaleString('en-US', {
              month: 'short', day: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit', second: '2-digit',
              hour12: false
            }).replace(',', ' @') + `.${((logIndex * 17) % 999).toString().padStart(3, '0')}`,
            agent: device,
            description: authSuccessAlert.description,
            level: authSuccessAlert.level,
            ruleId: authSuccessAlert.ruleId
          });
          logIndex++;
        }
      }
      
      // Generar logs críticos
      const criticalPerDevice = Math.ceil(criticalCount / targetDevices.length);
      for (let device of targetDevices) {
        for (let i = 0; i < criticalPerDevice && logIndex < totalCount; i++) {
          const hoursBack = logIndex * (dateFilter === 'today' ? 0.8 : dateFilter === 'week' ? 24 : 48);
          const timestamp = new Date(now.getTime() - hoursBack * 60 * 60 * 1000);
          const criticalAlert = alertTypes.find(a => a.type === 'critical') || alertTypes[2];
          
          logs.push({
            timestamp: timestamp.toLocaleString('en-US', {
              month: 'short', day: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit', second: '2-digit',
              hour12: false
            }).replace(',', ' @') + `.${((logIndex * 19) % 999).toString().padStart(3, '0')}`,
            agent: device,
            description: criticalAlert.description,
            level: criticalAlert.level,
            ruleId: criticalAlert.ruleId
          });
          logIndex++;
        }
      }
      
      // Completar con alertas normales hasta llegar al total
      while (logIndex < totalCount) {
        const device = targetDevices[logIndex % targetDevices.length];
        const hoursBack = logIndex * (dateFilter === 'today' ? 0.8 : dateFilter === 'week' ? 24 : 48);
        const timestamp = new Date(now.getTime() - hoursBack * 60 * 60 * 1000);
        const normalAlert = alertTypes.find(a => a.type === 'normal') || alertTypes[4];
        
        logs.push({
          timestamp: timestamp.toLocaleString('en-US', {
            month: 'short', day: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false
          }).replace(',', ' @') + `.${((logIndex * 23) % 999).toString().padStart(3, '0')}`,
          agent: device,
          description: normalAlert.description,
          level: normalAlert.level,
          ruleId: normalAlert.ruleId
        });
        logIndex++;
      }
      
      return logs.sort((a, b) => new Date(b.timestamp.replace(' @', ', ')).getTime() - new Date(a.timestamp.replace(' @', ', ')).getTime());
    };
    
    return {
      chartData: dateFilter === 'today' ? (currentData as any).hours : 
                (currentData as any).days,
      totalAlertas: currentData.total,
      alertasNivel12: currentData.nivel12,
      fallosAutenticacion: currentData.fallos,
      exitosAutenticacion: currentData.exitos,
      logs: generateCoherentLogs()
    };
  };

  // Obtener datos coherentes según los filtros seleccionados
  const periodData = generateCoherentData(selectedAlertsDate, selectedAlertsDevice);
  
  // Usar datos reales del backend si están disponibles, sino usar datos coherentes generados
  const totalAlertas = analysisData.resumen?.alertasHoy || periodData.totalAlertas;
  const alertasNivel12 = periodData.alertasNivel12; // No hay campo específico en resumen
  const fallosAutenticacion = periodData.fallosAutenticacion; // No hay campo específico en resumen
  const exitosAutenticacion = periodData.exitosAutenticacion; // No hay campo específico en resumen

  return (
    <>
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

        {/* Gráfico de Barras de Alertas por Tiempo - Dinámico según filtro de fecha */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            {(() => {
              switch(selectedAlertsDate) {
                case 'today': return 'Volumen de Alertas (Hoy - por horas)';
                case 'week': return 'Volumen de Alertas (Esta semana - por días)';
                case 'month': return 'Volumen de Alertas (Este mes - por días)';
                case '15days': return 'Volumen de Alertas (Últimos 15 días)';
                case 'custom': return `Volumen de Alertas (${customDateRange.startDate || 'Inicio'} - ${customDateRange.endDate || 'Fin'})`;
                default: return 'Volumen de Alertas (Hoy - por horas)';
              }
            })()}
          </h3>
          <div className="flex items-end justify-between h-48 gap-1">
            {(() => {
              // Usar directamente los datos coherentes ya generados
              const chartData = periodData.chartData.map((value: number, i: number) => {
                let label = '';
                
                switch(selectedAlertsDate) {
                  case 'today':
                    label = `${i.toString().padStart(2, '0')}:00`;
                    break;
                  case 'week':
                    const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
                    label = weekDays[i] || i.toString();
                    break;
                  case 'month':
                    label = (i + 1).toString();
                    break;
                  case '15days':
                    const date = new Date();
                    date.setDate(date.getDate() - (14 - i));
                    label = `${date.getDate()}/${date.getMonth() + 1}`;
                    break;
                  case 'custom':
                    if (customDateRange.startDate && customDateRange.endDate) {
                      const start = new Date(customDateRange.startDate);
                      const date = new Date(start);
                      date.setDate(start.getDate() + i);
                      label = `${date.getDate()}/${date.getMonth() + 1}`;
                    } else {
                      label = `${i.toString().padStart(2, '0')}:00`;
                    }
                    break;
                  default:
                    label = `${i.toString().padStart(2, '0')}:00`;
                }
                
                return {
                  label,
                  value,
                  key: i
                };
              });
              
              // Calcular altura máxima para escala
              const maxValue = Math.max(...chartData.map((item: {label: string, value: number, key: number}) => item.value), 1);
              const maxHeight = 150;
              
              return chartData.map((item: {label: string, value: number, key: number}, i: number) => {
                const barHeight = maxValue > 0 ? (item.value / maxValue) * maxHeight : 10;
                const isEmpty = item.value === 0;
                
                return (
                  <div key={item.key} className="flex flex-col items-center flex-1 group">
                    <div 
                      className={`rounded-t w-full transition-colors cursor-pointer relative ${
                        isEmpty 
                          ? 'bg-gray-700 border border-gray-600' 
                          : 'bg-gradient-to-t from-blue-600 to-blue-400 hover:from-blue-500 hover:to-blue-300'
                      }`}
                      style={{ 
                        height: `${barHeight}px`, 
                        minHeight: isEmpty ? '8px' : '4px' 
                      }}
                      title={`${item.label} - ${item.value} alertas ${isEmpty ? '(día futuro)' : ''}`}
                      onClick={() => {
                        if (selectedAlertsDate === 'today') {
                          const alerts = generateHourlyAlerts(item.key);
                          setHourlyAlertsModal({
                            isOpen: true,
                            hour: item.key,
                            alerts
                          });
                        }
                      }}
                    >
                      {/* Tooltip que aparece al hacer hover */}
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        {item.value} alertas
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 mt-2 transform -rotate-45 origin-center">
                      {item.label}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
          <div className="text-center text-xs text-gray-500 mt-4">
            {(() => {
              switch(selectedAlertsDate) {
                case 'today': return 'Horas (UTC)';
                case 'week': return 'Días de la semana';
                case 'month': return 'Días del mes';
                case '15days': return 'Días (DD/MM)';
                case 'custom': return customDateRange.startDate && customDateRange.endDate ? 'Rango personalizado (DD/MM)' : 'Horas (Seleccionar rango personalizado)';
                default: return 'Horas (UTC)';
              }
            })()}
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
              {/* Usar dispositivos del caché de inventario si están disponibles */}
              {inventoryData ? (
                inventoryData.devices.map(device => (
                  <option key={device.id} value={device.id}>
                    {device.name} ({device.ip})
                  </option>
                ))
              ) : (
                // Mensaje si no hay inventario disponible
                <option value="" disabled>
                  Cargando dispositivos...
                </option>
              )}
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
              // Usar datos coherentes ya generados
              const allAlerts = periodData.logs;
              
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
            Logs de Alertas
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
                {/* Usar logs coherentes generados según filtros */}
                {periodData.logs.slice(0, 50).map((alert, index) => (
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

      {/* Modal de Alertas por Hora */}
      {hourlyAlertsModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-4xl w-full max-h-96 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Alertas de las {hourlyAlertsModal.hour.toString().padStart(2, '0')}:00
              </h3>
              <button
                onClick={() => setHourlyAlertsModal({ isOpen: false, hour: 0, alerts: [] })}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto max-h-72">
              <table className="w-full">
                <thead className="bg-gray-700 sticky top-0">
                  <tr>
                    <th className="text-left p-3 text-gray-300">Timestamp</th>
                    <th className="text-left p-3 text-gray-300">Equipo</th>
                    <th className="text-left p-3 text-gray-300">Descripción</th>
                    <th className="text-left p-3 text-gray-300">Nivel</th>
                    <th className="text-left p-3 text-gray-300">ID Regla</th>
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
                      <td className="p-3 text-gray-300 text-sm">{alert.description}</td>
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
    </>
  );
};

export default AnalysisAlertsSection;
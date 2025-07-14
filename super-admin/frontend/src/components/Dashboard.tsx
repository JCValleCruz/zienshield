import React, { useState, useEffect } from 'react';
import { Shield, Monitor, AlertTriangle, Building2, Users, Loader } from 'lucide-react';
import { apiService, Company } from '../services/api';

const Dashboard: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<string>('Verificando...');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Verificar salud de la API
      console.log('🔍 Verificando conexión API...');
      const healthResponse = await apiService.healthCheck();
      setApiStatus(`API OK - ${healthResponse.data?.companies || 0} empresas en BD`);
      
      // Cargar empresas
      console.log('📋 Cargando empresas...');
      const companiesResponse = await apiService.getCompanies();
      
      if (companiesResponse.success) {
        setCompanies(companiesResponse.data);
        console.log(`✅ ${companiesResponse.data.length} empresas cargadas:`, companiesResponse.data);
      } else {
        throw new Error(companiesResponse.error || 'Error desconocido');
      }
      
    } catch (error) {
      console.error('❌ Error cargando dashboard:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
      setApiStatus('API Error');
    } finally {
      setIsLoading(false);
    }
  };

  const getSectorColor = (sector: string) => {
    switch (sector) {
      case 'TELECOM': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'LEGAL': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'RETAIL': return 'bg-green-500/10 text-green-400 border-green-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4 text-slate-300">
          <Loader className="animate-spin h-8 w-8 text-blue-500" />
          <span className="text-lg">Cargando ZienSHIELD...</span>
          <span className="text-sm text-slate-500">{apiStatus}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center">
              <Shield className="h-8 w-8 mr-3 text-blue-500" />
              ZienSHIELD Super Admin
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Panel de control multi-tenant • {apiStatus}
            </p>
          </div>
          <button
            onClick={loadDashboardData}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Monitor className="h-4 w-4" />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-400 mr-3" />
              <div>
                <h3 className="text-red-400 font-medium">Error de Conexión</h3>
                <p className="text-red-300 text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Métricas Generales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Building2 className="h-6 w-6 text-blue-400" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-1">
                {companies.length}
              </div>
              <div className="text-sm text-slate-400">
                Empresas registradas
              </div>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Shield className="h-6 w-6 text-green-400" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-1">
                100%
              </div>
              <div className="text-sm text-slate-400">
                Sistema operativo
              </div>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Users className="h-6 w-6 text-purple-400" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-1">
                {companies.length * 2}
              </div>
              <div className="text-sm text-slate-400">
                Usuarios activos
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Empresas */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg">
          <div className="px-6 py-4 border-b border-slate-700">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <Building2 className="h-5 w-5 mr-2 text-blue-400" />
              Empresas Registradas ({companies.length})
            </h2>
          </div>
          
          <div className="p-6">
            {companies.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No hay empresas registradas</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {companies.map((company) => (
                  <div key={company.id} className="bg-slate-700 border border-slate-600 rounded-lg p-4 hover:bg-slate-650 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{company.name}</h3>
                        <p className="text-sm text-slate-400">{company.admin_name}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getSectorColor(company.sector)}`}>
                        {company.sector}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="text-slate-400">Email:</span>
                        <span className="text-slate-300 ml-2">{company.admin_email}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-slate-400">Tenant ID:</span>
                        <span className="text-slate-300 ml-2 font-mono text-xs">{company.tenant_id}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-slate-400">Creado:</span>
                        <span className="text-slate-300 ml-2">
                          {new Date(company.created_at).toLocaleDateString('es-ES')}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex space-x-2">
                      <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-3 rounded text-sm transition-colors">
                        Ver Dashboard
                      </button>
                      <button className="bg-slate-600 hover:bg-slate-500 text-white py-1.5 px-3 rounded text-sm transition-colors">
                        Editar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

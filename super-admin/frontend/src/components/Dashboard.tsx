import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  Shield, Building, Users, AlertTriangle, Activity, Plus, LogOut, 
  Trash2, Mail, Phone, Calendar, CheckCircle, XCircle, Clock,
  TrendingUp, Server, Globe, Eye
} from 'lucide-react';
import CompanyModal from './CompanyModal';
import DeleteModal from './DeleteModal';

interface User {
  email: string;
  role: string;
  name: string;
}

interface Company {
  id: number;
  company_name: string;
  admin_email: string;
  sector: string;
  total_agents: number;
  active_agents: number;
  compliance_percentage: number;
  status: string;
  created_at: string;
}

interface Stats {
  companies: { total: number; active: number };
  agents: { total: number; active: number };
  alerts: { total: number; critical: number };
  compliance: { average: number };
  threats: { blocked: number };
  wazuh: { status: string; version: string };
}

const API_URL = process.env.REACT_APP_API_URL;

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  useEffect(() => {
    loadData();
    // Actualizar datos cada 30 segundos
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [companiesRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/companies`),
        axios.get(`${API_URL}/stats`)
      ]);

      if (companiesRes.data.success) {
        setCompanies(companiesRes.data.data);
      }
      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = async (companyData: any) => {
    try {
      const response = await axios.post(`${API_URL}/companies`, companyData);
      if (response.data.success) {
        await loadData();
        setShowCreateModal(false);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error creando empresa:', error);
      return false;
    }
  };

  const handleDeleteCompany = async () => {
    if (!selectedCompany) return false;
    
    try {
      const response = await axios.delete(`${API_URL}/companies/${selectedCompany.id}`);
      if (response.data.success) {
        await loadData();
        setShowDeleteModal(false);
        setSelectedCompany(null);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error eliminando empresa:', error);
      return false;
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, subtitle }: any) => (
    <motion.div 
      whileHover={{ y: -5 }}
      className="stat-card card-hover rounded-xl"
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${color} shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <TrendingUp className="w-5 h-5 text-slate-400" />
        </div>
        <div>
          <p className="text-3xl font-bold text-white mb-1">{value}</p>
          <p className="text-slate-400 text-sm font-medium">{title}</p>
          {subtitle && <p className="text-slate-500 text-xs mt-1">{subtitle}</p>}
        </div>
      </div>
    </motion.div>
  );

  const CompanyCard = ({ company }: { company: Company }) => (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -5 }}
      className="card-professional card-hover rounded-xl p-6 relative overflow-hidden"
    >
      {/* Status Indicator */}
      <div className="absolute top-4 right-4">
        {company.status === 'active' ? (
          <CheckCircle className="w-5 h-5 text-green-400" />
        ) : (
          <XCircle className="w-5 h-5 text-red-400" />
        )}
      </div>

      {/* Company Header */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-white mb-2">{company.company_name}</h3>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
          {company.sector}
        </span>
      </div>

      {/* Company Details */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center text-slate-300">
          <Mail className="w-4 h-4 mr-3 text-slate-400" />
          <span className="text-sm">{company.admin_email}</span>
        </div>
        
        <div className="flex items-center text-slate-300">
          <Users className="w-4 h-4 mr-3 text-slate-400" />
          <span className="text-sm">{company.active_agents}/{company.total_agents} agentes activos</span>
        </div>

        <div className="flex items-center text-slate-300">
          <Calendar className="w-4 h-4 mr-3 text-slate-400" />
          <span className="text-sm">Desde {new Date(company.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Compliance Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-slate-400">Compliance</span>
          <span className={`text-sm font-bold ${
            company.compliance_percentage >= 80 ? 'text-green-400' : 
            company.compliance_percentage >= 60 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {company.compliance_percentage}%
          </span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${
              company.compliance_percentage >= 80 ? 'bg-gradient-to-r from-green-500 to-green-400' :
              company.compliance_percentage >= 60 ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' :
              'bg-gradient-to-r from-red-500 to-red-400'
            }`}
            style={{ width: `${company.compliance_percentage}%` }}
          ></div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex space-x-3">
        <button className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center">
          <Eye className="w-4 h-4 mr-2" />
          Ver Detalles
        </button>
        <button 
          onClick={() => {
            setSelectedCompany(company);
            setShowDeleteModal(true);
          }}
          className="btn-danger flex items-center justify-center px-4"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Cargando panel de administración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                  ZienSHIELD Super Admin
                </h1>
                <p className="text-slate-400 text-sm">Panel de gestión global</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-white font-medium">{user.name}</p>
                <p className="text-slate-400 text-sm">{user.email}</p>
              </div>
              <button 
                onClick={onLogout}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Global Stats */}
        {stats && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8"
          >
            <StatCard
              title="Empresas Activas"
              value={stats.companies.active}
              icon={Building}
              color="from-green-500 to-green-600"
              subtitle={`${stats.companies.total} total`}
            />
            <StatCard
              title="Agentes Globales"
              value={stats.agents.total}
              icon={Users}
              color="from-blue-500 to-blue-600"
              subtitle={`${stats.agents.active} activos`}
            />
            <StatCard
              title="Alertas Críticas"
              value={stats.alerts.critical}
              icon={AlertTriangle}
              color="from-red-500 to-red-600"
              subtitle="Último mes"
            />
            <StatCard
              title="Compliance Avg"
              value={`${stats.compliance.average}%`}
              icon={Activity}
              color="from-purple-500 to-purple-600"
              subtitle="Global"
            />
            <StatCard
              title="Amenazas Bloqueadas"
              value={stats.threats.blocked.toLocaleString()}
              icon={Shield}
              color="from-orange-500 to-orange-600"
              subtitle="Total"
            />
            <StatCard
              title="Estado Wazuh"
              value={stats.wazuh.status === 'connected' ? 'Online' : 'Offline'}
              icon={Server}
              color={stats.wazuh.status === 'connected' ? 'from-green-500 to-green-600' : 'from-red-500 to-red-600'}
              subtitle={`v${stats.wazuh.version}`}
            />
          </motion.div>
        )}

        {/* Companies Section */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Inventario de Empresas</h2>
            <p className="text-slate-400">Gestione todas las organizaciones del sistema</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Nueva Empresa</span>
          </motion.button>
        </div>

        {/* Companies Grid */}
        <motion.div 
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {companies.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))}
        </motion.div>

        {companies.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <Building className="w-24 h-24 text-slate-600 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-slate-400 mb-2">No hay empresas registradas</h3>
            <p className="text-slate-500 mb-6">Comience agregando su primera empresa al sistema</p>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              <Plus className="w-5 h-5 mr-2" />
              Agregar Primera Empresa
            </button>
          </motion.div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CompanyModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateCompany}
        />
      )}

      {showDeleteModal && selectedCompany && (
        <DeleteModal
          company={selectedCompany}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedCompany(null);
          }}
          onConfirm={handleDeleteCompany}
        />
      )}
    </div>
  );
}

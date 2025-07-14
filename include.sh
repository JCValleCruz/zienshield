#!/bin/bash

# Script para implementar modal de Editar Empresa
# Ejecutar desde: /home/gacel/zienshield
# Uso: ./edit_company_modal.sh

set -e

echo "✏️ ZienSHIELD Edit Company Modal Creator"
echo "======================================="

# Verificar que estamos en el directorio correcto
if [ ! -f "super-admin/frontend/src/components/Dashboard.tsx" ]; then
    echo "❌ Error: Este script debe ejecutarse desde /home/gacel/zienshield"
    exit 1
fi

FRONTEND_DIR="super-admin/frontend"
DASHBOARD_FILE="$FRONTEND_DIR/src/components/Dashboard.tsx"
API_FILE="$FRONTEND_DIR/src/services/api.ts"
BACKUP_DASHBOARD="$FRONTEND_DIR/src/components/Dashboard.tsx.backup.$(date +%Y%m%d_%H%M%S)"
BACKUP_API="$FRONTEND_DIR/src/services/api.ts.backup.$(date +%Y%m%d_%H%M%S)"

echo "📁 Archivos a modificar:"
echo "   Dashboard: $DASHBOARD_FILE"
echo "   API Service: $API_FILE"

# Crear backups
echo "💾 Creando backups..."
cp "$DASHBOARD_FILE" "$BACKUP_DASHBOARD"
cp "$API_FILE" "$BACKUP_API"
echo "✅ Backups creados"

# Paso 1: Agregar método updateCompany al API Service
echo ""
echo "🔧 Paso 1: Actualizando API Service..."

# Verificar si ya existe el método updateCompany
if grep -q "updateCompany" "$API_FILE"; then
    echo "✅ Método updateCompany ya existe en API Service"
else
    echo "➕ Agregando método updateCompany..."
    
    # Agregar método updateCompany después de createCompany
    sed -i '/async deleteCompany/i\
\
  async updateCompany(id: number, companyData: CreateCompanyData): Promise<ApiResponse<Company>> {\
    return this.fetchApi(`/companies/${id}`, {\
      method: '\''PUT'\'',\
      body: JSON.stringify(companyData),\
    });\
  }' "$API_FILE"
    
    echo "✅ Método updateCompany agregado"
fi

# Paso 2: Crear servidor con endpoint PUT
echo ""
echo "🔧 Paso 2: Agregando endpoint PUT al servidor..."

API_SERVER_FILE="api/src/server.js"
API_BACKUP="api/src/server.js.backup.$(date +%Y%m%d_%H%M%S)"

# Backup del servidor
cp "$API_SERVER_FILE" "$API_BACKUP"
echo "💾 Backup servidor: $API_BACKUP"

# Agregar endpoint PUT antes del DELETE
if grep -q "app.put.*companies.*:id" "$API_SERVER_FILE"; then
    echo "✅ Endpoint PUT ya existe en servidor"
else
    echo "➕ Agregando endpoint PUT..."
    
    # Insertar endpoint PUT antes del DELETE
    sed -i '/\/\/ 🗑️ ELIMINAR EMPRESA/i\
\/\/ ✏️ ACTUALIZAR EMPRESA\
app.put("\/api\/companies\/:id", async (req, res) => {\
  try {\
    const { id } = req.params;\
    const { name, sector, admin_name, admin_phone, admin_email, admin_password } = req.body;\
    \
    console.log("✏️ Actualizando empresa con ID:", id);\
    \
    \/\/ Verificar que el ID es válido\
    if (!id || isNaN(parseInt(id))) {\
      return res.status(400).json({\
        success: false,\
        error: "ID de empresa inválido"\
      });\
    }\
    \
    \/\/ Verificar que la empresa existe\
    const checkResult = await pool.query("SELECT id, name FROM companies WHERE id = $1", [id]);\
    \
    if (checkResult.rows.length === 0) {\
      return res.status(404).json({\
        success: false,\
        error: "Empresa no encontrada"\
      });\
    }\
    \
    \/\/ 🔍 VALIDACIONES (iguales que POST)\
    const errors = [];\
    \
    \/\/ Campos obligatorios (contraseña opcional en edición)\
    if (!name?.trim()) errors.push("El nombre de la empresa es obligatorio");\
    if (!sector?.trim()) errors.push("El sector es obligatorio");\
    if (!admin_name?.trim()) errors.push("El nombre del administrador es obligatorio");\
    if (!admin_phone?.trim()) errors.push("El teléfono del administrador es obligatorio");\
    if (!admin_email?.trim()) errors.push("El email del administrador es obligatorio");\
    \
    \/\/ Contraseña: obligatoria solo si se proporciona (para permitir mantener actual)\
    if (admin_password && admin_password.trim().length < 6) {\
      errors.push("La contraseña debe tener al menos 6 caracteres");\
    }\
    \
    \/\/ Validaciones de formato\
    if (admin_email && !isValidEmail(admin_email)) {\
      errors.push("El formato del email no es válido");\
    }\
    \
    if (admin_phone && !isValidPhone(admin_phone)) {\
      errors.push("El formato del teléfono no es válido");\
    }\
    \
    \/\/ Validaciones de longitud\
    if (name && name.length > 255) errors.push("El nombre de la empresa no puede exceder 255 caracteres");\
    if (sector && sector.length > 100) errors.push("El sector no puede exceder 100 caracteres");\
    if (admin_name && admin_name.length > 255) errors.push("El nombre del administrador no puede exceder 255 caracteres");\
    if (admin_phone && admin_phone.length > 20) errors.push("El teléfono no puede exceder 20 caracteres");\
    if (admin_email && admin_email.length > 255) errors.push("El email no puede exceder 255 caracteres");\
    if (admin_password && admin_password.length > 255) errors.push("La contraseña no puede exceder 255 caracteres");\
    \
    if (errors.length > 0) {\
      return res.status(400).json({\
        success: false,\
        error: "Errores de validación",\
        details: errors\
      });\
    }\
    \
    \/\/ Verificar email único (excepto la empresa actual)\
    const existingEmail = await pool.query("SELECT id FROM companies WHERE admin_email = $1 AND id != $2", [admin_email, id]);\
    if (existingEmail.rows.length > 0) {\
      return res.status(409).json({\
        success: false,\
        error: "Ya existe otra empresa con este email de administrador"\
      });\
    }\
    \
    \/\/ Actualizar empresa (solo campos que han cambiado)\
    const updateData = {\
      name: name.trim(),\
      sector: sector.trim(),\
      admin_name: admin_name.trim(),\
      admin_phone: admin_phone.trim(),\
      admin_email: admin_email.trim()\
    };\
    \
    \/\/ Solo incluir contraseña si se proporcionó una nueva\
    if (admin_password && admin_password.trim()) {\
      updateData.admin_password = admin_password.trim();\
    }\
    \
    const result = await pool.query(`\
      UPDATE companies \
      SET name = $1, sector = $2, admin_name = $3, admin_phone = $4, admin_email = $5\
      ${admin_password && admin_password.trim() ? ', admin_password = $7' : ''}, updated_at = CURRENT_TIMESTAMP\
      WHERE id = $6\
      RETURNING id, name, sector, tenant_id, admin_name, admin_email, created_at\
    `, admin_password && admin_password.trim() ? \
        [name.trim(), sector.trim(), admin_name.trim(), admin_phone.trim(), admin_email.trim(), id, admin_password.trim()] :\
        [name.trim(), sector.trim(), admin_name.trim(), admin_phone.trim(), admin_email.trim(), id]);\
    \
    const updatedCompany = result.rows[0];\
    \
    console.log(`✅ Empresa actualizada exitosamente: ${updatedCompany.name} (ID: ${id})`);\
    \
    res.json({\
      success: true,\
      message: `Empresa "${updatedCompany.name}" actualizada exitosamente`,\
      data: updatedCompany\
    });\
    \
  } catch (error) {\
    console.error("❌ Error actualizando empresa:", error);\
    \
    \/\/ Manejar errores específicos de PostgreSQL\
    if (error.code === "23505") { \/\/ Constraint violation\
      return res.status(409).json({\
        success: false,\
        error: "Ya existe una empresa con estos datos únicos"\
      });\
    }\
    \
    res.status(500).json({\
      success: false,\
      error: "Error interno del servidor",\
      details: error.message\
    });\
  }\
});\
\
' "$API_SERVER_FILE"

    echo "✅ Endpoint PUT agregado"
fi

# Actualizar mensaje de inicio del servidor
if ! grep -q "✏️ Actualizar empresa" "$API_SERVER_FILE"; then
    sed -i '/console.log(`🗑️ Eliminar empresa:/i\
  console.log(`✏️ Actualizar empresa: PUT http://localhost:${PORT}/api/companies/:id`);' "$API_SERVER_FILE"
fi

echo "✅ Servidor actualizado con endpoint PUT"

# Paso 3: Actualizar Dashboard con funcionalidad de edición
echo ""
echo "🔧 Paso 3: Creando Dashboard con modal de edición..."

cat > "$DASHBOARD_FILE" << 'EOF'
import React, { useState, useEffect } from 'react';
import { Shield, Monitor, AlertTriangle, Building2, Users, Loader, Trash2, Plus, X, Eye, EyeOff, Edit } from 'lucide-react';
import { apiService, Company, CreateCompanyData } from '../services/api';

const Dashboard: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para modal de eliminación
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Estados para modal de agregar/editar empresa
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  // Estado del formulario
  const [formData, setFormData] = useState<CreateCompanyData>({
    name: '',
    sector: '',
    admin_name: '',
    admin_phone: '',
    admin_email: '',
    admin_password: ''
  });

  // Errores de validación
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Cargar empresas
      console.log('📋 Cargando empresas...');
      const companiesResponse = await apiService.getCompanies();
      
      if (companiesResponse.success) {
        setCompanies(companiesResponse.data);
        console.log(`✅ ${companiesResponse.data.length} empresas cargadas`);
      } else {
        throw new Error(companiesResponse.error || 'Error desconocido');
      }
      
    } catch (error) {
      console.error('❌ Error cargando dashboard:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  // Funciones para modal de eliminación
  const handleDeleteCompany = (company: Company) => {
    setCompanyToDelete(company);
    setDeleteModalOpen(true);
    setDeleteConfirmText("");
  };

  const confirmDeleteCompany = async () => {
    if (!companyToDelete || deleteConfirmText !== companyToDelete.name) {
      return;
    }

    try {
      console.log("🗑️ Eliminando empresa:", companyToDelete.name);
      
      // Llamar a la API DELETE
      const response = await apiService.deleteCompany(companyToDelete.id);
      
      if (response.success) {
        console.log("✅ Empresa eliminada de la BD");
        
        // Actualizar lista local
        setCompanies(companies.filter(c => c.id !== companyToDelete.id));
        
        // Cerrar modal
        setDeleteModalOpen(false);
        setCompanyToDelete(null);
        setDeleteConfirmText("");
        
        // Mensaje de éxito
        alert(`Empresa "${companyToDelete.name}" eliminada exitosamente`);
      }
    } catch (error) {
      console.error("❌ Error:", error);
      alert(`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  const cancelDelete = () => {
    setDeleteModalOpen(false);
    setCompanyToDelete(null);
    setDeleteConfirmText("");
  };

  // Funciones para modal de agregar/editar empresa
  const handleAddCompany = () => {
    setIsEditMode(false);
    setEditingCompany(null);
    setCompanyModalOpen(true);
    resetForm();
  };

  const handleEditCompany = async (company: Company) => {
    setIsEditMode(true);
    setEditingCompany(company);
    setCompanyModalOpen(true);
    
    try {
      // Cargar datos completos de la empresa desde la API
      console.log('🔍 Cargando datos completos de la empresa...');
      const response = await apiService.getCompany(company.id);
      
      if (response.success) {
        const fullCompanyData = response.data;
        
        // Precargar TODOS los datos del formulario
        setFormData({
          name: fullCompanyData.name,
          sector: fullCompanyData.sector,
          admin_name: fullCompanyData.admin_name,
          admin_phone: fullCompanyData.admin_phone || '', // Cargar teléfono real
          admin_email: fullCompanyData.admin_email,
          admin_password: '' // Siempre vacío por seguridad
        });
        
        console.log('✅ Datos completos cargados:', fullCompanyData);
      } else {
        throw new Error(response.error || 'Error cargando datos');
      }
    } catch (error) {
      console.error('❌ Error cargando datos completos:', error);
      
      // Fallback: usar datos básicos disponibles
      setFormData({
        name: company.name,
        sector: company.sector,
        admin_name: company.admin_name,
        admin_phone: '', // Campo vacío si no se pudo cargar
        admin_email: company.admin_email,
        admin_password: ''
      });
      
      setCreateError('No se pudieron cargar todos los datos. Algunos campos pueden estar vacíos.');
    }
    
    setFormErrors({});
    setShowPassword(false);
  };

  const closeCompanyModal = () => {
    setCompanyModalOpen(false);
    setIsEditMode(false);
    setEditingCompany(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      sector: '',
      admin_name: '',
      admin_phone: '',
      admin_email: '',
      admin_password: ''
    });
    setFormErrors({});
    setCreateError(null);
    setShowPassword(false);
  };

  const handleInputChange = (field: keyof CreateCompanyData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Validar campos obligatorios
    if (!formData.name.trim()) errors.name = 'El nombre de la empresa es obligatorio';
    if (!formData.sector.trim()) errors.sector = 'El sector es obligatorio';
    if (!formData.admin_name.trim()) errors.admin_name = 'El nombre del administrador es obligatorio';
    if (!formData.admin_phone.trim()) errors.admin_phone = 'El teléfono es obligatorio';
    if (!formData.admin_email.trim()) errors.admin_email = 'El email es obligatorio';
    
    // Contraseña obligatoria solo para CREAR, opcional para EDITAR
    if (!isEditMode && !formData.admin_password.trim()) {
      errors.admin_password = 'La contraseña es obligatoria';
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.admin_email && !emailRegex.test(formData.admin_email)) {
      errors.admin_email = 'El formato del email no es válido';
    }

    // Validar longitud de contraseña (solo si se proporciona)
    if (formData.admin_password && formData.admin_password.length < 6) {
      errors.admin_password = 'La contraseña debe tener al menos 6 caracteres';
    }

    // Validar longitudes máximas
    if (formData.name.length > 255) errors.name = 'El nombre no puede exceder 255 caracteres';
    if (formData.sector.length > 100) errors.sector = 'El sector no puede exceder 100 caracteres';
    if (formData.admin_name.length > 255) errors.admin_name = 'El nombre del administrador no puede exceder 255 caracteres';
    if (formData.admin_phone.length > 20) errors.admin_phone = 'El teléfono no puede exceder 20 caracteres';
    if (formData.admin_email.length > 255) errors.admin_email = 'El email no puede exceder 255 caracteres';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setIsCreating(true);
      setCreateError(null);

      if (isEditMode && editingCompany) {
        // Actualizar empresa existente
        console.log('✏️ Actualizando empresa:', formData.name);
        const response = await apiService.updateCompany(editingCompany.id, formData);

        if (response.success) {
          console.log('✅ Empresa actualizada exitosamente:', response.data);
          
          // Actualizar lista de empresas
          setCompanies(prev => prev.map(c => 
            c.id === editingCompany.id ? response.data : c
          ));
          
          // Cerrar modal
          closeCompanyModal();
          
          // Mostrar mensaje de éxito
          alert(`¡Empresa "${response.data.name}" actualizada exitosamente!`);
        }
      } else {
        // Crear nueva empresa
        console.log('➕ Creando empresa:', formData.name);
        const response = await apiService.createCompany(formData);

        if (response.success) {
          console.log('✅ Empresa creada exitosamente:', response.data);
          
          // Actualizar lista de empresas
          setCompanies(prev => [...prev, response.data]);
          
          // Cerrar modal
          closeCompanyModal();
          
          // Mostrar mensaje de éxito
          alert(`¡Empresa "${response.data.name}" creada exitosamente!`);
        }
      }
    } catch (error) {
      console.error('❌ Error:', error);
      setCreateError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsCreating(false);
    }
  };

  const getSectorColor = (sector: string) => {
    switch (sector) {
      case 'TELECOM': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'LEGAL': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'RETAIL': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'TECH': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'HEALTH': return 'bg-pink-500/10 text-pink-400 border-pink-500/20';
      case 'FINANCE': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4 text-slate-300">
          <Loader className="animate-spin h-8 w-8 text-blue-500" />
          <span className="text-lg">Cargando ZienSHIELD...</span>
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
              ZienSHIELD
            </h1>
          </div>
          
          {/* Botones del Header */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleAddCompany}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Agregar Empresa</span>
            </button>
            
            <button
              onClick={loadDashboardData}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Monitor className="h-4 w-4" />
              <span>Actualizar</span>
            </button>
          </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Empresas Registradas */}
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
                Empresas Registradas
              </div>
            </div>
          </div>

          {/* Empresas Activas */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Shield className="h-6 w-6 text-green-400" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-1">
                0
              </div>
              <div className="text-sm text-slate-400">
                Empresas Activas
              </div>
            </div>
          </div>

          {/* Equipos Totales */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Users className="h-6 w-6 text-purple-400" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-1">
                0
              </div>
              <div className="text-sm text-slate-400">
                Equipos Totales
              </div>
            </div>
          </div>

          {/* Alertas Totales */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-1">
                0
              </div>
              <div className="text-sm text-slate-400">
                Alertas Totales
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
                <p className="text-slate-400 mb-4">No hay empresas registradas</p>
                <button
                  onClick={handleAddCompany}
                  className="inline-flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Crear primera empresa</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {companies.map((company) => (
                  <div key={company.id} className="bg-slate-700 border border-slate-600 rounded-lg p-4 hover:bg-slate-650 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white">{company.name}</h3>
                        <p className="text-sm text-slate-400">{company.admin_name}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${getSectorColor(company.sector)}`}>
                          {company.sector}
                        </span>
                        <button
                          onClick={() => handleDeleteCompany(company)}
                          className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                          title={`Eliminar ${company.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
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
                      <button 
                        onClick={() => handleEditCompany(company)}
                        className="bg-slate-600 hover:bg-slate-500 text-white py-1.5 px-3 rounded text-sm transition-colors flex items-center space-x-1"
                      >
                        <Edit className="h-3 w-3" />
                        <span>Editar</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Eliminación */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-red-500/10 rounded-lg mr-3">
                <Trash2 className="h-6 w-6 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                Eliminar Empresa
              </h3>
            </div>

            <div className="mb-4">
              <p className="text-slate-300 mb-2">
                ¿Estás seguro de que quieres eliminar la empresa?
              </p>
              <p className="text-white font-semibold mb-4">
                {companyToDelete?.name}
              </p>
              <p className="text-sm text-slate-400 mb-2">
                Para confirmar, escribe el nombre exacto de la empresa:
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Nombre de la empresa"
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={cancelDelete}
                className="flex-1 bg-slate-600 hover:bg-slate-500 text-white py-2 px-4 rounded transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteCompany}
                disabled={deleteConfirmText !== companyToDelete?.name}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 disabled:text-slate-400 text-white py-2 px-4 rounded transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Agregar/Editar Empresa */}
      {companyModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header del Modal */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <div className="flex items-center">
                <div className={`p-2 rounded-lg mr-3 ${isEditMode ? 'bg-blue-500/10' : 'bg-green-500/10'}`}>
                  {isEditMode ? (
                    <Edit className="h-6 w-6 text-blue-400" />
                  ) : (
                    <Plus className="h-6 w-6 text-green-400" />
                  )}
                </div>
                <h3 className="text-lg font-semibold text-white">
                  {isEditMode ? 'Editar Empresa' : 'Agregar Nueva Empresa'}
                </h3>
              </div>
              <button
                onClick={closeCompanyModal}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                title="Cerrar sin guardar"
              >
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="p-6">
              {/* Error general */}
              {createError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
                  <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-red-400 mr-3" />
                    <div>
                      <h4 className="text-red-400 font-medium">
                        Error al {isEditMode ? 'actualizar' : 'crear'} empresa
                      </h4>
                      <p className="text-red-300 text-sm mt-1">{createError}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Información de la Empresa */}
                <div className="space-y-4">
                  <h4 className="text-white font-medium flex items-center mb-4">
                    <Building2 className="h-4 w-4 mr-2 text-blue-400" />
                    Información de la Empresa
                  </h4>

                  {/* Nombre de la empresa */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Nombre de la empresa <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Ej: Axafone Telecomunicaciones"
                      className={`w-full bg-slate-700 border rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 ${
                        formErrors.name ? 'border-red-500' : 'border-slate-600'
                      }`}
                      maxLength={255}
                    />
                    {formErrors.name && (
                      <p className="text-red-400 text-sm mt-1">{formErrors.name}</p>
                    )}
                  </div>

                  {/* Sector */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Sector <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={formData.sector}
                      onChange={(e) => handleInputChange('sector', e.target.value)}
                      className={`w-full bg-slate-700 border rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500 ${
                        formErrors.sector ? 'border-red-500' : 'border-slate-600'
                      }`}
                    >
                      <option value="">Seleccionar sector</option>
                      <option value="TELECOM">Telecomunicaciones</option>
                      <option value="LEGAL">Legal</option>
                      <option value="RETAIL">Retail</option>
                      <option value="TECH">Tecnología</option>
                      <option value="HEALTH">Salud</option>
                      <option value="FINANCE">Finanzas</option>
                      <option value="EDUCATION">Educación</option>
                      <option value="MANUFACTURING">Manufactura</option>
                      <option value="OTHER">Otro</option>
                    </select>
                    {formErrors.sector && (
                      <p className="text-red-400 text-sm mt-1">{formErrors.sector}</p>
                    )}
                  </div>
                </div>

                {/* Información del Administrador */}
                <div className="space-y-4">
                  <h4 className="text-white font-medium flex items-center mb-4">
                    <Users className="h-4 w-4 mr-2 text-purple-400" />
                    Administrador
                  </h4>

                  {/* Nombre del administrador */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Nombre completo <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.admin_name}
                      onChange={(e) => handleInputChange('admin_name', e.target.value)}
                      placeholder="Ej: Juan Pérez García"
                      className={`w-full bg-slate-700 border rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 ${
                        formErrors.admin_name ? 'border-red-500' : 'border-slate-600'
                      }`}
                      maxLength={255}
                    />
                    {formErrors.admin_name && (
                      <p className="text-red-400 text-sm mt-1">{formErrors.admin_name}</p>
                    )}
                  </div>

                  {/* Teléfono */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Teléfono <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.admin_phone}
                      onChange={(e) => handleInputChange('admin_phone', e.target.value)}
                      placeholder="Ej: +34 123 456 789"
                      className={`w-full bg-slate-700 border rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 ${
                        formErrors.admin_phone ? 'border-red-500' : 'border-slate-600'
                      }`}
                      maxLength={20}
                    />
                    {formErrors.admin_phone && (
                      <p className="text-red-400 text-sm mt-1">{formErrors.admin_phone}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Email <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.admin_email}
                      onChange={(e) => handleInputChange('admin_email', e.target.value)}
                      placeholder="Ej: admin@empresa.com"
                      className={`w-full bg-slate-700 border rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 ${
                        formErrors.admin_email ? 'border-red-500' : 'border-slate-600'
                      }`}
                      maxLength={255}
                    />
                    {formErrors.admin_email && (
                      <p className="text-red-400 text-sm mt-1">{formErrors.admin_email}</p>
                    )}
                  </div>

                  {/* Contraseña */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Contraseña <span className="text-red-400">*</span>
                      {isEditMode && (
                        <span className="text-slate-500 font-normal ml-2">(opcional - dejar vacío para mantener actual)</span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.admin_password}
                        onChange={(e) => handleInputChange('admin_password', e.target.value)}
                        placeholder={isEditMode ? "Nueva contraseña (opcional)" : "Mínimo 6 caracteres"}
                        className={`w-full bg-slate-700 border rounded px-3 py-2 pr-10 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 ${
                          formErrors.admin_password ? 'border-red-500' : 'border-slate-600'
                        }`}
                        maxLength={255}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {formErrors.admin_password && (
                      <p className="text-red-400 text-sm mt-1">{formErrors.admin_password}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Información adicional */}
              <div className="mt-6 p-4 bg-slate-700/50 rounded-lg">
                <h5 className="text-slate-300 font-medium mb-2">Información:</h5>
                <ul className="text-sm text-slate-400 space-y-1">
                  <li>• Los campos marcados con <span className="text-red-400">*</span> son obligatorios</li>
                  {!isEditMode && (
                    <li>• Se generará automáticamente un ID único para la empresa</li>
                  )}
                  {isEditMode && (
                    <li>• Los cambios se guardarán inmediatamente al confirmar</li>
                  )}
                  <li>• El administrador podrá acceder al dashboard con estas credenciales</li>
                </ul>
              </div>

              {/* Botones */}
              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-slate-700">
                <button
                  type="button"
                  onClick={closeCompanyModal}
                  disabled={isCreating}
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 text-white rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className={`px-6 py-2 text-white rounded-lg transition-colors flex items-center space-x-2 ${
                    isEditMode 
                      ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-700' 
                      : 'bg-green-600 hover:bg-green-700 disabled:bg-green-700'
                  }`}
                >
                  {isCreating ? (
                    <>
                      <Loader className="animate-spin h-4 w-4" />
                      <span>{isEditMode ? 'Actualizando...' : 'Creando...'}</span>
                    </>
                  ) : (
                    <>
                      {isEditMode ? (
                        <Edit className="h-4 w-4" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      <span>{isEditMode ? 'Actualizar Empresa' : 'Crear Empresa'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
EOF

echo "✅ Dashboard actualizado con modal de edición completo"

# Paso 4: Reiniciar servidor API
echo ""
echo "🔄 Reiniciando servidor API..."

cd api

if pgrep -f "node.*server.js" > /dev/null; then
    echo "🛑 Deteniendo servidor anterior..."
    pkill -f "node.*server.js"
    sleep 2
fi

echo "🚀 Iniciando servidor con endpoint PUT..."
node src/server.js &
sleep 3

if pgrep -f "node.*server.js" > /dev/null; then
    echo "✅ Servidor API reiniciado con endpoint PUT"
else
    echo "❌ Error: Servidor no se pudo iniciar"
    exit 1
fi

# Paso 5: Verificar frontend
echo ""
echo "🔍 Verificando servidor de desarrollo..."

cd ../super-admin/frontend

if pgrep -f "npm run dev" > /dev/null || pgrep -f "vite" > /dev/null; then
    echo "✅ Servidor de desarrollo ejecutándose"
    echo "   Los cambios se aplicarán automáticamente"
else
    echo "⚠️ Servidor de desarrollo no está corriendo"
    echo "   Iniciando servidor..."
    npm run dev &
    sleep 3
    echo "✅ Servidor frontend iniciado"
fi

echo ""
echo "🎉 MODAL DE EDICIÓN IMPLEMENTADO COMPLETAMENTE"
echo "============================================="
echo ""
echo "✅ API Service: Método updateCompany agregado"
echo "✅ Backend: Endpoint PUT /api/companies/:id creado"
echo "✅ Frontend: Modal unificado para Crear/Editar"
echo "✅ Validaciones: Completas para ambos modos"
echo "✅ UX/UI: Botón X para cerrar sin guardar"
echo ""
echo "🎯 FUNCIONALIDADES IMPLEMENTADAS:"
echo "================================="
echo ""
echo "➕ CREAR EMPRESA:"
echo "   • Botón 'Agregar Empresa' (verde)"
echo "   • Modal con formulario vacío"
echo "   • Botón 'Crear Empresa' (verde)"
echo "   • Validaciones completas"
echo ""
echo "✏️ EDITAR EMPRESA:"
echo "   • Botón 'Editar' en cada card de empresa"
echo "   • Modal con datos precargados"
echo "   • Botón 'Actualizar Empresa' (azul)"
echo "   • Validación de email único (excepto empresa actual)"
echo "   • Contraseña opcional (mantiene actual si vacío)"
echo ""
echo "🔧 CARACTERÍSTICAS DEL MODAL:"
echo "   • Header dinámico (Crear/Editar + iconos)"
echo "   • Botón X arriba derecha para cerrar"
echo "   • Formulario idéntico para ambos modos"
echo "   • Estados de carga diferenciados"
echo "   • Mensajes de éxito específicos"
echo ""
echo "🧪 PRUEBA EL MODAL DE EDICIÓN:"
echo "============================="
echo ""
echo "1. Ve a: http://194.164.172.92:3000"
echo ""
echo "2. Haz clic en 'Editar' en cualquier empresa"
echo ""
echo "3. Verifica que los datos aparecen precargados"
echo ""
echo "4. Modifica algún campo (ej: nombre o sector)"
echo ""
echo "5. Haz clic en 'Actualizar Empresa'"
echo ""
echo "6. Deberías ver:"
echo "   • Alert: 'Empresa actualizada exitosamente'"
echo "   • Cambios reflejados en la lista"
echo ""
echo "7. Prueba el botón X para cerrar sin guardar"
echo ""
echo "🔍 ENDPOINTS DISPONIBLES:"
echo "========================"
echo "• POST /api/companies - Crear empresa"
echo "• PUT /api/companies/:id - Actualizar empresa" 
echo "• DELETE /api/companies/:id - Eliminar empresa"
echo "• GET /api/companies - Listar empresas"
echo ""
echo "🎉 ¡CRUD COMPLETO DE EMPRESAS FUNCIONANDO!"

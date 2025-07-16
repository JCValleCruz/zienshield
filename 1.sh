#!/bin/bash

# Script para arreglar los campos del frontend ZienSHIELD
# Ejecutar desde: /home/gacel/zienshield

set -e

echo "🔧 Iniciando corrección de campos del frontend ZienSHIELD..."

# Verificar que estamos en la ubicación correcta
if [ ! -d "super-admin/frontend/src" ]; then
    echo "❌ Error: No se encuentra la estructura del proyecto."
    echo "   Ejecuta este script desde /home/gacel/zienshield"
    exit 1
fi

# Crear backup de los archivos originales
echo "📦 Creando backup de archivos originales..."
cp super-admin/frontend/src/services/api.ts super-admin/frontend/src/services/api.ts.backup.$(date +%Y%m%d_%H%M%S)
cp super-admin/frontend/src/components/Dashboard.tsx super-admin/frontend/src/components/Dashboard.tsx.backup.$(date +%Y%m%d_%H%M%S)

# Crear el nuevo archivo api.ts
echo "🔄 Actualizando api.ts..."
cat > super-admin/frontend/src/services/api.ts << 'EOF'
// src/services/api.ts
const API_BASE_URL = 'http://194.164.172.92:3001/api';

export interface Company {
  id: number;
  name: string;
  sector: string;
  tenant_id: string;
  phone?: string;
  address?: string;
  website?: string;
  status?: string;
  updated_at?: string;
  admin_name: string;
  admin_phone: string;
  admin_email: string;
  created_at: string;
  wazuh_group?: string;
}

// ✅ CORREGIDO: Interfaz actualizada para coincidir con el backend
export interface CreateCompanyData {
  company_name: string;    // ← Cambiar 'name' a 'company_name'
  sector: string;
  admin_phone: string;
  admin_email: string;
  admin_password: string;
  // ❌ NO incluir tenant_id (backend lo genera automáticamente)
  // ❌ NO incluir admin_name (backend no lo usa actualmente)
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  timestamp: string;
  error?: string;
  details?: string[];
}

// Interfaces adicionales para Wazuh
export interface WazuhGroup {
  id: string;
  name: string;
  description?: string;
  agents_count?: number;
}

export interface SyncResponse {
  synced_companies: number;
  failed_companies: string[];
  total_companies: number;
  timestamp: string;
}

class ApiService {
  private async fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API Error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error en API ${endpoint}:`, error);
      throw error;
    }
  }

  async healthCheck(): Promise<ApiResponse<any>> {
    return this.fetchApi('/health');
  }

  async getCompanies(): Promise<ApiResponse<Company[]>> {
    return this.fetchApi('/companies');
  }

  async getCompany(id: number): Promise<ApiResponse<Company>> {
    return this.fetchApi(`/companies/${id}`);
  }

  async createCompany(companyData: CreateCompanyData): Promise<ApiResponse<Company>> {
    return this.fetchApi('/companies', {
      method: 'POST',
      body: JSON.stringify(companyData),
    });
  }

  async updateCompany(id: number, companyData: CreateCompanyData): Promise<ApiResponse<Company>> {
    return this.fetchApi(`/companies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(companyData),
    });
  }

  async deleteCompany(id: number): Promise<ApiResponse<any>> {
    return this.fetchApi(`/companies/${id}`, {
      method: 'DELETE',
    });
  }

  // Método para sincronizar empresas con Wazuh
  async syncCompaniesWithWazuh(): Promise<ApiResponse<SyncResponse>> {
    return this.fetchApi('/sync/companies-to-wazuh', {
      method: 'POST',
    });
  }

  // Método para obtener grupos de Wazuh
  async getWazuhGroups(): Promise<ApiResponse<WazuhGroup[]>> {
    return this.fetchApi('/sync/wazuh-groups');
  }

  // Método para obtener estadísticas de sincronización
  async getSyncStats(): Promise<ApiResponse<any>> {
    return this.fetchApi('/sync/stats');
  }

  // Método para sincronizar una empresa específica
  async syncCompanyWithWazuh(companyId: number): Promise<ApiResponse<any>> {
    return this.fetchApi(`/sync/companies/${companyId}/wazuh`, {
      method: 'POST',
    });
  }

  // Método para desincronizar una empresa de Wazuh
  async unsyncCompanyFromWazuh(companyId: number): Promise<ApiResponse<any>> {
    return this.fetchApi(`/sync/companies/${companyId}/wazuh`, {
      method: 'DELETE',
    });
  }
}

export const apiService = new ApiService();
EOF

# Actualizar Dashboard.tsx - solo la parte del handleSubmit
echo "🔄 Actualizando Dashboard.tsx..."
sed -i '/const submitData: CreateCompanyData = {/,/};/c\
      // ✅ CORREGIDO: Datos preparados para coincidir con backend\
      const submitData: CreateCompanyData = {\
        company_name: formData.name.trim(),     // ← Cambiar '\''name'\'' a '\''company_name'\''\
        sector: formData.sector.trim() || '\''OTHER'\'',\
        admin_phone: formData.admin_phone.trim() || '\''+34 000 000 000'\'',\
        admin_email: formData.admin_email.trim() || `admin@${formData.name.toLowerCase().replace(/\\s+/g, '\'''\'')}`.com`,\
        admin_password: formData.admin_password.trim() || '\''password123'\''\
        // ❌ NO enviar tenant_id (backend lo genera automáticamente)\
        // ❌ NO enviar admin_name (backend no lo usa actualmente)\
      };' super-admin/frontend/src/components/Dashboard.tsx

echo "✅ Corrección completada!"
echo ""
echo "📋 Resumen de cambios:"
echo "   • api.ts: Actualizada interfaz CreateCompanyData"
echo "   • Dashboard.tsx: Corregido submitData para usar company_name"
echo "   • Se crearon backups de los archivos originales"
echo ""
echo "🔄 Próximos pasos:"
echo "   1. Reiniciar el servidor de desarrollo del frontend"
echo "   2. Probar la creación de una empresa"
echo ""
echo "💡 Comandos para reiniciar:"
echo "   cd /home/gacel/zienshield/super-admin/frontend"
echo "   npm start"
EOF

# Hacer el script ejecutable
chmod +x fix-frontend-fields.sh

echo "✅ Script creado: fix-frontend-fields.sh"
echo ""
echo "🚀 Para ejecutar el script:"
echo "   cd /home/gacel/zienshield"
echo "   ./fix-frontend-fields.sh"
echo ""
echo "¿Quieres que ejecute el script ahora? (Escribe 'sí' para continuar)"

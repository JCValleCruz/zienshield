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

// ACTUALIZADA: Interfaces para estadísticas globales con vulnerabilidades
export interface GlobalStats {
  companies: {
    total: number;
    synced: number;
  };
  agents: {
    total: number;
    active: number;
    inactive: number;
    pending: number;
  };
  alerts: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  compliance: {
    average: number;
  };
  vulnerabilities: {  // NUEVO: Vulnerabilidades reales de Wazuh
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  wazuh: {
    status: string;
    version: string;
    last_check: string;
  };
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

  // Método para obtener estadísticas globales (incluye agentes y vulnerabilidades de Wazuh)
  async getGlobalStats(): Promise<ApiResponse<GlobalStats>> {
    return this.fetchApi('/stats');
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

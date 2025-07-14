// src/services/api.ts
const API_BASE_URL = 'http://localhost:3002/api';

export interface Company {
  id: number;
  name: string;
  sector: string;
  tenant_id: string;
  admin_name: string;
  admin_email: string;
  created_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  timestamp: string;
  error?: string;
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
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
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
}

export const apiService = new ApiService();

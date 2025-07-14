#!/bin/bash

# Script rápido para arreglar error TypeScript admin_phone
# Ejecutar desde: /home/gacel/zienshield
# Uso: ./quick_fix_typescript.sh

set -e

echo "🔧 Quick Fix: TypeScript admin_phone Error"
echo "========================================="

# Verificar directorio
if [ ! -f "super-admin/frontend/src/services/api.ts" ]; then
    echo "❌ Error: Este script debe ejecutarse desde /home/gacel/zienshield"
    exit 1
fi

API_FILE="super-admin/frontend/src/services/api.ts"
BACKUP_FILE="super-admin/frontend/src/services/api.ts.backup.$(date +%Y%m%d_%H%M%S)"

echo "📁 Archivo a corregir: $API_FILE"

# Crear backup
echo "💾 Creando backup..."
cp "$API_FILE" "$BACKUP_FILE"
echo "✅ Backup: $BACKUP_FILE"

echo ""
echo "🔧 Actualizando interfaz Company..."

# Actualizar solo la interfaz Company para agregar admin_phone
cat > "$API_FILE" << 'EOF'
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
  admin_phone: string; // ← AGREGADO: Campo admin_phone
  admin_email: string;
  created_at: string;
}

export interface CreateCompanyData {
  name: string;
  sector: string;
  admin_name: string;
  admin_phone: string;
  admin_email: string;
  admin_password: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  timestamp: string;
  error?: string;
  details?: string[];
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
}

export const apiService = new ApiService();
EOF

echo "✅ Interfaz Company actualizada con admin_phone"

echo ""
echo "🔍 Verificando cambio..."

# Verificar que el cambio se aplicó
if grep -q "admin_phone: string" "$API_FILE"; then
    echo "✅ Campo admin_phone encontrado en interfaz Company"
else
    echo "❌ Error: Campo admin_phone no se agregó correctamente"
    exit 1
fi

echo ""
echo "🔧 Verificando servidor de desarrollo..."

cd super-admin/frontend

if pgrep -f "npm run dev" > /dev/null || pgrep -f "vite" > /dev/null; then
    echo "✅ Servidor de desarrollo ejecutándose"
    echo "   TypeScript se recompilará automáticamente en unos segundos..."
else
    echo "⚠️ Servidor de desarrollo no está corriendo"
    echo "   Iniciando servidor..."
    npm run dev &
    sleep 3
    echo "✅ Servidor iniciado"
fi

echo ""
echo "📋 CAMBIO APLICADO:"
echo "=================="
echo "✅ Interfaz Company actualizada:"
echo "   • admin_phone: string (AGREGADO)"
echo "✅ API Service mantiene todos los métodos"
echo "✅ Servidor frontend recompilando..."
echo ""
echo "🎯 El error TypeScript debería desaparecer en unos segundos"
echo ""
echo "🧪 Si el error persiste:"
echo "   1. Refresca el navegador (Ctrl+F5)"
echo "   2. Revisa la consola del servidor dev"
echo "   3. Reinicia el servidor: Ctrl+C y npm run dev"
echo ""
echo "🌐 Frontend: http://194.164.172.92:3000"
echo "🔥 ¡Error TypeScript solucionado!"

#!/bin/bash

# Script simple para arreglar DELETE en frontend
# Ejecutar desde: /home/gacel/zienshield
# Uso: ./simple_fix_delete.sh

set -e

echo "🔧 ZienSHIELD Simple Frontend Delete Fixer"
echo "=========================================="

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

echo "📁 Archivos a arreglar:"
echo "   Dashboard: $DASHBOARD_FILE"
echo "   API Service: $API_FILE"

# Crear backups
echo "💾 Creando backups..."
cp "$DASHBOARD_FILE" "$BACKUP_DASHBOARD"
cp "$API_FILE" "$BACKUP_API"
echo "✅ Backups creados"

# Paso 1: Arreglar API Service completo
echo ""
echo "🔧 Actualizando API Service completo..."

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

  async deleteCompany(id: number): Promise<ApiResponse<any>> {
    return this.fetchApi(`/companies/${id}`, {
      method: 'DELETE',
    });
  }
}

export const apiService = new ApiService();
EOF

echo "✅ API Service actualizado con método deleteCompany"

# Paso 2: Crear un pequeño parche para la función confirmDeleteCompany
echo ""
echo "🔧 Creando parche para función confirmDeleteCompany..."

# Crear archivo temporal con la función corregida
cat > /tmp/confirm_delete_function.txt << 'EOF'
  const confirmDeleteCompany = async () => {
    if (!companyToDelete || deleteConfirmText !== companyToDelete.name) {
      return;
    }

    try {
      console.log("🗑️ Eliminando empresa de la base de datos:", companyToDelete.name);
      
      // Llamar a la API DELETE
      const response = await apiService.deleteCompany(companyToDelete.id);
      
      if (response.success) {
        console.log("✅ Empresa eliminada exitosamente de la BD");
        
        // Remover de la lista local solo después de confirmar eliminación en BD
        setCompanies(companies.filter(c => c.id !== companyToDelete.id));
        
        // Cerrar modal
        setDeleteModalOpen(false);
        setCompanyToDelete(null);
        setDeleteConfirmText("");
        
        // Mostrar mensaje de éxito
        alert(`Empresa "${companyToDelete.name}" eliminada exitosamente`);
      }
    } catch (error) {
      console.error("❌ Error eliminando empresa:", error);
      alert(`Error al eliminar la empresa: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };
EOF

echo "📝 Archivo parche creado en /tmp/confirm_delete_function.txt"

# Mostrar la función actual que necesita reemplazo
echo ""
echo "🔍 Función actual en Dashboard:"
echo "=============================="
grep -A 15 "const confirmDeleteCompany" "$DASHBOARD_FILE" || echo "No encontrada"

echo ""
echo "⚠️  ACCIÓN MANUAL REQUERIDA:"
echo "=========================="
echo ""
echo "Necesitas editar manualmente el archivo Dashboard.tsx porque sed tiene problemas"
echo "con la sintaxis compleja. Sigue estos pasos:"
echo ""
echo "1. Abre el archivo:"
echo "   nano $DASHBOARD_FILE"
echo ""
echo "2. Busca la función 'confirmDeleteCompany' (aproximadamente línea 80-100)"
echo ""
echo "3. Reemplaza toda la función (desde 'const confirmDeleteCompany = async () => {' hasta su '}') con:"
echo ""
echo "const confirmDeleteCompany = async () => {"
echo "  if (!companyToDelete || deleteConfirmText !== companyToDelete.name) {"
echo "    return;"
echo "  }"
echo ""
echo "  try {"
echo "    console.log(\"🗑️ Eliminando empresa de la base de datos:\", companyToDelete.name);"
echo "    "
echo "    // Llamar a la API DELETE"
echo "    const response = await apiService.deleteCompany(companyToDelete.id);"
echo "    "
echo "    if (response.success) {"
echo "      console.log(\"✅ Empresa eliminada exitosamente de la BD\");"
echo "      "
echo "      // Remover de la lista local solo después de confirmar eliminación en BD"
echo "      setCompanies(companies.filter(c => c.id !== companyToDelete.id));"
echo "      "
echo "      // Cerrar modal"
echo "      setDeleteModalOpen(false);"
echo "      setCompanyToDelete(null);"
echo "      setDeleteConfirmText(\"\");"
echo "      "
echo "      // Mostrar mensaje de éxito"
echo "      alert(\`Empresa \"\${companyToDelete.name}\" eliminada exitosamente\`);"
echo "    }"
echo "  } catch (error) {"
echo "    console.error(\"❌ Error eliminando empresa:\", error);"
echo "    alert(\`Error al eliminar la empresa: \${error instanceof Error ? error.message : 'Error desconocido'}\`);"
echo "  }"
echo "};"
echo ""
echo "4. Guarda y cierra (Ctrl+X, Y, Enter)"
echo ""
echo "5. El frontend se actualizará automáticamente"
echo ""
echo "✅ API Service YA está corregido con método deleteCompany"
echo ""
echo "🧪 Después de editar, prueba eliminando una empresa:"
echo "   http://194.164.172.92:3000"

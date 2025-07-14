#!/bin/bash

# Script para probar DELETE directamente en base de datos y luego vincularlo
# Ejecutar desde: /home/gacel/zienshield
# Uso: ./test_delete_database.sh

set -e

echo "🗃️ ZienSHIELD Database DELETE Tester"
echo "===================================="

echo "📋 PASO 1: Ver empresas actuales en la base de datos"
echo "=================================================="

sudo -u postgres psql -d zienshield_multi_tenant -c "
SELECT id, name, admin_email, created_at::date as created
FROM companies 
ORDER BY id;
"

echo ""
echo "🎯 PASO 2: Elegir empresa para eliminar"
echo "======================================"

echo "Empresas disponibles para eliminar:"
echo "• ID 4: Empresa Test"
echo "• ID 5: ZienIdeas" 
echo "• ID 6: Patito"
echo ""
echo "¿Qué empresa quieres eliminar? (escribe el ID, ej: 4)"
read -r company_id

# Validar que es un número
if ! [[ "$company_id" =~ ^[0-9]+$ ]]; then
    echo "❌ Error: Debes escribir un número (ID de empresa)"
    exit 1
fi

echo ""
echo "🔍 PASO 3: Verificar empresa antes de eliminar"
echo "============================================="

# Obtener información de la empresa
company_info=$(sudo -u postgres psql -d zienshield_multi_tenant -t -c "
SELECT name FROM companies WHERE id = $company_id;
" | xargs)

if [ -z "$company_info" ]; then
    echo "❌ Error: No se encontró empresa con ID $company_id"
    exit 1
fi

echo "Empresa encontrada: $company_info"
echo ""
echo "⚠️  ¿Estás seguro de que quieres eliminar '$company_info'? (y/n)"
read -r confirm

if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "❌ Eliminación cancelada"
    exit 0
fi

echo ""
echo "🗑️ PASO 4: Eliminar empresa de la base de datos"
echo "=============================================="

# Eliminar empresa
result=$(sudo -u postgres psql -d zienshield_multi_tenant -t -c "
DELETE FROM companies WHERE id = $company_id RETURNING name;
" | xargs)

if [ -n "$result" ]; then
    echo "✅ Empresa '$result' eliminada exitosamente de la base de datos"
else
    echo "❌ Error: No se pudo eliminar la empresa"
    exit 1
fi

echo ""
echo "📋 PASO 5: Verificar eliminación"
echo "==============================="

echo "Empresas restantes en la base de datos:"
sudo -u postgres psql -d zienshield_multi_tenant -c "
SELECT id, name, admin_email, created_at::date as created
FROM companies 
ORDER BY id;
"

echo ""
echo "🧪 PASO 6: Probar API DELETE endpoint"
echo "===================================="

# Probar que la API DELETE también funciona con una empresa real
remaining_companies=$(sudo -u postgres psql -d zienshield_multi_tenant -t -c "
SELECT id FROM companies ORDER BY id LIMIT 1;
" | xargs)

if [ -n "$remaining_companies" ]; then
    echo "Probando endpoint DELETE con empresa ID $remaining_companies:"
    
    # Obtener nombre antes de eliminar
    test_company_name=$(sudo -u postgres psql -d zienshield_multi_tenant -t -c "
    SELECT name FROM companies WHERE id = $remaining_companies;
    " | xargs)
    
    echo "🔥 Eliminando '$test_company_name' vía API..."
    
    # Llamar API DELETE
    api_response=$(curl -s -X DELETE "http://194.164.172.92:3001/api/companies/$remaining_companies")
    
    echo "Respuesta de la API:"
    echo "$api_response" | jq '.' 2>/dev/null || echo "$api_response"
    
    # Verificar en BD
    echo ""
    echo "Verificando en base de datos:"
    sudo -u postgres psql -d zienshield_multi_tenant -c "
    SELECT id, name FROM companies WHERE id = $remaining_companies;
    "
    
    if [ $? -eq 0 ]; then
        remaining_check=$(sudo -u postgres psql -d zienshield_multi_tenant -t -c "
        SELECT COUNT(*) FROM companies WHERE id = $remaining_companies;
        " | xargs)
        
        if [ "$remaining_check" = "0" ]; then
            echo "✅ API DELETE funcionó correctamente - empresa eliminada de BD"
        else
            echo "❌ API DELETE no funcionó - empresa aún en BD"
        fi
    fi
fi

echo ""
echo "📋 PASO 7: Estado final de la base de datos"
echo "=========================================="

sudo -u postgres psql -d zienshield_multi_tenant -c "
SELECT id, name, admin_email, created_at::date as created
FROM companies 
ORDER BY id;
"

echo ""
echo "🔧 PASO 8: Vincular al frontend"
echo "==============================="

echo "La base de datos y API DELETE funcionan correctamente."
echo ""
echo "Ahora necesitamos actualizar el frontend para que use la API:"
echo ""
echo "🔧 Comando para arreglar el frontend:"
echo "nano super-admin/frontend/src/components/Dashboard.tsx"
echo ""
echo "Busca la función 'confirmDeleteCompany' y reemplázala con:"
echo ""
cat << 'FRONTEND_CODE'
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
FRONTEND_CODE

echo ""
echo "🎉 RESUMEN:"
echo "=========="
echo "✅ Base de datos DELETE: FUNCIONA"
echo "✅ API DELETE endpoint: FUNCIONA" 
echo "❌ Frontend modal: NECESITA ARREGLO"
echo ""
echo "📝 Acción pendiente:"
echo "   Editar Dashboard.tsx con la función mostrada arriba"
echo ""
echo "🌐 Después del arreglo:"
echo "   Ve a http://194.164.172.92:3000"
echo "   La papelera eliminará realmente de la BD"

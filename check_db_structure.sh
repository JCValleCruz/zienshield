#!/bin/bash

# Script para verificar estructura de la tabla companies (CORREGIDO)
# Ejecutar desde: /home/gacel/zienshield
# Uso: ./check_db_structure.sh

set -e

echo "🔍 ZienSHIELD Database Structure Checker"
echo "======================================"

# Verificar que estamos en el directorio correcto
if [ ! -d "api" ]; then
    echo "❌ Error: Este script debe ejecutarse desde /home/gacel/zienshield"
    echo "   Directorio actual: $(pwd)"
    exit 1
fi

echo "📊 Verificando estructura de la tabla 'companies'..."
echo ""

echo "🔍 Estructura básica de la tabla companies:"
echo "=========================================="
sudo -u postgres psql -d zienshield_multi_tenant -c "\d companies"

echo ""
echo "📝 Información detallada de columnas:"
echo "===================================="
sudo -u postgres psql -d zienshield_multi_tenant -c "
SELECT 
    column_name as \"Campo\",
    data_type as \"Tipo\",
    CASE WHEN character_maximum_length IS NOT NULL 
         THEN character_maximum_length::text
         ELSE '-' END as \"Max Length\",
    is_nullable as \"Nullable\",
    COALESCE(column_default, 'NULL') as \"Default\"
FROM information_schema.columns 
WHERE table_name = 'companies' 
ORDER BY ordinal_position;
"

echo ""
echo "🔑 Constraints de la tabla:"
echo "=========================="
sudo -u postgres psql -d zienshield_multi_tenant -c "
SELECT 
    constraint_name as \"Constraint\",
    constraint_type as \"Tipo\",
    column_name as \"Columna\"
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'companies';
"

echo ""
echo "✅ Datos actuales en la tabla:"
echo "============================="
sudo -u postgres psql -d zienshield_multi_tenant -c "
SELECT 
    id,
    name,
    sector,
    admin_name,
    admin_email,
    LEFT(tenant_id, 20) || '...' as tenant_id_preview,
    created_at::date as created_date
FROM companies 
ORDER BY id;
"

echo ""
echo "🎯 ANÁLISIS PARA FORMULARIO:"
echo "==========================="

# Crear análisis específico para el formulario
echo "📋 Campos identificados para el formulario:"

sudo -u postgres psql -d zienshield_multi_tenant -t -c "
SELECT 
    '• ' || column_name || 
    ' (' || data_type || 
    CASE WHEN character_maximum_length IS NOT NULL 
         THEN '(' || character_maximum_length || ')' 
         ELSE '' END ||
    ') - ' ||
    CASE WHEN is_nullable = 'NO' 
         THEN 'OBLIGATORIO' 
         ELSE 'OPCIONAL' END ||
    CASE WHEN column_default IS NOT NULL 
         THEN ' [Default: ' || column_default || ']'
         ELSE '' END
FROM information_schema.columns 
WHERE table_name = 'companies' 
AND column_name NOT IN ('id', 'created_at', 'updated_at')
ORDER BY 
    CASE WHEN is_nullable = 'NO' THEN 1 ELSE 2 END,
    ordinal_position;
" | sed '/^$/d'

echo ""
echo "🔍 Campos que necesitamos en el formulario:"
echo "===========================================" 

# Contar campos obligatorios vs opcionales
OBLIGATORIOS=$(sudo -u postgres psql -d zienshield_multi_tenant -t -c "
SELECT COUNT(*) 
FROM information_schema.columns 
WHERE table_name = 'companies' 
AND column_name NOT IN ('id', 'created_at', 'updated_at')
AND is_nullable = 'NO';
")

OPCIONALES=$(sudo -u postgres psql -d zienshield_multi_tenant -t -c "
SELECT COUNT(*) 
FROM information_schema.columns 
WHERE table_name = 'companies' 
AND column_name NOT IN ('id', 'created_at', 'updated_at')
AND is_nullable = 'YES';
")

echo "📊 Resumen:"
echo "   • Campos obligatorios: $OBLIGATORIOS"
echo "   • Campos opcionales: $OPCIONALES"
echo ""
echo "🚀 Próximo paso: Crear API endpoint POST /api/companies"
echo "💡 Para continuar: ./create_company_endpoint.sh"

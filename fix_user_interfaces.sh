#!/bin/bash

# Script para corregir las interfaces User en ZienSHIELD
# Ejecutar desde: /home/gacel/zienshield

echo "🔧 Iniciando corrección de interfaces User..."

# Variables de rutas
FRONTEND_DIR="super-admin/frontend/src"
APP_FILE="$FRONTEND_DIR/App.tsx"
DASHBOARD_FILE="$FRONTEND_DIR/components/Dashboard.tsx"
COMPANY_DASHBOARD_FILE="$FRONTEND_DIR/components/CompanyDashboard.tsx"

# Función para hacer backup
make_backup() {
    local file=$1
    if [ -f "$file" ]; then
        cp "$file" "$file.backup.$(date +%Y%m%d_%H%M%S)"
        echo "✅ Backup creado: $file.backup.$(date +%Y%m%d_%H%M%S)"
    fi
}

# Función para verificar si un archivo existe
check_file() {
    local file=$1
    if [ ! -f "$file" ]; then
        echo "❌ Error: No se encontró el archivo $file"
        return 1
    fi
    return 0
}

# Verificar que estamos en el directorio correcto
if [ ! -d "$FRONTEND_DIR" ]; then
    echo "❌ Error: No se encontró el directorio $FRONTEND_DIR"
    echo "   Asegúrate de ejecutar este script desde /home/gacel/zienshield"
    exit 1
fi

echo "📁 Directorio encontrado: $FRONTEND_DIR"

# Verificar que todos los archivos existen
echo "🔍 Verificando archivos..."
check_file "$APP_FILE" || exit 1
check_file "$DASHBOARD_FILE" || exit 1
check_file "$COMPANY_DASHBOARD_FILE" || exit 1

# Hacer backups
echo "💾 Creando backups..."
make_backup "$APP_FILE"
make_backup "$DASHBOARD_FILE"
make_backup "$COMPANY_DASHBOARD_FILE"

# 1. Corregir App.tsx
echo "🔧 Corrigiendo $APP_FILE..."
sed -i 's/id?: string;/id: string;/g' "$APP_FILE"
echo "✅ App.tsx corregido"

# 2. Corregir Dashboard.tsx
echo "🔧 Corrigiendo $DASHBOARD_FILE..."
sed -i 's/id: string;/id: string;/g' "$DASHBOARD_FILE"
# Buscar y reemplazar la interfaz User específica en Dashboard.tsx
sed -i '/interface User {/,/}/ {
    s/id: string;/id: string;/g
}' "$DASHBOARD_FILE"
echo "✅ Dashboard.tsx corregido"

# 3. Corregir CompanyDashboard.tsx
echo "🔧 Corrigiendo $COMPANY_DASHBOARD_FILE..."
sed -i 's/id?: string;/id: string;/g' "$COMPANY_DASHBOARD_FILE"
echo "✅ CompanyDashboard.tsx corregido"

# Verificar los cambios
echo "📋 Verificando cambios realizados..."

echo "🔍 Buscando interfaces User en los archivos..."
echo "--- App.tsx ---"
grep -n "interface User" "$APP_FILE" -A 10 || echo "No se encontró la interfaz User en App.tsx"

echo "--- Dashboard.tsx ---"
grep -n "interface User" "$DASHBOARD_FILE" -A 5 || echo "No se encontró la interfaz User en Dashboard.tsx"

echo "--- CompanyDashboard.tsx ---"
grep -n "interface User" "$COMPANY_DASHBOARD_FILE" -A 10 || echo "No se encontró la interfaz User en CompanyDashboard.tsx"

echo ""
echo "✅ Corrección completada!"
echo "📁 Los archivos originales están respaldados con extensión .backup"
echo ""
echo "🚀 Ahora puedes compilar el proyecto:"
echo "   cd super-admin/frontend"
echo "   npm run build"
echo ""
echo "📝 Si necesitas revertir los cambios, usa los archivos .backup"

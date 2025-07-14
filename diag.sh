#!/bin/bash

# Script de Diagnóstico Completo - ZienSHIELD
# Genera un reporte completo del estado del proyecto

echo "🔍 DIAGNÓSTICO COMPLETO DE ZIENSHIELD"
echo "======================================================"
echo "Fecha: $(date '+%Y-%m-%d %H:%M:%S')"
echo "======================================================"

# 1. INFORMACIÓN DEL SISTEMA
echo ""
echo "📊 1. INFORMACIÓN DEL SISTEMA"
echo "------------------------------------------------------"
echo "Usuario actual: $(whoami)"
echo "Directorio actual: $(pwd)"
echo "Sistema operativo: $(lsb_release -d | cut -f2)"
echo "Memoria disponible: $(free -h | grep Mem | awk '{print $7}')"
echo "Espacio en disco: $(df -h / | tail -1 | awk '{print $4}')"

# 2. ESTADO DE SERVICIOS CRÍTICOS
echo ""
echo "🛠️ 2. ESTADO DE SERVICIOS CRÍTICOS"
echo "------------------------------------------------------"

# PostgreSQL
if systemctl is-active --quiet postgresql; then
    echo "✅ PostgreSQL: ACTIVO"
    echo "   Puerto: $(ss -tlnp | grep :5432 | wc -l) conexiones"
else
    echo "❌ PostgreSQL: INACTIVO"
fi

# Wazuh Manager
if systemctl is-active --quiet wazuh-manager; then
    echo "✅ Wazuh Manager: ACTIVO"
else
    echo "❌ Wazuh Manager: INACTIVO"
fi

# Wazuh Dashboard
if systemctl is-active --quiet wazuh-dashboard; then
    echo "✅ Wazuh Dashboard: ACTIVO"
    echo "   URL: https://$(hostname -I | awk '{print $1}'):443"
else
    echo "❌ Wazuh Dashboard: INACTIVO"
fi

# Nginx
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx: ACTIVO"
else
    echo "❌ Nginx: INACTIVO"
fi

# 3. ESTRUCTURA DEL PROYECTO
echo ""
echo "📁 3. ESTRUCTURA DEL PROYECTO"
echo "------------------------------------------------------"
echo "Directorio base: /home/gacel/zienshield/"

if [ -d "/home/gacel/zienshield" ]; then
    echo "✅ Directorio base existe"
    echo ""
    echo "Estructura de directorios:"
    tree /home/gacel/zienshield -d -L 3 2>/dev/null || find /home/gacel/zienshield -type d -not -path '*/node_modules/*' | head -20
else
    echo "❌ Directorio base no encontrado"
fi

# 4. ESTADO DE LA BASE DE DATOS
echo ""
echo "🗄️ 4. ESTADO DE LA BASE DE DATOS"
echo "------------------------------------------------------"

if command -v psql &> /dev/null; then
    echo "Conectando a PostgreSQL..."
    
    # Verificar si la base de datos existe
    DB_EXISTS=$(sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -w zienshield_multi_tenant)
    
    if [ -n "$DB_EXISTS" ]; then
        echo "✅ Base de datos 'zienshield_multi_tenant' existe"
        
        # Contar empresas
        COMPANY_COUNT=$(sudo -u postgres psql -d zienshield_multi_tenant -tAc "SELECT COUNT(*) FROM companies;" 2>/dev/null)
        if [ -n "$COMPANY_COUNT" ]; then
            echo "📊 Empresas en BD: $COMPANY_COUNT"
            
            # Mostrar empresas
            echo ""
            echo "Lista de empresas:"
            sudo -u postgres psql -d zienshield_multi_tenant -c "SELECT id, name, sector, tenant_id, created_at FROM companies ORDER BY id;" 2>/dev/null
        else
            echo "❌ Error accediendo a la tabla companies"
        fi
        
        # Verificar otras tablas
        echo ""
        echo "Tablas en la base de datos:"
        sudo -u postgres psql -d zienshield_multi_tenant -c "\dt" 2>/dev/null
        
    else
        echo "❌ Base de datos 'zienshield_multi_tenant' no existe"
    fi
else
    echo "❌ PostgreSQL no está instalado o no disponible"
fi

# 5. ESTADO DEL FRONTEND
echo ""
echo "🖥️ 5. ESTADO DEL FRONTEND"
echo "------------------------------------------------------"

FRONTEND_DIR="/home/gacel/zienshield/super-admin/frontend"

if [ -d "$FRONTEND_DIR" ]; then
    echo "✅ Directorio frontend existe: $FRONTEND_DIR"
    
    cd "$FRONTEND_DIR"
    
    # Package.json
    if [ -f "package.json" ]; then
        echo "✅ package.json existe"
        echo "   Dependencias principales:"
        grep -E '"(react|tailwindcss|typescript)"' package.json 2>/dev/null
    else
        echo "❌ package.json no encontrado"
    fi
    
    # Node modules
    if [ -d "node_modules" ]; then
        echo "✅ node_modules existe"
        MODULE_COUNT=$(find node_modules -maxdepth 1 -type d | wc -l)
        echo "   Módulos instalados: $((MODULE_COUNT - 1))"
    else
        echo "❌ node_modules no encontrado"
    fi
    
    # Archivos de configuración
    echo ""
    echo "Archivos de configuración:"
    [ -f "tailwind.config.js" ] && echo "   ✅ tailwind.config.js" || echo "   ❌ tailwind.config.js"
    [ -f "postcss.config.js" ] && echo "   ✅ postcss.config.js" || echo "   ❌ postcss.config.js"
    [ -f "tsconfig.json" ] && echo "   ✅ tsconfig.json" || echo "   ❌ tsconfig.json"
    
    # Estructura src
    echo ""
    echo "Estructura src/:"
    if [ -d "src" ]; then
        find src -type f -name "*.tsx" -o -name "*.ts" -o -name "*.css" | head -10
    else
        echo "   ❌ Directorio src no encontrado"
    fi
    
else
    echo "❌ Directorio frontend no encontrado"
fi

# 6. ESTADO DEL BACKEND/API
echo ""
echo "🔧 6. ESTADO DEL BACKEND/API"
echo "------------------------------------------------------"

BACKEND_DIR="/home/gacel/zienshield/api"

if [ -d "$BACKEND_DIR" ]; then
    echo "✅ Directorio API existe: $BACKEND_DIR"
    
    cd "$BACKEND_DIR"
    
    # Verificar si hay servidor corriendo
    API_PROCESS=$(ps aux | grep -E "(node|npm)" | grep -v grep | head -3)
    if [ -n "$API_PROCESS" ]; then
        echo "✅ Procesos Node.js detectados:"
        echo "$API_PROCESS"
    else
        echo "⚠️ No se detectan procesos Node.js corriendo"
    fi
    
    # Verificar package.json del backend
    if [ -f "package.json" ]; then
        echo "✅ package.json del backend existe"
    else
        echo "❌ package.json del backend no encontrado"
    fi
    
else
    echo "❌ Directorio API no encontrado"
fi

# 7. PUERTOS Y CONEXIONES
echo ""
echo "🌐 7. PUERTOS Y CONEXIONES"
echo "------------------------------------------------------"

echo "Puertos en uso relevantes:"
ss -tlnp | grep -E ":(3000|3001|5432|443|80|55000|1514|1515)" | while read line; do
    echo "   $line"
done

# 8. LOGS RECIENTES
echo ""
echo "📋 8. LOGS RECIENTES (ÚLTIMAS 5 LÍNEAS)"
echo "------------------------------------------------------"

# Logs de PostgreSQL
if [ -f "/var/log/postgresql/postgresql-14-main.log" ]; then
    echo "PostgreSQL logs:"
    tail -5 /var/log/postgresql/postgresql-14-main.log 2>/dev/null | sed 's/^/   /'
fi

# Logs de Wazuh
if [ -f "/var/ossec/logs/ossec.log" ]; then
    echo ""
    echo "Wazuh logs:"
    sudo tail -5 /var/ossec/logs/ossec.log 2>/dev/null | sed 's/^/   /'
fi

# 9. ARCHIVOS DE CONFIGURACIÓN CRÍTICOS
echo ""
echo "⚙️ 9. ARCHIVOS DE CONFIGURACIÓN CRÍTICOS"
echo "------------------------------------------------------"

CONFIG_FILES=(
    "/home/gacel/zienshield/config/app.json"
    "/home/gacel/zienshield/clavespost.txt"
    "/home/gacel/zienshield/super-admin/frontend/tailwind.config.js"
    "/home/gacel/zienshield/super-admin/frontend/postcss.config.js"
)

for file in "${CONFIG_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
        echo "   Tamaño: $(stat -c%s "$file") bytes"
        echo "   Modificado: $(stat -c%y "$file")"
    else
        echo "❌ $file"
    fi
done

# 10. PROCESOS RELACIONADOS
echo ""
echo "🔄 10. PROCESOS RELACIONADOS CON ZIENSHIELD"
echo "------------------------------------------------------"

echo "Procesos relevantes:"
ps aux | grep -E "(wazuh|postgres|nginx|node|npm)" | grep -v grep | while read line; do
    echo "   $line"
done

# 11. CONECTIVIDAD
echo ""
echo "🔗 11. VERIFICACIÓN DE CONECTIVIDAD"
echo "------------------------------------------------------"

# Test PostgreSQL local
if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
    echo "✅ PostgreSQL responde en localhost:5432"
else
    echo "❌ PostgreSQL no responde en localhost:5432"
fi

# Test Wazuh API
if curl -s -k https://localhost:55000 >/dev/null 2>&1; then
    echo "✅ Wazuh API responde en localhost:55000"
else
    echo "❌ Wazuh API no responde en localhost:55000"
fi

# Test Wazuh Dashboard
if curl -s -k https://localhost:443 >/dev/null 2>&1; then
    echo "✅ Wazuh Dashboard responde en localhost:443"
else
    echo "❌ Wazuh Dashboard no responde en localhost:443"
fi

echo ""
echo "======================================================"
echo "🏁 DIAGNÓSTICO COMPLETADO - $(date '+%H:%M:%S')"
echo "======================================================"

# Guardar reporte
REPORT_FILE="/home/gacel/zienshield/diagnostico_$(date +%Y%m%d_%H%M%S).txt"
echo ""
echo "💾 Reporte guardado en: $REPORT_FILE"

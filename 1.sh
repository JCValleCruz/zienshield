#!/bin/bash

# Script para añadir el campo 'events' faltante en Dashboard.tsx
# Uso: ./fix-dashboard.sh

DASHBOARD_FILE="super-admin/frontend/src/components/Dashboard.tsx"

echo "🔧 Arreglando Dashboard.tsx para añadir campo 'events'..."

# Verificar que el archivo existe
if [ ! -f "$DASHBOARD_FILE" ]; then
    echo "❌ Error: No se encuentra el archivo $DASHBOARD_FILE"
    exit 1
fi

# Crear backup
cp "$DASHBOARD_FILE" "$DASHBOARD_FILE.backup.$(date +%Y%m%d_%H%M%S)"
echo "📋 Backup creado: $DASHBOARD_FILE.backup.$(date +%Y%m%d_%H%M%S)"

# Buscar la línea que contiene 'vulnerabilities: { total: 0' y añadir la línea de events después
sed -i '/vulnerabilities: { total: 0, critical: 0, high: 0, medium: 0, low: 0 },/a\    events: { perSecond: 0, total: 0, totalAlerts: 0, hour: 0 },' "$DASHBOARD_FILE"

# Verificar que el cambio se hizo correctamente
if grep -q "events: { perSecond: 0, total: 0, totalAlerts: 0, hour: 0 }" "$DASHBOARD_FILE"; then
    echo "✅ Campo 'events' añadido correctamente"
    echo "📄 Mostrando las líneas modificadas:"
    echo "----------------------------------------"
    grep -A 3 -B 3 "events: { perSecond: 0" "$DASHBOARD_FILE"
    echo "----------------------------------------"
else
    echo "❌ Error: No se pudo añadir el campo 'events'"
    echo "🔄 Restaurando backup..."
    cp "$DASHBOARD_FILE.backup.$(date +%Y%m%d_%H%M%S)" "$DASHBOARD_FILE"
    exit 1
fi

echo "✅ Dashboard.tsx arreglado correctamente"
echo "🚀 Ahora puedes reiniciar el frontend para que compile sin errores"

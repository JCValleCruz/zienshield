#!/bin/bash

# Script para añadir la ruta de server-metrics al server.js existente
# Ejecutar desde: /home/gacel/zienshield

set -e

echo "🔧 Añadiendo ruta /api/system/server-metrics al server.js..."

SERVER_FILE="super-admin/backend/src/server.js"

# Verificar que el archivo existe
if [ ! -f "$SERVER_FILE" ]; then
    echo "❌ Error: No se encuentra el archivo $SERVER_FILE"
    exit 1
fi

# Crear backup
cp "$SERVER_FILE" "$SERVER_FILE.backup.$(date +%Y%m%d_%H%M%S)"
echo "📋 Backup creado: $SERVER_FILE.backup.$(date +%Y%m%d_%H%M%S)"

# Verificar si la ruta ya existe
if grep -q "server-metrics" "$SERVER_FILE"; then
    echo "⚠️  La ruta server-metrics ya existe en server.js"
else
    # Añadir la nueva ruta después de la línea de /api/stats
    sed -i "/app\.use('\/api\/stats', require('\.\/routes\/stats'));/a\\
app.use('/api/system/server-metrics', require('./routes/server-metrics'));" "$SERVER_FILE"
    
    echo "✅ Ruta /api/system/server-metrics añadida a server.js"
fi

# Verificar que el cambio se hizo correctamente
if grep -q "server-metrics" "$SERVER_FILE"; then
    echo "✅ Verificación exitosa: ruta server-metrics encontrada en server.js"
    echo "📄 Mostrando las rutas en server.js:"
    echo "----------------------------------------"
    grep -n "app\.use.*routes" "$SERVER_FILE"
    echo "----------------------------------------"
else
    echo "❌ Error: No se pudo añadir la ruta server-metrics"
    exit 1
fi

# Reiniciar el backend
echo "🔄 Reiniciando backend..."
pm2 restart zienshield-backend

# Esperar un momento para que se reinicie
sleep 3

# Verificar que el backend está funcionando
echo "🔍 Verificando estado del backend..."
pm2 status | grep zienshield-backend

# Probar el nuevo endpoint
echo "🧪 Probando el nuevo endpoint..."
sleep 2

if curl -f -s http://194.164.172.92:3001/api/system/server-metrics > /dev/null; then
    echo "✅ ¡Endpoint /api/system/server-metrics funcionando correctamente!"
    echo ""
    echo "📊 Respuesta del endpoint:"
    curl -s http://194.164.172.92:3001/api/system/server-metrics | jq '.'
else
    echo "❌ El endpoint no responde correctamente"
    echo "📋 Logs del backend:"
    pm2 logs zienshield-backend --lines 10
fi

echo ""
echo "🎉 ¡Configuración completada!"
echo "🖥️  El widget 'Sistema' ahora mostrará datos reales del servidor"

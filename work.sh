# Ir al directorio del backend
cd super-admin/backend

# Instalar dependencias de Node.js
npm install

# Agregar uuid para generar tenant_id únicos
npm install uuid

# Verificar que todo está instalado
npm list --depth=0

# Probar el servidor (ejecutar en segundo plano)
npm start &

# Esperar 3 segundos para que inicie
sleep 3

# Probar endpoints
echo "🔍 Probando endpoint de salud:"
curl -s http://localhost:3001/api/health | head -5

echo -e "\n🔍 Probando estadísticas globales:"
curl -s http://localhost:3001/api/stats | head -10

echo -e "\n🔍 Probando lista de empresas:"
curl -s http://localhost:3001/api/companies | head -10

# Detener el servidor para configurar mejor
pkill -f "node src/server.js"

# ========================================
# PASO 4B: ARREGLAR EXTRACCIÓN DE OS Y HARDWARE
# ========================================

cd /home/gacel/zienshield

echo "🔧 ARREGLANDO EXTRACCIÓN DE OS Y HARDWARE"
echo "========================================"

# 1. Hacer backup del controlador actual
echo "1. HACIENDO BACKUP DEL CONTROLADOR:"
cp super-admin/backend/src/controllers/company-stats.js super-admin/backend/src/controllers/company-stats.js.backup.$(date +%Y%m%d_%H%M%S)

# 2. Arreglar la extracción de datos de OS y Hardware
echo "2. APLICANDO CORRECCIONES AL CONTROLADOR:"

# Buscar y reemplazar la lógica de extracción de OS
sed -i '/let osInfo = { name: "Desconocido"/,/}/ {
  /let osInfo = { name: "Desconocido"/,/}/ c\
        let osInfo = { name: "Desconocido", version: "", architecture: "N/A" };\
        try {\
          const osResponse = await wazuhApiCall(`/syscollector/${agent.id}/os`);\
          if (osResponse && osResponse.data && osResponse.data.affected_items && osResponse.data.affected_items.length > 0) {\
            const osData = osResponse.data.affected_items[0];\
            osInfo = {\
              name: osData.os?.name || "Desconocido",\
              version: osData.os?.version || "",\
              architecture: osData.architecture || "N/A"\
            };\
          }\
        } catch (osError) {\
          console.warn(`⚠️ No se pudo obtener OS del agente ${agent.id}`);\
        }
}' super-admin/backend/src/controllers/company-stats.js

# Buscar y reemplazar la lógica de extracción de Hardware  
sed -i '/let hardwareInfo = { ram: "N\/A"/,/}/ {
  /let hardwareInfo = { ram: "N\/A"/,/}/ c\
        let hardwareInfo = { ram: "N/A", cpu: "N/A", cores: 0 };\
        try {\
          const hwResponse = await wazuhApiCall(`/syscollector/${agent.id}/hardware`);\
          if (hwResponse && hwResponse.data && hwResponse.data.affected_items && hwResponse.data.affected_items.length > 0) {\
            const hwData = hwResponse.data.affected_items[0];\
            hardwareInfo = {\
              ram: hwData.ram?.total ? `${Math.round(hwData.ram.total / (1024 * 1024))} GB` : "N/A",\
              cpu: hwData.cpu?.name ? hwData.cpu.name.trim() : "N/A",\
              cores: hwData.cpu?.cores || 0\
            };\
          }\
        } catch (hwError) {\
          console.warn(`⚠️ No se pudo obtener hardware del agente ${agent.id}`);\
        }
}' super-admin/backend/src/controllers/company-stats.js

echo "3. VERIFICANDO CAMBIOS APLICADOS:"
grep -A 10 -B 2 "osData.os?.name" super-admin/backend/src/controllers/company-stats.js || echo "Verificando manualmente..."

echo "4. REINICIANDO BACKEND:"
pm2 restart zienshield-backend

echo "5. ESPERANDO REINICIO..."
sleep 5

echo "6. PROBANDO ENDPOINT ACTUALIZADO:"
curl -s "http://194.164.172.92:3001/api/company/axafone-tel-001/devices?limit=1" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if 'devices' in data.get('data', {}):
    device = data['data']['devices'][0]
    print('🖥️  Dispositivo:', device['name'])
    print('💻 OS:', device['os'])
    print('🔧 CPU:', device['hardware']['cpu'])
    print('💾 RAM:', device['hardware']['ram'])
    print('🏗️  Cores:', device['hardware']['cores'])
else:
    print('❌ Error en el endpoint')
    print(json.dumps(data, indent=2))
"

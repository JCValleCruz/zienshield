#!/bin/bash
# Prueba directa de winget en agente activo

WAZUH_API_URL="https://194.164.172.92:55000"
WAZUH_USER="wazuh"
WAZUH_PASSWORD="wazuh"
AGENT_ID="004"  # pc-axafone-teo

echo "🚀 PRUEBA DE WINGET EN AGENTE ACTIVO"
echo "===================================="
echo "🎯 Objetivo: pc-axafone-teo (192.168.100.85)"
echo ""

# Obtener token
echo "🔐 Obteniendo token..."
TOKEN=$(curl -u ${WAZUH_USER}:${WAZUH_PASSWORD} -k -s -X POST \
  "${WAZUH_API_URL}/security/user/authenticate" \
  -H "Content-Type: application/json" | jq -r '.data.token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
    echo "❌ Error de autenticación"
    exit 1
fi

echo "✅ Token obtenido: ${TOKEN:0:20}..."

# Verificar que el agente esté activo
echo "🔍 Verificando estado del agente..."
AGENT_STATUS=$(curl -k -s -X GET \
  "${WAZUH_API_URL}/agents/${AGENT_ID}" \
  -H "Authorization: Bearer ${TOKEN}" | jq -r '.data.affected_items[0].status // "unknown"')

echo "📊 Estado del agente ${AGENT_ID}: $AGENT_STATUS"

if [ "$AGENT_STATUS" = "active" ]; then
    echo "✅ Agente activo, procediendo con el comando..."
    
    echo ""
    echo "🔄 INTENTANDO DIFERENTES MÉTODOS DE EJECUCIÓN:"
    echo "=============================================="
    
    # Método 1: Comando restart-wazuh (comando conocido que funciona)
    echo "1️⃣ Probando comando predefinido..."
    
    RESPONSE1=$(curl -k -s -w "HTTPSTATUS:%{http_code}" -X PUT \
      "${WAZUH_API_URL}/active-response" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer ${TOKEN}" \
      -d "{
        \"command\": \"restart-wazuh\",
        \"arguments\": [],
        \"alert\": {
          \"data\": {
            \"srcip\": \"194.164.172.92\"
          }
        },
        \"agents_list\": [\"${AGENT_ID}\"]
      }")
    
    HTTP_CODE1=$(echo $RESPONSE1 | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    RESPONSE_BODY1=$(echo $RESPONSE1 | sed -e 's/HTTPSTATUS:.*//g')
    
    echo "   HTTP Code: $HTTP_CODE1"
    echo "   Response: $RESPONSE_BODY1"
    
    if [ $HTTP_CODE1 -eq 200 ]; then
        echo "   ✅ Comando predefinido funciona correctamente"
        
        # Método 2: Intentar comando personalizado
        echo ""
        echo "2️⃣ Probando comando personalizado para winget..."
        
        # Crear un comando más simple primero
        RESPONSE2=$(curl -k -s -w "HTTPSTATUS:%{http_code}" -X PUT \
          "${WAZUH_API_URL}/active-response" \
          -H "Content-Type: application/json" \
          -H "Authorization: Bearer ${TOKEN}" \
          -d "{
            \"command\": \"wazuh-winget\",
            \"arguments\": [],
            \"alert\": {
              \"data\": {
                \"srcip\": \"194.164.172.92\"
              }
            },
            \"agents_list\": [\"${AGENT_ID}\"]
          }")
        
        HTTP_CODE2=$(echo $RESPONSE2 | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
        RESPONSE_BODY2=$(echo $RESPONSE2 | sed -e 's/HTTPSTATUS:.*//g')
        
        echo "   HTTP Code: $HTTP_CODE2"
        echo "   Response: $RESPONSE_BODY2"
        
        if [ $HTTP_CODE2 -eq 200 ]; then
            echo "   ✅ Comando personalizado enviado"
        else
            echo "   ⚠️ Comando personalizado falló (esperado si no está configurado)"
        fi
        
    else
        echo "   ❌ Active Response no funciona correctamente"
    fi
    
    echo ""
    echo "📋 ANÁLISIS DE RESULTADOS:"
    echo "========================="
    
    if [ $HTTP_CODE1 -eq 200 ]; then
        echo "✅ Active Response está funcionando en este agente"
        echo ""
        echo "🎯 PRÓXIMOS PASOS PARA WINGET:"
        echo "=============================="
        echo "Para ejecutar winget remotamente necesitas:"
        echo ""
        echo "A) CONFIGURAR ACTIVE RESPONSE PERSONALIZADO:"
        echo "   1. En el servidor Wazuh (194.164.172.92), editar:"
        echo "      sudo nano /var/ossec/etc/ossec.conf"
        echo ""
        echo "   2. Agregar antes de </ossec_config>:"
        echo "      <command>"
        echo "        <n>wazuh-winget</n>"
        echo "        <executable>wazuh-winget</executable>"
        echo "        <timeout_allowed>yes</timeout_allowed>"
        echo "      </command>"
        echo ""
        echo "   3. Crear el script en el agente Windows:"
        echo "      C:\\Program Files (x86)\\ossec-agent\\active-response\\bin\\wazuh-winget.cmd"
        echo "      Contenido:"
        echo "      @echo off"
        echo "      powershell.exe -ExecutionPolicy Bypass -Command \"winget upgrade --all --accept-package-agreements --accept-source-agreements --silent\""
        echo ""
        echo "   4. Reiniciar Wazuh Manager:"
        echo "      sudo systemctl restart wazuh-manager"
        echo ""
        echo "B) O USAR MÉTODO DIRECTO EN EL PC:"
        echo "   • Conectar via RDP al PC: 192.168.100.85"
        echo "   • Ejecutar: winget upgrade --all --accept-package-agreements --accept-source-agreements --silent"
        echo ""
        echo "C) CONFIGURAR MÓDULO COMMAND (Automático cada 24h):"
        echo "   • Usar los comandos PowerShell mostrados anteriormente"
        echo "   • Se ejecutará automáticamente sin intervención manual"
        
    else
        echo "❌ Active Response no está funcionando"
        echo "🔧 Posibles soluciones:"
        echo "   • Verificar configuración del Active Response en el manager"
        echo "   • Revisar logs: sudo tail -f /var/ossec/logs/ossec.log"
        echo "   • Usar método directo conectándose al PC Windows"
    fi
    
else
    echo "❌ El agente ${AGENT_ID} no está activo: $AGENT_STATUS"
    echo "Prueba con otro agente activo"
fi

echo ""
echo "🎯 ¿QUIERES EJECUTAR WINGET AHORA?"
echo "================================="
echo "Si prefieres el método directo y rápido:"
echo "1. Conecta al PC de Teo: 192.168.100.85"
echo "2. Abrir PowerShell como Admin"
echo "3. Ejecutar: winget upgrade --all --accept-package-agreements --accept-source-agreements --silent"
echo ""
echo "¡Actualizaciones completas en 5-10 minutos!"

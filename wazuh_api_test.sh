#!/bin/bash
# Script para verificar capacidades de la API de Wazuh

echo "🔍 VERIFICANDO CAPACIDADES DE LA API DE WAZUH"
echo "============================================"

# Configuración
WAZUH_API_URL="http://194.164.172.92:55000"
USERNAME="wazuh"
PASSWORD="wazuh"

echo "1. Obteniendo token de autenticación..."
TOKEN=$(curl -s -u ${USERNAME}:${PASSWORD} -k -X POST "${WAZUH_API_URL}/security/user/authenticate" | jq -r '.data.token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
    echo "❌ Error: No se pudo obtener el token de autenticación"
    exit 1
fi

echo "✅ Token obtenido exitosamente"

echo ""
echo "2. Verificando información del manager..."
curl -s -k -H "Authorization: Bearer $TOKEN" -X GET "${WAZUH_API_URL}/manager/info" | jq '.data'

echo ""
echo "3. Listando agentes existentes..."
curl -s -k -H "Authorization: Bearer $TOKEN" -X GET "${WAZUH_API_URL}/agents?limit=10" | jq '.data.affected_items[] | {id, name, ip, status, os}'

echo ""
echo "4. Verificando grupos disponibles..."
curl -s -k -H "Authorization: Bearer $TOKEN" -X GET "${WAZUH_API_URL}/groups" | jq '.data.affected_items[] | {name, count}'

echo ""
echo "✅ Verificación completa. La API está lista para enrolamiento de agentes."

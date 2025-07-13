# Crear script automatizado para Wazuh
cat > /home/gacel/zienshield/scripts/setup_wazuh.sh << 'EOF'
#!/bin/bash

# Script de instalación automática de Wazuh para ZienSHIELD Multi-Tenant
# Archivo: /home/gacel/zienshield/scripts/setup_wazuh.sh

set -e  # Salir si hay algún error

echo "🛡️ Iniciando instalación de Wazuh SIEM..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables de configuración
WAZUH_VERSION="4.8"
ELASTIC_VERSION="7.17.22"

echo -e "${BLUE}📋 Configuración de instalación:${NC}"
echo "   Wazuh versión: $WAZUH_VERSION"
echo "   Elasticsearch versión: $ELASTIC_VERSION"
echo "   Servidor IP: 194.164.172.92"
echo ""

# Paso 1: Agregar repositorio de Wazuh
echo -e "${YELLOW}📦 Agregando repositorio de Wazuh...${NC}"
curl -s https://packages.wazuh.com/key/GPG-KEY-WAZUH | sudo gpg --no-default-keyring --keyring gnupg-ring:/usr/share/keyrings/wazuh.gpg --import
sudo chmod 644 /usr/share/keyrings/wazuh.gpg
echo "deb [signed-by=/usr/share/keyrings/wazuh.gpg] https://packages.wazuh.com/4.x/apt/ stable main" | sudo tee /etc/apt/sources.list.d/wazuh.list
sudo apt update
echo -e "${GREEN}✅ Repositorio de Wazuh agregado${NC}"

# Paso 2: Instalar Wazuh Manager
echo -e "${YELLOW}🔧 Instalando Wazuh Manager...${NC}"
sudo apt install -y wazuh-manager
sudo systemctl daemon-reload
sudo systemctl enable wazuh-manager
sudo systemctl start wazuh-manager
echo -e "${GREEN}✅ Wazuh Manager instalado${NC}"

# Paso 3: Agregar repositorio de Elasticsearch
echo -e "${YELLOW}📦 Agregando repositorio de Elasticsearch...${NC}"
curl -fsSL https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo gpg --no-default-keyring --keyring gnupg-ring:/usr/share/keyrings/elasticsearch.gpg --import
sudo chmod 644 /usr/share/keyrings/elasticsearch.gpg
echo "deb [signed-by=/usr/share/keyrings/elasticsearch.gpg] https://artifacts.elastic.co/packages/7.x/apt stable main" | sudo tee /etc/apt/sources.list.d/elastic-7.x.list
sudo apt update
echo -e "${GREEN}✅ Repositorio de Elasticsearch agregado${NC}"

# Paso 4: Instalar Elasticsearch
echo -e "${YELLOW}🔧 Instalando Elasticsearch...${NC}"
sudo apt install -y elasticsearch=$ELASTIC_VERSION
sudo systemctl daemon-reload
sudo systemctl enable elasticsearch

# Configurar Elasticsearch para Wazuh
echo -e "${YELLOW}⚙️ Configurando Elasticsearch...${NC}"
sudo tee /etc/elasticsearch/elasticsearch.yml > /dev/null << EOYML
# Configuración básica para Wazuh
cluster.name: wazuh-cluster
node.name: wazuh-node-1
path.data: /var/lib/elasticsearch
path.logs: /var/log/elasticsearch
network.host: localhost
http.port: 9200
discovery.type: single-node

# Seguridad básica
xpack.security.enabled: false
xpack.monitoring.collection.enabled: true

# Memoria
bootstrap.memory_lock: false
EOYML

# Configurar memoria para Elasticsearch
sudo tee /etc/elasticsearch/jvm.options.d/heap.options > /dev/null << EOJVM
# Configurar heap para 3GB (50% de la RAM disponible)
-Xms3g
-Xmx3g
EOJVM

# Configurar permisos
sudo mkdir -p /var/log/elasticsearch
sudo chown -R elasticsearch:elasticsearch /var/lib/elasticsearch
sudo chown -R elasticsearch:elasticsearch /var/log/elasticsearch

sudo systemctl start elasticsearch
echo -e "${GREEN}✅ Elasticsearch instalado y configurado${NC}"

# Paso 5: Instalar Filebeat
echo -e "${YELLOW}🔧 Instalando Filebeat...${NC}"
sudo apt install -y filebeat=$ELASTIC_VERSION

# Configurar Filebeat para Wazuh
sudo curl -so /etc/filebeat/filebeat.yml https://packages.wazuh.com/4.8/tpl/wazuh/filebeat/filebeat.yml
sudo curl -so /etc/filebeat/wazuh-template.json https://raw.githubusercontent.com/wazuh/wazuh/4.8/extensions/elasticsearch/7.x/wazuh-template.json

# Configurar template
sudo filebeat setup --index-management -E setup.template.json.enabled=false

sudo systemctl daemon-reload
sudo systemctl enable filebeat
sudo systemctl start filebeat
echo -e "${GREEN}✅ Filebeat instalado y configurado${NC}"

# Paso 6: Instalar Wazuh Dashboard
echo -e "${YELLOW}🔧 Instalando Wazuh Dashboard...${NC}"
sudo apt install -y wazuh-dashboard

# Configurar Wazuh Dashboard
sudo tee /etc/wazuh-dashboard/opensearch_dashboards.yml > /dev/null << EODASH
# Configuración del servidor
server.host: "0.0.0.0"
server.port: 443
opensearch.hosts: ["https://localhost:9200"]

# SSL (deshabilitado por ahora)
opensearch.ssl.verificationMode: none

# Configuración de Wazuh
opensearch.username: "admin"
opensearch.password: "admin"

# Configuración de logs
logging.dest: /var/log/wazuh-dashboard/wazuh-dashboard.log
EODASH

# Crear directorio de logs
sudo mkdir -p /var/log/wazuh-dashboard
sudo chown -R wazuh-dashboard:wazuh-dashboard /var/log/wazuh-dashboard

sudo systemctl daemon-reload
sudo systemctl enable wazuh-dashboard
sudo systemctl start wazuh-dashboard
echo -e "${GREEN}✅ Wazuh Dashboard instalado${NC}"

# Paso 7: Configurar grupos para multi-tenant
echo -e "${YELLOW}🏢 Configurando grupos para multi-tenant...${NC}"
sudo tee -a /var/ossec/etc/ossec.conf > /dev/null << EOCONF

<!-- Configuración multi-tenant -->
<wodle name="vulnerability-detection">
<enabled>yes</enabled>
<interval>5m</interval>
<run_on_start>yes</run_on_start>
</wodle>

<!-- Configuración de grupos por defecto -->
<auth>
<port>1515</port>
<use_source_ip>no</use_source_ip>
<use_password>yes</use_password>
<ssl_verify_host>no</ssl_verify_host>
<ssl_auto_negotiate>no</ssl_auto_negotiate>
</auth>
EOCONF

# Reiniciar Wazuh Manager
sudo systemctl restart wazuh-manager
echo -e "${GREEN}✅ Configuración multi-tenant aplicada${NC}"

# Paso 8: Verificación final
echo -e "${YELLOW}🔍 Verificando instalación...${NC}"
sleep 30

# Verificar servicios
echo -e "${BLUE}📊 Estado de servicios:${NC}"
services=("wazuh-manager" "elasticsearch" "filebeat" "wazuh-dashboard")
for service in "${services[@]}"; do
    if sudo systemctl is-active --quiet $service; then
        echo -e "  ✅ $service: ACTIVO"
    else
        echo -e "  ❌ $service: INACTIVO"
    fi
done

# Verificar puertos
echo -e "${BLUE}📡 Puertos activos:${NC}"
if sudo netstat -tlnp | grep -q ":9200"; then
    echo -e "  ✅ Elasticsearch (9200): ACTIVO"
else
    echo -e "  ❌ Elasticsearch (9200): INACTIVO"
fi

if sudo netstat -tlnp | grep -q ":443"; then
    echo -e "  ✅ Wazuh Dashboard (443): ACTIVO"
else
    echo -e "  ❌ Wazuh Dashboard (443): INACTIVO"
fi

if sudo netstat -tlnp | grep -q ":55000"; then
    echo -e "  ✅ Wazuh API (55000): ACTIVO"
else
    echo -e "  ❌ Wazuh API (55000): INACTIVO"
fi

# Verificar conectividad
echo -e "${BLUE}🔌 Verificando conectividad:${NC}"
if curl -s http://localhost:9200 > /dev/null; then
    echo -e "  ✅ Elasticsearch responde"
else
    echo -e "  ❌ Elasticsearch no responde"
fi

echo ""
echo -e "${GREEN}🎉 ¡Instalación de Wazuh completada!${NC}"
echo ""
echo -e "${YELLOW}🌐 Accesos disponibles:${NC}"
echo "   Wazuh Dashboard: https://194.164.172.92"
echo "   Usuario: admin"
echo "   Contraseña: admin"
echo "   Elasticsearch: http://localhost:9200"
echo "   Wazuh API: https://localhost:55000"
echo ""
echo -e "${YELLOW}📝 Logs importantes:${NC}"
echo "   Wazuh Manager: /var/ossec/logs/ossec.log"
echo "   Elasticsearch: /var/log/elasticsearch/wazuh-cluster.log"
echo "   Wazuh Dashboard: /var/log/wazuh-dashboard/wazuh-dashboard.log"
EOF

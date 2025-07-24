#!/bin/bash

echo "🔧 Instalando stack de monitoreo ZienShield..."

# Crear directorios necesarios
mkdir -p /home/gacel/zienshield/monitoring/{prometheus,grafana,data}

echo "📋 Configuración creada:"
echo "- Docker Compose: docker-compose.monitoring.yml"
echo "- Prometheus Config: monitoring/prometheus/prometheus.yml"
echo "- Grafana Datasource: monitoring/grafana/provisioning/datasources/prometheus.yml"

echo ""
echo "🐳 Para iniciar los servicios, ejecuta:"
echo "sudo docker-compose -f docker-compose.monitoring.yml up -d"
echo ""
echo "📊 URLs de acceso remoto una vez iniciado:"
echo "- Grafana: http://194.164.172.92:3002 (admin/zienshield2024)"
echo "- Prometheus: http://194.164.172.92:9090"
echo "- Node Exporter: http://194.164.172.92:9100"
echo ""
echo "ℹ️ Servicios actuales de ZienShield:"
echo "- Wazuh Panel: http://194.164.172.92:3000"
echo "- ZienShield Super Admin: http://194.164.172.92:3001"
echo "- ZienShield Grafana: http://194.164.172.92:3002"
echo ""
echo "🔥 Si hay problemas de firewall, ejecuta:"
echo "sudo ufw allow 3002/tcp  # Grafana"
echo "sudo ufw allow 9090/tcp  # Prometheus"
echo "sudo ufw allow 9100/tcp  # Node Exporter"
echo ""
echo "⚠️ Nota: Si tienes problemas con permisos de Docker, ejecuta:"
echo "sudo usermod -aG docker $USER"
echo "newgrp docker"
#!/bin/bash

echo "🧪 Probando Sistema de Monitoreo Web ZienShield"
echo "=============================================="

echo "1️⃣ Ejecutando agente de monitoreo por 90 segundos..."
cd /home/gacel/zienshield/web-monitoring/agents
timeout 90 python3 zienshield-web-monitor-lite.py &
AGENT_PID=$!

echo "⏰ Esperando que el agente genere datos..."
sleep 95

echo ""
echo "2️⃣ Verificando log generado..."
if [ -f "/home/gacel/zienshield-web-traffic.log" ]; then
    echo "✅ Log encontrado:"
    wc -l /home/gacel/zienshield-web-traffic.log
    echo ""
    echo "📋 Últimas 3 entradas:"
    tail -3 /home/gacel/zienshield-web-traffic.log | cut -c1-100
else
    echo "❌ Log no encontrado"
fi

echo ""
echo "3️⃣ Probando APIs de tráfico web..."

echo "📊 Stats generales:"
curl -s http://194.164.172.92:3001/api/web-traffic/stats | head -c 200
echo ""

echo "🌐 Métricas de dominios:"
curl -s http://194.164.172.92:3001/api/web-traffic/domains | head -c 200
echo ""

echo "🔍 Métricas de navegadores:"
curl -s http://194.164.172.92:3001/api/web-traffic/browsers | head -c 200
echo ""

echo "4️⃣ Verificando métricas en Prometheus..."
echo "🔍 Métricas web disponibles:"
curl -s http://194.164.172.92:3001/metrics | grep "zienshield_web_" | head -5

echo ""
echo "✅ Prueba completada!"
echo ""
echo "📊 Para ver métricas en tiempo real:"
echo "   - Grafana: http://194.164.172.92:3002"
echo "   - Prometheus: http://194.164.172.92:9090"
echo "   - API Web Traffic: http://194.164.172.92:3001/api/web-traffic/stats"
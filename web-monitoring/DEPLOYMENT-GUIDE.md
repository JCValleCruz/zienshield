# 🚀 ZienShield Agent Deployment Guide

Guía completa para desplegar agentes de monitoreo web ZienShield en equipos remotos.

## 📋 Índice

1. [Descripción](#descripción)
2. [Requisitos](#requisitos)
3. [Instalación Rápida](#instalación-rápida)
4. [Despliegue Individual](#despliegue-individual)
5. [Despliegue Masivo](#despliegue-masivo)
6. [Configuración Avanzada](#configuración-avanzada)
7. [Monitoreo y Mantenimiento](#monitoreo-y-mantenimiento)
8. [Solución de Problemas](#solución-de-problemas)

## 🎯 Descripción

Los agentes ZienShield capturan métricas de navegación web y tráfico de red en tiempo real:

- **Conexiones de red activas** por dominio y proceso
- **Tiempo de navegación** por sitio web
- **Bandwidth consumido** por aplicación
- **Categorización automática** de sitios (social, trabajo, video, etc.)
- **Detección de navegadores** y aplicaciones web
- **Métricas del sistema** (CPU, memoria, disco)

## 🔧 Requisitos

### Servidor ZienShield
- ✅ Sistema ZienShield funcionando
- ✅ APIs de métricas web activadas
- ✅ Puerto 3001 accesible desde agentes

### Equipos Remotos
- **Sistema Operativo**: Linux, Windows, macOS
- **Python**: 3.6 o superior
- **Permisos**: Administrador/root
- **Red**: Conectividad SSH y HTTP al servidor

### Herramientas de Despliegue
- **SSH**: Acceso remoto a equipos
- **Python 3**: En servidor y agentes
- **Claves SSH**: Recomendado para automatización

## ⚡ Instalación Rápida

### 1. Despliegue en un Solo Equipo

```bash
# En el servidor ZienShield
cd /home/gacel/zienshield/web-monitoring/agents

# Desplegar agente remotamente
./deploy-agent.sh 192.168.1.100

# Con usuario específico
./deploy-agent.sh -u admin 192.168.1.100

# Con clave SSH
./deploy-agent.sh -k ~/.ssh/id_rsa admin@192.168.1.100
```

### 2. Despliegue Masivo

```bash
# Crear archivo de hosts
cat > hosts.txt << EOF
192.168.1.100:root:22
192.168.1.101:admin:22:/home/admin/.ssh/id_rsa
server.company.com:deploy:2222
EOF

# Desplegar en paralelo
python3 quick-deploy.py hosts.txt

# Con reporte detallado
python3 quick-deploy.py -r deployment-report.json hosts.txt
```

## 🔧 Despliegue Individual

### Script de Instalación Manual

Si prefieres instalar manualmente en un equipo:

```bash
# Copiar instalador al equipo remoto
scp install-agent.py user@target-host:/tmp/

# Conectar y ejecutar
ssh user@target-host
cd /tmp
sudo python3 install-agent.py
```

### Proceso de Instalación

El script `install-agent.py` ejecuta automáticamente:

1. **Verificación de requisitos**
   - Python 3.6+
   - Permisos de administrador
   - Conectividad al servidor

2. **Instalación de dependencias**
   ```bash
   pip install psutil requests
   ```

3. **Enrolamiento del agente**
   - Genera ID único del agente
   - Registra en servidor ZienShield
   - Crea configuración local

4. **Instalación como servicio**
   - **Linux**: Servicio systemd
   - **Windows**: Servicio de Windows
   - **macOS**: Launch daemon

5. **Inicio automático**
   - Configura inicio en boot
   - Comienza monitoreo inmediato

## 📊 Despliegue Masivo

### Archivo de Hosts

Formato: `host:user:port:key_file`

```text
# Hosts de producción
prod-server-01:root:22:/keys/prod_key
prod-server-02:root:22:/keys/prod_key
prod-server-03:root:22:/keys/prod_key

# Hosts de desarrollo
dev1.company.com:deploy:22
dev2.company.com:deploy:22

# Workstations
192.168.1.10:admin:22
192.168.1.11:admin:22
192.168.1.12:admin:22
```

### Opciones de Despliegue Paralelo

```bash
# Despliegue básico
python3 quick-deploy.py hosts.txt

# Más workers para mayor paralelismo
python3 quick-deploy.py -w 10 hosts.txt

# Modo simulación (dry-run)
python3 quick-deploy.py --dry-run hosts.txt

# Con reporte JSON
python3 quick-deploy.py -r report.json hosts.txt

# Crear archivo de ejemplo
python3 quick-deploy.py --create-example
```

## ⚙️ Configuración Avanzada

### Configuración del Agente

Archivo: `/opt/zienshield/config.json`

```json
{
  "agent_id": "uuid-generated",
  "hostname": "workstation-01",
  "server_url": "http://194.164.172.92:3001",
  "metrics_endpoint": "/api/web-traffic/metrics",
  "collection_interval": 30,
  "categories": {
    "social": ["facebook.com", "twitter.com"],
    "work": ["gmail.com", "slack.com"],
    "video": ["youtube.com", "netflix.com"]
  }
}
```

### Personalización de Categorías

Editar categorías de sitios web:

```python
# En el agente: /opt/zienshield/zienshield-agent.py
self.site_categories = {
    'work': ['company.com', 'office.com', 'gmail.com'],
    'social': ['facebook.com', 'linkedin.com'],
    'entertainment': ['youtube.com', 'netflix.com'],
    'news': ['bbc.com', 'cnn.com'],
    'custom': ['internal-app.company.com']
}
```

### Configuración de Red

Para redes corporativas con proxy:

```bash
# Variables de entorno en el agente
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080
export NO_PROXY=localhost,127.0.0.1,194.164.172.92
```

## 📈 Monitoreo y Mantenimiento

### Verificar Estado de Agentes

```bash
# Estado del servicio
ssh user@agent-host "systemctl status zienshield-web-monitor"

# Logs del agente
ssh user@agent-host "tail -f /opt/zienshield/logs/agent.log"

# Última actividad
ssh user@agent-host "journalctl -u zienshield-web-monitor -n 20"
```

### Dashboard de Métricas

Acceder al dashboard de Grafana:
- **URL**: http://194.164.172.92:3002
- **Usuario**: admin
- **Contraseña**: zienshield2024
- **Dashboard**: "ZienShield - Tráfico Web y Navegación"

### APIs de Monitoreo

```bash
# Métricas de Prometheus
curl http://194.164.172.92:3001/metrics | grep zienshield_web

# Estado de agentes
curl http://194.164.172.92:3001/api/web-traffic/agents

# Métricas específicas por agente
curl http://194.164.172.92:3001/api/web-traffic/metrics/agent-id
```

## 🔧 Comandos de Gestión

### Gestión de Servicios

```bash
# Iniciar agente
sudo systemctl start zienshield-web-monitor

# Detener agente
sudo systemctl stop zienshield-web-monitor

# Reiniciar agente
sudo systemctl restart zienshield-web-monitor

# Ver estado
sudo systemctl status zienshield-web-monitor

# Habilitar inicio automático
sudo systemctl enable zienshield-web-monitor
```

### Actualización de Agentes

```bash
# Script de actualización (crear si es necesario)
#!/bin/bash
systemctl stop zienshield-web-monitor
cp /tmp/new-zienshield-agent.py /opt/zienshield/
systemctl start zienshield-web-monitor
```

## 🐛 Solución de Problemas

### Error: No se puede conectar al servidor

```bash
# Verificar conectividad
ping 194.164.172.92
curl -I http://194.164.172.92:3001/api/web-traffic/agents

# Verificar configuración de red
cat /opt/zienshield/config.json
```

### Error: Permisos insuficientes

```bash
# Verificar permisos del agente
ls -la /opt/zienshield/
sudo chown -R root:root /opt/zienshield/
sudo chmod +x /opt/zienshield/zienshield-agent.py
```

### Error: Dependencias faltantes

```bash
# Reinstalar dependencias
sudo pip3 install psutil requests

# Verificar instalación
python3 -c "import psutil, requests; print('OK')"
```

### Error: Servicio no inicia

```bash
# Ver logs del sistema
sudo journalctl -u zienshield-web-monitor -f

# Verificar configuración
sudo systemctl cat zienshield-web-monitor

# Ejecutar manualmente para debug
cd /opt/zienshield
sudo python3 zienshield-agent.py
```

### Agente no envía métricas

```bash
# Verificar logs del agente
tail -f /opt/zienshield/logs/agent.log

# Test de conectividad manual
curl -X POST http://194.164.172.92:3001/api/web-traffic/metrics \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Verificar configuración JSON
python3 -m json.tool /opt/zienshield/config.json
```

## 📊 Métricas Capturadas

### Por Dominio
- Número total de conexiones
- Tiempo de actividad
- Bandwidth consumido
- Categoría del sitio
- Procesos asociados

### Por Navegador
- CPU utilizado
- Memoria consumida
- Tiempo activo
- Sitios visitados

### Sistema
- CPU total
- Memoria total
- Uso de disco
- Tráfico de red

## 🔐 Seguridad

### Mejores Prácticas

1. **Usar claves SSH** en lugar de contraseñas
2. **Configurar firewall** para restringir acceso
3. **Rotar credenciales** periódicamente
4. **Monitorear logs** de seguridad
5. **Actualizar agentes** regularmente

### Configuración de Firewall

```bash
# En agentes (permitir salida al servidor)
sudo ufw allow out 3001/tcp

# En servidor (permitir entrada de agentes)
sudo ufw allow 3001/tcp
```

## 📞 Soporte

Para soporte adicional:

1. **Logs detallados**: `/opt/zienshield/logs/agent.log`
2. **Configuración**: `/opt/zienshield/config.json`
3. **Estado del servicio**: `systemctl status zienshield-web-monitor`
4. **Métricas del servidor**: http://194.164.172.92:3001/metrics

---

🎉 **¡Agentes ZienShield desplegados exitosamente!**

Los equipos ahora envían métricas de navegación web al servidor central cada 30 segundos.
# 🎯 ZienShield Web Monitor - Instalador Windows CREADO

## ✅ **UBICACIÓN DEL INSTALADOR:**

### 📁 **Carpeta del paquete:**
```
/home/gacel/zienshield/web-monitoring/agents/ZienShield-WebMonitor-Portable/
```

### 📦 **Archivo comprimido:**
```
/home/gacel/zienshield/web-monitoring/agents/ZienShield-WebMonitor-Windows.tar.gz
```

## 📋 **Contenido del paquete:**

| Archivo | Tamaño | Descripción |
|---------|--------|-------------|
| `zienshield-web-monitor-windows.py` | 23 KB | **Programa principal** - Monitor web completo |
| `ZienShield-Monitor.bat` | 1.6 KB | **Launcher con menú** - Ejecutar fácilmente |
| `README.txt` | 6.3 KB | **Documentación completa** - Manual técnico |
| `INSTRUCCIONES.txt` | 5 KB | **Guía de instalación** - Paso a paso |
| `INICIO-RAPIDO.txt` | 0.5 KB | **Instalación rápida** - 3 pasos |
| `requirements.txt` | 0.1 KB | **Dependencias** - pip install |

## 🚀 **Cómo usar en Windows:**

### 1️⃣ **Copiar al equipo Windows**
- Descargar: `ZienShield-WebMonitor-Windows.tar.gz`
- Extraer la carpeta `ZienShield-WebMonitor-Portable`
- Copiar a cualquier ubicación en Windows

### 2️⃣ **Instalar requisitos** (una sola vez)
```cmd
# Verificar Python
python --version

# Si no está instalado, descargar desde:
# https://python.org/downloads

# Instalar dependencias
pip install requests
```

### 3️⃣ **Ejecutar el monitor**
```cmd
# Opción A: Menú interactivo (recomendado)
ZienShield-Monitor.bat

# Opción B: Línea de comandos
python zienshield-web-monitor-windows.py
```

## 📊 **Verificar que funciona:**

### En el equipo Windows:
1. Ejecutar el monitor
2. Debe mostrar: "✅ Métricas enviadas al backend ZienShield"
3. Logs locales en: `~/Documents/ZienShield/`

### En Grafana:
1. Ir a: http://194.164.172.92:3000
2. Dashboard: "ZienShield Web Traffic"  
3. Verificar que aparezca el nuevo agente

## 🎯 **Características del monitor:**

### ✅ **Detección automática:**
- **Navegadores**: Chrome, Firefox, Edge, Opera, Brave, etc.
- **Conexiones**: TCP activas a sitios web externos
- **Categorización**: Social, Work, Video, Shopping, etc.
- **Sistema**: Windows 7, 8, 10, 11

### 📊 **Métricas enviadas:**
- Total de conexiones activas
- Dominios únicos visitados
- Navegadores en ejecución (procesos y memoria)
- Top dominios por conexiones
- Distribución por categorías de sitios
- Información del sistema y usuario

### 🔒 **Privacidad garantizada:**
- **NO** captura contenido de páginas web
- **NO** lee historial de navegación  
- **NO** accede a archivos personales
- **SOLO** estadísticas de conexiones de red

## 📈 **Integración con ZienShield:**

### 🌐 **Comunicación:**
- **Servidor**: http://194.164.172.92:3001
- **Endpoint**: /agent-metrics
- **Protocolo**: HTTP POST con JSON
- **Frecuencia**: Cada 30 segundos

### 📊 **Visualización:**
- **Grafana**: http://194.164.172.92:3000
- **Prometheus**: http://194.164.172.92:9090
- **Dashboard**: "ZienShield Web Traffic"

## 🔧 **Para administradores:**

### 📋 **Despliegue masivo:**
1. Copiar carpeta a cada equipo
2. Ejecutar script de instalación automática
3. Verificar en Grafana que aparezcan nuevos agentes

### 📈 **Monitoreo:**
- Métricas disponibles inmediatamente en Prometheus
- Dashboards preconfiguratos en Grafana
- Alertas automáticas para agentes offline

### 🛠️ **Personalización:**
- Editar categorías de sitios en el script Python
- Cambiar frecuencia de monitoreo (30s por defecto)
- Configurar servidor backend diferente

## 📞 **Soporte:**

### 🔍 **Diagnóstico:**
```cmd
# Probar conectividad
python zienshield-web-monitor-windows.py --test

# Ejecutar una sola vez
python zienshield-web-monitor-windows.py --once

# Ver ayuda completa
python zienshield-web-monitor-windows.py --help
```

### 📋 **Logs de error:**
- **Programa**: ~/Documents/ZienShield/zienshield-web-traffic.log
- **Windows**: Visor de Eventos > Aplicaciones

---

## ✅ **RESUMEN:**

🎉 **El instalador está completamente listo y funcional**

📍 **Ubicación**: `/home/gacel/zienshield/web-monitoring/agents/`
📦 **Archivo**: `ZienShield-WebMonitor-Windows.tar.gz`
🖥️ **Compatible**: Windows 7, 8, 10, 11
🐍 **Requiere**: Python 3.7+ y librería requests
🌐 **Servidor**: http://194.164.172.92:3001
📊 **Dashboard**: http://194.164.172.92:3000

**El paquete incluye todo lo necesario para monitorear tráfico web en equipos Windows y enviar datos a la plataforma ZienShield para análisis en Grafana.**

---
*Creado el: 2025-07-24 16:02*
*Por: Claude Code Assistant*
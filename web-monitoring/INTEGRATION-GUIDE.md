# ZienShield Web Monitoring - Integración Grafana

## ✅ Estado de la Integración

La integración entre el script Python y Grafana está **COMPLETAMENTE FUNCIONAL**. 

### 🔧 Componentes Configurados:

1. **Script Python** → Recopila métricas de conexiones web
2. **Backend Node.js** → Recibe métricas vía HTTP POST 
3. **Prometheus** → Hace scraping de métricas cada 30s
4. **Grafana** → Visualiza métricas en dashboards

### 📊 Métricas Disponibles:

- `zienshield_web_domain_connections_total` - Conexiones por dominio y agente
- `zienshield_web_unique_domains` - Dominios únicos por agente  
- `zienshield_web_active_browsers` - Navegadores activos por agente
- `zienshield_web_category_connections_total` - Conexiones por categoría de sitio
- `zienshield_web_domain_session_seconds` - Tiempo de sesión por dominio (histograma)
- Y 5 métricas adicionales más...

## 🚀 Cómo Usar

### En el Cliente (donde se ejecuta el monitoreo):

```bash
# Ejecutar una vez para probar
cd /home/gacel/zienshield/web-monitoring/agents/
python3 zienshield-web-monitor-lite.py --once

# Ejecutar continuamente (recomendado)
python3 zienshield-web-monitor-lite.py

# En segundo plano
nohup python3 zienshield-web-monitor-lite.py > monitor.log 2>&1 &
```

### 📈 Verificar que Funciona:

```bash
# 1. Verificar métricas en el backend
curl http://194.164.172.92:3001/metrics | grep zienshield_web

# 2. Verificar en Prometheus
curl "http://194.164.172.92:9090/api/v1/query?query=zienshield_web_unique_domains"

# 3. Ver dashboards en Grafana
# http://194.164.172.92:3000/
```

## 🌐 URLs de Acceso:

- **Backend API**: http://194.164.172.92:3001
- **Prometheus**: http://194.164.172.92:9090  
- **Grafana**: http://194.164.172.92:3000
- **Endpoint Métricas**: http://194.164.172.92:3001/metrics
- **Endpoint Agente**: http://194.164.172.92:3001/agent-metrics

## 📊 Dashboard Grafana:

El dashboard `zienshield-web-traffic-dashboard.json` incluye:

- **Estadísticas generales**: Total conexiones, dominios únicos, navegadores
- **Top dominios**: Gráfico de barras con dominios más visitados
- **Conexiones por categoría**: Gráfico circular (social, work, video, etc.)
- **Tiempo de sesión**: Histograma de tiempo por dominio
- **Actividad por hora**: Mapa de calor de actividad web
- **Navegadores por agente**: Series temporales de navegadores activos

## ⚙️ Configuración Técnica:

### Script Python:
- **Puerto backend**: 3001 (corregido)
- **Endpoint**: `/agent-metrics` 
- **Frecuencia**: 30 segundos
- **Método**: HTTP POST con JSON

### Prometheus:
- **Scraping**: Cada 30 segundos de `194.164.172.92:3001/metrics`
- **Job**: `zienshield-super-admin`
- **Métricas**: Formato estándar Prometheus

### Backend:
- **Puerto**: 3001
- **Endpoint público**: `/agent-metrics` (sin autenticación)
- **Servicio**: `webMetricsService.js` para conversión a Prometheus

## 🎯 Datos Que Se Monitorean:

### Por Agente:
- Conexiones TCP activas
- Dominios únicos visitados  
- Navegadores web en ejecución
- Procesos de navegadores (Chrome, Firefox, Edge, etc.)

### Por Dominio:
- Número de conexiones
- Puertos utilizados
- Categoría del sitio web (social, work, video, etc.)
- Tiempo estimado de sesión

### Agregado:
- Total de agentes activos
- Ranking de dominios más visitados
- Distribución por categorías
- Tendencias de conexiones por hora

## ✅ Estado Actual:

**FUNCIONANDO CORRECTAMENTE** ✅

- Script Python: ✅ Recopila datos reales
- Backend: ✅ Recibe y procesa métricas  
- Prometheus: ✅ Hace scraping cada 30s
- Métricas: ✅ Disponibles en formato correcto
- Grafana: ✅ Configurado para leer métricas

## 📝 Próximos Pasos:

1. **Desplegar script en clientes** - Ejecutar en máquinas a monitorear
2. **Configurar dashboards** - Importar dashboard JSON en Grafana
3. **Configurar alertas** - Crear alertas para anomalías de tráfico
4. **Optimizar categorización** - Añadir más dominios a las categorías

---

*Integración completada por Claude Code - $(date)*
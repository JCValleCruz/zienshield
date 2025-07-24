# 📊 ZienShield Web Monitoring Architecture

## 🎯 Objetivo
Capturar métricas completas de navegación web desde agentes Wazuh hacia ZienShield:

### 📈 Métricas a Capturar
1. **Tiempo conectado por dominio** (YouTube, Facebook, etc.)
2. **Bandwidth por sitio web** 
3. **Historial de navegación completo**
4. **Aplicaciones utilizadas por tiempo**
5. **Tráfico de red por proceso**

## 🏗️ Arquitectura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Agente Linux  │    │   Agente Win    │    │  Agente MacOS   │
│   - netstat     │    │   - netstat     │    │   - netstat     │
│   - ss          │    │   - PowerShell  │    │   - lsof        │
│   - iftop       │    │   - Process Mon │    │   - Activity M  │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼───────────────┐
                    │      Wazuh Manager         │
                    │   - Rules personalizadas   │
                    │   - Decoders customizados  │
                    │   - API REST               │
                    └─────────────┬───────────────┘
                                  │
                    ┌─────────────▼───────────────┐
                    │    ZienShield Backend      │
                    │   - Parser de eventos      │
                    │   - Agregación de datos    │
                    │   - Métricas Prometheus    │
                    └─────────────┬───────────────┘
                                  │
                    ┌─────────────▼───────────────┐
                    │      Grafana Dashboard     │
                    │   - Tiempo por sitio       │
                    │   - Bandwidth usage        │
                    │   - Top websites           │
                    │   - Alertas personalizadas │
                    └─────────────────────────────┘
```

## 🔧 Componentes

### 1. **Agente de Monitoreo** (`zienshield-web-monitor.py`)
- Ejecuta cada 30 segundos
- Captura conexiones activas
- Resuelve IPs a dominios
- Calcula bandwidth por sitio
- Envía datos estructurados a Wazuh

### 2. **Rules de Wazuh** 
- Procesa eventos de navegación
- Categoriza sitios web (social, trabajo, etc.)
- Genera alertas por uso excesivo

### 3. **Backend Parser**
- Procesa eventos desde Wazuh API
- Agrega datos por usuario/empresa
- Expone métricas a Prometheus

### 4. **Dashboard Grafana**
- Visualización en tiempo real
- Reportes históricos
- Alertas configurables

## 📁 Estructura de Archivos

```
/home/gacel/zienshield/web-monitoring/
├── agents/
│   ├── zienshield-web-monitor.py      # Agente principal
│   ├── browser-history-parser.py     # Parser de historial
│   └── install-agent.sh              # Instalador
├── wazuh-config/
│   ├── local_rules.xml               # Rules personalizadas
│   ├── local_decoder.xml             # Decoders
│   └── ossec-agent.conf              # Config del agente
├── backend/
│   ├── webTrafficParser.js           # Parser de eventos
│   ├── webMetricsService.js          # Métricas Prometheus
│   └── webTrafficRoutes.js           # API endpoints
└── dashboards/
    ├── web-traffic-dashboard.json    # Dashboard Grafana
    └── web-alerts.json               # Configuración alertas
```

## 🚀 Plan de Implementación

### Fase 1: Agente Base
- [ ] Script Python para Linux
- [ ] Captura básica de conexiones
- [ ] Resolución DNS
- [ ] Integración con Wazuh

### Fase 2: Análisis Avanzado  
- [ ] Parser de historial de navegadores
- [ ] Monitoreo de aplicaciones
- [ ] Bandwidth por proceso

### Fase 3: Backend Integration
- [ ] API para procesar eventos
- [ ] Métricas Prometheus
- [ ] Agregación por tenant

### Fase 4: Visualización
- [ ] Dashboards Grafana
- [ ] Alertas configurables
- [ ] Reportes automáticos
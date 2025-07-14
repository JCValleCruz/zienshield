# Actualización del Dashboard - Métricas del Sistema

## 📊 Nuevas Funcionalidades Agregadas

### 1. Componente SystemMetricsGrid
- **Ubicación**: `super-admin/frontend/src/components/SystemMetricsGrid.tsx`
- **Funcionalidad**: Muestra métricas en tiempo real del servidor ZienSHIELD

### 2. Hook useSystemMetrics  
- **Ubicación**: `super-admin/frontend/src/hooks/useSystemMetrics.ts`
- **Funcionalidad**: Gestiona la obtención y actualización de métricas del sistema

### 3. Widgets Implementados

#### Grid Principal (4 columnas):
1. **CPU Usage**: Uso de procesador con barra de progreso
2. **RAM Usage**: Uso de memoria con información detallada 
3. **Disk Usage**: Uso de disco con espacio libre en GB
4. **Network Interface**: Información de red con velocidades RX/TX

#### Grid Secundario (3 columnas):
1. **Events per Second**: Eventos procesados por segundo
2. **Uptime**: Tiempo de actividad del servidor
3. **Load Average**: Carga promedio del sistema

### 4. Características Técnicas

#### Auto-actualización:
- Métricas se actualizan automáticamente cada 30 segundos
- Botón manual de actualización disponible
- Indicador visual de carga en tiempo real

#### Responsive Design:
- Grid adaptativo para diferentes tamaños de pantalla
- Optimizado para móvil, tablet y desktop
- Barras de progreso animadas con colores semáforo

#### Colores Semáforo:
- 🟢 Verde (0-49%): Uso normal
- 🟡 Amarillo (50-79%): Uso moderado  
- 🔴 Rojo (80-100%): Uso alto

### 5. Integración con Wazuh (Preparado)

El código está preparado para integrar con Wazuh cuando esté disponible:

```typescript
// TODO: Implementar llamada real a la API cuando esté disponible
// const response = await fetch('http://194.164.172.92:3001/api/system/metrics');
// const data = await response.json();
```

### 6. Archivos Modificados

```
super-admin/frontend/src/
├── components/
│   ├── Dashboard.tsx (✏️ MODIFICADO)
│   └── SystemMetricsGrid.tsx (🆕 NUEVO)
├── hooks/
│   └── useSystemMetrics.ts (🆕 NUEVO)
└── index.css (✏️ ACTUALIZADO)
```

### 7. Instalación y Uso

#### Para aplicar los cambios:
```bash
cd /home/gacel/zienshield/
chmod +x update_dashboard.sh
./update_dashboard.sh
```

#### Para iniciar el frontend:
```bash
cd super-admin/frontend
npm start
```

### 8. API Backend (Pendiente)

Para completar la funcionalidad, se necesitará implementar en el backend:

```javascript
// Endpoint: GET /api/system/metrics
{
  "success": true,
  "data": {
    "cpu": { "usage": 45, "cores": 4, "model": "Intel Xeon" },
    "memory": { "total": 8192, "used": 3072, "free": 5120, "usage": 37 },
    "disk": { "total": 80000, "used": 35000, "free": 45000, "usage": 43, "freeGB": 44 },
    "network": { "interface": "eth0", "rx": 850, "tx": 320, "speed": "1Gbps" },
    "events": { "perSecond": 25, "total": 67432 },
    "uptime": 1296000,
    "loadAverage": [1.2, 1.1, 0.9]
  },
  "timestamp": "2025-07-15T10:30:00Z"
}
```

### 9. Próximos Pasos

1. **Implementar API real** para métricas del sistema
2. **Integrar con Wazuh** para eventos reales
3. **Agregar alertas** cuando las métricas excedan umbrales
4. **Implementar histórico** de métricas con gráficos
5. **Notificaciones push** para estados críticos

### 10. Troubleshooting

#### Si hay errores de importación:
```bash
cd super-admin/frontend
npm install
npm install framer-motion lucide-react
```

#### Si el TypeScript se queja:
```bash
npm run build
# Los warnings son normales, el código funciona
```

#### Para restaurar versión anterior:
```bash
cp super-admin/frontend/src/components/Dashboard.tsx.backup super-admin/frontend/src/components/Dashboard.tsx
```

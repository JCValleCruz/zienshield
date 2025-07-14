# Dashboard Compacto - Métricas del Sistema ZienSHIELD

## 🎯 **Diseño Optimizado**

### **Grid de 4 Columnas (Mismo layout que métricas de empresas):**

1. **📊 Recursos del Sistema** (CPU + RAM + Disco en barras compactas)
2. **🌐 Network Interface** (Información de red)
3. **⚡ Events per Second** (Eventos en tiempo real)
4. **🖥️ Sistema** (Uptime + Load Average)

## 🔧 **Características del Diseño Compacto**

### **Widget 1: Recursos (Formato Leyenda)**
```
📊 Recursos
├── CPU    [▓▓▓▓▓░░░░░] 45%
├── RAM    [▓▓▓░░░░░░░] 37%
└── Disco  [▓▓▓▓░░░░░░] 43% (44 GB libre)
```

### **Widget 2: Red**
```
🌐 Red
eth0
↓ Descarga: 850 MB/s
↑ Subida:   320 MB/s
Velocidad:  1Gbps
```

### **Widget 3: Eventos**
```
⚡ Eventos
25
eventos/segundo
Total: 67,432
● En tiempo real
```

### **Widget 4: Sistema**
```
🖥️ Sistema
15d 8h
uptime
Carga: 1.20
● Online
```

## 📐 **Optimizaciones de Espacio**

### **Antes (Muy Grande):**
- 7 widgets separados
- Mucho espacio vertical
- Información repetida

### **Ahora (Compacto):**
- 4 widgets en una fila
- Altura similar a métricas de empresas
- Información condensada pero clara
- Barras de progreso como leyenda

## 🎨 **Elementos Visuales**

- **Barras de Progreso**: 6px de altura (compactas)
- **Iconos**: 12x12px (pequeños pero visibles)
- **Colores Semáforo**: Verde/Amarillo/Rojo según uso
- **Animaciones Suaves**: Shimmer en barras de progreso
- **Puntos de Estado**: Indicadores pulsantes de 6px

## 📱 **Responsive Design**

- **Desktop (>1024px)**: 4 columnas
- **Tablet (768-1024px)**: 2 columnas
- **Móvil (<768px)**: 1 columna

## 🔄 **Auto-actualización**

- Métricas se refrescan cada 30 segundos
- Indicador visual de carga (punto pulsante)
- Botón manual de actualización

## 🚀 **Implementación**

El script crea automáticamente:

1. `useSystemMetrics.ts` - Hook para datos
2. `SystemMetricsGrid.tsx` - Componente compacto
3. `Dashboard.tsx` - Dashboard actualizado con métricas
4. Estilos CSS optimizados

## 📊 **Datos Simulados**

Hasta integrar con Wazuh API real:
- CPU: 20-60% aleatorio
- RAM: 2-5GB de 8GB total
- Disco: 30-50GB de 80GB total
- Red: Velocidades realistas
- Eventos: 10-60 por segundo

## ✅ **Ventajas del Diseño Compacto**

1. **Menos Espacio**: Ocupa 1/3 del espacio anterior
2. **Más Información**: Misma cantidad de datos
3. **Mejor UX**: Información rápida de escanear
4. **Consistente**: Mismo grid que métricas empresas
5. **Responsive**: Funciona en todos los dispositivos

## 🔮 **Próximos Pasos**

1. Conectar con API real de Wazuh
2. Añadir alertas cuando métricas sean críticas
3. Histórico de métricas en gráficos
4. Configurar umbrales personalizables

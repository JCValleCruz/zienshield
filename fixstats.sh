#!/bin/bash

echo "🔧 Arreglando ubicación precisa de la cuarta card..."

cd /home/gacel/zienshield/super-admin/frontend

# Restaurar desde backup para limpiar
cp src/components/Dashboard.tsx.backup_fourth_card_* src/components/Dashboard.tsx.temp_restore
cp src/components/Dashboard.tsx.temp_restore src/components/Dashboard.tsx

echo "📁 Restaurado desde backup limpio"

# Buscar específicamente la estructura del grid de métricas
echo "🔍 Buscando estructura específica del grid..."
grep -n -A 5 -B 5 "lg:grid-cols-4\|grid-cols-.*gap.*mb" src/components/Dashboard.tsx

# Buscar donde está "Equipos Totales" y luego encontrar el verdadero cierre de esa card
# antes del modal
echo "🔍 Buscando estructura alrededor de Equipos Totales..."
sed -n '1350,1370p' src/components/Dashboard.tsx

# El problema es que necesitamos insertar ANTES del cierre del grid, no después de una card específica
# Buscar la línea que cierra el grid completo
GRID_START=$(grep -n "lg:grid-cols-4\|md:grid-cols-2.*lg:grid-cols-4" src/components/Dashboard.tsx | cut -d: -f1)

if [ -n "$GRID_START" ]; then
    echo "📍 Grid encontrado en línea: $GRID_START"
    
    # Encontrar el div que cierra ese grid (buscar hacia adelante)
    GRID_CLOSE=$(tail -n +$GRID_START src/components/Dashboard.tsx | grep -n "^[[:space:]]*</div>[[:space:]]*$" | head -1 | cut -d: -f1)
    ACTUAL_CLOSE=$((GRID_START + GRID_CLOSE - 2))
    
    echo "📍 Insertando cuarta card ANTES del cierre del grid en línea: $ACTUAL_CLOSE"
    
    # Insertar la cuarta card justo antes del cierre del grid
    sed -i "${ACTUAL_CLOSE}i\\
\\
          {/* Alertas Totales */}\\
          <div className=\"bg-slate-800 border border-slate-700 rounded-lg p-6\">\\
            <div className=\"flex items-center justify-between mb-4\">\\
              <div className=\"p-2 bg-red-500/10 rounded-lg\">\\
                <AlertTriangle className=\"h-6 w-6 text-red-400\" />\\
              </div>\\
            </div>\\
            <div>\\
              <div className=\"text-3xl font-bold text-white mb-1\">\\
                0\\
              </div>\\
              <div className=\"text-sm text-slate-400\">\\
                Alertas Totales\\
              </div>\\
            </div>\\
          </div>" src/components/Dashboard.tsx
    
    echo "✅ Cuarta card agregada en la ubicación correcta"
else
    echo "❌ No se encontró el grid"
fi

# Verificar que solo hay las 4 cards de métricas correctas
METRIC_CARDS=$(grep -c "bg-slate-800 border border-slate-700 rounded-lg p-6" src/components/Dashboard.tsx)
echo "📊 Número de cards de métricas: $METRIC_CARDS"

if [ "$METRIC_CARDS" -eq 4 ]; then
    echo "✅ Número correcto de cards (4)"
elif [ "$METRIC_CARDS" -gt 10 ]; then
    echo "❌ Demasiadas cards - hay duplicación"
else
    echo "⚠️ Número inesperado de cards: $METRIC_CARDS"
fi

# Verificar contenido
if grep -q "Alertas Totales" src/components/Dashboard.tsx; then
    echo "✅ Cuarta card presente"
else
    echo "❌ Cuarta card no presente"
fi

echo ""
echo "🔄 Recarga la página para ver las 4 cards correctamente"

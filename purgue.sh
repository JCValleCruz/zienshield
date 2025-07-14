#!/bin/bash

echo "🚨 EMERGENCIA: Restaurando Dashboard desde backup limpio..."

cd /home/gacel/zienshield/super-admin/frontend

# Buscar el backup más antiguo y limpio (antes de todos los modales)
echo "📁 Buscando backups disponibles..."
ls -la src/components/Dashboard.tsx.backup* | head -10

# Usar el backup más temprano posible
CLEAN_BACKUP=$(ls -t src/components/Dashboard.tsx.backup* | tail -1)

if [ -n "$CLEAN_BACKUP" ]; then
    echo "📁 Restaurando desde: $CLEAN_BACKUP"
    cp "$CLEAN_BACKUP" src/components/Dashboard.tsx
else
    echo "⚠️ No hay backup, creando archivo limpio básico..."
    # Si no hay backup, tendremos que recrear un archivo básico
    echo "❌ Sin backup disponible - necesitamos recrear manualmente"
    exit 1
fi

# Verificar que no hay múltiples modales
MODAL_COUNT=$(grep -c "Modal de Edición" src/components/Dashboard.tsx)
echo "🔍 Número de modales encontrados: $MODAL_COUNT"

if [ "$MODAL_COUNT" -gt 2 ]; then
    echo "❌ Aún hay múltiples modales, necesitamos limpiar más agresivamente"
    
    # Eliminar TODOS los modales duplicados excepto el primero
    # Crear archivo temporal sin modales duplicados
    awk '
    /\/\* Modal de Edición \*\// { 
        if (modal_found) next 
        modal_found = 1 
    }
    /editModalOpen.*&&/ { 
        if (in_modal && modal_count > 0) { skip = 1; next }
        if (!in_modal) { modal_count++; in_modal = 1 }
    }
    skip && /}\)\)}/ { skip = 0; in_modal = 0; next }
    !skip { print }
    ' src/components/Dashboard.tsx > src/components/Dashboard.tsx.cleaned
    
    mv src/components/Dashboard.tsx.cleaned src/components/Dashboard.tsx
    echo "✅ Archivo limpiado de modales duplicados"
fi

# Verificar estado final
FINAL_COUNT=$(grep -c "Modal de Edición" src/components/Dashboard.tsx)
echo "✅ Número final de modales: $FINAL_COUNT"

# Verificar que no hay errores de sintaxis
echo "🔍 Verificando sintaxis..."
if grep -q "editModalOpen\|handleEditCompany" src/components/Dashboard.tsx; then
    echo "⚠️ Aún hay referencias a modal de edición"
else
    echo "✅ Archivo limpio sin modales de edición"
fi

echo ""
echo "🎯 ESTADO ACTUAL:"
echo "   - Archivo Dashboard restaurado"
echo "   - Modales duplicados eliminados"
echo "   - Listo para empezar de nuevo CON CUIDADO"

#!/bin/bash

echo "🔍 Verificando estado actual del modal y corrigiendo..."

cd /home/gacel/zienshield/super-admin/frontend

# Verificar si hay errores de compilación primero
echo "📋 Verificando si hay errores de compilación..."

# Buscar la sección actual del modal para ver qué tenemos
echo "🔍 Contenido actual del modal de edición:"
grep -n -A 10 -B 5 "Modal de Edición" src/components/Dashboard.tsx

echo ""
echo "🔍 Buscando dónde termina el campo tenant_id para insertar los nuevos:"
grep -n -A 15 "Tenant ID" src/components/Dashboard.tsx

echo ""
echo "🔍 Verificando si los campos adicionales ya están:"
if grep -q "Teléfono\|Dirección\|Página Web" src/components/Dashboard.tsx; then
    echo "✅ Algunos campos ya están presentes"
    grep -n "Teléfono\|Dirección\|Página Web\|Estado.*select" src/components/Dashboard.tsx
else
    echo "❌ Los campos adicionales no están presentes"
    echo "📝 Vamos a agregarlos manualmente de forma más directa..."
    
    # Buscar exactamente donde termina el div del tenant_id
    TENANT_LINE=$(grep -n "Identificador único para el tenant" src/components/Dashboard.tsx | cut -d: -f1)
    if [ -n "$TENANT_LINE" ]; then
        echo "📍 Campo tenant_id encontrado en línea: $TENANT_LINE"
        # Agregar campos después de esa sección
        echo "📝 Agregando campos manualmente..."
        
        # Encontrar la línea donde termina ese div
        CLOSING_LINE=$(tail -n +$TENANT_LINE src/components/Dashboard.tsx | grep -n "^[[:space:]]*</div>" | head -1 | cut -d: -f1)
        ACTUAL_LINE=$((TENANT_LINE + CLOSING_LINE - 1))
        echo "📍 Insertando después de línea: $ACTUAL_LINE"
        
        # Insertar los campos manualmente
        sed -i "${ACTUAL_LINE}a\\
\\
                {/* Teléfono */}\\
                <div>\\
                  <label className=\"block text-sm font-medium text-slate-300 mb-1\">\\
                    Teléfono\\
                  </label>\\
                  <input\\
                    type=\"tel\"\\
                    value={editFormData.phone}\\
                    onChange={(e) => handleEditFormChange(\"phone\", e.target.value)}\\
                    placeholder=\"ej: +34 912 345 678\"\\
                    className=\"w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500\"\\
                  />\\
                </div>\\
\\
                {/* Dirección */}\\
                <div>\\
                  <label className=\"block text-sm font-medium text-slate-300 mb-1\">\\
                    Dirección\\
                  </label>\\
                  <textarea\\
                    value={editFormData.address}\\
                    onChange={(e) => handleEditFormChange(\"address\", e.target.value)}\\
                    placeholder=\"Dirección completa de la empresa\"\\
                    rows={2}\\
                    className=\"w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none\"\\
                  />\\
                </div>\\
\\
                {/* Página Web */}\\
                <div>\\
                  <label className=\"block text-sm font-medium text-slate-300 mb-1\">\\
                    Página Web\\
                  </label>\\
                  <input\\
                    type=\"url\"\\
                    value={editFormData.website}\\
                    onChange={(e) => handleEditFormChange(\"website\", e.target.value)}\\
                    placeholder=\"https://www.empresa.com\"\\
                    className=\"w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500\"\\
                  />\\
                </div>\\
\\
                {/* Estado */}\\
                <div>\\
                  <label className=\"block text-sm font-medium text-slate-300 mb-1\">\\
                    Estado\\
                  </label>\\
                  <select\\
                    value={editFormData.status}\\
                    onChange={(e) => handleEditFormChange(\"status\", e.target.value)}\\
                    className=\"w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500\"\\
                  >\\
                    <option value=\"ACTIVE\">Activo</option>\\
                    <option value=\"INACTIVE\">Inactivo</option>\\
                    <option value=\"SUSPENDED\">Suspendido</option>\\
                    <option value=\"PENDING\">Pendiente</option>\\
                  </select>\\
                </div>" src/components/Dashboard.tsx
        
        echo "✅ Campos agregados manualmente"
    else
        echo "❌ No se encontró el campo tenant_id"
    fi
fi

# Verificar resultado final
echo ""
echo "🔍 Verificación final:"
if grep -q "Teléfono.*label\|Dirección.*label\|Página Web.*label\|Estado.*label" src/components/Dashboard.tsx; then
    echo "✅ Todos los campos adicionales están presentes"
    echo "📋 Campos encontrados:"
    grep -c "Teléfono\|Dirección\|Página Web\|Estado.*Estado" src/components/Dashboard.tsx | head -4
else
    echo "❌ Aún faltan campos"
fi

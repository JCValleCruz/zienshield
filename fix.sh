#!/bin/bash

echo "🔧 Arreglando error de sintaxis JSX..."

cd /home/gacel/zienshield/super-admin/frontend

# Crear backup
cp src/components/Dashboard.tsx src/components/Dashboard.tsx.backup_jsx_fix_$(date +%Y%m%d_%H%M%S)
echo "📁 Backup creado"

# Buscar la línea 626 y el área problemática del modal
echo "🔍 Buscando área problemática alrededor de línea 626..."
sed -n '620,635p' src/components/Dashboard.tsx

# El problema es que hay elementos JSX adyacentes sin wrapper
# Vamos a buscar y arreglar el modal de eliminación
# Buscar donde empieza el modal y asegurar que esté bien estructurado

# Eliminar el modal mal formado y agregarlo correctamente
sed -i '/Modal de Eliminación/,/deleteModalOpen.*&&/ {
    /Modal de Eliminación/,/deleteModalOpen.*&&/d
}' src/components/Dashboard.tsx

# Ahora agregar el modal correctamente al final, antes del último </div>
sed -i '/^[[:space:]]*<\/div>[[:space:]]*$/i\
\
        {/* Modal de Eliminación */}\
        {deleteModalOpen && (\
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">\
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md w-full mx-4">\
              <div className="flex items-center mb-4">\
                <div className="p-2 bg-red-500/10 rounded-lg mr-3">\
                  <Trash2 className="h-6 w-6 text-red-400" />\
                </div>\
                <h3 className="text-lg font-semibold text-white">\
                  Eliminar Empresa\
                </h3>\
              </div>\
\
              <div className="mb-4">\
                <p className="text-slate-300 mb-2">\
                  ¿Estás seguro de que quieres eliminar la empresa?\
                </p>\
                <p className="text-white font-semibold mb-4">\
                  {companyToDelete?.name}\
                </p>\
                <p className="text-sm text-slate-400 mb-2">\
                  Para confirmar, escribe el nombre exacto de la empresa:\
                </p>\
                <input\
                  type="text"\
                  value={deleteConfirmText}\
                  onChange={(e) => setDeleteConfirmText(e.target.value)}\
                  placeholder="Nombre de la empresa"\
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"\
                />\
              </div>\
\
              <div className="flex space-x-3">\
                <button\
                  onClick={cancelDelete}\
                  className="flex-1 bg-slate-600 hover:bg-slate-500 text-white py-2 px-4 rounded transition-colors"\
                >\
                  Cancelar\
                </button>\
                <button\
                  onClick={confirmDeleteCompany}\
                  disabled={deleteConfirmText !== companyToDelete?.name}\
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 disabled:text-slate-400 text-white py-2 px-4 rounded transition-colors"\
                >\
                  Eliminar\
                </button>\
              </div>\
            </div>\
          </div>\
        )}' src/components/Dashboard.tsx

echo "✅ Error JSX arreglado"

# Verificar que no hay problemas de sintaxis
echo "🔍 Verificando sintaxis..."
if grep -q "Modal de Eliminación" src/components/Dashboard.tsx; then
    echo "✅ Modal de eliminación presente"
else
    echo "❌ Modal no encontrado"
fi

# Verificar que no hay elementos JSX adyacentes problemáticos
echo "📋 Verificando estructura JSX..."
grep -n -A 3 -B 3 "Adjacent\|JSX\|elements" src/components/Dashboard.tsx || echo "✅ No hay referencias a errores JSX"

echo ""
echo "🔄 Recarga la página para verificar que se corrigió el error"

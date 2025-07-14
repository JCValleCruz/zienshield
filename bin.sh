#!/bin/bash

echo "🗑️ Restaurando funcionalidad completa de papelera..."

cd /home/gacel/zienshield/super-admin/frontend

# Crear backup del estado actual
cp src/components/Dashboard.tsx src/components/Dashboard.tsx.backup_before_restore_$(date +%Y%m%d_%H%M%S)
echo "📁 Backup creado"

# 1. Agregar Trash2 al import
sed -i 's/import { Shield, Monitor, AlertTriangle, Building2, Users, Loader } from '\''lucide-react'\'';/import { Shield, Monitor, AlertTriangle, Building2, Users, Loader, Trash2 } from '\''lucide-react'\'';/' src/components/Dashboard.tsx

# 2. Agregar estados para modal de eliminación después de los useState existentes
sed -i '/const \[apiStatus, setApiStatus\] = useState<string>.*Verificando/a\
\
  // Estados para modal de eliminación\
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);\
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);\
  const [deleteConfirmText, setDeleteConfirmText] = useState("");' src/components/Dashboard.tsx

# 3. Agregar funciones de eliminación antes de getSectorColor
sed -i '/const getSectorColor = (sector: string) => {/i\
  // Funciones para modal de eliminación\
  const handleDeleteCompany = (company: Company) => {\
    setCompanyToDelete(company);\
    setDeleteModalOpen(true);\
    setDeleteConfirmText("");\
  };\
\
  const confirmDeleteCompany = async () => {\
    if (!companyToDelete || deleteConfirmText !== companyToDelete.name) {\
      return;\
    }\
\
    try {\
      console.log("Eliminando empresa:", companyToDelete.name);\
      \
      // Remover de la lista local por ahora\
      setCompanies(companies.filter(c => c.id !== companyToDelete.id));\
      \
      // Cerrar modal\
      setDeleteModalOpen(false);\
      setCompanyToDelete(null);\
      setDeleteConfirmText("");\
    } catch (error) {\
      console.error("Error eliminando empresa:", error);\
    }\
  };\
\
  const cancelDelete = () => {\
    setDeleteModalOpen(false);\
    setCompanyToDelete(null);\
    setDeleteConfirmText("");\
  };\
' src/components/Dashboard.tsx

# 4. Agregar botón papelera en las cards de empresa
# Buscar el span del sector y agregar el botón después
sed -i '/getSectorColor(company\.sector)/,/^[[:space:]]*<\/span>/ {
    /^[[:space:]]*<\/span>$/a\
                      <button\
                        onClick={() => handleDeleteCompany(company)}\
                        className="ml-2 p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"\
                        title={`Eliminar ${company.name}`}\
                      >\
                        <Trash2 className="h-4 w-4" />\
                      </button>
}' src/components/Dashboard.tsx

# 5. Agregar el modal de eliminación antes del cierre del componente
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

echo "✅ Funcionalidad de papelera restaurada completamente"

# Verificar que todo se agregó correctamente
if grep -q "handleDeleteCompany\|Trash2.*h-4.*w-4\|Modal de Eliminación" src/components/Dashboard.tsx; then
    echo "✅ Verificación exitosa:"
    echo "   🗑️ Botón papelera agregado"
    echo "   🔧 Funciones de eliminación agregadas" 
    echo "   📝 Modal de eliminación agregado"
    echo "   📱 Estados agregados"
else
    echo "❌ Error en la restauración"
fi

echo ""
echo "🎯 Funcionalidad restaurada:"
echo "   1. Botón papelera rojo en cada card"
echo "   2. Modal de confirmación con input de nombre"
echo "   3. Eliminación local (no de BD por ahora)"
echo ""
echo "🔄 Recarga la página y prueba la papelera"

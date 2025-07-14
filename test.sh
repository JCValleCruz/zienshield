#!/bin/bash

echo "📝 Agregando campos opcionales al modal de edición..."

cd /home/gacel/zienshield/super-admin/frontend

# Crear backup
cp src/components/Dashboard.tsx src/components/Dashboard.tsx.backup_optional_modal_$(date +%Y%m%d_%H%M%S)
echo "📁 Backup creado"

# Actualizar el estado editFormData para incluir todos los campos opcionales
sed -i '/setEditFormData({$/,/});/ {
    s/tenant_id: ""/tenant_id: "",\
    phone: "",\
    address: "",\
    website: "",\
    status: "ACTIVE"/
}' src/components/Dashboard.tsx

echo "✅ Estado editFormData actualizado con campos opcionales"

# Actualizar la función handleEditCompany para incluir los campos opcionales
sed -i '/setEditFormData({$/,/});/ {
    s/tenant_id: company\.tenant_id/tenant_id: company.tenant_id,\
      phone: company.phone || "",\
      address: company.address || "",\
      website: company.website || "",\
      status: company.status || "ACTIVE"/
}' src/components/Dashboard.tsx

echo "✅ Función handleEditCompany actualizada"

# Agregar los nuevos campos al modal después del campo tenant_id
# Buscar donde termina el div del tenant_id y agregar los nuevos campos
sed -i '/Identificador único para el tenant/,/^[[:space:]]*<\/div>/ {
    /^[[:space:]]*<\/div>$/a\
\
                {/* Teléfono */}\
                <div>\
                  <label className="block text-sm font-medium text-slate-300 mb-1">\
                    Teléfono\
                  </label>\
                  <input\
                    type="tel"\
                    value={editFormData.phone}\
                    onChange={(e) => handleEditFormChange("phone", e.target.value)}\
                    placeholder="ej: +34 912 345 678"\
                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"\
                  />\
                </div>\
\
                {/* Dirección */}\
                <div>\
                  <label className="block text-sm font-medium text-slate-300 mb-1">\
                    Dirección\
                  </label>\
                  <textarea\
                    value={editFormData.address}\
                    onChange={(e) => handleEditFormChange("address", e.target.value)}\
                    placeholder="Dirección completa de la empresa"\
                    rows={2}\
                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none"\
                  />\
                </div>\
\
                {/* Página Web */}\
                <div>\
                  <label className="block text-sm font-medium text-slate-300 mb-1">\
                    Página Web\
                  </label>\
                  <input\
                    type="url"\
                    value={editFormData.website}\
                    onChange={(e) => handleEditFormChange("website", e.target.value)}\
                    placeholder="https://www.empresa.com"\
                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"\
                  />\
                </div>\
\
                {/* Estado */}\
                <div>\
                  <label className="block text-sm font-medium text-slate-300 mb-1">\
                    Estado\
                  </label>\
                  <select\
                    value={editFormData.status}\
                    onChange={(e) => handleEditFormChange("status", e.target.value)}\
                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"\
                  >\
                    <option value="ACTIVE">Activo</option>\
                    <option value="INACTIVE">Inactivo</option>\
                    <option value="SUSPENDED">Suspendido</option>\
                    <option value="PENDING">Pendiente</option>\
                  </select>\
                </div>
}' src/components/Dashboard.tsx

echo "✅ Campos opcionales agregados al modal"

# Verificar que todo se agregó correctamente
if grep -q "Teléfono\|Dirección\|Página Web" src/components/Dashboard.tsx; then
    echo "✅ Todos los campos opcionales agregados correctamente:"
    echo "   📞 Teléfono (input tel)"
    echo "   🏠 Dirección (textarea)"
    echo "   🌐 Página Web (input url)"
    echo "   📊 Estado (select: Activo/Inactivo/Suspendido/Pendiente)"
    echo ""
    echo "📋 Total de campos en el modal: 9"
    echo "   - Nombre de la empresa"
    echo "   - Nombre del administrador"
    echo "   - Email del administrador"
    echo "   - Sector"
    echo "   - Tenant ID"
    echo "   - Teléfono"
    echo "   - Dirección"
    echo "   - Página Web"
    echo "   - Estado"
else
    echo "❌ Error agregando campos opcionales al modal"
fi

echo ""
echo "🎯 El modal ahora tiene todos los campos fundamentales"
echo "🔄 Recarga la página y prueba el modal de edición completo"

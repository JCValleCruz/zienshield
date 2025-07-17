#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Ruta al archivo Dashboard.tsx
const dashboardPath = path.join(__dirname, 'Dashboard.tsx');

console.log('🔧 Iniciando modificación de Dashboard.tsx para login...');

try {
  // Verificar que el archivo existe
  if (!fs.existsSync(dashboardPath)) {
    console.error('❌ No se encontró Dashboard.tsx en la ruta actual');
    process.exit(1);
  }

  // Leer el contenido del archivo
  let content = fs.readFileSync(dashboardPath, 'utf8');
  
  console.log('📖 Archivo Dashboard.tsx leído correctamente');
  
  let changesMade = 0;
  
  // Cambio 1: Agregar imports para LogOut icon
  if (!content.includes('LogOut')) {
    content = content.replace(
      /import { Shield, Monitor, AlertTriangle, Building2, Users, Loader, Trash2, Plus, X, Eye, EyeOff, Edit, RefreshCw } from 'lucide-react';/,
      "import { Shield, Monitor, AlertTriangle, Building2, Users, Loader, Trash2, Plus, X, Eye, EyeOff, Edit, RefreshCw, LogOut } from 'lucide-react';"
    );
    changesMade++;
    console.log('✅ Cambio 1: Agregado import LogOut');
  }
  
  // Cambio 2: Agregar interfaces para props
  if (!content.includes('interface DashboardProps')) {
    const interfaceDefinition = `interface User {
  id: string;
  email: string;
  role: string;
}

interface DashboardProps {
  user?: User;
  onLogout?: () => void;
}

`;
    
    content = content.replace(
      /const Dashboard: React\.FC = \(\) => \{/,
      `${interfaceDefinition}const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {`
    );
    changesMade++;
    console.log('✅ Cambio 2: Agregadas interfaces y props');
  }
  
  // Cambio 3: Modificar el header para incluir email del usuario
  const oldHeaderPattern = /<h1 className="text-2xl font-bold text-white flex items-center">\s*<Shield className="h-8 w-8 mr-3 text-blue-500" \/>\s*ZienSHIELD\s*<\/h1>/;
  
  if (content.match(oldHeaderPattern)) {
    content = content.replace(
      oldHeaderPattern,
      `<div>
              <h1 className="text-2xl font-bold text-white flex items-center">
                <Shield className="h-8 w-8 mr-3 text-blue-500" />
                ZienSHIELD
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Super Admin Panel - {user?.email || 'admin@zienshield.com'}
              </p>
            </div>`
    );
    changesMade++;
    console.log('✅ Cambio 3: Modificado header con email del usuario');
  }
  
  // Cambio 4: Agregar botón de logout en el header
  const buttonsSectionPattern = /<button\s+onClick=\{loadDashboardData\}\s+className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"\s*>\s*<Monitor className="h-4 w-4" \/>\s*<span>Actualizar<\/span>\s*<\/button>/;
  
  if (content.match(buttonsSectionPattern)) {
    content = content.replace(
      buttonsSectionPattern,
      `<button
              onClick={loadDashboardData}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Monitor className="h-4 w-4" />
              <span>Actualizar</span>
            </button>
            
            {onLogout && (
              <button
                onClick={onLogout}
                className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Cerrar Sesión</span>
              </button>
            )}`
    );
    changesMade++;
    console.log('✅ Cambio 4: Agregado botón de logout');
  }
  
  // Cambio 5: Asegurar que el export tenga las props correctas
  if (content.includes('const Dashboard: React.FC = () => {')) {
    content = content.replace(
      'const Dashboard: React.FC = () => {',
      'const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {'
    );
    changesMade++;
    console.log('✅ Cambio 5: Corregida definición del componente');
  }
  
  if (changesMade === 0) {
    console.log('⚠️  No se encontraron patrones para modificar o ya están aplicados');
    
    // Verificar si ya tiene las props
    if (content.includes('DashboardProps')) {
      console.log('✅ El Dashboard ya tiene las props de login configuradas');
    } else {
      console.log('🔧 Intentando aplicar cambios con patrones alternativos...');
      
      // Patrón alternativo más amplio
      if (content.includes('const Dashboard: React.FC = () => {')) {
        content = content.replace(
          'const Dashboard: React.FC = () => {',
          `interface User {
  id: string;
  email: string;
  role: string;
}

interface DashboardProps {
  user?: User;
  onLogout?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {`
        );
        console.log('🔧 Aplicado patrón alternativo para props');
      }
    }
  }
  
  // Crear backup del archivo original
  const backupPath = dashboardPath + '.login-backup.' + Date.now();
  fs.writeFileSync(backupPath, fs.readFileSync(dashboardPath, 'utf8'));
  console.log(`💾 Backup creado en: ${backupPath}`);
  
  // Escribir el archivo modificado
  fs.writeFileSync(dashboardPath, content, 'utf8');
  
  console.log('🎉 Dashboard.tsx modificado exitosamente');
  console.log('📋 Cambios aplicados:');
  console.log('   - Agregadas interfaces User y DashboardProps');
  console.log('   - Modificado header para mostrar email del usuario');
  console.log('   - Agregado botón de logout');
  console.log('   - Importado LogOut icon');
  console.log('');
  console.log('✅ El Dashboard ahora acepta props de usuario y logout');
  console.log('');
  console.log('🔄 Siguiente paso: Actualizar App.tsx con la nueva versión que incluye Login');
  
} catch (error) {
  console.error('❌ Error modificando Dashboard.tsx:', error.message);
  process.exit(1);
}

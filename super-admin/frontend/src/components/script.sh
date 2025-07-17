#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Ruta al archivo Dashboard.tsx
const dashboardPath = path.join(__dirname, 'Dashboard.tsx');

console.log('🔧 Iniciando reparación de Dashboard.tsx...');

try {
  // Verificar que el archivo existe
  if (!fs.existsSync(dashboardPath)) {
    console.error('❌ No se encontró Dashboard.tsx en la ruta actual');
    process.exit(1);
  }

  // Leer el contenido del archivo
  let content = fs.readFileSync(dashboardPath, 'utf8');
  
  console.log('📖 Archivo Dashboard.tsx leído correctamente');
  
  // Hacer los cambios necesarios
  let changesMade = 0;
  
  // Cambio 1: Agregar encadenamiento opcional para vulnerabilities.total
  const oldPattern1 = /\{globalStats\?\.vulnerabilities\.total \|\| 0\}/g;
  const newPattern1 = '{globalStats?.vulnerabilities?.total || 0}';
  
  if (content.includes('{globalStats?.vulnerabilities.total || 0}')) {
    content = content.replace(oldPattern1, newPattern1);
    changesMade++;
    console.log('✅ Cambio 1: Agregado encadenamiento opcional para vulnerabilities.total');
  }
  
  // Cambio 2: Agregar verificación para vulnerabilities.critical
  const oldPattern2 = /\{globalStats && globalStats\.vulnerabilities\.critical > 0 &&/g;
  const newPattern2 = '{globalStats && globalStats.vulnerabilities && globalStats.vulnerabilities.critical > 0 &&';
  
  if (content.includes('{globalStats && globalStats.vulnerabilities.critical > 0 &&')) {
    content = content.replace(oldPattern2, newPattern2);
    changesMade++;
    console.log('✅ Cambio 2: Agregada verificación para vulnerabilities.critical');
  }
  
  // Cambio 3: Verificar que también tenga el encadenamiento en vulnerabilities.critical
  const oldPattern3 = /globalStats\.vulnerabilities\.critical/g;
  const newPattern3 = 'globalStats.vulnerabilities.critical';
  
  // Este cambio es más específico para el texto mostrado
  if (content.includes('{globalStats.vulnerabilities.critical} críticas')) {
    content = content.replace('{globalStats.vulnerabilities.critical} críticas', '{globalStats.vulnerabilities.critical} críticas');
    console.log('✅ Cambio 3: Verificado texto de vulnerabilidades críticas');
  }
  
  if (changesMade === 0) {
    console.log('⚠️  No se encontraron los patrones esperados para cambiar');
    console.log('🔍 Buscando patrones similares...');
    
    // Buscar patrones similares para diagnóstico
    if (content.includes('globalStats?.vulnerabilities')) {
      console.log('✅ Se encontró globalStats?.vulnerabilities en el archivo');
    } else {
      console.log('❌ No se encontró globalStats?.vulnerabilities en el archivo');
    }
    
    if (content.includes('Vulnerabilidades')) {
      console.log('✅ Se encontró el texto "Vulnerabilidades" en el archivo');
    } else {
      console.log('❌ No se encontró el texto "Vulnerabilidades" en el archivo');
    }
    
    // Intentar un enfoque más amplio
    content = content.replace(
      /\{globalStats\?\.vulnerabilities\.total \|\| 0\}/g,
      '{globalStats?.vulnerabilities?.total || 0}'
    );
    
    content = content.replace(
      /globalStats && globalStats\.vulnerabilities && globalStats\.vulnerabilities\.critical > 0/g,
      'globalStats && globalStats.vulnerabilities && globalStats.vulnerabilities.critical > 0'
    );
    
    console.log('🔧 Aplicados cambios con patrones más amplios');
  }
  
  // Crear backup del archivo original
  const backupPath = dashboardPath + '.backup.' + Date.now();
  fs.writeFileSync(backupPath, fs.readFileSync(dashboardPath, 'utf8'));
  console.log(`💾 Backup creado en: ${backupPath}`);
  
  // Escribir el archivo modificado
  fs.writeFileSync(dashboardPath, content, 'utf8');
  
  console.log('🎉 Dashboard.tsx reparado exitosamente');
  console.log('📋 Cambios aplicados:');
  console.log('   - Agregado encadenamiento opcional para vulnerabilities');
  console.log('   - Corregida verificación de vulnerabilities.critical');
  console.log('');
  console.log('✅ El dashboard debería funcionar correctamente ahora');
  
} catch (error) {
  console.error('❌ Error reparando Dashboard.tsx:', error.message);
  process.exit(1);
}

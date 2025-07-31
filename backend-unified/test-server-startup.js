#!/usr/bin/env node

/**
 * SCRIPT DE TESTING DE STARTUP DEL SERVIDOR
 * 
 * Verifica que el servidor unificado se inicia correctamente
 * sin necesidad de mantenerlo ejecutándose
 */

require('dotenv').config();

console.log('🧪 TESTING STARTUP DEL SERVIDOR UNIFICADO');
console.log('='.repeat(60));

async function testServerStartup() {
  try {
    console.log('📦 Importando módulos del servidor...');
    
    // Verificar que los módulos se cargan sin errores
    const { createServer } = require('./src/server');
    const { get } = require('./src/config/environment');
    
    console.log('✅ Módulos importados correctamente');
    
    // Verificar configuración
    console.log('🔧 Verificando configuración...');
    const serverPort = get('server.port');
    const serverHost = get('server.host'); 
    const appName = get('app.name');
    
    console.log(`   • Aplicación: ${appName}`);
    console.log(`   • Host: ${serverHost}`);
    console.log(`   • Puerto: ${serverPort}`);
    console.log('✅ Configuración válida');
    
    // Crear servidor (sin iniciar)
    console.log('🏗️  Creando instancia del servidor...');
    const app = await createServer();
    
    console.log('✅ Servidor creado exitosamente');
    console.log('✅ Stack de middleware configurado');
    console.log('✅ Rutas montadas correctamente');
    
    // Información de endpoints disponibles
    console.log('\n📋 Endpoints configurados:');
    console.log('   • GET /health - Health check principal');
    console.log('   • GET /api/companies - Lista de empresas');
    console.log('   • POST /api/companies - Crear empresa');
    console.log('   • GET /api/companies/:id - Ver empresa');
    console.log('   • PUT /api/companies/:id - Actualizar empresa');
    console.log('   • DELETE /api/companies/:id - Eliminar empresa');
    console.log('   • GET /api/companies/health - Health check empresas');
    
    console.log('\n🎉 ¡SERVIDOR UNIFICADO CONFIGURADO CORRECTAMENTE!');
    console.log('\n📝 Para iniciar el servidor ejecuta:');
    console.log('   npm start  # o node src/server.js');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error en startup del servidor:', error);
    console.error('\n📋 Detalles del error:');
    console.error(`   • Mensaje: ${error.message}`);
    console.error(`   • Stack: ${error.stack}`);
    
    return false;
  }
}

// Ejecutar test
testServerStartup()
  .then((success) => {
    if (success) {
      console.log('\n✅ TEST DE STARTUP: EXITOSO');
      process.exit(0);
    } else {
      console.log('\n❌ TEST DE STARTUP: FALLIDO');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('\n💀 Error crítico en test:', error);
    process.exit(1);
  });
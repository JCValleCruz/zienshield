#!/usr/bin/env node

/**
 * SCRIPT DE TESTING DE CONFIGURACIÓN CENTRALIZADA
 * 
 * Verifica que la configuración se carga correctamente
 * y que todas las validaciones funcionan
 */

require('dotenv').config();

const { getConfig, get, isDevelopment, isProduction } = require('./src/config/environment');
const ValidationService = require('./src/services/validationService');

console.log('🧪 INICIANDO TESTING DE CONFIGURACIÓN CENTRALIZADA');
console.log('='.repeat(60));

let testsPassed = 0;
let testsFailed = 0;

function test(description, testFn) {
  try {
    console.log(`\n🔍 Testing: ${description}`);
    const result = testFn();
    if (result === true || result === undefined) {
      console.log('  ✅ PASSED');
      testsPassed++;
    } else {
      console.log(`  ❌ FAILED: ${result}`);
      testsFailed++;
    }
  } catch (error) {
    console.log(`  ❌ ERROR: ${error.message}`);
    testsFailed++;
  }
}

// ====================================================================
// TESTS DE CONFIGURACIÓN ENVIRONMENT
// ====================================================================

test('Cargar configuración de desarrollo', () => {
  const config = getConfig();
  return config && config.app && config.app.name === 'ZienSHIELD';
});

test('Verificar configuración de servidor', () => {
  const serverConfig = get('server');
  return serverConfig && serverConfig.port && serverConfig.host === '0.0.0.0';
});

test('Verificar configuración de base de datos', () => {
  const dbConfig = get('database');
  return dbConfig && dbConfig.host && dbConfig.database && dbConfig.username === 'postgres';
});

test('Verificar configuración de Wazuh', () => {
  const wazuhConfig = get('wazuh');
  return wazuhConfig && wazuhConfig.apiUrl && wazuhConfig.username === 'wazuh';
});

test('Verificar configuración de CORS', () => {
  const corsConfig = get('cors');
  return corsConfig && Array.isArray(corsConfig.origins) && corsConfig.origins.length > 0;
});

test('Verificar configuración de caché', () => {
  const cacheConfig = get('wazuh.cache');
  return cacheConfig && cacheConfig.maxMemoryMB === 50 && cacheConfig.ttl && typeof cacheConfig.ttl === 'object';
});

test('Verificar helper functions', () => {
  return isDevelopment() === true && isProduction() === false;
});

test('Verificar acceso a configuración anidada', () => {
  const dbHost = get('database.host');
  const wazuhTimeout = get('wazuh.timeout');
  return dbHost === 'localhost' && wazuhTimeout === 30000;
});

// ====================================================================
// TESTS DE VALIDACIÓN SERVICE
// ====================================================================

test('Validar email válido', () => {
  return ValidationService.isValidEmail('test@example.com') === true;
});

test('Rechazar email inválido', () => {
  return ValidationService.isValidEmail('invalid-email') === false;
});

test('Validar teléfono válido', () => {
  return ValidationService.isValidPhone('+34 666 777 888') === true;
});

test('Rechazar teléfono inválido', () => {
  return ValidationService.isValidPhone('abc123') === false;
});

test('Validar datos de empresa completos', () => {
  const validCompany = {
    name: 'Empresa Test',
    sector: 'tecnologia',
    admin_name: 'Admin Test',
    admin_phone: '+34 666 777 888',
    admin_email: 'admin@test.com',
    admin_password: 'Test123456'
  };
  
  const result = ValidationService.validateCompanyData(validCompany);
  return result.isValid === true;
});

test('Rechazar datos de empresa incompletos', () => {
  const invalidCompany = {
    name: '', // Vacío
    sector: 'tecnologia',
    admin_email: 'invalid-email' // Email inválido
  };
  
  const result = ValidationService.validateCompanyData(invalidCompany);
  return result.isValid === false && result.errors.length > 0;
});

test('Generar tenant_id válido', () => {
  const tenantId = ValidationService.generateTenantId('Empresa Test', 'tecnologia');
  return tenantId && tenantId.includes('empresa-test') && tenantId.includes('tec');
});

test('Validar ID numérico válido', () => {
  return ValidationService.isValidId('123') === true && 
         ValidationService.isValidId(456) === true;
});

test('Rechazar ID inválido', () => {
  return ValidationService.isValidId('abc') === false && 
         ValidationService.isValidId(-1) === false;
});

test('Validar contraseña segura', () => {
  const result = ValidationService.validatePassword('SecurePass123');
  return result.isValid === true;
});

test('Rechazar contraseña débil', () => {
  const result = ValidationService.validatePassword('123');
  return result.isValid === false && result.errors.length > 0;
});

test('Sanitizar string con caracteres peligrosos', () => {
  const sanitized = ValidationService.sanitizeString('<script>alert("xss")</script>');
  return !sanitized.includes('<') && !sanitized.includes('>');
});

test('Validar parámetros de paginación', () => {
  const result = ValidationService.validatePaginationParams({
    page: '2',
    limit: '10',
    sortBy: 'name',
    sortOrder: 'desc'
  });
  
  return result.isValid === true && 
         result.sanitized.page === 2 && 
         result.sanitized.limit === 10;
});

// ====================================================================
// TESTS DE INTEGRACIÓN
// ====================================================================

test('Verificar que variables de entorno se cargan', () => {
  const nodeEnv = process.env.NODE_ENV;
  const port = process.env.PORT;
  return nodeEnv === 'development' && port === '3001';
});

test('Verificar consistencia entre .env y config', () => {
  const envPort = parseInt(process.env.PORT);
  const configPort = get('server.port');
  return envPort === configPort;
});

// ====================================================================
// MOSTRAR RESULTADOS
// ====================================================================

console.log('\n' + '='.repeat(60));
console.log('📊 RESULTADOS DEL TESTING');
console.log('='.repeat(60));
console.log(`✅ Tests pasados: ${testsPassed}`);
console.log(`❌ Tests fallidos: ${testsFailed}`);
console.log(`📈 Total tests: ${testsPassed + testsFailed}`);

if (testsFailed === 0) {
  console.log('\n🎉 ¡TODOS LOS TESTS PASARON! Configuración centralizada funcionando correctamente.');
  console.log('\n📋 CONFIGURACIÓN CARGADA:');
  console.log('  • Entorno:', get('app.environment'));
  console.log('  • Puerto:', get('server.port'));
  console.log('  • Base de datos:', get('database.host') + ':' + get('database.port'));
  console.log('  • Wazuh API:', get('wazuh.apiUrl'));
  console.log('  • CORS origins:', get('cors.origins').join(', '));
  console.log('  • Caché habilitado:', get('wazuh.cache.enabled'));
  
  process.exit(0);
} else {
  console.log('\n🚨 ALGUNOS TESTS FALLARON. Revisar configuración antes de continuar.');
  process.exit(1);
}
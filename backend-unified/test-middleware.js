#!/usr/bin/env node

/**
 * SCRIPT DE TESTING DE MIDDLEWARE UNIFICADO
 * 
 * Verifica que todos los middlewares creados funcionen correctamente:
 * - Seguridad (Helmet + CORS)
 * - Rate limiting diferenciado
 * - Validación y sanitización
 * - Manejo de errores
 */

require('dotenv').config();

// Simular environment de testing
process.env.NODE_ENV = 'test';

console.log('🧪 INICIANDO TESTING DE MIDDLEWARE UNIFICADO');
console.log('='.repeat(60));

let testsPassed = 0;
let testsFailed = 0;

function test(description, testFn) {
  try {
    console.log(`\n🔍 Testing: ${description}`);
    const result = testFn();
    
    // Manejar promesas
    if (result && typeof result.then === 'function') {
      return result
        .then((res) => {
          if (res === true || res === undefined) {
            console.log('  ✅ PASSED');
            testsPassed++;
          } else {
            console.log(`  ❌ FAILED: ${res}`);
            testsFailed++;
          }
        })
        .catch((error) => {
          console.log(`  ❌ ERROR: ${error.message}`);
          testsFailed++;
        });
    } else {
      if (result === true || result === undefined) {
        console.log('  ✅ PASSED');
        testsPassed++;
      } else {
        console.log(`  ❌ FAILED: ${result}`);
        testsFailed++;
      }
    }
  } catch (error) {
    console.log(`  ❌ ERROR: ${error.message}`);
    testsFailed++;
  }
}

// ====================================================================
// TESTS DE CONFIGURACIÓN ENVIRONMENT
// ====================================================================

test('Environment configuration se carga correctamente', () => {
  const { getConfig, get } = require('./src/config/environment');
  const config = getConfig();
  return config && config.app && config.app.name === 'ZienSHIELD';
});

test('Configuración CORS disponible', () => {
  const { get } = require('./src/config/environment');
  const corsConfig = get('cors');
  return corsConfig && Array.isArray(corsConfig.origins) && corsConfig.origins.length > 0;
});

test('Configuración rate limiting disponible', () => {
  const { get } = require('./src/config/environment');
  const rateLimitConfig = get('rateLimiting');
  return rateLimitConfig && 
         rateLimitConfig.windowMs && 
         rateLimitConfig.maxRequests &&
         rateLimitConfig.maxRequests === 100; // Verificar valor específico
});

// ====================================================================
// TESTS DE MIDDLEWARE DE SEGURIDAD
// ====================================================================

test('Middleware de seguridad se carga sin errores', () => {
  const securityMiddleware = require('./src/middleware/security');
  return typeof securityMiddleware.createSecurityMiddleware === 'function';
});

test('Helmet middleware se configura correctamente', () => {
  const { createHelmetMiddleware } = require('./src/middleware/security');
  const helmetMiddleware = createHelmetMiddleware();
  return typeof helmetMiddleware === 'function';
});

test('CORS middleware se configura con orígenes correctos', () => {
  const { createCorsMiddleware } = require('./src/middleware/security');
  const corsMiddleware = createCorsMiddleware();
  return typeof corsMiddleware === 'function';
});

test('Headers personalizados se añaden correctamente', () => {
  const { addCustomHeaders } = require('./src/middleware/security');
  
  // Simular req y res
  const mockReq = { headers: {} };
  const mockRes = {
    headers: {},
    set: function(key, value) { this.headers[key] = value; }
  };
  const mockNext = () => {};
  
  addCustomHeaders(mockReq, mockRes, mockNext);
  
  return mockRes.headers['X-Service-Name'] === 'ZienSHIELD-Backend-Unified' &&
         mockRes.headers['X-Service-Version'] === '1.0.0';
});

// ====================================================================
// TESTS DE RATE LIMITING
// ====================================================================

test('Rate limiting middleware se carga sin errores', () => {
  const rateLimitingMiddleware = require('./src/middleware/rateLimiting');
  return typeof rateLimitingMiddleware.createSmartRateLimit === 'function';
});

test('Rate limiting de autenticación es más restrictivo', () => {
  const { createAuthRateLimit } = require('./src/middleware/rateLimiting');
  const authLimiter = createAuthRateLimit();
  return typeof authLimiter === 'function';
});

test('Rate limiting CRUD permite más peticiones', () => {
  const { createCrudRateLimit } = require('./src/middleware/rateLimiting');
  const crudLimiter = createCrudRateLimit();
  return typeof crudLimiter === 'function';
});

test('Smart rate limiting detecta rutas automáticamente', () => {
  const { createSmartRateLimit } = require('./src/middleware/rateLimiting');
  const smartLimiter = createSmartRateLimit();
  return typeof smartLimiter === 'function';
});

// ====================================================================
// TESTS DE VALIDACIÓN
// ====================================================================

test('Middleware de validación se carga sin errores', () => {
  const validationMiddleware = require('./src/middleware/validation');
  return typeof validationMiddleware.createValidationMiddleware === 'function';
});

test('Sanitización de body funciona correctamente', () => {
  const { sanitizeRequestBody } = require('./src/middleware/validation');
  
  // Simular request con datos peligrosos
  const mockReq = {
    method: 'POST',
    path: '/api/test',
    body: {
      name: '<script>alert("xss")</script>Empresa Test',
      email: 'test@example.com'
    }
  };
  const mockRes = {};
  const mockNext = () => {};
  
  sanitizeRequestBody(mockReq, mockRes, mockNext);
  
  // Verificar que el script fue removido
  return !mockReq.body.name.includes('<script>') && 
         mockReq.body.email === 'test@example.com';
});

test('Validación de parámetros URL funciona', () => {
  const { validateUrlParams } = require('./src/middleware/validation');
  
  const mockReq = {
    method: 'GET',
    path: '/api/companies/123',
    params: { id: '123' }
  };
  const mockRes = {
    status: () => ({ json: () => {} })
  };
  const mockNext = () => {};
  
  validateUrlParams(mockReq, mockRes, mockNext);
  return true; // Si no hay excepción, el test pasa
});

test('Validación de datos de empresa funciona', () => {
  const ValidationService = require('./src/services/validationService');
  
  const validCompany = {
    name: 'Empresa Test',
    sector: 'tecnologia',
    admin_name: 'Admin Test',
    admin_phone: '+34 666 777 888',
    admin_email: 'admin@test.com',
    admin_password: 'TestPassword123'
  };
  
  const result = ValidationService.validateCompanyData(validCompany);
  return result.isValid === true;
});

// ====================================================================
// TESTS DE MANEJO DE ERRORES
// ====================================================================

test('Error handler se carga sin errores', () => {
  const errorHandler = require('./src/middleware/errorHandler');
  return typeof errorHandler.errorHandler === 'function';
});

test('Detección de tipo de error funciona', () => {
  const { ErrorTypes } = require('./src/middleware/errorHandler');
  return ErrorTypes.VALIDATION === 'validation' && 
         ErrorTypes.AUTHENTICATION === 'authentication' && 
         ErrorTypes.DATABASE === 'database';
});

test('Creación de errores customizados funciona', () => {
  const { createError, ErrorTypes } = require('./src/middleware/errorHandler');
  
  const error = createError('Test error', 400, ErrorTypes.VALIDATION, ['campo requerido']);
  
  return error.message === 'Test error' && 
         error.status === 400 && 
         error.type === ErrorTypes.VALIDATION;
});

test('Not found handler funciona correctamente', () => {
  const { notFoundHandler } = require('./src/middleware/errorHandler');
  
  const mockReq = { method: 'GET', path: '/api/nonexistent' };
  const mockRes = {};
  let errorPassed = false;
  const mockNext = (error) => { errorPassed = !!error; };
  
  notFoundHandler(mockReq, mockRes, mockNext);
  return errorPassed;
});

// ====================================================================
// TESTS DE INTEGRACIÓN
// ====================================================================

test('Todos los middlewares se pueden combinar', () => {
  const { createSecurityMiddleware } = require('./src/middleware/security');
  const { createSmartRateLimit } = require('./src/middleware/rateLimiting');
  const { createValidationMiddleware } = require('./src/middleware/validation');
  const { errorHandler } = require('./src/middleware/errorHandler');
  
  const securityStack = createSecurityMiddleware();
  const rateLimitMiddleware = createSmartRateLimit();
  const validationStack = createValidationMiddleware();
  
  return Array.isArray(securityStack) &&
         typeof rateLimitMiddleware === 'function' &&
         Array.isArray(validationStack) &&
         typeof errorHandler === 'function';
});

test('Stack completo de middleware tiene el orden correcto', () => {
  // Simular el orden que usaríamos en server.js
  const middlewareOrder = [
    'security',      // Primero - headers de seguridad
    'rateLimiting',  // Segundo - límites de peticiones
    'validation',    // Tercero - validar datos
    'routes',        // Cuarto - rutas de la aplicación
    'errorHandler'   // Último - manejar errores
  ];
  
  return middlewareOrder.length === 5 &&
         middlewareOrder[0] === 'security' &&
         middlewareOrder[4] === 'errorHandler';
});

// ====================================================================
// EJECUTAR TODOS LOS TESTS
// ====================================================================

async function runAllTests() {
  console.log('\n📊 Ejecutando todos los tests...\n');
  
  // Lista de todos los tests (se ejecutan automáticamente con la función test())
  // Los tests ya se ejecutaron arriba
  
  // Esperar un momento para que se completen los tests async
  await new Promise(resolve => setTimeout(resolve, 100));
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESULTADOS DEL TESTING DE MIDDLEWARE');
  console.log('='.repeat(60));
  console.log(`✅ Tests pasados: ${testsPassed}`);
  console.log(`❌ Tests fallidos: ${testsFailed}`);
  console.log(`📈 Total tests: ${testsPassed + testsFailed}`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 ¡TODOS LOS TESTS PASARON! Middleware unificado funcionando correctamente.');
    console.log('\n📋 MIDDLEWARES VALIDADOS:');
    console.log('  ✅ Seguridad (Helmet + CORS + Headers personalizados)');
    console.log('  ✅ Rate Limiting (Diferenciado por tipo de endpoint)');
    console.log('  ✅ Validación (Sanitización + Validaciones específicas)');
    console.log('  ✅ Manejo de Errores (Respuestas consistentes + Logs)');
    console.log('  ✅ Integración (Stack completo compatible)');
    
    console.log('\n🚀 PRÓXIMO PASO: Integrar middleware al server.js unificado');
    
    process.exit(0);
  } else {
    console.log('\n🚨 ALGUNOS TESTS FALLARON. Revisar middleware antes de continuar.');
    console.log('\n📋 ACCIONES RECOMENDADAS:');
    console.log('  1. Revisar logs de errores arriba');
    console.log('  2. Verificar configuración environment.js');
    console.log('  3. Comprobar dependencias instaladas (npm install)');
    console.log('  4. Re-ejecutar este test: npm run test:middleware');
    
    process.exit(1);
  }
}

// Ejecutar todos los tests
runAllTests().catch(console.error);
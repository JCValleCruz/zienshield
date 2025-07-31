#!/usr/bin/env node

/**
 * SCRIPT DE TESTING DEL SERVICIO DE BASE DE DATOS
 * 
 * Verifica que el DatabaseService funcione correctamente:
 * - Conexión y configuración del pool
 * - Queries simples y con parámetros
 * - Transacciones
 * - Manejo de errores
 * - Health checks
 */

require('dotenv').config();

// Simular environment de testing
process.env.NODE_ENV = 'test';

console.log('🗄️ INICIANDO TESTING DEL DATABASE SERVICE');
console.log('='.repeat(60));

let testsPassed = 0;
let testsFailed = 0;

function test(description, testFn) {
  return new Promise((resolve) => {
    console.log(`\n🔍 Testing: ${description}`);
    
    try {
      const result = testFn();
      
      // Manejar promesas
      if (result && typeof result.then === 'function') {
        result
          .then((res) => {
            if (res === true || res === undefined) {
              console.log('  ✅ PASSED');
              testsPassed++;
            } else {
              console.log(`  ❌ FAILED: ${res}`);
              testsFailed++;
            }
            resolve();
          })
          .catch((error) => {
            console.log(`  ❌ ERROR: ${error.message}`);
            testsFailed++;
            resolve();
          });
      } else {
        if (result === true || result === undefined) {
          console.log('  ✅ PASSED');
          testsPassed++;
        } else {
          console.log(`  ❌ FAILED: ${result}`);
          testsFailed++;
        }
        resolve();
      }
    } catch (error) {
      console.log(`  ❌ ERROR: ${error.message}`);
      testsFailed++;
      resolve();
    }
  });
}

// ====================================================================
// TESTS DEL DATABASE SERVICE
// ====================================================================

async function runDatabaseTests() {
  const { getDatabaseService } = require('./src/services/databaseService');
  let dbService;

  // Test 1: Creación del servicio
  await test('DatabaseService se crea correctamente', () => {
    dbService = getDatabaseService();
    return typeof dbService === 'object' && 
           typeof dbService.initialize === 'function';
  });

  // Test 2: Inicialización del servicio
  await test('DatabaseService se inicializa y conecta', async () => {
    try {
      await dbService.initialize();
      return dbService.isConnected === true;
    } catch (error) {
      console.log(`     Detalle del error: ${error.message}`);
      return false;
    }
  });

  // Test 3: Pool stats
  await test('Pool stats se generan correctamente', () => {
    const stats = dbService.getPoolStats();
    return stats && 
           typeof stats.totalCount === 'number' &&
           typeof stats.maxConnections === 'number';
  });

  // Test 4: Query simple
  await test('Query simple funciona correctamente', async () => {
    try {
      const result = await dbService.query('SELECT NOW() as current_time');
      return result.rows && 
             result.rows.length === 1 && 
             result.rows[0].current_time instanceof Date;
    } catch (error) {
      console.log(`     Detalle: ${error.message}`);
      return false;
    }
  });

  // Test 5: Query con parámetros
  await test('Query con parámetros funciona', async () => {
    try {
      const result = await dbService.query(
        'SELECT $1::text as test_param, $2::int as test_number', 
        ['hello', 42]
      );
      return result.rows[0].test_param === 'hello' && 
             result.rows[0].test_number === 42;
    } catch (error) {
      console.log(`     Detalle: ${error.message}`);
      return false;
    }
  });

  // Test 6: Health check
  await test('Health check funciona correctamente', async () => {
    try {
      const health = await dbService.healthCheck();
      return health.status === 'healthy' && 
             health.responseTime &&
             health.database.connected === true;
    } catch (error) {
      console.log(`     Detalle: ${error.message}`);
      return false;
    }
  });

  // Test 7: Verificar tabla companies (si existe)
  await test('Puede consultar información de esquema', async () => {
    try {
      const result = await dbService.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        LIMIT 5
      `);
      return Array.isArray(result.rows);
    } catch (error) {
      console.log(`     Detalle: ${error.message}`);
      return false;
    }
  });

  // Test 8: Transacción simple
  await test('Transacciones funcionan correctamente', async () => {
    try {
      const result = await dbService.transaction(async (client) => {
        // Crear tabla temporal
        await client.query(`
          CREATE TEMPORARY TABLE test_transaction (
            id SERIAL PRIMARY KEY,
            name TEXT
          )
        `);
        
        // Insertar datos
        await client.query(
          'INSERT INTO test_transaction (name) VALUES ($1)',
          ['test_data']
        );
        
        // Consultar datos
        const selectResult = await client.query(
          'SELECT name FROM test_transaction WHERE name = $1',
          ['test_data']
        );
        
        return selectResult.rows[0];
      });
      
      return result && result.name === 'test_data';
    } catch (error) {
      console.log(`     Detalle: ${error.message}`);
      return false;
    }
  });

  // Test 9: Manejo de errores SQL
  await test('Manejo de errores SQL funciona', async () => {
    try {
      // Intentar query inválida
      await dbService.query('SELECT * FROM tabla_que_no_existe');
      return false; // No debería llegar aquí
    } catch (error) {
      // Debe capturar el error correctamente
      return error.message.includes('Database query failed') &&
             error.code === '42P01'; // Código específico para "tabla no existe"
    }
  });

  // Test 10: Singleton pattern
  await test('Singleton pattern funciona correctamente', () => {
    const dbService2 = getDatabaseService();
    return dbService === dbService2; // Debe ser la misma instancia
  });

  // Test final: Cerrar conexiones
  await test('Cierre de conexiones funciona', async () => {
    try {
      await dbService.close();
      return true;
    } catch (error) {
      console.log(`     Detalle: ${error.message}`);
      return false;
    }
  });
}

// ====================================================================
// EJECUTAR TODOS LOS TESTS
// ====================================================================

async function runAllTests() {
  console.log('\n📊 Ejecutando tests del DatabaseService...\n');
  
  try {
    await runDatabaseTests();
  } catch (error) {
    console.error('❌ Error ejecutando tests:', error);
    testsFailed++;
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESULTADOS DEL TESTING DE DATABASE SERVICE');
  console.log('='.repeat(60));
  console.log(`✅ Tests pasados: ${testsPassed}`);
  console.log(`❌ Tests fallidos: ${testsFailed}`);
  console.log(`📈 Total tests: ${testsPassed + testsFailed}`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 ¡TODOS LOS TESTS PASARON! DatabaseService funcionando correctamente.');
    console.log('\n📋 FUNCIONALIDADES VALIDADAS:');
    console.log('  ✅ Conexión y pool de PostgreSQL');
    console.log('  ✅ Queries simples y con parámetros');
    console.log('  ✅ Transacciones atómicas');
    console.log('  ✅ Manejo robusto de errores');
    console.log('  ✅ Health checks y monitoring');
    console.log('  ✅ Singleton pattern');
    
    console.log('\n🚀 PRÓXIMO PASO: Integrar DatabaseService con CompaniesController');
    
    process.exit(0);
  } else {
    console.log('\n🚨 ALGUNOS TESTS FALLARON. Revisar configuración antes de continuar.');
    console.log('\n📋 ACCIONES RECOMENDADAS:');
    console.log('  1. Verificar que PostgreSQL esté corriendo');
    console.log('  2. Revisar configuración en .env');
    console.log('  3. Verificar permisos de base de datos');
    console.log('  4. Comprobar conectividad de red');
    console.log('  5. Re-ejecutar: npm run test:database');
    
    process.exit(1);
  }
}

// Ejecutar todos los tests
runAllTests().catch(console.error);
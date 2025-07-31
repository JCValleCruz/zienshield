#!/usr/bin/env node

/**
 * SERVIDOR PRINCIPAL UNIFICADO DE ZIENSHIELD
 * 
 * Consolida todas las funcionalidades de los backends originales:
 * - Middleware de seguridad, rate limiting y validación
 * - Rutas CRUD de empresas con controlador unificado
 * - Servicio de base de datos centralizado
 * - Manejo consistente de errores
 * - Health checks y monitoreo
 */

require('dotenv').config();

const express = require('express');
const { get, isDevelopment } = require('./config/environment');
const { createSecurityMiddleware } = require('./middleware/security');
const { createValidationMiddleware } = require('./middleware/validation');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { createCompaniesRouter } = require('./routes/companies/routes');
const { createAuthRouter } = require('./routes/auth/routes');
const { createWazuhRouter } = require('./routes/wazuh/routes');
const statsRouter = require('./routes/stats');
const systemRouter = require('./routes/system');
const webTrafficRouter = require('./routes/webTraffic');
const { trackWebTraffic } = require('./controllers/webTrafficMetrics');
const { getPrometheusMetrics, prometheusMiddleware, startMetricsCollection } = require('./controllers/prometheusMetrics');
const { getSyncController } = require('./controllers/syncController');
const { extractUser, requireAuth, requireSuperAdmin, auditAuthenticatedAction } = require('./middleware/auth');
const { getDatabaseService } = require('./services/databaseService');

/**
 * Configurar aplicación Express principal
 * 
 * ¿Qué hace? Configura Express con todos los middlewares y rutas
 * ¿Por qué esta estructura? Orden correcto de middlewares para seguridad
 * ¿Para qué? Servidor completo listo para producción
 */
async function createServer() {
  console.log('🚀 Iniciando ZienSHIELD Backend Unificado...');
  console.log('='.repeat(60));
  
  const app = express();
  
  // ====================================================================
  // INFORMACIÓN DEL SERVIDOR
  // ====================================================================
  
  const serverInfo = {
    name: get('app.name'),
    version: get('app.version'),
    environment: get('app.environment'),
    port: get('server.port'),
    startTime: new Date().toISOString()
  };
  
  console.log('📋 Configuración del servidor:');
  console.log(`   🏷️  Nombre: ${serverInfo.name}`);
  console.log(`   📦 Versión: ${serverInfo.version}`);
  console.log(`   🌍 Entorno: ${serverInfo.environment}`);
  console.log(`   🔌 Puerto: ${serverInfo.port}`);
  console.log(`   ⏰ Iniciado: ${serverInfo.startTime}`);
  
  // ====================================================================
  // MIDDLEWARES BÁSICOS DE EXPRESS
  // ====================================================================
  
  console.log('\\n⚙️  Configurando middlewares básicos...');
  
  // Parse JSON y URL-encoded
  app.use(express.json({ 
    limit: '10mb', 
    strict: true 
  }));
  app.use(express.urlencoded({ 
    extended: true, 
    limit: '10mb' 
  }));
  
  // Request ID para tracking
  app.use((req, res, next) => {
    req.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    next();
  });
  
  // Web traffic tracking middleware
  app.use(trackWebTraffic);
  
  // Prometheus metrics middleware
  app.use(prometheusMiddleware);
  
  console.log('   ✅ JSON/URL parsing configurado');
  console.log('   ✅ Request ID middleware activo');
  console.log('   ✅ Web traffic tracking middleware activo');
  console.log('   ✅ Prometheus metrics middleware activo');
  
  // ====================================================================
  // MIDDLEWARES DE SEGURIDAD
  // ====================================================================
  
  console.log('\\n🛡️  Configurando middlewares de seguridad...');
  
  const securityMiddleware = createSecurityMiddleware();
  app.use(securityMiddleware);
  
  console.log('   ✅ Helmet (headers de seguridad) activo');
  console.log('   ✅ CORS configurado para orígenes permitidos');
  console.log('   ✅ Headers personalizados añadidos');
  
  // ====================================================================
  // MIDDLEWARES DE VALIDACIÓN GLOBAL
  // ====================================================================
  
  console.log('\\n🔍 Configurando middlewares de validación...');
  
  const validationMiddleware = createValidationMiddleware();
  app.use(validationMiddleware);
  
  console.log('   ✅ Sanitización de datos de entrada activa');
  console.log('   ✅ Validación de parámetros URL activa');
  console.log('   ✅ Rate limiting inteligente configurado');
  
  // ====================================================================
  // MIDDLEWARE DE AUTENTICACIÓN GLOBAL
  // ====================================================================
  
  console.log('\n🔐 Configurando middleware de autenticación...');
  
  // Extraer usuario de JWT en todas las peticiones (si está presente)
  app.use(extractUser);
  
  console.log('   ✅ Extracción de JWT automática activa');
  console.log('   ✅ req.user disponible en todas las rutas');
  
  // ====================================================================
  // INICIALIZACIÓN DE SERVICIOS
  // ====================================================================
  
  console.log('\\n🗄️  Inicializando servicios de backend...');
  
  // Inicializar servicio de base de datos
  const databaseService = getDatabaseService();
  await databaseService.initialize();
  
  console.log('   ✅ Servicio de base de datos inicializado');
  console.log('   ✅ Pool de conexiones PostgreSQL activo');
  
  // ====================================================================
  // RUTAS PRINCIPALES
  // ====================================================================
  
  console.log('\\n🛣️  Configurando rutas de la aplicación...');
  
  // Rutas de health check (ambas versiones para compatibilidad)
  const healthHandler = async (req, res) => {
    try {
      console.log('❤️  Health check principal solicitado');
      
      const dbHealth = await databaseService.healthCheck();
      
      const health = {
        service: 'ZienSHIELD-Backend-Unified',
        status: dbHealth.status === 'healthy' ? 'healthy' : 'unhealthy',
        version: serverInfo.version,
        environment: serverInfo.environment,
        uptime: Math.floor((Date.now() - new Date(serverInfo.startTime).getTime()) / 1000),
        timestamp: new Date().toISOString(),
        database: dbHealth,
        modules: {
          companies: '/api/companies/health',
          auth: '/api/auth/health',
          wazuh: '/api/wazuh/health'
        },
        endpoints: {
          health: 'GET /health - Service health check',
          companies: 'GET /api/companies/* - Companies CRUD operations',
          auth: 'GET /api/auth/* - Authentication operations',
          wazuh: 'GET /api/wazuh/* - Wazuh integration operations'
        }
      };
      
      const statusCode = health.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(health);
      
    } catch (error) {
      console.error('❌ Error en health check principal:', error);
      
      res.status(503).json({
        service: 'ZienSHIELD-Backend-Unified',
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };

  // Ambas versiones del health check para compatibilidad
  app.get('/health', healthHandler);
  app.get('/api/health', healthHandler);
  
  // Montar rutas de empresas
  const companiesRouter = createCompaniesRouter();
  app.use('/api/companies', companiesRouter);
  
  // Montar rutas de autenticación
  const authRouter = createAuthRouter();
  app.use('/api/auth', authRouter);
  
  // Montar rutas de Wazuh
  const wazuhRouter = createWazuhRouter();
  app.use('/api/wazuh', wazuhRouter);
  
  // Montar rutas de estadísticas
  app.use('/api/stats', statsRouter);
  
  // Montar rutas del sistema
  app.use('/api/system', systemRouter);
  
  // Montar rutas de tráfico web
  app.use('/api/web-traffic', webTrafficRouter);
  
  // Endpoint de métricas de Prometheus
  app.get('/metrics', getPrometheusMetrics);
  
  // Endpoint de test para diagnosticar validación
  app.post('/api/test-post', (req, res) => {
    res.json({
      success: true,
      message: 'Test POST endpoint funciona',
      body: req.body,
      timestamp: new Date().toISOString()
    });
  });

  // Endpoint de compatibilidad para sync (alias) - TEMPORAL SIN AUTH PARA DEBUG
  const syncController = getSyncController();
  app.post('/api/sync/companies-to-wazuh', 
    (req, res, next) => {
      syncController.syncCompaniesToWazuh(req, res, next);
    }
  );
  
  console.log('   ✅ Ruta principal de health check: GET /health');
  console.log('   ✅ Rutas de empresas montadas en: /api/companies');
  console.log('   ✅ Rutas de autenticación montadas en: /api/auth');
  console.log('   ✅ Rutas de Wazuh montadas en: /api/wazuh');
  console.log('   ✅ Rutas de estadísticas montadas en: /api/stats');
  console.log('   ✅ Rutas del sistema montadas en: /api/system');
  console.log('   ✅ Rutas de tráfico web montadas en: /api/web-traffic');
  console.log('   ✅ Endpoint de métricas Prometheus: GET /metrics');
  console.log('   ✅ Endpoint de compatibilidad health: GET /api/health');
  console.log('   ✅ Endpoint de compatibilidad sync: POST /api/sync/companies-to-wazuh');
  
  // ====================================================================
  // MIDDLEWARES DE MANEJO DE ERRORES (SIEMPRE AL FINAL)
  // ====================================================================
  
  console.log('\\n🚨 Configurando manejo de errores...');
  
  // 404 para rutas no encontradas
  app.use(notFoundHandler);
  
  // Error handler principal
  app.use(errorHandler);
  
  console.log('   ✅ Handler de 404 (rutas no encontradas) activo');
  console.log('   ✅ Error handler principal configurado');
  
  return app;
}

/**
 * Iniciar servidor HTTP
 * 
 * ¿Qué hace? Arranca el servidor Express en el puerto configurado
 * ¿Por qué async? Para manejar la inicialización de servicios
 * ¿Para qué? Punto de entrada principal de la aplicación
 */
async function startServer() {
  try {
    // Crear aplicación Express
    const app = await createServer();
    
    const port = get('server.port');
    const host = get('server.host');
    
    // Iniciar servidor HTTP
    const server = app.listen(port, host, () => {
      console.log('\\n' + '='.repeat(60));
      console.log('🎉 ¡ZIENSHIELD BACKEND UNIFICADO INICIADO EXITOSAMENTE!');
      console.log('='.repeat(60));
      console.log(`🌐 Servidor escuchando en: http://${host}:${port}`);
      console.log(`📊 Health check disponible en: http://${host}:${port}/health`);
      console.log(`🏢 API de empresas en: http://${host}:${port}/api/companies`);
      console.log(`🔐 API de autenticación en: http://${host}:${port}/api/auth`);
      console.log(`🛡️  API de Wazuh en: http://${host}:${port}/api/wazuh`);
      
      if (isDevelopment()) {
        console.log('\\n🔧 MODO DESARROLLO - Endpoints de prueba:');
        console.log(`   • Health Check General: curl http://${host}:${port}/health`);
        console.log(`   • Login Super Admin: curl -X POST http://${host}:${port}/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@zienshield.com","password":"ZienAdmin2025"}'`);
        console.log(`   • Listar empresas: curl http://${host}:${port}/api/companies`);
        console.log(`   • Sincronizar Wazuh: curl -X POST http://${host}:${port}/api/wazuh/sync/companies -H "Authorization: Bearer <token>"`);
        console.log(`   • Health módulos:`);
        console.log(`     - Companies: curl http://${host}:${port}/api/companies/health`);
        console.log(`     - Auth: curl http://${host}:${port}/api/auth/health`);
        console.log(`     - Wazuh: curl http://${host}:${port}/api/wazuh/health`);
      }
      
      console.log('\\n✨ Servidor listo para recibir peticiones');
      console.log('   Presiona Ctrl+C para detener el servidor');
      
      // Iniciar recolección de métricas de Prometheus
      startMetricsCollection();
    });
    
    // Manejo de cierre gracioso
    process.on('SIGTERM', () => gracefulShutdown(server));
    process.on('SIGINT', () => gracefulShutdown(server));
    process.on('SIGHUP', () => gracefulShutdown(server));
    
    return server;
    
  } catch (error) {
    console.error('❌ Error fatal iniciando servidor:', error);
    process.exit(1);
  }
}

/**
 * Cierre gracioso del servidor
 * 
 * ¿Qué hace? Cierra el servidor y servicios de manera ordenada
 * ¿Por qué importante? Evita pérdida de datos y conexiones colgadas
 * ¿Para qué? Shutdown limpio en producción
 */
async function gracefulShutdown(server) {
  console.log('\\n🛑 Señal de cierre recibida, cerrando servidor...');
  
  // Cerrar servidor HTTP (deja de aceptar nuevas conexiones)
  server.close(async (err) => {
    if (err) {
      console.error('❌ Error cerrando servidor HTTP:', err);
      process.exit(1);
    }
    
    console.log('✅ Servidor HTTP cerrado');
    
    try {
      // Cerrar servicio de base de datos
      const databaseService = getDatabaseService();
      await databaseService.close();
      console.log('✅ Servicio de base de datos cerrado');
      
      console.log('✅ Cierre gracioso completado');
      process.exit(0);
      
    } catch (error) {
      console.error('❌ Error en cierre gracioso:', error);
      process.exit(1);
    }
  });
  
  // Timeout de seguridad (forzar cierre después de 10 segundos)
  setTimeout(() => {
    console.error('⚠️  Timeout de cierre alcanzado, forzando salida');
    process.exit(1);
  }, 10000);
}

// ====================================================================
// PUNTO DE ENTRADA PRINCIPAL
// ====================================================================

if (require.main === module) {
  console.log('🔄 Iniciando aplicación...');
  startServer().catch((error) => {
    console.error('💀 Error fatal en aplicación:', error);
    process.exit(1);
  });
}

module.exports = {
  createServer,
  startServer
};
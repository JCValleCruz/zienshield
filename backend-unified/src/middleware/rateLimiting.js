/**
 * MIDDLEWARE DE RATE LIMITING DIFERENCIADO
 * 
 * Implementa límites de peticiones personalizados según el tipo de endpoint:
 * - Autenticación: MUY restrictivo (prevenir ataques de fuerza bruta)
 * - CRUD empresas: Moderadamente restrictivo (uso normal)
 * - Health/métricas: Permisivo (monitoreo frecuente)
 */

const rateLimit = require('express-rate-limit');
const { get } = require('../config/environment');

/**
 * Configuración base de rate limiting desde environment.js
 * 
 * ¿Qué hace? Obtiene la configuración centralizada de límites
 * ¿Por qué? Permite ajustar límites sin cambiar código
 * ¿Para qué? Diferentes entornos pueden tener límites diferentes
 */
function getRateLimitConfig() {
  return {
    windowMs: get('rateLimiting.windowMs'), // Ventana de tiempo (15 min por defecto)
    message: get('rateLimiting.message'),   // Mensaje cuando se excede el límite
    standardHeaders: true, // Incluir info de rate limit en headers `RateLimit-*`
    legacyHeaders: false,  // Deshabilitar headers legacy `X-RateLimit-*`
    
    // Función personalizada para generar mensajes de error
    message: (req, res) => ({
      error: 'Límite de peticiones excedido',
      message: get('rateLimiting.message'),
      retryAfter: Math.round(get('rateLimiting.windowMs') / 1000 / 60), // En minutos
      timestamp: new Date().toISOString(),
      requestId: req.requestId || 'unknown'
    }),
    
    // Handler para cuando se alcanza el límite (nueva sintaxis v7+)
    handler: (req, res, options) => {
      console.warn(`⚠️  Rate limit alcanzado:`, {
        ip: req.ip,
        route: req.route?.path || req.path,
        method: req.method,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString(),
        limit: options.limit,
        windowMs: options.windowMs
      });
      
      // Añadir headers informativos
      res.set('X-RateLimit-Policy', 'ZienSHIELD-Security');
      res.set('X-RateLimit-Reason', 'Too many requests');
      
      // Enviar respuesta de rate limit
      return res.status(429).json({
        error: 'Límite de peticiones excedido',
        message: get('rateLimiting.message'),
        retryAfter: Math.round(get('rateLimiting.windowMs') / 1000 / 60),
        timestamp: new Date().toISOString(),
        requestId: req.requestId || 'unknown'
      });
    }
  };
}

/**
 * Rate limiting MUY RESTRICTIVO para endpoints de autenticación
 * 
 * ¿Qué hace? Permite solo 5 intentos de login cada 15 minutos por IP
 * ¿Por qué? Prevenir ataques de fuerza bruta contra passwords
 * ¿Para qué? Proteger las cuentas de usuario de intentos masivos de login
 */
function createAuthRateLimit() {
  console.log('🔐 Configurando rate limiting para autenticación (5 req/15min)...');
  
  const baseConfig = getRateLimitConfig();
  
  return rateLimit({
    ...baseConfig,
    max: get('rateLimiting.authMaxRequests'), // 5 por defecto
    skipSuccessfulRequests: true, // Solo contar intentos fallidos
    
    // Mensaje específico para auth
    message: (req, res) => ({
      error: 'Demasiados intentos de autenticación',
      message: 'Has excedido el límite de intentos de login. Intenta de nuevo más tarde.',
      retryAfter: Math.round(get('rateLimiting.windowMs') / 1000 / 60),
      timestamp: new Date().toISOString(),
      requestId: req.requestId || 'unknown'
    }),
    
    // Identificador único por IP para auth
    keyGenerator: (req) => {
      return `auth_${req.ip}_${req.get('User-Agent')}`;
    },
    
    // Log especial para intentos de auth sospechosos  
    handler: (req, res, options) => {
      console.error(`🚨 ALERTA: Posible ataque de fuerza bruta detectado:`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        method: req.method,
        body: req.body ? { email: req.body.email, password: '[HIDDEN]' } : 'No body',
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
      
      res.set('X-Security-Alert', 'Brute-force-protection-triggered');
      
      return res.status(429).json({
        error: 'Demasiados intentos de autenticación',
        message: 'Has excedido el límite de intentos de login. Intenta de nuevo más tarde.',
        retryAfter: Math.round(get('rateLimiting.windowMs') / 1000 / 60),
        timestamp: new Date().toISOString(),
        requestId: req.requestId || 'unknown'
      });
    }
  });
}

/**
 * Rate limiting MODERADO para operaciones CRUD de empresas
 * 
 * ¿Qué hace? Permite 50 peticiones cada 15 minutos por IP
 * ¿Por qué? Uso normal de la aplicación, pero previene abuso
 * ¿Para qué? Equilibrio entre usabilidad y protección
 */
function createCrudRateLimit() {
  console.log('📊 Configurando rate limiting para CRUD empresas (50 req/15min)...');
  
  const baseConfig = getRateLimitConfig();
  
  return rateLimit({
    ...baseConfig,
    max: get('rateLimiting.maxRequests'), // 50-100 por defecto
    
    // Diferentes límites según el método HTTP
    keyGenerator: (req) => {
      // POST/PUT/DELETE más restrictivos que GET
      const method = req.method;
      const multiplier = method === 'GET' ? 1 : 0.5; // GET permite el doble
      
      return `crud_${method}_${req.ip}`;
    },
    
    // Skip peticiones de health check del sistema
    skip: (req) => {
      const userAgent = req.get('User-Agent') || '';
      
      // Skip monitoring automático
      return userAgent.includes('monitoring') || 
             userAgent.includes('healthcheck') ||
             req.path === '/api/health';
    }
  });
}

/**
 * Rate limiting PERMISIVO para health checks y métricas
 * 
 * ¿Qué hace? Permite 100 peticiones cada 15 minutos por IP
 * ¿Por qué? Estas rutas necesitan ser consultadas frecuentemente
 * ¿Para qué? Permitir monitoreo continuo sin bloqueos
 */
function createHealthRateLimit() {
  console.log('❤️  Configurando rate limiting para health/métricas (100 req/15min)...');
  
  const baseConfig = getRateLimitConfig();
  
  return rateLimit({
    ...baseConfig,
    max: 100, // Más permisivo
    
    // Mensaje específico para monitoreo
    message: (req, res) => ({
      error: 'Límite de monitoreo excedido',
      message: 'Demasiadas peticiones de monitoreo. Reduce la frecuencia.',
      retryAfter: Math.round(get('rateLimiting.windowMs') / 1000 / 60),
      timestamp: new Date().toISOString()
    }),
    
    // Identificador específico para monitoreo
    keyGenerator: (req) => {
      return `health_${req.ip}`;
    }
  });
}

/**
 * Rate limiting GLOBAL por defecto para rutas no especificadas
 * 
 * ¿Qué hace? Límite genérico para cualquier otra ruta
 * ¿Por qué? Protección base para funcionalidades futuras
 * ¿Para qué? Cobertura completa sin configuración adicional
 */
function createGlobalRateLimit() {
  console.log('🌐 Configurando rate limiting global por defecto...');
  
  const baseConfig = getRateLimitConfig();
  
  return rateLimit({
    ...baseConfig,
    max: get('rateLimiting.maxRequests'), // Usar configuración estándar
    
    // Diferentes límites según la ruta
    keyGenerator: (req) => {
      const route = req.route?.path || req.path;
      return `global_${route}_${req.ip}`;
    }
  });
}

/**
 * Middleware inteligente que aplica diferentes rate limits según la ruta
 * 
 * ¿Qué hace? Detecta automáticamente qué tipo de límite aplicar
 * ¿Por qué? Evita configurar manualmente cada ruta
 * ¿Para qué? Aplicación automática de la política de rate limiting
 */
function createSmartRateLimit() {
  const authLimiter = createAuthRateLimit();
  const crudLimiter = createCrudRateLimit();
  const healthLimiter = createHealthRateLimit();
  const globalLimiter = createGlobalRateLimit();
  
  return (req, res, next) => {
    const path = req.path;
    const method = req.method;
    
    // Determinar qué rate limiter usar según la ruta
    if (path.includes('/auth/') || path.includes('/login')) {
      console.log(`🔐 Aplicando rate limiting de AUTH para: ${method} ${path}`);
      return authLimiter(req, res, next);
      
    } else if (path.includes('/companies') || 
               path.includes('/sync') || 
               path.includes('/stats') ||
               path.includes('/vulnerabilities')) {
      console.log(`📊 Aplicando rate limiting de CRUD para: ${method} ${path}`);
      return crudLimiter(req, res, next);
      
    } else if (path.includes('/health') || 
               path.includes('/metrics') || 
               path.includes('/server-metrics')) {
      console.log(`❤️  Aplicando rate limiting de HEALTH para: ${method} ${path}`);
      return healthLimiter(req, res, next);
      
    } else {
      console.log(`🌐 Aplicando rate limiting GLOBAL para: ${method} ${path}`);
      return globalLimiter(req, res, next);
    }
  };
}

/**
 * Función para obtener estadísticas de rate limiting
 * 
 * ¿Qué hace? Proporciona información sobre el uso de límites
 * ¿Por qué? Para monitoreo y ajuste de configuraciones
 * ¿Para qué? Optimizar los límites según el uso real
 */
function getRateLimitStats(req) {
  const headers = {};
  
  // Extraer headers de rate limit si existen
  Object.keys(req.headers).forEach(key => {
    if (key.toLowerCase().startsWith('x-ratelimit-') || 
        key.toLowerCase().startsWith('ratelimit-')) {
      headers[key] = req.headers[key];
    }
  });
  
  return headers;
}

module.exports = {
  createSmartRateLimit,
  createAuthRateLimit,
  createCrudRateLimit,
  createHealthRateLimit,
  createGlobalRateLimit,
  getRateLimitStats
};
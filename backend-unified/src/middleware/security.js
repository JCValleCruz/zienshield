/**
 * MIDDLEWARE DE SEGURIDAD UNIFICADO
 * 
 * Combina las mejores prácticas de seguridad de ambos backends:
 * - Helmet del Super Admin Backend (headers de seguridad)
 * - CORS centralizado del API Backend
 * - Configuración específica para ZienSHIELD
 */

const helmet = require('helmet');
const cors = require('cors');
const { get } = require('../config/environment');

/**
 * Configurar Helmet con opciones específicas para ZienSHIELD
 * 
 * ¿Qué hace? Añade headers de seguridad automáticamente a todas las respuestas
 * ¿Por qué? Protege contra ataques web comunes (XSS, clickjacking, etc.)
 * ¿Para qué? Mejorar la seguridad sin código adicional en cada endpoint
 */
function createHelmetMiddleware() {
  console.log('🛡️  Configurando middleware de seguridad Helmet...');
  
  return helmet({
    // Prevenir clickjacking - tu app no se puede meter en un iframe malicioso
    frameguard: { 
      action: 'deny' 
    },
    
    // Prevenir MIME type sniffing - el navegador respeta el Content-Type exacto
    noSniff: true,
    
    // Habilitar protección XSS del navegador
    xssFilter: true,
    
    // Control de recursos cross-origin - permite cargar imágenes/scripts de otros dominios si es necesario
    crossOriginResourcePolicy: { 
      policy: "cross-origin" 
    },
    
    // En desarrollo, permitir conexiones HTTP. En producción, forzar HTTPS
    ...(get('app.environment') === 'production' && {
      hsts: {
        maxAge: 31536000, // 1 año
        includeSubDomains: true,
        preload: true
      }
    }),
    
    // Política de contenido (CSP) - define qué scripts y recursos se pueden cargar
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'", 
          "'unsafe-inline'", // Necesario para React en desarrollo
          "https://cdn.jsdelivr.net" // CDNs permitidos si los usas
        ],
        styleSrc: [
          "'self'", 
          "'unsafe-inline'", // Necesario para CSS dinámico
          "https://fonts.googleapis.com"
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com"
        ],
        imgSrc: [
          "'self'", 
          "data:", // Para imágenes base64
          "https:" // Permitir imágenes HTTPS externas
        ],
        connectSrc: [
          "'self'",
          get('wazuh.apiUrl'), // Permitir conexiones a Wazuh API
          "ws://localhost:*", // WebSockets en desarrollo
          "wss://localhost:*"
        ]
      },
      // En desarrollo, solo reportar violaciones. En producción, bloquear
      reportOnly: get('app.environment') !== 'production'
    }
  });
}

/**
 * Configurar CORS usando la configuración centralizada
 * 
 * ¿Qué hace? Define qué dominios pueden hacer peticiones a tu API
 * ¿Por qué? Sin CORS, solo el mismo dominio puede hacer peticiones
 * ¿Para qué? Permitir que tu frontend (puerto 3000) hable con tu backend (puerto 3001)
 */
function createCorsMiddleware() {
  console.log('🌐 Configurando middleware CORS...');
  
  const corsConfig = get('cors');
  
  console.log(`📋 CORS configurado para orígenes: ${corsConfig.origins.join(', ')}`);
  
  return cors({
    // Dominios permitidos - solo estos pueden hacer peticiones a tu API
    origin: corsConfig.origins,
    
    // Permitir envío de cookies y headers de autenticación
    credentials: corsConfig.credentials,
    
    // Métodos HTTP permitidos
    methods: corsConfig.methods,
    
    // Headers permitidos en las peticiones
    allowedHeaders: corsConfig.allowedHeaders,
    
    // Headers que el frontend puede leer en las respuestas
    exposedHeaders: [
      'X-Total-Count', // Para paginación
      'X-Page-Count',  // Para paginación
      'X-Request-ID'   // Para debugging
    ],
    
    // Tiempo que el navegador puede cachear las opciones CORS (en segundos)
    maxAge: 86400, // 24 horas
    
    // Manejar peticiones OPTIONS automáticamente
    preflightContinue: false,
    optionsSuccessStatus: 204
  });
}

/**
 * Middleware para añadir headers personalizados de ZienSHIELD
 * 
 * ¿Qué hace? Añade información útil a cada respuesta
 * ¿Por qué? Facilita el debugging y monitoreo
 * ¿Para qué? Saber qué versión del backend procesó cada petición
 */
function addCustomHeaders(req, res, next) {
  // Header personalizado con información del servicio
  res.set('X-Service-Name', 'ZienSHIELD-Backend-Unified');
  res.set('X-Service-Version', '1.0.0');
  res.set('X-Environment', get('app.environment'));
  
  // ID único para cada petición (útil para logs y debugging)
  const requestId = req.headers['x-request-id'] || 
                   `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  res.set('X-Request-ID', requestId);
  req.requestId = requestId;
  
  next();
}

/**
 * Middleware de logging de seguridad
 * 
 * ¿Qué hace? Registra información sobre peticiones sospechosas
 * ¿Por qué? Para detectar intentos de ataque
 * ¿Para qué? Monitorear la seguridad de la aplicación
 */
function securityLogging(req, res, next) {
  const userAgent = req.get('User-Agent') || 'Unknown';
  const ip = req.ip || req.connection.remoteAddress || 'Unknown';
  const method = req.method;
  const url = req.url;
  
  // Log de peticiones sospechosas (muy básico)
  const suspiciousPatterns = [
    /\.\.\//, // Path traversal attempts
    /<script/i, // XSS attempts in URL
    /union.*select/i, // SQL injection attempts
    /exec\(/i, // Code injection attempts
  ];
  
  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(url) || pattern.test(userAgent)
  );
  
  if (isSuspicious) {
    console.warn(`🚨 Petición sospechosa detectada:`, {
      ip,
      method,
      url,
      userAgent,
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });
  }
  
  next();
}

/**
 * Función principal que combina todos los middlewares de seguridad
 * 
 * ¿Qué hace? Aplica todos los filtros de seguridad en orden
 * ¿Por qué? Cada filtro tiene una función específica
 * ¿Para qué? Tener una defensa en capas completa
 */
function createSecurityMiddleware() {
  console.log('🔒 Inicializando stack completo de middleware de seguridad...');
  
  return [
    // 1. Headers de seguridad básicos
    createHelmetMiddleware(),
    
    // 2. CORS - definir qué dominios pueden acceder
    createCorsMiddleware(),
    
    // 3. Headers personalizados de ZienSHIELD
    addCustomHeaders,
    
    // 4. Logging de seguridad
    securityLogging
  ];
}

module.exports = {
  createSecurityMiddleware,
  createHelmetMiddleware,
  createCorsMiddleware,
  addCustomHeaders,
  securityLogging
};
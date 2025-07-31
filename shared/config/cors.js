/**
 * CONFIGURACIÓN CORS CENTRALIZADA
 * 
 * Gestiona los orígenes permitidos para peticiones cross-origin
 * en todos los servicios de ZienShield de forma consistente.
 * 
 * Patrones implementados:
 * - Single Source of Truth: Una sola configuración CORS
 * - Environment-based config: Diferentes reglas por entorno
 * - Security by default: Producción más restrictiva
 */

module.exports = {
  development: {
    // Desarrollo: Más permisivo para facilitar testing
    origin: [
      'http://localhost:3000',        // Frontend en desarrollo
      'http://127.0.0.1:3000',       // Alternativa localhost
      'http://194.164.172.92:3000',   // Servidor actual
      'http://194.164.172.92'         // Sin puerto específico
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'X-Requested-With',
      'Accept',
      'Origin'
    ],
    optionsSuccessStatus: 200 // Para navegadores legacy
  },

  production: {
    // Producción: Restrictivo y basado en variables de entorno
    origin: function(origin, callback) {
      const allowedOrigins = process.env.CORS_ORIGINS ? 
        process.env.CORS_ORIGINS.split(',').map(o => o.trim()) : 
        [];
      
      // Permite requests sin origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Origen no permitido por CORS'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Sin OPTIONS ni PATCH
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400 // Cache preflight por 24h
  },

  // Helper para obtener configuración por entorno actual
  getCorsConfig() {
    const env = process.env.NODE_ENV || 'development';
    return this[env] || this.development;
  }
};
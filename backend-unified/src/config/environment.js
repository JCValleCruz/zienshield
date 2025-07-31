/**
 * CONFIGURACIÓN CENTRALIZADA DE ENVIRONMENT
 * 
 * Consolida todas las configuraciones dispersas del proyecto
 * Elimina hard-coding y centraliza variables de entorno
 */

const path = require('path');

// Detectar entorno
const NODE_ENV = process.env.NODE_ENV || 'development';

// Configuración base común
const baseConfig = {
  // Información de la aplicación
  app: {
    name: 'ZienSHIELD',
    version: '1.0.0',
    environment: NODE_ENV
  },
  
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'ZienShield2025_JWT_Secret_Key_Multi_Tenant',
    expiresIn: process.env.JWT_EXPIRE || '24h'
  },
  
  // Rate Limiting
  rateLimiting: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // Más restrictivo por defecto
    authMaxRequests: parseInt(process.env.RATE_LIMIT_AUTH_MAX) || 5, // Muy restrictivo para auth
    message: process.env.RATE_LIMIT_MESSAGE || 'Demasiadas solicitudes desde esta IP'
  },
  
  // Security Headers
  security: {
    helmetEnabled: process.env.HELMET_ENABLED !== 'false',
    corsPolicy: process.env.CORS_POLICY || 'cross-origin'
  }
};

// Configuraciones específicas por entorno
const configs = {
  development: {
    ...baseConfig,
    
    // Server Configuration
    server: {
      port: parseInt(process.env.PORT) || 3001,
      host: process.env.HOST || '0.0.0.0',
      baseUrl: process.env.BASE_URL || 'http://localhost:3001'
    },
    
    // Database Configuration
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'zienshield',
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      ssl: process.env.DB_SSL === 'true',
      
      // Pool configuration
      pool: {
        max: parseInt(process.env.DB_POOL_MAX) || 8,
        min: parseInt(process.env.DB_POOL_MIN) || 2,
        idle: parseInt(process.env.DB_POOL_IDLE) || 10000,
        acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 30000
      }
    },
    
    // Wazuh Configuration
    wazuh: {
      apiUrl: process.env.WAZUH_API_URL || 'https://194.164.172.92:55000',
      username: process.env.WAZUH_USERNAME || 'wazuh',
      password: process.env.WAZUH_PASSWORD || 'wazuh', // CAMBIAR EN PRODUCCIÓN
      timeout: parseInt(process.env.WAZUH_TIMEOUT) || 30000,
      retryAttempts: parseInt(process.env.WAZUH_RETRY_ATTEMPTS) || 3,
      rateLimitPerSecond: parseInt(process.env.WAZUH_RATE_LIMIT) || 4,
      sslVerify: process.env.WAZUH_SSL_VERIFY === 'true', // Default false en desarrollo
      
      // Cache configuration
      cache: {
        enabled: process.env.WAZUH_CACHE_ENABLED !== 'false',
        maxMemoryMB: parseInt(process.env.WAZUH_CACHE_MAX_MEMORY_MB) || 50,
        maxEntries: parseInt(process.env.WAZUH_CACHE_MAX_ENTRIES) || 500,
        cleanupIntervalMs: parseInt(process.env.WAZUH_CACHE_CLEANUP_INTERVAL_MS) || 5 * 60 * 1000,
        
        // TTL por tipo de datos (en milisegundos)
        ttl: {
          hardware: parseInt(process.env.WAZUH_CACHE_TTL_HARDWARE) || 24 * 60 * 60 * 1000, // 24h
          os: parseInt(process.env.WAZUH_CACHE_TTL_OS) || 12 * 60 * 60 * 1000,             // 12h
          packages: parseInt(process.env.WAZUH_CACHE_TTL_PACKAGES) || 6 * 60 * 60 * 1000,  // 6h
          network: parseInt(process.env.WAZUH_CACHE_TTL_NETWORK) || 30 * 60 * 1000,        // 30min
          agents: parseInt(process.env.WAZUH_CACHE_TTL_AGENTS) || 2 * 60 * 1000,           // 2min
          stats: parseInt(process.env.WAZUH_CACHE_TTL_STATS) || 5 * 60 * 1000              // 5min
        }
      }
    },
    
    // CORS Configuration
    cors: {
      origins: process.env.CORS_ORIGINS 
        ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
      credentials: process.env.CORS_CREDENTIALS !== 'false',
      methods: process.env.CORS_METHODS 
        ? process.env.CORS_METHODS.split(',').map(method => method.trim())
        : ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: process.env.CORS_ALLOWED_HEADERS
        ? process.env.CORS_ALLOWED_HEADERS.split(',').map(header => header.trim())
        : ['Content-Type', 'Authorization', 'X-Requested-With']
    },
    
    // Frontend URLs
    frontend: {
      url: process.env.FRONTEND_URL || 'http://localhost:3000',
      superAdminUrl: process.env.SUPER_ADMIN_FRONTEND_URL || 'http://localhost:3000'
    },
    
    // Logging Configuration
    logging: {
      level: process.env.LOG_LEVEL || 'debug',
      enableConsole: process.env.LOG_CONSOLE_ENABLED !== 'false',
      enableFile: process.env.LOG_FILE_ENABLED === 'true',
      filePath: process.env.LOG_FILE_PATH || './logs',
      maxFileSize: process.env.LOG_MAX_FILE_SIZE || '10MB',
      maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5
    },
    
    // Metrics & Monitoring
    metrics: {
      enabled: process.env.METRICS_ENABLED !== 'false',
      prometheusEnabled: process.env.PROMETHEUS_ENABLED !== 'false',
      metricsPath: process.env.METRICS_PATH || '/metrics'
    },
    
    // Vulnerabilities Service
    vulnerabilities: {
      updateEnabled: process.env.VULN_UPDATE_ENABLED !== 'false',
      updateIntervalMs: parseInt(process.env.VULN_UPDATE_INTERVAL_MS) || 60 * 60 * 1000, // 1 hora
      batchSize: parseInt(process.env.VULN_BATCH_SIZE) || 50
    }
  },
  
  production: {
    ...baseConfig,
    
    // Server Configuration - Más seguro
    server: {
      port: parseInt(process.env.PORT) || 3001,
      host: process.env.HOST || '0.0.0.0',
      baseUrl: process.env.BASE_URL // REQUERIDO en producción
    },
    
    // Database Configuration - SSL obligatorio
    database: {
      host: process.env.DB_HOST, // REQUERIDO
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME, // REQUERIDO
      username: process.env.DB_USER, // REQUERIDO
      password: process.env.DB_PASSWORD, // REQUERIDO
      ssl: true, // SIEMPRE SSL en producción
      
      pool: {
        max: parseInt(process.env.DB_POOL_MAX) || 15,
        min: parseInt(process.env.DB_POOL_MIN) || 5,
        idle: parseInt(process.env.DB_POOL_IDLE) || 10000,
        acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 30000
      }
    },
    
    // Wazuh Configuration - Más seguro
    wazuh: {
      apiUrl: process.env.WAZUH_API_URL, // REQUERIDO
      username: process.env.WAZUH_USERNAME, // REQUERIDO
      password: process.env.WAZUH_PASSWORD, // REQUERIDO
      timeout: parseInt(process.env.WAZUH_TIMEOUT) || 10000, // Más corto en producción
      retryAttempts: parseInt(process.env.WAZUH_RETRY_ATTEMPTS) || 5,
      rateLimitPerSecond: parseInt(process.env.WAZUH_RATE_LIMIT) || 2, // Más restrictivo
      sslVerify: true, // SIEMPRE true en producción
      
      cache: {
        enabled: process.env.WAZUH_CACHE_ENABLED !== 'false',
        maxMemoryMB: parseInt(process.env.WAZUH_CACHE_MAX_MEMORY_MB) || 100,
        maxEntries: parseInt(process.env.WAZUH_CACHE_MAX_ENTRIES) || 1000,
        cleanupIntervalMs: parseInt(process.env.WAZUH_CACHE_CLEANUP_INTERVAL_MS) || 5 * 60 * 1000,
        
        ttl: {
          hardware: parseInt(process.env.WAZUH_CACHE_TTL_HARDWARE) || 24 * 60 * 60 * 1000,
          os: parseInt(process.env.WAZUH_CACHE_TTL_OS) || 12 * 60 * 60 * 1000,
          packages: parseInt(process.env.WAZUH_CACHE_TTL_PACKAGES) || 6 * 60 * 60 * 1000,
          network: parseInt(process.env.WAZUH_CACHE_TTL_NETWORK) || 30 * 60 * 1000,
          agents: parseInt(process.env.WAZUH_CACHE_TTL_AGENTS) || 2 * 60 * 1000,
          stats: parseInt(process.env.WAZUH_CACHE_TTL_STATS) || 5 * 60 * 1000
        }
      }
    },
    
    // CORS - Más restrictivo
    cors: {
      origins: process.env.CORS_ORIGINS.split(',').map(origin => origin.trim()), // REQUERIDO
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE'], // Sin OPTIONS en producción
      allowedHeaders: ['Content-Type', 'Authorization']
    },
    
    // Rate Limiting - Más agresivo
    rateLimiting: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 50, // Más restrictivo
      authMaxRequests: parseInt(process.env.RATE_LIMIT_AUTH_MAX) || 3, // Muy restrictivo
      message: 'Rate limit exceeded. Please try again later.'
    },
    
    // Logging - Más completo
    logging: {
      level: process.env.LOG_LEVEL || 'info',
      enableConsole: process.env.LOG_CONSOLE_ENABLED !== 'false',
      enableFile: true, // SIEMPRE logs en archivo en producción
      filePath: process.env.LOG_FILE_PATH || './logs',
      maxFileSize: process.env.LOG_MAX_FILE_SIZE || '50MB',
      maxFiles: parseInt(process.env.LOG_MAX_FILES) || 10
    }
  },
  
  test: {
    ...baseConfig,
    
    server: {
      port: parseInt(process.env.PORT) || 3099,
      host: '127.0.0.1'
    },
    
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'zienshield_test',
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      ssl: false,
      
      pool: {
        max: 5,
        min: 1,
        idle: 5000,
        acquire: 10000
      }
    },
    
    wazuh: {
      // Configuración mock para testing
      apiUrl: 'http://mock-wazuh:55000',
      username: 'test',
      password: 'test',
      timeout: 5000,
      retryAttempts: 1,
      rateLimitPerSecond: 10,
      sslVerify: false,
      
      cache: {
        enabled: false // Sin cache en tests
      }
    },
    
    cors: {
      origins: ['http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    },
    
    logging: {
      level: 'error', // Solo errores en tests
      enableConsole: false,
      enableFile: false
    }
  }
};

/**
 * Obtener configuración para el entorno actual
 */
function getConfig() {
  const config = configs[NODE_ENV];
  
  if (!config) {
    throw new Error(`Configuración no encontrada para entorno: ${NODE_ENV}`);
  }
  
  // Validar configuraciones requeridas en producción
  if (NODE_ENV === 'production') {
    validateProductionConfig(config);
  }
  
  return config;
}

/**
 * Validar configuraciones críticas en producción
 */
function validateProductionConfig(config) {
  const required = [
    'server.baseUrl',
    'database.host', 'database.database', 'database.username', 'database.password',
    'wazuh.apiUrl', 'wazuh.username', 'wazuh.password',
    'cors.origins'
  ];
  
  const missing = [];
  
  for (const path of required) {
    const value = getNestedValue(config, path);
    if (!value) {
      missing.push(path);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(`Configuraciones requeridas faltantes en producción: ${missing.join(', ')}`);
  }
  
  // Validar que SSL esté habilitado
  if (!config.wazuh.sslVerify) {
    throw new Error('SSL verification debe estar habilitado en producción');
  }
  
  if (!config.database.ssl) {
    console.warn('⚠️  ADVERTENCIA: SSL de base de datos no está habilitado en producción');
  }
}

/**
 * Obtener valor anidado de un objeto usando notación de punto
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current && current[key], obj);
}

/**
 * Obtener configuración específica por clave
 */
function get(key) {
  const config = getConfig();
  return getNestedValue(config, key);
}

/**
 * Verificar si estamos en desarrollo
 */
function isDevelopment() {
  return NODE_ENV === 'development';
}

/**
 * Verificar si estamos en producción
 */
function isProduction() {
  return NODE_ENV === 'production';
}

/**
 * Verificar si estamos en testing
 */
function isTesting() {
  return NODE_ENV === 'test';
}

module.exports = {
  getConfig,
  get,
  isDevelopment,
  isProduction,
  isTesting,
  NODE_ENV
};
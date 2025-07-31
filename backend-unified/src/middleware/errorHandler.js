/**
 * MIDDLEWARE DE MANEJO DE ERRORES UNIFICADO
 * 
 * Intercepta y procesa todos los errores de la aplicación:
 * - Respuestas consistentes para el frontend
 * - Logs detallados para debugging
 * - Ocultación de información sensible
 * - Diferentes niveles según el tipo de error
 */

const { get, isDevelopment } = require('../config/environment');

/**
 * Tipos de errores que reconoce el sistema
 * 
 * ¿Qué hace? Clasifica errores para dar respuestas apropiadas
 * ¿Por qué? Diferentes errores necesitan diferente tratamiento
 * ¿Para qué? Respuestas más útiles y logs más organizados
 */
const ErrorTypes = {
  VALIDATION: 'validation',
  AUTHENTICATION: 'authentication', 
  AUTHORIZATION: 'authorization',
  NOT_FOUND: 'not_found',
  RATE_LIMIT: 'rate_limit',
  DATABASE: 'database',
  EXTERNAL_API: 'external_api',
  INTERNAL: 'internal',
  NETWORK: 'network'
};

/**
 * Mapeo de errores comunes de base de datos a mensajes amigables
 * 
 * ¿Qué hace? Convierte códigos de error PostgreSQL a mensajes legibles
 * ¿Por qué? Los usuarios no entienden "23505" pero sí "email ya existe"
 * ¿Para qué? Mejor experiencia de usuario
 */
const DatabaseErrorMessages = {
  '23505': 'Ya existe un registro con estos datos únicos',
  '23503': 'No se puede eliminar porque tiene datos relacionados',
  '23502': 'Faltan campos obligatorios',
  '42P01': 'Error de configuración de base de datos',
  '28P01': 'Error de autenticación con la base de datos',
  '3D000': 'La base de datos especificada no existe',
  'ECONNREFUSED': 'No se puede conectar a la base de datos',
  'ENOTFOUND': 'Servidor de base de datos no encontrado'
};

/**
 * Detectar tipo de error automáticamente
 * 
 * ¿Qué hace? Analiza el error para clasificarlo correctamente
 * ¿Por qué? Cada tipo de error debe manejarse diferente
 * ¿Para qué? Respuestas apropiadas y logs organizados
 */
function detectErrorType(error) {
  // Error de validación
  if (error.name === 'ValidationError' || error.message.includes('validación')) {
    return ErrorTypes.VALIDATION;
  }
  
  // Error de autenticación
  if (error.name === 'UnauthorizedError' || 
      error.message.includes('token') || 
      error.message.includes('authentication') ||
      error.status === 401) {
    return ErrorTypes.AUTHENTICATION;
  }
  
  // Error de autorización/permisos
  if (error.name === 'ForbiddenError' || 
      error.message.includes('forbidden') ||
      error.message.includes('permisos') ||
      error.status === 403) {
    return ErrorTypes.AUTHORIZATION;
  }
  
  // Error 404 - no encontrado
  if (error.status === 404 || error.message.includes('not found')) {
    return ErrorTypes.NOT_FOUND;
  }
  
  // Error de rate limiting
  if (error.status === 429 || error.message.includes('rate limit')) {
    return ErrorTypes.RATE_LIMIT;
  }
  
  // Errores de base de datos
  if (error.code && DatabaseErrorMessages[error.code]) {
    return ErrorTypes.DATABASE;
  }
  
  if (error.name === 'DatabaseError' || 
      error.message.includes('database') ||
      error.message.includes('PostgreSQL') ||
      error.message.includes('connection')) {
    return ErrorTypes.DATABASE;
  }
  
  // Errores de APIs externas
  if (error.message.includes('Wazuh') || 
      error.message.includes('external') ||
      error.code === 'ECONNREFUSED' ||
      error.code === 'ENOTFOUND') {
    return ErrorTypes.EXTERNAL_API;
  }
  
  // Errores de red
  if (error.code === 'ECONNRESET' || 
      error.code === 'ETIMEDOUT' ||
      error.message.includes('network')) {
    return ErrorTypes.NETWORK;
  }
  
  // Por defecto, error interno
  return ErrorTypes.INTERNAL;
}

/**
 * Generar mensaje amigable para el usuario
 * 
 * ¿Qué hace? Convierte errores técnicos en mensajes comprensibles
 * ¿Por qué? Los usuarios no deben ver stacktraces o códigos internos
 * ¿Para qué? Mejor experiencia y menos confusión
 */
function generateUserMessage(error, errorType) {
  switch (errorType) {
    case ErrorTypes.VALIDATION:
      return 'Los datos enviados no son válidos. Por favor revisa los campos marcados.';
      
    case ErrorTypes.AUTHENTICATION:
      return 'Credenciales inválidas. Por favor verifica tu email y contraseña.';
      
    case ErrorTypes.AUTHORIZATION:
      return 'No tienes permisos para realizar esta acción.';
      
    case ErrorTypes.NOT_FOUND:
      return 'El recurso solicitado no fue encontrado.';
      
    case ErrorTypes.RATE_LIMIT:
      return 'Has realizado demasiadas peticiones. Por favor espera un momento antes de intentar de nuevo.';
      
    case ErrorTypes.DATABASE:
      if (error.code && DatabaseErrorMessages[error.code]) {
        return DatabaseErrorMessages[error.code];
      }
      return 'Error temporál en la base de datos. Por favor intenta de nuevo en unos minutos.';
      
    case ErrorTypes.EXTERNAL_API:
      if (error.message.includes('Wazuh')) {
        return 'Error temporal conectando con el sistema de seguridad. Los datos pueden estar desactualizados.';
      }
      return 'Error temporal conectando con servicios externos. Por favor intenta de nuevo.';
      
    case ErrorTypes.NETWORK:
      return 'Error de conexión. Por favor verifica tu conexión a internet e intenta de nuevo.';
      
    case ErrorTypes.INTERNAL:
    default:
      return 'Error interno del servidor. Nuestro equipo ha sido notificado y está trabajando en una solución.';
  }
}

/**
 * Determinar código de estado HTTP apropiado
 * 
 * ¿Qué hace? Asigna el código HTTP correcto según el tipo de error
 * ¿Por qué? El frontend necesita códigos HTTP apropiados para manejar errores
 * ¿Para qué? Comportamiento consistente en la aplicación
 */
function getStatusCode(error, errorType) {
  // Si el error ya tiene un status code, usarlo
  if (error.status && error.status >= 400 && error.status < 600) {
    return error.status;
  }
  
  // Asignar según el tipo de error
  switch (errorType) {
    case ErrorTypes.VALIDATION:
      return 400; // Bad Request
      
    case ErrorTypes.AUTHENTICATION:
      return 401; // Unauthorized
      
    case ErrorTypes.AUTHORIZATION:
      return 403; // Forbidden
      
    case ErrorTypes.NOT_FOUND:
      return 404; // Not Found
      
    case ErrorTypes.RATE_LIMIT:
      return 429; // Too Many Requests
      
    case ErrorTypes.DATABASE:
      // Diferentes códigos según el error de DB
      if (error.code === '23505') return 409; // Conflict (duplicado)
      if (error.code === '23503') return 409; // Conflict (referencia)
      if (error.code === '23502') return 400; // Bad Request (campo requerido)
      return 503; // Service Unavailable (problema de DB)
      
    case ErrorTypes.EXTERNAL_API:
      return 502; // Bad Gateway
      
    case ErrorTypes.NETWORK:
      return 503; // Service Unavailable
      
    case ErrorTypes.INTERNAL:
    default:
      return 500; // Internal Server Error
  }
}

/**
 * Generar logs detallados para debugging
 * 
 * ¿Qué hace? Registra información completa del error para los desarrolladores
 * ¿Por qué? Necesitamos información detallada para arreglar problemas
 * ¿Para qué? Debugging eficiente y resolución rápida de problemas
 */
function logError(error, req, errorType, statusCode) {
  const logData = {
    // Información del error
    errorType,
    statusCode,
    message: error.message,
    stack: error.stack,
    name: error.name,
    code: error.code,
    
    // Información de la petición
    method: req.method,
    url: req.url,
    path: req.path,
    params: req.params,
    query: req.query,
    body: req.body ? sanitizeBodyForLog(req.body) : undefined,
    
    // Información del cliente
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    referer: req.get('Referer'),
    
    // Información de contexto
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    environment: get('app.environment'),
    
    // Headers relevantes (sin información sensible)
    headers: sanitizeHeadersForLog(req.headers)
  };
  
  // Log con nivel apropiado según la severidad
  if (statusCode >= 500) {
    console.error('🚨 ERROR INTERNO:', JSON.stringify(logData, null, 2));
  } else if (statusCode >= 400) {
    console.warn('⚠️  ERROR DE CLIENTE:', JSON.stringify(logData, null, 2));
  } else {
    console.log('ℹ️  ERROR MANEJADO:', JSON.stringify(logData, null, 2));
  }
}

/**
 * Limpiar body para logs (ocultar información sensible)
 * 
 * ¿Qué hace? Remueve passwords y datos sensibles antes de logear
 * ¿Por qué? No queremos passwords en los logs
 * ¿Para qué? Seguridad y compliance
 */
function sanitizeBodyForLog(body) {
  if (!body || typeof body !== 'object') return body;
  
  const sanitized = { ...body };
  
  // Campos sensibles que no deben aparecer en logs
  const sensitiveFields = [
    'password', 'admin_password', 'token', 'secret', 
    'apiKey', 'api_key', 'creditCard', 'ssn'
  ];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[HIDDEN]';
    }
  });
  
  return sanitized;
}

/**
 * Limpiar headers para logs (ocultar información sensible)
 * 
 * ¿Qué hace? Remueve tokens de autorización de los logs
 * ¿Por qué? Los tokens en logs son un riesgo de seguridad
 * ¿Para qué? Mantener información útil sin comprometer seguridad
 */
function sanitizeHeadersForLog(headers) {
  if (!headers) return {};
  
  const sanitized = { ...headers };
  
  // Headers sensibles
  if (sanitized.authorization) {
    sanitized.authorization = '[HIDDEN]';
  }
  if (sanitized.cookie) {
    sanitized.cookie = '[HIDDEN]';
  }
  
  return sanitized;
}

/**
 * Middleware principal de manejo de errores
 * 
 * ¿Qué hace? Intercepta TODOS los errores y los procesa uniformemente
 * ¿Por qué? Express requiere un middleware especial para errores
 * ¿Para qué? Respuestas consistentes sin importar dónde ocurra el error
 */
function errorHandler(error, req, res, next) {
  // Si la respuesta ya fue enviada, pasar el error a Express
  if (res.headersSent) {
    return next(error);
  }
  
  console.log(`🚨 Error interceptado en ${req.method} ${req.path}`);
  
  try {
    // Detectar tipo de error
    const errorType = detectErrorType(error);
    
    // Determinar código de estado
    const statusCode = getStatusCode(error, errorType);
    
    // Generar mensaje para el usuario
    const userMessage = generateUserMessage(error, errorType);
    
    // Log detallado para desarrolladores
    logError(error, req, errorType, statusCode);
    
    // Preparar respuesta según el entorno
    const errorResponse = {
      error: true,
      message: userMessage,
      type: errorType,
      timestamp: new Date().toISOString(),
      requestId: req.requestId || 'unknown'
    };
    
    // En desarrollo, incluir información adicional
    if (isDevelopment()) {
      errorResponse.development = {
        originalMessage: error.message,
        stack: error.stack,
        code: error.code
      };
    }
    
    // Añadir detalles específicos si existen
    if (error.details) {
      errorResponse.details = error.details;
    }
    
    // Headers adicionales para debugging
    res.set('X-Error-Type', errorType);
    res.set('X-Error-ID', req.requestId || 'unknown');
    
    // Enviar respuesta
    res.status(statusCode).json(errorResponse);
    
  } catch (handlingError) {
    // Si hay error manejando el error, enviar respuesta mínima
    console.error('❌ Error manejando error:', handlingError);
    
    res.status(500).json({
      error: true,
      message: 'Error interno del servidor',
      timestamp: new Date().toISOString(),
      requestId: req.requestId || 'unknown'
    });
  }
}

/**
 * Middleware para capturar errores 404 (rutas no encontradas)
 * 
 * ¿Qué hace? Maneja peticiones a rutas que no existen
 * ¿Por qué? Por defecto Express no captura 404s como errores
 * ¿Para qué? Respuestas consistentes para rutas inexistentes
 */
function notFoundHandler(req, res, next) {
  const error = new Error(`Ruta no encontrada: ${req.method} ${req.path}`);
  error.status = 404;
  
  console.log(`🔍 Ruta no encontrada: ${req.method} ${req.path} - IP: ${req.ip}`);
  
  // Pasar al error handler principal
  next(error);
}

/**
 * Función para crear errores customizados fácilmente
 * 
 * ¿Qué hace? Permite crear errores con información estructurada
 * ¿Por qué? Facilita crear errores desde cualquier parte del código
 * ¿Para qué? Errores consistentes y bien formateados
 */
function createError(message, statusCode = 500, type = ErrorTypes.INTERNAL, details = null) {
  const error = new Error(message);
  error.status = statusCode;
  error.type = type;
  if (details) error.details = details;
  
  return error;
}

module.exports = {
  errorHandler,
  notFoundHandler,
  createError,
  ErrorTypes,
  DatabaseErrorMessages
};
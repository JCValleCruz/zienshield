/**
 * MIDDLEWARE DE VALIDACIÓN Y SANITIZACIÓN
 * 
 * Limpia y valida automáticamente todos los datos de entrada:
 * - Sanitiza strings para prevenir XSS
 * - Valida formatos de datos comunes (email, teléfono, etc.)
 * - Limita tamaños para prevenir ataques de memoria
 * - Usa el ValidationService centralizado que ya creamos
 */

const ValidationService = require('../services/validationService');

/**
 * Middleware de sanitización automática para request body
 * 
 * ¿Qué hace? Limpia automáticamente todos los strings que llegan en el body
 * ¿Por qué? Prevenir XSS y otros ataques de inyección
 * ¿Para qué? No tener que recordar limpiar datos en cada endpoint
 */
function sanitizeRequestBody(req, res, next) {
  if (!req.body || typeof req.body !== 'object') {
    return next();
  }
  
  console.log(`🧹 Sanitizando datos de entrada para ${req.method} ${req.path}`);
  
  const originalBody = JSON.parse(JSON.stringify(req.body)); // Backup para logs
  
  try {
    // Función recursiva para limpiar objetos anidados
    function sanitizeObject(obj) {
      if (typeof obj === 'string') {
        return ValidationService.sanitizeString(obj);
      } else if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      } else if (obj && typeof obj === 'object') {
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
          // También sanitizar las claves del objeto
          const cleanKey = ValidationService.sanitizeString(key);
          sanitized[cleanKey] = sanitizeObject(value);
        }
        return sanitized;
      }
      return obj;
    }
    
    req.body = sanitizeObject(req.body);
    
    // Log si se hicieron cambios significativos
    const hasChanges = JSON.stringify(originalBody) !== JSON.stringify(req.body);
    if (hasChanges) {
      console.warn(`⚠️  Datos sanitizados en petición:`, {
        endpoint: `${req.method} ${req.path}`,
        ip: req.ip,
        originalKeys: Object.keys(originalBody),
        sanitizedKeys: Object.keys(req.body),
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      });
    }
    
    next();
    
  } catch (error) {
    console.error('❌ Error en sanitización:', error);
    return res.status(400).json({
      error: 'Error procesando datos de entrada',
      message: 'Los datos enviados no tienen el formato correcto',
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Middleware de validación para datos de empresa
 * 
 * ¿Qué hace? Valida automáticamente los datos cuando se crean/actualizan empresas
 * ¿Por qué? Usar el ValidationService que ya creamos en lugar de duplicar código
 * ¿Para qué? Respuestas de error consistentes y validaciones centralizadas
 */
function validateCompanyData(req, res, next) {
  // Solo aplicar en rutas de CRUD de empresas con datos en el body
  // Excluir endpoints de sync que contienen "companies" pero no son CRUD
  if (!req.path.startsWith('/api/companies') || 
      !['POST', 'PUT', 'PATCH'].includes(req.method) ||
      !req.body) {
    return next();
  }
  
  console.log(`✅ Validando datos de empresa para ${req.method} ${req.path}`);
  
  try {
    let validationResult;
    
    // Usar validación diferente según si es creación o actualización
    if (req.method === 'POST') {
      // Creación - todos los campos requeridos
      validationResult = ValidationService.validateCompanyData(req.body);
    } else {
      // Actualización - campos opcionales
      validationResult = ValidationService.validateCompanyUpdateData(req.body);
    }
    
    if (!validationResult.isValid) {
      console.warn(`⚠️  Validación de empresa falló:`, {
        endpoint: `${req.method} ${req.path}`,
        errors: validationResult.errors,
        data: { ...req.body, admin_password: req.body.admin_password ? '[HIDDEN]' : undefined },
        ip: req.ip,
        requestId: req.requestId
      });
      
      return res.status(400).json({
        error: 'Errores de validación en datos de empresa',
        details: validationResult.errors,
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
    }
    
    console.log(`✅ Validación de empresa exitosa para ${req.body.name || 'empresa'}`);
    next();
    
  } catch (error) {
    console.error('❌ Error en validación de empresa:', error);
    return res.status(500).json({
      error: 'Error interno en validación',
      message: 'No se pudieron validar los datos de la empresa',
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Middleware de validación para parámetros de URL
 * 
 * ¿Qué hace? Valida que los IDs en la URL sean válidos
 * ¿Por qué? Prevenir errores de base de datos con IDs malformados
 * ¿Para qué? Respuestas más rápidas y claras cuando hay errores
 */
function validateUrlParams(req, res, next) {
  const params = req.params;
  
  if (!params || Object.keys(params).length === 0) {
    return next();
  }
  
  console.log(`🔍 Validando parámetros URL para ${req.method} ${req.path}`);
  
  try {
    const errors = [];
    
    // Validar IDs numéricos
    if (params.id && !ValidationService.isValidId(params.id)) {
      errors.push(`ID inválido: "${params.id}". Debe ser un número positivo.`);
    }
    
    // Validar tenant_id
    if (params.tenantId && !ValidationService.isValidTenantId(params.tenantId)) {
      errors.push(`Tenant ID inválido: "${params.tenantId}". Formato incorrecto.`);
    }
    
    // Validar otros parámetros comunes
    Object.entries(params).forEach(([key, value]) => {
      if (typeof value === 'string') {
        // Limpiar y validar longitud
        const sanitized = ValidationService.sanitizeString(value);
        if (sanitized !== value) {
          console.warn(`⚠️  Parámetro sanitizado: ${key} = "${value}" -> "${sanitized}"`);
          req.params[key] = sanitized;
        }
        
        // Validar longitud máxima
        if (sanitized.length > 100) {
          errors.push(`Parámetro "${key}" demasiado largo (máximo 100 caracteres).`);
        }
      }
    });
    
    if (errors.length > 0) {
      console.warn(`⚠️  Validación de parámetros falló:`, {
        endpoint: `${req.method} ${req.path}`,
        params: params,
        errors: errors,
        ip: req.ip,
        requestId: req.requestId
      });
      
      return res.status(400).json({
        error: 'Parámetros de URL inválidos',
        details: errors,
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
    }
    
    next();
    
  } catch (error) {
    console.error('❌ Error validando parámetros URL:', error);
    return res.status(400).json({
      error: 'Error procesando parámetros de la petición',
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Middleware de validación para query parameters (paginación, filtros)
 * 
 * ¿Qué hace? Valida y sanitiza parámetros de consulta como ?page=1&limit=10
 * ¿Por qué? Prevenir errores en paginación y filtrado
 * ¿Para qué? Parámetros limpios y consistentes para todos los endpoints
 */
function validateQueryParams(req, res, next) {
  if (!req.query || Object.keys(req.query).length === 0) {
    return next();
  }
  
  console.log(`🔍 Validando query parameters para ${req.method} ${req.path}`);
  
  try {
    // Detectar si hay parámetros de paginación
    const hasPaginationParams = req.query.page || req.query.limit || 
                                req.query.sortBy || req.query.sortOrder;
    
    if (hasPaginationParams) {
      const validationResult = ValidationService.validatePaginationParams(req.query);
      
      if (!validationResult.isValid) {
        return res.status(400).json({
          error: 'Parámetros de paginación inválidos',
          details: validationResult.errors,
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        });
      }
      
      // Reemplazar query params con versiones sanitizadas
      req.query = { ...req.query, ...validationResult.sanitized };
      console.log(`✅ Parámetros de paginación validados y sanitizados`);
    } else {
      // Sanitizar query params generales
      Object.keys(req.query).forEach(key => {
        if (typeof req.query[key] === 'string') {
          const original = req.query[key];
          const sanitized = ValidationService.sanitizeString(original);
          
          if (sanitized !== original) {
            console.warn(`⚠️  Query param sanitizado: ${key} = "${original}" -> "${sanitized}"`);
            req.query[key] = sanitized;
          }
        }
      });
    }
    
    next();
    
  } catch (error) {
    console.error('❌ Error validando query parameters:', error);
    return res.status(400).json({
      error: 'Error procesando parámetros de consulta',
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Middleware para validar headers de autenticación
 * 
 * ¿Qué hace? Extrae y valida tokens de autorización
 * ¿Por qué? Centralizizar validación de auth antes de llegar a los endpoints
 * ¿Para qué? Manejo consistente de autenticación en toda la API
 */
function validateAuthHeaders(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    // No es un error - algunos endpoints no requieren auth
    return next();
  }
  
  console.log(`🔐 Validando headers de autenticación para ${req.method} ${req.path}`);
  
  try {
    // Extraer token del header "Bearer TOKEN" o "TOKEN" directamente
    let token = null;
    
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      token = authHeader;
    }
    
    // Validar formato básico del token
    if (!ValidationService.isValidAuthToken(token)) {
      console.warn(`⚠️  Token de autenticación inválido:`, {
        endpoint: `${req.method} ${req.path}`,
        tokenPreview: token ? token.substring(0, 10) + '...' : 'null',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        requestId: req.requestId
      });
      
      return res.status(401).json({
        error: 'Token de autenticación inválido',
        message: 'El token proporcionado no tiene el formato correcto',
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
    }
    
    // Añadir token limpio al request para uso posterior
    req.authToken = token;
    console.log(`✅ Token de autenticación validado correctamente`);
    
    next();
    
  } catch (error) {
    console.error('❌ Error validando headers de auth:', error);
    return res.status(500).json({
      error: 'Error procesando autenticación',
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Middleware principal que combina todas las validaciones
 * 
 * ¿Qué hace? Aplica todas las validaciones en el orden correcto
 * ¿Por qué? Cada validación tiene un propósito específico
 * ¿Para qué? Cobertura completa con una sola línea de código
 */
function createValidationMiddleware() {
  console.log('✅ Configurando stack completo de validación y sanitización...');
  
  return [
    // 1. Sanitizar body de la petición (limpiar strings)
    sanitizeRequestBody,
    
    // 2. Validar parámetros de URL (IDs, tenant_ids)
    validateUrlParams,
    
    // 3. Validar query parameters (paginación, filtros)
    validateQueryParams,
    
    // 4. Validar headers de autenticación
    validateAuthHeaders,
    
    // 5. Validaciones específicas por tipo de dato (empresas)
    validateCompanyData
  ];
}

module.exports = {
  createValidationMiddleware,
  sanitizeRequestBody,
  validateCompanyData,
  validateUrlParams,
  validateQueryParams,
  validateAuthHeaders
};
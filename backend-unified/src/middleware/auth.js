/**
 * MIDDLEWARE DE AUTENTICACIÓN UNIFICADO
 *
 * Proporciona middlewares para verificar autenticación y autorización:
 * - Extracción y validación de JWT
 * - Verificación de roles (super admin, company admin)
 * - Manejo de impersonación
 * - Autorización granular por endpoint
 */

const jwt = require('jsonwebtoken');
const { get } = require('../config/environment');
const { createError, ErrorTypes } = require('./errorHandler');

/**
 * Middleware para extraer información del usuario del JWT
 *
 * ¿Qué hace? Extrae y valida el JWT de cada petición
 * ¿Por qué? Disponibilizar información del usuario en req.user
 * ¿Para qué? Otros middlewares y endpoints pueden usar req.user
 */
function extractUser(req, res, next) {
  const authHeader = req.headers.authorization;

  // Si no hay token, continuar sin usuario (algunos endpoints son públicos)
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  try {
    const token = authHeader.substring(7);
    const secret = get('jwt.secret');

    const decoded = jwt.verify(token, secret, {
      issuer: 'zienshield-backend-unified',
      audience: 'zienshield-frontend'
    });

    // Añadir información del usuario a la petición
    req.user = {
      email: decoded.email,
      role: decoded.role,
      tenant_id: decoded.tenant_id,
      company_id: decoded.company_id,
      is_impersonated: decoded.is_impersonated || false,
      original_role: decoded.original_role,
      iat: decoded.iat,
      exp: decoded.exp
    };

    console.log(`👤 Usuario autenticado: ${decoded.email} (${decoded.role})`);
    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      console.log('⏰ Token expirado');
      req.user = null;
      req.tokenExpired = true;
    } else if (error.name === 'JsonWebTokenError') {
      console.log('🚫 Token inválido');
      req.user = null;
    } else {
      console.error('❌ Error verificando token:', error);
      req.user = null;
    }
    
    next(); // Continuar sin usuario
  }
}

/**
 * Middleware que requiere autenticación válida
 *
 * ¿Qué hace? Bloquea peticiones sin token válido
 * ¿Por qué? Proteger endpoints que requieren autenticación
 * ¿Para qué? Seguridad básica
 */
function requireAuth(req, res, next) {
  if (!req.user) {
    if (req.tokenExpired) {
      return next(createError(
        'Token expirado. Por favor inicia sesión de nuevo.',
        401,
        ErrorTypes.AUTHENTICATION,
        { reason: 'token_expired' }
      ));
    }

    return next(createError(
      'Autenticación requerida',
      401,
      ErrorTypes.AUTHENTICATION,
      { reason: 'no_token' }
    ));
  }

  next();
}

/**
 * Middleware que requiere rol de super administrador
 *
 * ¿Qué hace? Solo permite acceso a super admins
 * ¿Por qué? Proteger endpoints administrativos críticos
 * ¿Para qué? Gestión de empresas, impersonación, etc.
 */
function requireSuperAdmin(req, res, next) {
  if (!req.user) {
    return next(createError(
      'Autenticación requerida',
      401,
      ErrorTypes.AUTHENTICATION
    ));
  }

  const allowedRoles = ['super_admin', 'super_admin_impersonating'];
  
  if (!allowedRoles.includes(req.user.role)) {
    console.log(`🚫 Acceso denegado: ${req.user.email} intentó acceder endpoint de super admin`);
    
    return next(createError(
      'Acceso denegado. Solo super administradores.',
      403,
      ErrorTypes.AUTHORIZATION,
      { userRole: req.user.role, requiredRole: 'super_admin' }
    ));
  }

  next();
}

/**
 * Middleware que requiere rol de administrador de empresa
 *
 * ¿Qué hace? Solo permite acceso a admins de empresa (o super admins)
 * ¿Por qué? Proteger datos específicos de empresas
 * ¿Para qué? Acceso a datos propios de la empresa
 */
function requireCompanyAdmin(req, res, next) {
  if (!req.user) {
    return next(createError(
      'Autenticación requerida',
      401,
      ErrorTypes.AUTHENTICATION
    ));
  }

  const allowedRoles = ['company_admin', 'super_admin', 'super_admin_impersonating'];
  
  if (!allowedRoles.includes(req.user.role)) {
    return next(createError(
      'Acceso denegado. Solo administradores de empresa.',
      403,
      ErrorTypes.AUTHORIZATION,
      { userRole: req.user.role, requiredRole: 'company_admin' }
    ));
  }

  next();
}

/**
 * Middleware que verifica acceso a datos de empresa específica
 *
 * ¿Qué hace? Verifica que el usuario puede acceder a datos de una empresa
 * ¿Por qué? Multi-tenancy seguro
 * ¿Para qué? Prevenir acceso cruzado entre empresas
 */
function requireCompanyAccess(paramName = 'tenantId') {
  return (req, res, next) => {
    if (!req.user) {
      return next(createError(
        'Autenticación requerida',
        401,
        ErrorTypes.AUTHENTICATION
      ));
    }

    const requestedTenantId = req.params[paramName];
    
    // Super admins pueden acceder a cualquier empresa
    if (req.user.role === 'super_admin' || req.user.role === 'super_admin_impersonating') {
      return next();
    }

    // Company admins solo pueden acceder a su propia empresa
    if (req.user.role === 'company_admin') {
      if (req.user.tenant_id !== requestedTenantId) {
        console.log(`🚫 Acceso denegado: ${req.user.email} intentó acceder a tenant ${requestedTenantId}`);
        
        return next(createError(
          'Acceso denegado. Solo puedes acceder a datos de tu empresa.',
          403,
          ErrorTypes.AUTHORIZATION,
          { 
            userTenantId: req.user.tenant_id,
            requestedTenantId: requestedTenantId 
          }
        ));
      }
    }

    next();
  };
}

/**
 * Middleware que verifica permisos específicos
 *
 * ¿Qué hace? Verifica permisos granulares del usuario
 * ¿Por qué? Control de acceso fino
 * ¿Para qué? Futuras funcionalidades con permisos específicos
 */
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return next(createError(
        'Autenticación requerida',
        401,
        ErrorTypes.AUTHENTICATION
      ));
    }

    // Super admins tienen todos los permisos
    if (req.user.role === 'super_admin' || req.user.role === 'super_admin_impersonating') {
      return next();
    }

    // TODO: Implementar sistema de permisos granulares en futuras versiones
    // Por ahora, solo verificar roles básicos
    const rolePermissions = {
      'company_admin': ['company_data', 'company_users', 'company_stats'],
      'company_user': ['company_data']
    };

    const userPermissions = rolePermissions[req.user.role] || [];
    
    if (!userPermissions.includes(permission)) {
      return next(createError(
        `Permiso requerido: ${permission}`,
        403,
        ErrorTypes.AUTHORIZATION,
        { 
          userRole: req.user.role,
          requiredPermission: permission,
          userPermissions: userPermissions
        }
      ));
    }

    next();
  };
}

/**
 * Middleware para logging de acciones autenticadas
 *
 * ¿Qué hace? Registra todas las acciones de usuarios autenticados
 * ¿Por qué? Auditoría y trazabilidad
 * ¿Para qué? Cumplimiento y debugging
 */
function auditAuthenticatedAction(req, res, next) {
  if (req.user) {
    console.log('📝 AUDITORÍA - Acción autenticada:', {
      timestamp: new Date().toISOString(),
      user: req.user.email,
      role: req.user.role,
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      is_impersonated: req.user.is_impersonated || false,
      tenant_id: req.user.tenant_id,
      requestId: req.requestId
    });
  }

  next();
}

/**
 * Middleware para detectar tokens próximos a expirar
 *
 * ¿Qué hace? Añade header cuando el token está próximo a expirar
 * ¿Por qué? Permitir al frontend renovar tokens proactivamente
 * ¿Para qué? UX mejorada sin interrupciones
 */
function checkTokenExpiration(req, res, next) {
  if (req.user && req.user.exp) {
    const expirationTime = req.user.exp * 1000; // JWT usa segundos, convertir a ms
    const currentTime = Date.now();
    const timeToExpiration = expirationTime - currentTime;
    
    // Si queda menos de 5 minutos, añadir header de advertencia
    if (timeToExpiration < 5 * 60 * 1000) {
      res.set('X-Token-Expiring-Soon', 'true');
      res.set('X-Token-Expires-At', new Date(expirationTime).toISOString());
      console.log(`⏰ Token próximo a expirar para: ${req.user.email}`);
    }
  }

  next();
}

module.exports = {
  extractUser,
  requireAuth,
  requireSuperAdmin,
  requireCompanyAdmin,
  requireCompanyAccess,
  requirePermission,
  auditAuthenticatedAction,
  checkTokenExpiration
};
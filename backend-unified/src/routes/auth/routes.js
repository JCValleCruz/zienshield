/**
 * RUTAS DE AUTENTICACIÓN UNIFICADAS
 *
 * Define todos los endpoints de autenticación:
 * - Login multi-tenant
 * - Impersonación de empresas
 * - Renovación de tokens
 * - Logout (futuro)
 */

const express = require('express');
const AuthController = require('./controller');
const { createSmartRateLimit } = require('../../middleware/rateLimiting');
const { requireAuth, requireSuperAdmin, auditAuthenticatedAction } = require('../../middleware/auth');
const { getDatabaseService } = require('../../services/databaseService');

/**
 * Crear router de autenticación con todas las rutas configuradas
 *
 * ¿Qué hace? Configura todas las rutas de auth con middlewares apropiados
 * ¿Por qué? Organización modular y reutilización
 * ¿Para qué? Sistema de autenticación completo
 */
function createAuthRouter() {
  console.log('🔐 Configurando rutas de autenticación...');

  const router = express.Router();
  
  // Inicializar controlador con servicio de base de datos
  const databaseService = getDatabaseService();
  const authController = new AuthController(databaseService);

  // Rate limiting específico para auth (muy restrictivo)
  const smartRateLimit = createSmartRateLimit();

  // ====================================================================
  // RUTAS PÚBLICAS (NO REQUIEREN AUTENTICACIÓN)
  // ====================================================================

  /**
   * POST /api/auth/login - Login multi-tenant
   *
   * Autentica super admins y administradores de empresa
   * Rate limiting: Muy restrictivo (5 intentos/15min)
   */
  router.post('/login', 
    smartRateLimit, // Rate limiting automático para /auth/
    authController.login.bind(authController)
  );

  /**
   * GET /api/auth/auto-login/:token - Auto-login con token de impersonación
   *
   * Permite auto-login usando token de impersonación obtenido previamente
   * No requiere autenticación previa (el token ya contiene la autorización)
   */
  router.get('/auto-login/:token',
    smartRateLimit,
    authController.autoLogin.bind(authController)
  );

  // ====================================================================
  // RUTAS PROTEGIDAS (REQUIEREN AUTENTICACIÓN)
  // ====================================================================

  /**
   * POST /api/auth/refresh - Renovar token JWT
   *
   * Permite renovar tokens próximos a expirar
   * Requiere: Token válido (puede estar próximo a expirar)
   */
  router.post('/refresh',
    smartRateLimit,
    requireAuth,
    auditAuthenticatedAction,
    authController.refreshToken.bind(authController)
  );

  // ====================================================================
  // RUTAS DE SUPER ADMIN (REQUIEREN ROL SUPER_ADMIN)
  // ====================================================================

  /**
   * POST /api/auth/impersonate/:tenantId - Impersonar empresa
   *
   * Permite a super admins impersonar empresas para soporte
   * Requiere: Rol super_admin
   * Auditoría: Crítica - todas las impersonaciones se registran
   */
  router.post('/impersonate/:tenantId',
    smartRateLimit,
    requireAuth,
    requireSuperAdmin,
    auditAuthenticatedAction,
    authController.impersonateCompany.bind(authController)
  );

  // ====================================================================
  // RUTAS DE INFORMACIÓN Y UTILIDAD
  // ====================================================================

  /**
   * GET /api/auth/me - Información del usuario actual
   *
   * Devuelve información del usuario autenticado
   * Útil para verificar estado de sesión
   */
  router.get('/me',
    requireAuth,
    (req, res) => {
      console.log(`👤 Información solicitada por: ${req.user.email}`);

      res.json({
        success: true,
        user: {
          email: req.user.email,
          role: req.user.role,
          tenant_id: req.user.tenant_id,
          company_id: req.user.company_id,
          is_impersonated: req.user.is_impersonated || false,
          original_role: req.user.original_role,
          token_expires_at: new Date(req.user.exp * 1000).toISOString()
        },
        timestamp: new Date().toISOString()
      });
    }
  );

  /**
   * POST /api/auth/logout - Cerrar sesión
   *
   * Nota: En un sistema JWT sin estado, el logout se maneja en el frontend
   * Este endpoint existe para logging y futuras implementaciones
   */
  router.post('/logout',
    requireAuth,
    auditAuthenticatedAction,
    (req, res) => {
      console.log(`👋 Logout solicitado por: ${req.user.email}`);

      // Log de auditoría para logout
      console.log('📝 AUDITORÍA - Logout:', {
        timestamp: new Date().toISOString(),
        user: req.user.email,
        role: req.user.role,
        tenant_id: req.user.tenant_id,
        is_impersonated: req.user.is_impersonated || false,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        requestId: req.requestId
      });

      res.json({
        success: true,
        message: 'Sesión cerrada exitosamente',
        timestamp: new Date().toISOString()
      });
    }
  );

  /**
   * GET /api/auth/health - Health check del módulo de autenticación
   *
   * Verifica que el sistema de autenticación funciona correctamente
   */
  router.get('/health', (req, res) => {
    console.log('❤️ Health check módulo autenticación');

    res.json({
      module: 'authentication',
      status: 'healthy',
      features: {
        jwt_auth: 'enabled',
        multi_tenant: 'enabled', 
        impersonation: 'enabled',
        token_refresh: 'enabled',
        role_based_access: 'enabled'
      },
      endpoints: {
        login: 'POST /api/auth/login',
        autoLogin: 'GET /api/auth/auto-login/:token',
        refresh: 'POST /api/auth/refresh',
        impersonate: 'POST /api/auth/impersonate/:tenantId',
        me: 'GET /api/auth/me',
        logout: 'POST /api/auth/logout',
        health: 'GET /api/auth/health'
      },
      security: {
        rate_limiting: 'enabled',
        jwt_verification: 'enabled',
        role_validation: 'enabled',
        audit_logging: 'enabled'
      },
      timestamp: new Date().toISOString()
    });
  });

  console.log('✅ Rutas de autenticación configuradas correctamente');
  console.log('📊 Rutas disponibles:');
  console.log('   POST   /api/auth/login           - Login multi-tenant');
  console.log('   GET    /api/auth/auto-login/:token - Auto-login con token de impersonación');
  console.log('   POST   /api/auth/refresh         - Renovar token');
  console.log('   POST   /api/auth/impersonate/:id - Impersonar empresa (super admin)');
  console.log('   GET    /api/auth/me             - Info usuario actual');
  console.log('   POST   /api/auth/logout          - Cerrar sesión');
  console.log('   GET    /api/auth/health          - Health check');

  return router;
}

module.exports = {
  createAuthRouter
};
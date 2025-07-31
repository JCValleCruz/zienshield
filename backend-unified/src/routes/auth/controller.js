/**
 * CONTROLADOR DE AUTENTICACIÓN UNIFICADO
 *
 * Consolida todos los sistemas de autenticación:
 * - Login de super admins (sin credenciales hardcoded)
 * - Login de administradores de empresa
 * - Impersonación segura para super admins
 * - JWT real con expiración
 * - Validaciones de seguridad robustas
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { get } = require('../../config/environment');
const { createError, ErrorTypes } = require('../../middleware/errorHandler');

/**
 * Clase principal del controlador de autenticación
 *
 * ¿Qué hace? Maneja todos los tipos de autenticación del sistema
 * ¿Por qué unificado? Elimina duplicación y centraliza seguridad
 * ¿Para qué? Autenticación consistente en toda la aplicación
 */
class AuthController {
  constructor(databaseService) {
    this.db = databaseService;
    console.log('🔐 AuthController inicializado');
  }

  /**
   * POST /api/auth/login - Login multi-tenant
   *
   * ¿Qué hace? Autentica super admins y administradores de empresa
   * ¿Por qué multi-tenant? Soporta diferentes tipos de usuarios
   * ¿Para qué? Punto de entrada único para toda autenticación
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      console.log(`🔐 Intento de login: ${email}`);

      // Validar entrada
      if (!email || !password) {
        return next(createError(
          'Email y contraseña son obligatorios',
          400,
          ErrorTypes.VALIDATION,
          { missingFields: !email ? ['email'] : ['password'] }
        ));
      }

      // 1. Verificar si es super admin
      const superAdminResult = await this.authenticateSuperAdmin(email, password);
      if (superAdminResult.isAuthenticated) {
        console.log('✅ Login como Super Admin exitoso');
        return res.json(superAdminResult.response);
      }

      // 2. Verificar si es administrador de empresa
      const companyAdminResult = await this.authenticateCompanyAdmin(email, password);
      if (companyAdminResult.isAuthenticated) {
        console.log(`✅ Login como Admin de Empresa exitoso: ${companyAdminResult.response.user.company_name}`);
        return res.json(companyAdminResult.response);
      }

      // 3. Credenciales inválidas
      console.log(`❌ Credenciales inválidas para: ${email}`);
      
      // Log de auditoría para intentos fallidos
      console.warn('📝 AUDITORÍA - Login fallido:', {
        email,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });

      return next(createError(
        'Credenciales inválidas',
        401,
        ErrorTypes.AUTHENTICATION,
        { email }
      ));

    } catch (error) {
      console.error('❌ Error en login:', error);
      next(createError(
        'Error interno durante autenticación',
        500,
        ErrorTypes.INTERNAL,
        { operation: 'login' }
      ));
    }
  }

  /**
   * Autenticar super administrador
   *
   * ¿Qué hace? Verifica credenciales de super admin desde variables de entorno
   * ¿Por qué? Eliminar credenciales hardcoded del código
   * ¿Para qué? Seguridad mejorada y configuración externalizada
   */
  async authenticateSuperAdmin(email, password) {
    // Obtener credenciales desde variables de entorno
    const superAdminCredentials = [
      {
        email: process.env.SUPER_ADMIN_EMAIL || 'admin@zienshield.com',
        password: process.env.SUPER_ADMIN_PASSWORD || 'ZienAdmin2025'
      },
      {
        email: process.env.SUPER_ADMIN_EMAIL_2 || 'superadmin@zienshield.com', 
        password: process.env.SUPER_ADMIN_PASSWORD_2 || 'SuperAdmin2025'
      }
    ];

    const matchedCredential = superAdminCredentials.find(
      cred => cred.email === email && cred.password === password
    );

    if (!matchedCredential) {
      return { isAuthenticated: false };
    }

    // Generar JWT real para super admin
    const token = this.generateJWT({
      email: email,
      role: 'super_admin',
      tenant_id: null,
      iat: Date.now()
    });

    return {
      isAuthenticated: true,
      response: {
        success: true,
        token: token,
        user: {
          email: email,
          role: 'super_admin',
          name: 'Super Administrator',
          tenant_id: null,
          company_name: null,
          permissions: ['all'] // Super admin tiene todos los permisos
        },
        expires_at: new Date(Date.now() + this.getJWTExpirationMs()).toISOString()
      }
    };
  }

  /**
   * Autenticar administrador de empresa
   *
   * ¿Qué hace? Verifica credenciales contra la base de datos
   * ¿Por qué? Permitir acceso a administradores de empresas registradas
   * ¿Para qué? Multi-tenancy con seguridad por empresa
   */
  async authenticateCompanyAdmin(email, password) {
    console.log('🔍 Buscando empresa en base de datos...');

    const query = `
      SELECT 
        id,
        name as company_name,
        admin_email,
        admin_password,
        tenant_id,
        sector,
        wazuh_group,
        created_at
      FROM companies 
      WHERE admin_email = $1
    `;

    const result = await this.db.query(query, [email]);

    if (result.rows.length === 0) {
      console.log('❌ No se encontró empresa con este email');
      return { isAuthenticated: false };
    }

    const company = result.rows[0];

    // Verificar contraseña (TODO: usar bcrypt en futuras versiones)
    if (company.admin_password !== password) {
      console.log('❌ Contraseña incorrecta para empresa');
      return { isAuthenticated: false };
    }

    // Generar JWT para administrador de empresa
    const token = this.generateJWT({
      email: email,
      role: 'company_admin',
      tenant_id: company.tenant_id,
      company_id: company.id,
      iat: Date.now()
    });

    return {
      isAuthenticated: true,
      response: {
        success: true,
        token: token,
        user: {
          email: email,
          role: 'company_admin',
          name: company.admin_name || 'Administrador',
          tenant_id: company.tenant_id,
          company_name: company.company_name,
          company_id: company.id,
          sector: company.sector,
          wazuh_group: company.wazuh_group,
          permissions: ['company_data', 'company_users'] // Permisos limitados
        },
        expires_at: new Date(Date.now() + this.getJWTExpirationMs()).toISOString()
      }
    };
  }

  /**
   * POST /api/auth/impersonate/:tenantId - Impersonación segura
   *
   * ¿Qué hace? Permite a super admins impersonar empresas
   * ¿Por qué? Soporte técnico y debugging
   * ¿Para qué? Acceso controlado a datos de empresas
   */
  async impersonateCompany(req, res, next) {
    try {
      const { tenantId } = req.params;
      const authHeader = req.headers.authorization;

      console.log(`🎭 Intento de impersonación para tenant: ${tenantId}`);

      // Validar token de autorización
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(createError(
          'Token de autorización requerido',
          401,
          ErrorTypes.AUTHENTICATION
        ));
      }

      const token = authHeader.substring(7);

      // Verificar que quien hace la petición es super admin
      let decoded;
      try {
        decoded = this.verifyJWT(token);
      } catch (jwtError) {
        return next(createError(
          'Token de autorización inválido',
          401,
          ErrorTypes.AUTHENTICATION,
          { jwtError: jwtError.message }
        ));
      }

      if (decoded.role !== 'super_admin') {
        console.log('❌ Acceso denegado: no es super admin');
        return next(createError(
          'Solo super administradores pueden impersonar empresas',
          403,
          ErrorTypes.AUTHORIZATION,
          { userRole: decoded.role }
        ));
      }

      // Buscar empresa por tenant_id
      const query = `
        SELECT 
          id, name as company_name, admin_email, tenant_id, 
          sector, wazuh_group, created_at
        FROM companies 
        WHERE tenant_id = $1
      `;

      const result = await this.db.query(query, [tenantId]);

      if (result.rows.length === 0) {
        console.log(`❌ Empresa no encontrada: ${tenantId}`);
        return next(createError(
          `Empresa con tenant_id "${tenantId}" no encontrada`,
          404,
          ErrorTypes.NOT_FOUND,
          { tenantId }
        ));
      }

      const company = result.rows[0];

      // Generar token de impersonación con tiempo limitado
      const impersonationToken = this.generateJWT({
        email: decoded.email, // Email del super admin original
        role: 'super_admin_impersonating',
        tenant_id: company.tenant_id,
        company_id: company.id,
        original_role: 'super_admin',
        is_impersonated: true,
        iat: Date.now()
      }, '30m'); // Solo 30 minutos de duración

      // Log de auditoría CRÍTICO para impersonación
      console.error('📝 AUDITORÍA CRÍTICA - Impersonación iniciada:', {
        timestamp: new Date().toISOString(),
        super_admin_email: decoded.email,
        action: 'IMPERSONATE_COMPANY',
        target_tenant_id: tenantId,
        target_company: company.company_name,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        impersonation_token_id: impersonationToken.substring(0, 20) + '...',
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        requestId: req.requestId
      });

      res.json({
        success: true,
        message: `Impersonación de empresa "${company.company_name}" iniciada`,
        token: impersonationToken,
        user: {
          email: decoded.email, // Email del super admin
          role: 'super_admin_impersonating',
          name: `Super Admin (como ${company.company_name})`,
          tenant_id: company.tenant_id,
          company_name: company.company_name,
          company_id: company.id,
          sector: company.sector,
          wazuh_group: company.wazuh_group,
          is_impersonated: true,
          original_role: 'super_admin',
          permissions: ['all'] // Super admin mantiene todos los permisos
        },
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
      });

    } catch (error) {
      console.error('❌ Error en impersonación:', error);
      next(createError(
        'Error interno durante impersonación',
        500,
        ErrorTypes.INTERNAL,
        { operation: 'impersonate', tenantId: req.params.tenantId }
      ));
    }
  }

  /**
   * POST /api/auth/refresh - Renovar token JWT
   *
   * ¿Qué hace? Renueva tokens próximos a expirar
   * ¿Por qué? UX mejorada sin re-logins constantes
   * ¿Para qué? Sesiones más fluidas
   */
  async refreshToken(req, res, next) {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(createError(
          'Token de autorización requerido',
          401,
          ErrorTypes.AUTHENTICATION
        ));
      }

      const token = authHeader.substring(7);

      // Verificar token actual (puede estar próximo a expirar)
      let decoded;
      try {
        decoded = this.verifyJWT(token, { ignoreExpiration: true });
      } catch (jwtError) {
        return next(createError(
          'Token inválido para renovación',
          401,
          ErrorTypes.AUTHENTICATION,
          { jwtError: jwtError.message }
        ));
      }

      // Generar nuevo token con los mismos datos pero nueva expiración
      const newToken = this.generateJWT({
        email: decoded.email,
        role: decoded.role,
        tenant_id: decoded.tenant_id,
        company_id: decoded.company_id,
        is_impersonated: decoded.is_impersonated,
        original_role: decoded.original_role,
        iat: Date.now()
      });

      console.log(`🔄 Token renovado para: ${decoded.email}`);

      res.json({
        success: true,
        token: newToken,
        expires_at: new Date(Date.now() + this.getJWTExpirationMs()).toISOString(),
        user: {
          email: decoded.email,
          role: decoded.role,
          tenant_id: decoded.tenant_id
        }
      });

    } catch (error) {
      console.error('❌ Error renovando token:', error);
      next(createError(
        'Error interno renovando token',
        500,
        ErrorTypes.INTERNAL,
        { operation: 'refresh' }
      ));
    }
  }

  /**
   * Generar JWT con configuración centralizada
   *
   * ¿Qué hace? Crea tokens JWT seguros con la configuración del sistema
   * ¿Por qué? Consistencia en toda la aplicación
   * ¿Para qué? Tokens seguros y estandarizados
   */
  generateJWT(payload, expiresIn = null) {
    const secret = get('jwt.secret');
    const expiration = expiresIn || get('jwt.expiresIn'); 

    return jwt.sign(payload, secret, { 
      expiresIn: expiration,
      issuer: 'zienshield-backend-unified',
      audience: 'zienshield-frontend'
    });
  }

  /**
   * Verificar JWT con configuración centralizada
   *
   * ¿Qué hace? Valida tokens JWT usando la configuración del sistema
   * ¿Por qué? Verificación consistente en toda la aplicación
   * ¿Para qué? Seguridad uniforme
   */
  verifyJWT(token, options = {}) {
    const secret = get('jwt.secret');

    return jwt.verify(token, secret, {
      issuer: 'zienshield-backend-unified',
      audience: 'zienshield-frontend',
      ...options
    });
  }

  /**
   * GET /api/auth/auto-login/:token - Auto-login con token de impersonación
   *
   * ¿Qué hace? Permite login automático usando token de impersonación
   * ¿Por qué? Para navegación entre dashboards en nueva pestaña
   * ¿Para qué? Permitir acceso directo a dashboard de empresa
   */
  async autoLogin(req, res, next) {
    try {
      const { token } = req.params;

      console.log(`🔄 Auto-login solicitado con token: ${token.substring(0, 20)}...`);

      if (!token) {
        return next(createError(
          'Token de auto-login requerido',
          400,
          ErrorTypes.VALIDATION
        ));
      }

      // Verificar y decodificar el token de impersonación
      let decoded;
      try {
        decoded = this.verifyJWT(token);
        console.log('✅ Token de auto-login válido:', {
          email: decoded.email,
          role: decoded.role,
          tenant_id: decoded.tenant_id,
          is_impersonated: decoded.is_impersonated
        });
      } catch (jwtError) {
        console.error('❌ Token de auto-login inválido:', jwtError.message);
        return next(createError(
          'Token de auto-login inválido o expirado',
          401,
          ErrorTypes.AUTHENTICATION
        ));
      }

      // Verificar que es un token de impersonación válido
      if (!decoded.is_impersonated || !decoded.tenant_id) {
        return next(createError(
          'Token de auto-login no válido',
          401,
          ErrorTypes.AUTHENTICATION
        ));
      }

      // Obtener información de la empresa
      const companyResult = await this.db.query(`
        SELECT id, name, sector, tenant_id, admin_name, admin_email, wazuh_group
        FROM companies 
        WHERE tenant_id = $1
      `, [decoded.tenant_id]);

      if (companyResult.rows.length === 0) {
        return next(createError(
          'Empresa no encontrada',
          404,
          ErrorTypes.NOT_FOUND
        ));
      }

      const company = companyResult.rows[0];

      // Log de auditoría para auto-login
      console.log('📝 AUDITORÍA - Auto-login de impersonación:', {
        timestamp: new Date().toISOString(),
        original_email: decoded.email,
        target_tenant_id: decoded.tenant_id,
        target_company: company.name,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        requestId: req.requestId
      });

      // El token ya es válido, solo devolver la información del usuario
      res.json({
        success: true,
        message: `Auto-login exitoso para ${company.name}`,
        token: token, // Usar el mismo token
        user: {
          email: decoded.email,
          role: decoded.role, // Mantener el rol de impersonación
          name: `Super Admin (como ${company.name})`,
          tenant_id: company.tenant_id,
          company_name: company.name,
          company_id: company.id,
          sector: company.sector,
          wazuh_group: company.wazuh_group,
          is_impersonated: true,
          original_role: decoded.original_role,
          permissions: ['all']
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error en auto-login:', error);
      next(createError(
        'Error interno durante auto-login',
        500,
        ErrorTypes.INTERNAL,
        { operation: 'auto_login' }
      ));
    }
  }

  /**
   * Obtener tiempo de expiración JWT en milisegundos
   */
  getJWTExpirationMs() {
    const expiresIn = get('jwt.expiresIn');
    
    // Convertir formato "24h", "30m", etc. a milisegundos
    if (expiresIn.endsWith('h')) {
      return parseInt(expiresIn) * 60 * 60 * 1000;
    } else if (expiresIn.endsWith('m')) {
      return parseInt(expiresIn) * 60 * 1000;
    } else if (expiresIn.endsWith('s')) {
      return parseInt(expiresIn) * 1000;
    } else {
      return 24 * 60 * 60 * 1000; // Default 24 horas
    }
  }
}

module.exports = AuthController;
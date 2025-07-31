/**
 * RUTAS CRUD UNIFICADAS PARA EMPRESAS
 * 
 * Conecta el CompaniesController con Express usando todos los middlewares:
 * - Seguridad (helmet + CORS)
 * - Rate limiting diferenciado
 * - Validación y sanitización
 * - Manejo de errores centralizado
 */

const express = require('express');
const CompaniesController = require('./controller');
const { getDatabaseService } = require('../../services/databaseService');
const { createValidationMiddleware } = require('../../middleware/validation');
const { createSmartRateLimit } = require('../../middleware/rateLimiting');

/**
 * Configurar rutas de empresas con todos los middlewares
 * 
 * ¿Qué hace? Crea el router Express con todas las rutas CRUD
 * ¿Por qué esta estructura? Separa configuración de rutas de lógica de negocio
 * ¿Para qué? Router reutilizable que se puede montar en cualquier path
 */
function createCompaniesRouter() {
  const router = express.Router();
  
  console.log('🏢 Configurando rutas de empresas...');
  
  // Inicializar controlador con servicio de BD
  const databaseService = getDatabaseService();
  const companiesController = new CompaniesController(databaseService);
  
  // Middleware de validación específico para empresas
  const validationMiddleware = createValidationMiddleware();
  
  // Rate limiting inteligente (se aplica automáticamente según la ruta)
  const rateLimitMiddleware = createSmartRateLimit();
  
  // ====================================================================
  // MIDDLEWARE ESPECÍFICO PARA VALIDACIONES DE EMPRESAS
  // ====================================================================
  
  /**
   * Middleware para validar ID numérico en parámetros de URL
   * 
   * ¿Qué hace? Verifica que :id sea un número válido
   * ¿Por qué? Evitar inyecciones SQL y errores de BD
   * ¿Para qué? Seguridad y mensajes de error claros
   */
  function validateCompanyId(req, res, next) {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id)) || parseInt(id) <= 0) {
      return res.status(400).json({
        error: true,
        message: 'ID de empresa inválido. Debe ser un número positivo.',
        type: 'validation',
        details: { providedId: id },
        timestamp: new Date().toISOString(),
        requestId: req.requestId || 'unknown'
      });
    }
    
    // Convertir a entero para uso posterior
    req.params.id = parseInt(id);
    next();
  }
  
  /**
   * Middleware para validar datos de empresa en POST/PUT
   * 
   * ¿Qué hace? Valida estructura y contenido de datos de empresa
   * ¿Por qué? El controlador asume datos válidos
   * ¿Para qué? Respuestas de error claras antes de procesar
   */
  function validateCompanyData(req, res, next) {
    const ValidationService = require('../../services/validationService');
    
    // Para PUT, permitir datos parciales
    const isUpdate = req.method === 'PUT';
    
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        error: true,
        message: 'Datos de empresa requeridos en el body de la petición.',
        type: 'validation',
        timestamp: new Date().toISOString(),
        requestId: req.requestId || 'unknown'
      });
    }
    
    // Validar usando ValidationService
    const validation = isUpdate ? 
      ValidationService.validateCompanyUpdateData(req.body) :
      ValidationService.validateCompanyData(req.body);
    
    if (!validation.isValid) {
      return res.status(400).json({
        error: true,
        message: 'Datos de empresa inválidos.',
        type: 'validation',
        details: validation.errors,
        timestamp: new Date().toISOString(),
        requestId: req.requestId || 'unknown'
      });
    }
    
    next();
  }
  
  /**
   * Middleware para validar parámetros de paginación y filtros
   * 
   * ¿Qué hace? Valida query parameters para la lista de empresas
   * ¿Por qué? Evitar errores de paginación y filtros malformados
   * ¿Para qué? Parámetros consistentes para el controlador
   */
  function validateListParams(req, res, next) {
    const { page, limit, sortBy, sortOrder, search, sector } = req.query;
    
    // Validar page
    if (page && (isNaN(parseInt(page)) || parseInt(page) < 1)) {
      return res.status(400).json({
        error: true,
        message: 'Parámetro "page" debe ser un número positivo.',
        type: 'validation',
        details: { providedPage: page },
        timestamp: new Date().toISOString(),
        requestId: req.requestId || 'unknown'
      });
    }
    
    // Validar limit
    if (limit && (isNaN(parseInt(limit)) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
      return res.status(400).json({
        error: true,
        message: 'Parámetro "limit" debe ser un número entre 1 y 100.',
        type: 'validation',
        details: { providedLimit: limit },
        timestamp: new Date().toISOString(),
        requestId: req.requestId || 'unknown'
      });
    }
    
    // Validar sortBy (campos permitidos)
    const allowedSortFields = ['id', 'name', 'sector', 'created_at', 'updated_at'];
    if (sortBy && !allowedSortFields.includes(sortBy)) {
      return res.status(400).json({
        error: true,
        message: `Campo de ordenación inválido. Permitidos: ${allowedSortFields.join(', ')}`,
        type: 'validation',
        details: { providedSortBy: sortBy, allowedFields: allowedSortFields },
        timestamp: new Date().toISOString(),
        requestId: req.requestId || 'unknown'
      });
    }
    
    // Validar sortOrder
    if (sortOrder && !['asc', 'desc'].includes(sortOrder.toLowerCase())) {
      return res.status(400).json({
        error: true,
        message: 'Orden de clasificación debe ser "asc" o "desc".',
        type: 'validation',
        details: { providedSortOrder: sortOrder },
        timestamp: new Date().toISOString(),
        requestId: req.requestId || 'unknown'
      });
    }
    
    // Validar search (longitud mínima)
    if (search && search.trim().length < 2) {
      return res.status(400).json({
        error: true,
        message: 'Término de búsqueda debe tener al menos 2 caracteres.',
        type: 'validation',
        details: { providedSearch: search },
        timestamp: new Date().toISOString(),
        requestId: req.requestId || 'unknown'
      });
    }
    
    // Normalizar parámetros
    if (page) req.query.page = parseInt(page);
    if (limit) req.query.limit = parseInt(limit);
    if (search) req.query.search = search.trim();
    if (sector) req.query.sector = sector.trim();
    if (sortOrder) req.query.sortOrder = sortOrder.toLowerCase();
    
    next();
  }
  
  // ====================================================================
  // DEFINICIÓN DE RUTAS CRUD
  // ====================================================================
  
  console.log('📋 Configurando rutas CRUD de empresas...');
  
  // ====================================================================
  // RUTA DE HEALTH CHECK ESPECÍFICA PARA EMPRESAS (ANTES DE /:id)
  // ====================================================================
  
  /**
   * GET /api/companies/health
   * Health check específico del módulo de empresas
   */
  router.get('/health', async (req, res) => {
    try {
      console.log('❤️ Health check módulo empresas');
      
      // Verificar estado del DatabaseService
      const dbHealth = await databaseService.healthCheck();
      
      // Contar empresas para verificar funcionamiento
      const companiesCount = await databaseService.query(
        'SELECT COUNT(*) as total FROM companies'
      );
      
      const health = {
        module: 'companies',
        status: dbHealth.status === 'healthy' ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        database: dbHealth,
        statistics: {
          totalCompanies: parseInt(companiesCount.rows[0].total),
          lastCheck: new Date().toISOString()
        },
        endpoints: {
          'GET /': 'List companies with pagination',
          'GET /:id': 'Get company by ID', 
          'POST /': 'Create new company',
          'PUT /:id': 'Update existing company',
          'DELETE /:id': 'Delete company'
        }
      };
      
      const statusCode = health.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(health);
      
    } catch (error) {
      console.error('❌ Error en health check de empresas:', error);
      
      res.status(503).json({
        module: 'companies',
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  /**
   * GET /api/companies
   * Obtener lista paginada de empresas con filtros opcionales
   */
  router.get('/', 
    rateLimitMiddleware,                    // Rate limiting inteligente
    ...validationMiddleware,                // Validación y sanitización general
    validateListParams,                     // Validación específica de parámetros de lista
    async (req, res, next) => {
      console.log(`📋 GET /companies - Query: ${JSON.stringify(req.query)}`);
      return companiesController.getAllCompanies(req, res, next);
    }
  );
  
  /**
   * GET /api/companies/:id
   * Obtener empresa específica por ID
   */
  router.get('/:id',
    rateLimitMiddleware,                    // Rate limiting inteligente
    ...validationMiddleware,                // Validación y sanitización general
    validateCompanyId,                      // Validar que ID sea numérico
    async (req, res, next) => {
      console.log(`🔍 GET /companies/${req.params.id}`);
      return companiesController.getCompanyById(req, res, next);
    }
  );
  
  /**
   * POST /api/companies
   * Crear nueva empresa
   */
  router.post('/',
    rateLimitMiddleware,                    // Rate limiting más restrictivo para POST
    ...validationMiddleware,                // Validación y sanitización general
    validateCompanyData,                    // Validar estructura de datos de empresa
    async (req, res, next) => {
      console.log(`➕ POST /companies - Creando: ${req.body.name}`);
      return companiesController.createCompany(req, res, next);
    }
  );
  
  /**
   * PUT /api/companies/:id
   * Actualizar empresa existente
   */
  router.put('/:id',
    rateLimitMiddleware,                    // Rate limiting más restrictivo para PUT
    ...validationMiddleware,                // Validación y sanitización general
    validateCompanyId,                      // Validar que ID sea numérico
    validateCompanyData,                    // Validar estructura de datos (parcial para PUT)
    async (req, res, next) => {
      console.log(`✏️ PUT /companies/${req.params.id} - Actualizando: ${req.body.name || '[sin nombre]'}`);
      return companiesController.updateCompany(req, res, next);
    }
  );
  
  /**
   * DELETE /api/companies/:id
   * Eliminar empresa
   */
  router.delete('/:id',
    rateLimitMiddleware,                    // Rate limiting más restrictivo para DELETE
    ...validationMiddleware,                // Validación y sanitización general
    validateCompanyId,                      // Validar que ID sea numérico
    async (req, res, next) => {
      console.log(`🗑️ DELETE /companies/${req.params.id}`);
      return companiesController.deleteCompany(req, res, next);
    }
  );
  
  console.log('✅ Rutas CRUD de empresas configuradas correctamente');
  console.log('📊 Rutas disponibles:');
  console.log('   GET    /api/companies         - Listar empresas');
  console.log('   GET    /api/companies/:id     - Obtener empresa');
  console.log('   POST   /api/companies         - Crear empresa');
  console.log('   PUT    /api/companies/:id     - Actualizar empresa');
  console.log('   DELETE /api/companies/:id     - Eliminar empresa');
  console.log('   GET    /api/companies/health  - Health check');
  
  return router;
}

module.exports = {
  createCompaniesRouter
};
/**
 * CONTROLADOR UNIFICADO DE EMPRESAS
 * 
 * Consolida toda la lógica de gestión de empresas de ambos backends:
 * - CRUD completo con validaciones centralizadas
 * - Paginación y filtrado inteligente
 * - Respuestas consistentes
 * - Logging detallado para auditoría
 * - Integración con ValidationService y configuración centralizada
 */

const { get } = require('../../config/environment');
const ValidationService = require('../../services/validationService');
const { createError, ErrorTypes } = require('../../middleware/errorHandler');

/**
 * Clase principal del controlador de empresas
 * 
 * ¿Qué hace? Maneja todas las operaciones CRUD de empresas
 * ¿Por qué una clase? Organización mejor y reutilización de código común
 * ¿Para qué? Eliminar duplicación entre los dos backends existentes
 */
class CompaniesController {
  constructor(databaseService) {
    this.db = databaseService;
    console.log('🏢 CompaniesController inicializado');
  }

  /**
   * GET /api/companies - Obtener lista de empresas con paginación
   * 
   * ¿Qué hace? Devuelve lista de empresas con opciones de paginación y filtrado
   * ¿Por qué paginación? Para manejar muchas empresas sin problemas de performance
   * ¿Para qué? Interfaz eficiente en el frontend
   */
  async getAllCompanies(req, res, next) {
    try {
      console.log(`📋 Solicitando lista de empresas - IP: ${req.ip}`);
      
      // Los query params ya están validados por el middleware
      const {
        page = 1,
        limit = 10,
        sortBy = 'id',
        sortOrder = 'asc',
        search = '',
        sector = ''
      } = req.query;

      // Construir query con filtros opcionales
      let whereClause = '';
      let queryParams = [];
      let paramCount = 0;

      if (search) {
        paramCount++;
        whereClause += `WHERE (name ILIKE $${paramCount} OR admin_email ILIKE $${paramCount})`;
        queryParams.push(`%${search}%`);
      }

      if (sector && sector !== 'all') {
        paramCount++;
        const sectorCondition = `sector ILIKE $${paramCount}`;
        
        if (whereClause) {
          whereClause += ` AND ${sectorCondition}`;
        } else {
          whereClause += `WHERE ${sectorCondition}`;
        }
        
        queryParams.push(`%${sector}%`);
      }

      // Query para contar total (para paginación)
      const countQuery = `
        SELECT COUNT(*) as total
        FROM companies
        ${whereClause}
      `;

      // Query principal con paginación
      const offset = (page - 1) * limit;
      const dataQuery = `
        SELECT
          id,
          name,
          sector,
          tenant_id,
          admin_name,
          admin_phone,
          admin_email,
          wazuh_group,
          created_at,
          updated_at
        FROM companies
        ${whereClause}
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      queryParams.push(limit, offset);

      // Ejecutar ambas queries
      const [countResult, dataResult] = await Promise.all([
        this.db.query(countQuery, whereClause ? queryParams.slice(0, paramCount) : []),
        this.db.query(dataQuery, queryParams)
      ]);

      const total = parseInt(countResult.rows[0].total);
      const companies = dataResult.rows;
      const totalPages = Math.ceil(total / limit);

      console.log(`✅ Encontradas ${companies.length} empresas (${total} total) - Página ${page}/${totalPages}`);

      // Respuesta consistente con metadatos de paginación
      const response = {
        success: true,
        data: companies,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          totalPages: totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        filters: {
          search: search || null,
          sector: sector || null,
          sortBy,
          sortOrder
        },
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      };

      // Headers útiles para el frontend
      res.set('X-Total-Count', total.toString());
      res.set('X-Page-Count', totalPages.toString());
      res.set('X-Current-Page', page.toString());

      res.json(response);

    } catch (error) {
      console.error('❌ Error obteniendo empresas:', error);
      next(createError(
        'Error obteniendo lista de empresas',
        500,
        ErrorTypes.DATABASE,
        { operation: 'getAllCompanies', query: req.query }
      ));
    }
  }

  /**
   * GET /api/companies/:id - Obtener empresa específica por ID
   * 
   * ¿Qué hace? Devuelve información completa de una empresa específica
   * ¿Por qué necesaria? Para ver detalles y editar empresas existentes
   * ¿Para qué? Formularios de edición y vistas de detalle
   */
  async getCompanyById(req, res, next) {
    try {
      const { id } = req.params;
      console.log(`🔍 Buscando empresa con ID: ${id}`);

      // El ID ya fue validado por el middleware
      const query = `
        SELECT
          id,
          name,
          sector,
          tenant_id,
          admin_name,
          admin_phone,
          admin_email,
          wazuh_group,
          created_at,
          updated_at
        FROM companies
        WHERE id = $1
      `;

      const result = await this.db.query(query, [id]);

      if (result.rows.length === 0) {
        console.log(`❌ Empresa no encontrada: ID ${id}`);
        return next(createError(
          `Empresa con ID ${id} no encontrada`,
          404,
          ErrorTypes.NOT_FOUND,
          { requestedId: id }
        ));
      }

      const company = result.rows[0];
      console.log(`✅ Empresa encontrada: ${company.name}`);

      res.json({
        success: true,
        data: company,
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });

    } catch (error) {
      console.error('❌ Error obteniendo empresa:', error);
      next(createError(
        'Error obteniendo información de la empresa',
        500,
        ErrorTypes.DATABASE,
        { operation: 'getCompanyById', companyId: req.params.id }
      ));
    }
  }

  /**
   * POST /api/companies - Crear nueva empresa
   * 
   * ¿Qué hace? Crea una nueva empresa con validaciones completas
   * ¿Por qué complejo? Necesita generar tenant_id, validar unicidad, etc.
   * ¿Para qué? Permitir a super admins añadir nuevas empresas al sistema
   */
  async createCompany(req, res, next) {
    try {
      const companyData = req.body;
      console.log(`➕ Creando nueva empresa: ${companyData.name}`);

      // Los datos ya fueron validados por el middleware de validación
      // Pero vamos a hacer validaciones adicionales específicas

      // Verificar unicidad de email
      const emailCheckQuery = 'SELECT id FROM companies WHERE admin_email = $1';
      const emailExists = await this.db.query(emailCheckQuery, [companyData.admin_email]);
      
      if (emailExists.rows.length > 0) {
        console.log(`❌ Email ya existe: ${companyData.admin_email}`);
        return next(createError(
          'Ya existe una empresa con este email de administrador',
          409,
          ErrorTypes.VALIDATION,
          { duplicateField: 'admin_email', value: companyData.admin_email }
        ));
      }

      // Generar tenant_id único
      const tenantId = ValidationService.generateTenantId(
        companyData.name,
        companyData.sector
      );

      // Verificar que el tenant_id sea único (muy improbable que se repita)
      const tenantCheckQuery = 'SELECT id FROM companies WHERE tenant_id = $1';
      const tenantExists = await this.db.query(tenantCheckQuery, [tenantId]);
      
      if (tenantExists.rows.length > 0) {
        console.log(`❌ Tenant ID colisión (muy raro): ${tenantId}`);
        return next(createError(
          'Error generando identificador único para la empresa. Intenta de nuevo.',
          409,
          ErrorTypes.INTERNAL,
          { generatedTenantId: tenantId }
        ));
      }

      // Generar grupo Wazuh basado en tenant_id
      const wazuhGroup = `zs_${tenantId.replace(/-/g, '_')}`;

      // Insertar nueva empresa
      const insertQuery = `
        INSERT INTO companies (
          name, sector, tenant_id, admin_name, admin_phone, 
          admin_email, admin_password, wazuh_group
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING 
          id, name, sector, tenant_id, admin_name, admin_email, 
          wazuh_group, created_at
      `;

      const insertValues = [
        companyData.name.trim(),
        companyData.sector.trim(),
        tenantId,
        companyData.admin_name.trim(),
        companyData.admin_phone.trim(),
        companyData.admin_email.trim(),
        companyData.admin_password, // Será hasheado en una futura versión
        wazuhGroup
      ];

      const result = await this.db.query(insertQuery, insertValues);
      const newCompany = result.rows[0];

      console.log(`✅ Empresa creada exitosamente: ${newCompany.name} (ID: ${newCompany.id})`);

      // Log de auditoría para creación de empresa
      console.log('📝 AUDITORÍA - Empresa creada:', {
        companyId: newCompany.id,
        companyName: newCompany.name,
        tenantId: newCompany.tenant_id,
        adminEmail: newCompany.admin_email,
        createdBy: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });

      res.status(201).json({
        success: true,
        message: 'Empresa creada exitosamente',
        data: newCompany,
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });

    } catch (error) {
      console.error('❌ Error creando empresa:', error);
      
      // Manejar errores específicos de base de datos
      if (error.code === '23505') {
        return next(createError(
          'Ya existe una empresa con estos datos únicos',
          409,
          ErrorTypes.DATABASE,
          { pgErrorCode: error.code, constraint: error.constraint }
        ));
      }

      next(createError(
        'Error interno creando la empresa',
        500,
        ErrorTypes.DATABASE,
        { operation: 'createCompany', companyName: req.body?.name }
      ));
    }
  }

  /**
   * PUT /api/companies/:id - Actualizar empresa existente
   * 
   * ¿Qué hace? Actualiza datos de empresa existente con validaciones
   * ¿Por qué PUT? Actualización completa vs PATCH (parcial)
   * ¿Para qué? Permitir modificar información de empresas desde el admin
   */
  async updateCompany(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      console.log(`✏️ Actualizando empresa ID: ${id}`);

      // Verificar que la empresa existe
      const existsQuery = 'SELECT id, name, admin_email FROM companies WHERE id = $1';
      const existsResult = await this.db.query(existsQuery, [id]);

      if (existsResult.rows.length === 0) {
        console.log(`❌ Empresa no encontrada para actualizar: ID ${id}`);
        return next(createError(
          `Empresa con ID ${id} no encontrada`,
          404,
          ErrorTypes.NOT_FOUND,
          { requestedId: id }
        ));
      }

      const currentCompany = existsResult.rows[0];

      // Verificar unicidad de email si se está cambiando
      if (updateData.admin_email && updateData.admin_email !== currentCompany.admin_email) {
        const emailCheckQuery = 'SELECT id FROM companies WHERE admin_email = $1 AND id != $2';
        const emailExists = await this.db.query(emailCheckQuery, [updateData.admin_email, id]);
        
        if (emailExists.rows.length > 0) {
          console.log(`❌ Email ya existe en otra empresa: ${updateData.admin_email}`);
          return next(createError(
            'Ya existe otra empresa con este email de administrador',
            409,
            ErrorTypes.VALIDATION,
            { duplicateField: 'admin_email', value: updateData.admin_email }
          ));
        }
      }

      // Construir query de actualización dinámica
      const updateFields = [];
      const updateValues = [];
      let paramCount = 0;

      // Campos que se pueden actualizar
      const allowedFields = ['name', 'sector', 'admin_name', 'admin_phone', 'admin_email'];
      
      allowedFields.forEach(field => {
        if (updateData[field] !== undefined && updateData[field] !== null) {
          paramCount++;
          updateFields.push(`${field} = $${paramCount}`);
          updateValues.push(updateData[field].toString().trim());
        }
      });

      // Manejo especial para password (solo si se proporciona)
      if (updateData.admin_password && updateData.admin_password.trim()) {
        paramCount++;
        updateFields.push(`admin_password = $${paramCount}`);
        updateValues.push(updateData.admin_password.trim());
      }

      if (updateFields.length === 0) {
        return next(createError(
          'No se proporcionaron campos válidos para actualizar',
          400,
          ErrorTypes.VALIDATION,
          { providedFields: Object.keys(updateData) }
        ));
      }

      // Añadir timestamp de actualización
      paramCount++;
      updateFields.push(`updated_at = $${paramCount}`);
      updateValues.push(new Date());

      // Añadir ID para WHERE clause
      paramCount++;
      updateValues.push(id);

      const updateQuery = `
        UPDATE companies
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING 
          id, name, sector, tenant_id, admin_name, admin_email, 
          wazuh_group, created_at, updated_at
      `;

      const result = await this.db.query(updateQuery, updateValues);
      const updatedCompany = result.rows[0];

      console.log(`✅ Empresa actualizada: ${updatedCompany.name} (ID: ${id})`);

      // Log de auditoría para actualización
      console.log('📝 AUDITORÍA - Empresa actualizada:', {
        companyId: id,
        companyName: updatedCompany.name,
        updatedFields: updateFields.map(f => f.split(' = ')[0]),
        updatedBy: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });

      res.json({
        success: true,
        message: `Empresa "${updatedCompany.name}" actualizada exitosamente`,
        data: updatedCompany,
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });

    } catch (error) {
      console.error('❌ Error actualizando empresa:', error);
      
      if (error.code === '23505') {
        return next(createError(
          'Ya existe una empresa con estos datos únicos',
          409,
          ErrorTypes.DATABASE,
          { pgErrorCode: error.code, constraint: error.constraint }
        ));
      }

      next(createError(
        'Error interno actualizando la empresa',
        500,
        ErrorTypes.DATABASE,
        { operation: 'updateCompany', companyId: id }
      ));
    }
  }

  /**
   * DELETE /api/companies/:id - Eliminar empresa
   * 
   * ¿Qué hace? Elimina empresa con verificaciones de seguridad
   * ¿Por qué cuidadoso? Eliminar empresas es una operación irreversible
   * ¿Para qué? Limpiar empresas de prueba o que ya no usan el servicio
   */
  async deleteCompany(req, res, next) {
    try {
      const { id } = req.params;
      console.log(`🗑️ Eliminando empresa ID: ${id}`);

      // Verificar que la empresa existe y obtener información para logs
      const existsQuery = 'SELECT id, name, tenant_id, admin_email FROM companies WHERE id = $1';
      const existsResult = await this.db.query(existsQuery, [id]);

      if (existsResult.rows.length === 0) {
        console.log(`❌ Empresa no encontrada para eliminar: ID ${id}`);
        return next(createError(
          `Empresa con ID ${id} no encontrada`,
          404,
          ErrorTypes.NOT_FOUND,
          { requestedId: id }
        ));
      }

      const companyToDelete = existsResult.rows[0];

      // TODO: En futuras versiones, verificar dependencias (usuarios, datos, etc.)
      // Por ahora asumimos que es seguro eliminar

      // Eliminar empresa
      const deleteQuery = 'DELETE FROM companies WHERE id = $1 RETURNING id, name';
      const deleteResult = await this.db.query(deleteQuery, [id]);

      if (deleteResult.rows.length === 0) {
        console.log(`❌ No se pudo eliminar empresa ID: ${id}`);
        return next(createError(
          'No se pudo eliminar la empresa',
          500,
          ErrorTypes.INTERNAL,
          { companyId: id }
        ));
      }

      const deletedCompany = deleteResult.rows[0];
      console.log(`✅ Empresa eliminada: ${deletedCompany.name} (ID: ${id})`);

      // Log de auditoría CRÍTICO para eliminación
      console.error('🚨 AUDITORÍA CRÍTICA - Empresa eliminada:', {
        companyId: id,
        companyName: companyToDelete.name,
        tenantId: companyToDelete.tenant_id,
        adminEmail: companyToDelete.admin_email,
        deletedBy: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });

      res.json({
        success: true,
        message: `Empresa "${deletedCompany.name}" eliminada exitosamente`,
        data: {
          id: parseInt(id),
          name: deletedCompany.name
        },
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });

    } catch (error) {
      console.error('❌ Error eliminando empresa:', error);
      
      if (error.code === '23503') {
        return next(createError(
          'No se puede eliminar la empresa porque tiene datos relacionados',
          409,
          ErrorTypes.DATABASE,
          { pgErrorCode: error.code, constraint: error.constraint }
        ));
      }

      next(createError(
        'Error interno eliminando la empresa',
        500,
        ErrorTypes.DATABASE,
        { operation: 'deleteCompany', companyId: id }
      ));
    }
  }
}

module.exports = CompaniesController;
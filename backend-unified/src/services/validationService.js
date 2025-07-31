/**
 * SERVICIO DE VALIDACIÓN CENTRALIZADO
 * 
 * Consolida todas las funciones de validación duplicadas
 * entre los backends existentes
 */

const crypto = require('crypto');

class ValidationService {
  /**
   * Validar formato de email
   * @param {string} email 
   * @returns {boolean}
   */
  static isValidEmail(email) {
    if (!email || typeof email !== 'string') {
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  /**
   * Validar formato de teléfono (formato internacional básico)
   * @param {string} phone 
   * @returns {boolean}
   */
  static isValidPhone(phone) {
    if (!phone || typeof phone !== 'string') {
      return false;
    }
    
    const phoneRegex = /^[+]?[\d\s\-()]{9,20}$/;
    return phoneRegex.test(phone.trim());
  }

  /**
   * Validar datos completos de empresa
   * @param {Object} companyData 
   * @returns {Object} { isValid: boolean, errors: string[] }
   */
  static validateCompanyData(companyData) {
    const errors = [];
    
    // Validaciones de campos requeridos
    if (!companyData.name?.trim()) {
      errors.push('El nombre de la empresa es obligatorio');
    }
    
    if (!companyData.sector?.trim()) {
      errors.push('El sector es obligatorio');
    }
    
    if (!companyData.admin_name?.trim()) {
      errors.push('El nombre del administrador es obligatorio');
    }
    
    if (!companyData.admin_phone?.trim()) {
      errors.push('El teléfono del administrador es obligatorio');
    }
    
    if (!companyData.admin_email?.trim()) {
      errors.push('El email del administrador es obligatorio');
    }
    
    // Validaciones de formato
    if (companyData.admin_email && !this.isValidEmail(companyData.admin_email)) {
      errors.push('El formato del email no es válido');
    }
    
    if (companyData.admin_phone && !this.isValidPhone(companyData.admin_phone)) {
      errors.push('El formato del teléfono no es válido');
    }
    
    // Validación de nombre de empresa (no permitir caracteres especiales problemáticos)
    if (companyData.name) {
      const nameRegex = /^[a-zA-Z0-9\s\-_.&áéíóúñÁÉÍÓÚÑ]+$/;
      if (!nameRegex.test(companyData.name.trim())) {
        errors.push('El nombre de la empresa contiene caracteres no permitidos');
      }
    }
    
    // Validación de sector (lista predefinida)
    if (companyData.sector) {
      const validSectors = [
        'tecnologia', 'salud', 'educacion', 'finanzas', 'retail', 
        'manufactura', 'energia', 'transporte', 'inmobiliario', 
        'consultoria', 'gobierno', 'ong', 'legal', 'otros'
      ];
      
      if (!validSectors.includes(companyData.sector.toLowerCase().trim())) {
        errors.push('El sector especificado no es válido');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }


  /**
   * Generar tenant_id único basado en nombre de empresa y sector
   * @param {string} companyName 
   * @param {string} sector 
   * @returns {string}
   */
  static generateTenantId(companyName, sector) {
    if (!companyName || !sector) {
      throw new Error('Company name and sector are required to generate tenant ID');
    }
    
    // Limpiar nombre de empresa
    const cleanName = companyName.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remover acentos
      .replace(/[^a-z0-9]/g, '-')      // Reemplazar caracteres especiales
      .replace(/-+/g, '-')             // Consolidar guiones múltiples
      .replace(/^-|-$/g, '');          // Remover guiones al inicio/final

    // Limpiar sector (primeros 3 caracteres)
    const cleanSector = sector.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .substring(0, 3);

    // Generar sufijo aleatorio
    const randomSuffix = crypto.randomBytes(3).toString('hex');

    // Construir tenant_id
    const tenantId = `${cleanName}-${cleanSector}-${randomSuffix}`.substring(0, 50);
    
    return tenantId;
  }

  /**
   * Validar ID numérico
   * @param {string|number} id 
   * @returns {boolean}
   */
  static isValidId(id) {
    if (id === null || id === undefined) {
      return false;
    }
    
    const numId = parseInt(id);
    return !isNaN(numId) && numId > 0;
  }

  /**
   * Validar token de autenticación
   * @param {string} token 
   * @returns {boolean}
   */
  static isValidAuthToken(token) {
    if (!token || typeof token !== 'string') {
      return false;
    }
    
    // Verificar que no sea un token demo (seguridad)
    const demoTokens = [
      'demo-token-super-admin',
      'company-token-demo',
      'test-token'
    ];
    
    if (demoTokens.some(demoToken => token.includes(demoToken))) {
      console.warn('🚨 ADVERTENCIA: Detectado token demo en validación');
      return false; // En producción, rechazar tokens demo
    }
    
    // Validar formato básico (mínimo 10 caracteres)
    return token.length >= 10;
  }

  /**
   * Validar tenant_id format
   * @param {string} tenantId 
   * @returns {boolean}
   */
  static isValidTenantId(tenantId) {
    if (!tenantId || typeof tenantId !== 'string') {
      return false;
    }
    
    // Formato esperado: nombre-sec-xxx (3-50 caracteres, solo letras, números y guiones)
    const tenantRegex = /^[a-z0-9\-]{3,50}$/;
    return tenantRegex.test(tenantId);
  }

  /**
   * Validar contraseña (criterios de seguridad básicos)
   * @param {string} password 
   * @returns {Object} { isValid: boolean, errors: string[] }
   */
  static validatePassword(password) {
    const errors = [];
    
    if (!password || typeof password !== 'string') {
      errors.push('La contraseña es obligatoria');
      return { isValid: false, errors };
    }
    
    // Criterios mínimos de seguridad
    if (password.length < 8) {
      errors.push('La contraseña debe tener al menos 8 caracteres');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('La contraseña debe contener al menos una letra mayúscula');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('La contraseña debe contener al menos una letra minúscula');
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push('La contraseña debe contener al menos un número');
    }
    
    // Verificar contraseñas comunes (blacklist básica)
    const commonPasswords = [
      'password', '123456', '123456789', 'qwerty', 'abc123',
      'password123', 'admin', 'admin123', 'wazuh', 'zienshield'
    ];
    
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('La contraseña es demasiado común, elige una más segura');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Sanitizar string para prevenir XSS básico
   * @param {string} input 
   * @returns {string}
   */
  static sanitizeString(input) {
    if (!input || typeof input !== 'string') {
      return '';
    }
    
    return input
      .trim()
      .replace(/[<>\"'&]/g, '') // Remover caracteres potencialmente peligrosos
      .substring(0, 255); // Limitar longitud
  }

  /**
   * Validar parámetros de paginación
   * @param {Object} params 
   * @returns {Object} { isValid: boolean, errors: string[], sanitized: Object }
   */
  static validatePaginationParams(params) {
    const errors = [];
    const sanitized = {
      page: 1,
      limit: 10,
      sortBy: 'id',
      sortOrder: 'asc'
    };
    
    // Validar página
    if (params.page !== undefined) {
      const page = parseInt(params.page);
      if (isNaN(page) || page < 1) {
        errors.push('El número de página debe ser un entero positivo');
      } else if (page > 1000) {
        errors.push('El número de página no puede ser mayor a 1000');
      } else {
        sanitized.page = page;
      }
    }
    
    // Validar límite
    if (params.limit !== undefined) {
      const limit = parseInt(params.limit);
      if (isNaN(limit) || limit < 1) {
        errors.push('El límite debe ser un entero positivo');
      } else if (limit > 100) {
        errors.push('El límite no puede ser mayor a 100');
      } else {
        sanitized.limit = limit;
      }
    }
    
    // Validar ordenamiento
    if (params.sortBy !== undefined) {
      const allowedSortFields = ['id', 'name', 'sector', 'created_at', 'admin_email'];
      if (!allowedSortFields.includes(params.sortBy)) {
        errors.push('Campo de ordenamiento no válido');
      } else {
        sanitized.sortBy = params.sortBy;
      }
    }
    
    if (params.sortOrder !== undefined) {
      const allowedOrders = ['asc', 'desc'];
      if (!allowedOrders.includes(params.sortOrder.toLowerCase())) {
        errors.push('Orden de clasificación debe ser "asc" o "desc"');
      } else {
        sanitized.sortOrder = params.sortOrder.toLowerCase();
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      sanitized
    };
  }

  /**
   * Validar datos para actualización de empresa (campos opcionales)
   * 
   * ¿Qué hace? Como validateCompanyData pero permite campos opcionales
   * ¿Por qué? PUT permite actualizar solo algunos campos
   * ¿Para qué? Validación flexible para actualizaciones parciales
   */
  static validateCompanyUpdateData(data) {
    const errors = [];
    
    // Para actualización, todos los campos son opcionales
    // pero si están presentes deben ser válidos
    
    if (data.name !== undefined) {
      if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
        errors.push('Nombre de empresa debe tener al menos 2 caracteres');
      } else if (data.name.trim().length > 100) {
        errors.push('Nombre de empresa no puede exceder 100 caracteres');
      }
    }
    
    if (data.sector !== undefined) {
      const validSectors = [
        'tecnologia', 'salud', 'educacion', 'finanzas', 'retail', 
        'manufactura', 'energia', 'transporte', 'inmobiliario', 
        'consultoria', 'gobierno', 'ong', 'legal', 'otros'
      ];
      
      if (!data.sector || !validSectors.includes(data.sector.toLowerCase())) {
        errors.push(`Sector debe ser uno de: ${validSectors.join(', ')}`);
      }
    }
    
    if (data.admin_name !== undefined) {
      if (!data.admin_name || typeof data.admin_name !== 'string' || data.admin_name.trim().length < 2) {
        errors.push('Nombre del administrador debe tener al menos 2 caracteres');
      } else if (data.admin_name.trim().length > 50) {
        errors.push('Nombre del administrador no puede exceder 50 caracteres');
      }
    }
    
    if (data.admin_phone !== undefined) {
      if (!data.admin_phone?.trim()) {
        errors.push('El teléfono del administrador no puede estar vacío');
      } else if (!this.isValidPhone(data.admin_phone)) {
        errors.push('El formato del teléfono no es válido');
      }
    }
    
    if (data.admin_email !== undefined) {
      if (!data.admin_email?.trim()) {
        errors.push('El email del administrador no puede estar vacío');
      } else if (!this.isValidEmail(data.admin_email)) {
        errors.push('El formato del email no es válido');
      }
    }
    
    if (data.admin_password !== undefined) {
      const passwordValidation = this.validatePassword(data.admin_password);
      if (!passwordValidation.isValid) {
        errors.push(...passwordValidation.errors);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
}

module.exports = ValidationService;
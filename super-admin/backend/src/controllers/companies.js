const pool = require('../../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Obtener todas las empresas - usando la estructura real de la tabla
const getAllCompanies = async (req, res) => {
  try {
    const query = `
      SELECT
        id,
        name as company_name,
        admin_email,
        tenant_id,
        sector,
        wazuh_group,
        created_at,
        updated_at
      FROM companies 
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query);
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error obteniendo empresas:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo empresas'
    });
  }
};

// Crear nueva empresa
const createCompany = async (req, res) => {
  try {
    const { company_name, admin_email, admin_password, sector, admin_phone } = req.body;

    // Validar datos requeridos
    if (!company_name || !admin_email) {
      return res.status(400).json({
        success: false,
        error: 'Errores de validación en datos de empresa',
        details: ['El nombre de la empresa y email del administrador son obligatorios']
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(admin_email)) {
      return res.status(400).json({
        success: false,
        error: 'Errores de validación en datos de empresa',
        details: ['El formato del email no es válido']
      });
    }

    // Verificar si el email ya existe
    const emailCheck = await pool.query(
      'SELECT id FROM companies WHERE admin_email = $1',
      [admin_email]
    );

    if (emailCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'El email ya está registrado'
      });
    }

    // Generar tenant_id único
    const safeSector = (sector || 'company').toLowerCase().substring(0, 3);
    const tenant_id = `${company_name.toLowerCase().replace(/\s+/g, '-')}-${safeSector}-${Math.random().toString(36).substring(2, 8)}`;

    // Insertar empresa con la estructura real
    const insertQuery = `
      INSERT INTO companies (
        name, admin_email, admin_password, sector, admin_phone, tenant_id
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      company_name, 
      admin_email, 
      admin_password || 'password123', 
      sector || 'OTHER', 
      admin_phone || '+34 000 000 000', 
      tenant_id
    ]);

    res.status(201).json({
      success: true,
      data: {
        id: result.rows[0].id,
        company_name: result.rows[0].name,
        admin_email: result.rows[0].admin_email,
        tenant_id: result.rows[0].tenant_id,
        sector: result.rows[0].sector
      },
      message: 'Empresa creada exitosamente'
    });

  } catch (error) {
    console.error('Error creando empresa:', error);
    res.status(500).json({
      success: false,
      error: 'Error creando empresa'
    });
  }
};

// Actualizar empresa
const updateCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    console.log(`✏️ Actualizando empresa ID: ${id}`, updateData);

    // Verificar que la empresa existe
    const companyCheck = await pool.query(
      'SELECT id, name, admin_email FROM companies WHERE id = $1',
      [id]
    );

    if (companyCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Empresa no encontrada'
      });
    }

    const currentCompany = companyCheck.rows[0];

    // Verificar unicidad de email si se está cambiando
    if (updateData.admin_email && updateData.admin_email !== currentCompany.admin_email) {
      const emailCheck = await pool.query(
        'SELECT id FROM companies WHERE admin_email = $1 AND id != $2',
        [updateData.admin_email, id]
      );

      if (emailCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Ya existe otra empresa con este email de administrador'
        });
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
      return res.status(400).json({
        success: false,
        error: 'No se proporcionaron campos válidos para actualizar'
      });
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

    const result = await pool.query(updateQuery, updateValues);
    const updatedCompany = result.rows[0];

    console.log(`✅ Empresa actualizada: ${updatedCompany.name} (ID: ${id})`);

    res.json({
      success: true,
      message: `Empresa "${updatedCompany.name}" actualizada exitosamente`,
      data: updatedCompany
    });

  } catch (error) {
    console.error('❌ Error actualizando empresa:', error);

    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'Ya existe una empresa con estos datos únicos'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error interno actualizando la empresa'
    });
  }
};

// Eliminar empresa
const deleteCompany = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que la empresa existe
    const companyCheck = await pool.query(
      'SELECT name FROM companies WHERE id = $1',
      [id]
    );

    if (companyCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Empresa no encontrada'
      });
    }

    // Eliminar empresa
    await pool.query('DELETE FROM companies WHERE id = $1', [id]);

    res.json({
      success: true,
      message: `Empresa ${companyCheck.rows[0].name} eliminada exitosamente`
    });

  } catch (error) {
    console.error('Error eliminando empresa:', error);
    res.status(500).json({
      success: false,
      error: 'Error eliminando empresa'
    });
  }
};

module.exports = {
  getAllCompanies,
  createCompany,
  updateCompany,
  deleteCompany
};

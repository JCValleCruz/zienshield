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
    if (!company_name || !admin_email || !admin_password) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos obligatorios'
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
    const tenant_id = `${company_name.toLowerCase().replace(/\s+/g, '-')}-${sector.toLowerCase().substring(0, 3)}-${Math.random().toString(36).substring(2, 8)}`;

    // Insertar empresa con la estructura real
    const insertQuery = `
      INSERT INTO companies (
        name, admin_email, admin_password, sector, admin_phone, tenant_id
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      company_name, admin_email, admin_password, sector, admin_phone, tenant_id
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
  deleteCompany
};

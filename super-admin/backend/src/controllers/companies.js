const pool = require('../../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Obtener todas las empresas con estadísticas
const getAllCompanies = async (req, res) => {
  try {
    const query = `
      SELECT 
        c.id,
        c.company_name,
        c.admin_email,
        c.tenant_id,
        c.sector,
        c.status,
        c.max_agents,
        c.created_at,
        COALESCE(agent_stats.total_agents, 0) as total_agents,
        COALESCE(agent_stats.active_agents, 0) as active_agents,
        CASE 
          WHEN c.max_agents > 0 THEN 
            ROUND((COALESCE(agent_stats.active_agents, 0)::float / c.max_agents::float) * 100, 1)
          ELSE 0 
        END as compliance_percentage,
        COALESCE(alert_stats.total_alerts, 0) as total_alerts,
        COALESCE(alert_stats.critical_alerts, 0) as critical_alerts
      FROM companies c
      LEFT JOIN (
        SELECT 
          company_id,
          COUNT(*) as total_agents,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_agents
        FROM agents
        GROUP BY company_id
      ) agent_stats ON c.id = agent_stats.company_id
      LEFT JOIN (
        SELECT 
          company_id,
          COUNT(*) as total_alerts,
          COUNT(CASE WHEN severity_level >= 10 THEN 1 END) as critical_alerts
        FROM alerts
        WHERE timestamp >= NOW() - INTERVAL '30 days'
        GROUP BY company_id
      ) alert_stats ON c.id = alert_stats.company_id
      ORDER BY c.created_at DESC
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

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(admin_password, 12);
    const tenant_id = uuidv4();
    const wazuh_group = `${company_name.toLowerCase().replace(/\s+/g, '_')}_group`;

    // Insertar empresa
    const insertQuery = `
      INSERT INTO companies (
        company_name, admin_email, admin_password_hash, 
        sector, admin_phone, tenant_id, wazuh_group, 
        status, max_agents, country
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', 10, 'España')
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      company_name, admin_email, hashedPassword, 
      sector, admin_phone, tenant_id, wazuh_group
    ]);

    // TODO: Crear grupo en Wazuh físicamente
    // await createWazuhGroup(wazuh_group, tenant_id);

    res.status(201).json({ 
      success: true, 
      data: {
        id: result.rows[0].id,
        company_name: result.rows[0].company_name,
        admin_email: result.rows[0].admin_email,
        tenant_id: result.rows[0].tenant_id,
        sector: result.rows[0].sector,
        wazuh_group: result.rows[0].wazuh_group
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
      'SELECT company_name, wazuh_group FROM companies WHERE id = $1',
      [id]
    );

    if (companyCheck.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Empresa no encontrada' 
      });
    }

    // Eliminar empresa (CASCADE eliminará usuarios, agentes, alertas)
    await pool.query('DELETE FROM companies WHERE id = $1', [id]);

    // TODO: Eliminar grupo de Wazuh físicamente
    // await deleteWazuhGroup(companyCheck.rows[0].wazuh_group);

    res.json({ 
      success: true, 
      message: `Empresa ${companyCheck.rows[0].company_name} eliminada exitosamente`
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

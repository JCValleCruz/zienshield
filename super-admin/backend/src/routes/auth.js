const express = require('express');
const pool = require('../../config/database');
const router = express.Router();

// POST /api/auth/login - Login multi-tenant
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    console.log('🔐 Intento de login:', { email, password: '***' });
    
    // 1. Verificar si es super admin
    const superAdminCredentials = [
      { email: 'admin@zienshield.com', password: 'ZienAdmin2025' },
      { email: 'superadmin@zienshield.com', password: 'SuperAdmin2025' }
    ];
    
    const isSuperAdmin = superAdminCredentials.some(
      cred => cred.email === email && cred.password === password
    );
    
    if (isSuperAdmin) {
      console.log('✅ Login como Super Admin exitoso');
      return res.json({ 
        success: true, 
        token: 'demo-token-super-admin',
        user: {
          email: email,
          role: 'super_admin',
          name: 'Super Administrator',
          tenant_id: null,
          company_name: null
        }
      });
    }
    
    // 2. Verificar si es usuario de empresa
    console.log('🔍 Buscando empresa en base de datos...');
    
    const companyQuery = `
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
    
    const result = await pool.query(companyQuery, [email]);
    console.log('📊 Resultado de búsqueda:', result.rows.length, 'filas encontradas');
    
    if (result.rows.length === 0) {
      console.log('❌ Email no encontrado en base de datos');
      return res.status(401).json({ 
        success: false, 
        error: 'Credenciales inválidas' 
      });
    }
    
    const company = result.rows[0];
    console.log('🏢 Empresa encontrada:', {
      id: company.id,
      name: company.company_name,
      email: company.admin_email,
      tenant_id: company.tenant_id
    });
    
    // Verificar contraseña (por ahora comparación directa, luego usar bcrypt)
    if (company.admin_password !== password) {
      console.log('❌ Contraseña incorrecta');
      return res.status(401).json({ 
        success: false, 
        error: 'Credenciales inválidas' 
      });
    }
    
    console.log('✅ Login de empresa exitoso');
    return res.json({ 
      success: true, 
      token: `company-token-${company.tenant_id}`,
      user: {
        email: company.admin_email,
        role: 'company_admin',
        name: company.company_name,
        tenant_id: company.tenant_id,
        company_name: company.company_name,
        company_id: company.id,
        sector: company.sector,
        wazuh_group: company.wazuh_group
      }
    });
    
  } catch (error) {
    console.error('❌ Error en login:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
}); // ✅ Cierre correcto aquí

// GET /api/auth/me - Verificar token/sesión
router.get('/me', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: 'Token no proporcionado' 
    });
  }
  
  try {
    // Verificar token de super admin
    if (token === 'demo-token-super-admin') {
      return res.json({
        success: true,
        user: {
          email: 'admin@zienshield.com',
          role: 'super_admin',
          name: 'Super Administrator',
          tenant_id: null,
          company_name: null
        }
      });
    }
    
    // Verificar token de empresa
    if (token.startsWith('company-token-')) {
      const tenant_id = token.replace('company-token-', '');
      
      const companyQuery = `
        SELECT 
          id,
          name as company_name,
          admin_email,
          tenant_id,
          sector,
          wazuh_group
        FROM companies 
        WHERE tenant_id = $1
      `;
      
      const result = await pool.query(companyQuery, [tenant_id]);
      
      if (result.rows.length === 0) {
        return res.status(401).json({ 
          success: false, 
          error: 'Token inválido' 
        });
      }
      
      const company = result.rows[0];
      return res.json({
        success: true,
        user: {
          email: company.admin_email,
          role: 'company_admin',
          name: company.company_name,
          tenant_id: company.tenant_id,
          company_name: company.company_name,
          company_id: company.id,
          sector: company.sector,
          wazuh_group: company.wazuh_group
        }
      });
    }
    
    return res.status(401).json({ 
      success: false, 
      error: 'Token inválido' 
    });
    
  } catch (error) {
    console.error('❌ Error verificando token:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
}); // ✅ Cierre correcto aquí

module.exports = router;

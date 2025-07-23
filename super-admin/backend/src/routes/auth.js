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

// TEST: Endpoint simple para verificar que la ruta funciona
router.get('/test-impersonate', (req, res) => {
  res.json({ success: true, message: 'Endpoint de impersonación funcionando' });
});

// POST /api/auth/impersonate/:tenantId - Impersonación de empresa por super admin
router.post('/impersonate/:tenantId', async (req, res) => {
  const { tenantId } = req.params;
  const token = req.headers.authorization?.split(' ')[1];
  
  try {
    console.log('🎭 Intento de impersonación para tenant:', tenantId);
    console.log('🔑 Token recibido:', token);
    
    // 1. Verificar que quien hace la petición es super admin
    if (token !== 'demo-token-super-admin') {
      console.log('❌ Acceso denegado: no es super admin');
      return res.status(403).json({ 
        success: false, 
        error: 'Acceso denegado: Se requieren permisos de super administrador' 
      });
    }
    
    console.log('✅ Token de super admin verificado');
    
    // 2. Buscar la empresa por tenant_id
    console.log('🔍 Buscando empresa con tenant_id:', tenantId);
    
    const companyQuery = `
      SELECT 
        id,
        name as company_name,
        admin_email,
        tenant_id,
        sector,
        wazuh_group,
        created_at
      FROM companies 
      WHERE tenant_id = $1
    `;
    
    const result = await pool.query(companyQuery, [tenantId]);
    console.log('📊 Resultado de consulta:', result.rows.length, 'filas encontradas');
    
    if (result.rows.length === 0) {
      console.log('❌ Empresa no encontrada:', tenantId);
      return res.status(404).json({ 
        success: false, 
        error: 'Empresa no encontrada' 
      });
    }
    
    const company = result.rows[0];
    console.log('✅ Empresa encontrada:', company.company_name);
    
    // 3. Generar token temporal de impersonación (válido por 30 minutos)
    const impersonationToken = `impersonate-${company.tenant_id}-${Date.now()}`;
    
    // 4. Registrar la acción de impersonación para auditoría
    console.log('📝 LOG DE IMPERSONACIÓN:', {
      timestamp: new Date().toISOString(),
      super_admin_action: 'IMPERSONATE_COMPANY',
      target_tenant_id: tenantId,
      target_company: company.company_name,
      impersonation_token: impersonationToken
    });
    
    // 5. Retornar datos completos de la empresa
    return res.json({ 
      success: true, 
      data: {
        token: impersonationToken,
        user: {
          email: company.admin_email,
          role: 'company_admin',
          name: company.company_name,
          tenant_id: company.tenant_id,
          company_name: company.company_name,
          company_id: company.id,
          sector: company.sector,
          wazuh_group: company.wazuh_group,
          is_impersonated: true // Flag para identificar sesión de impersonación
        },
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutos
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error en impersonación:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor durante impersonación',
      details: error.message
    });
  }
});

// GET /api/auth/auto-login/:token - Auto-login con token de impersonación
router.get('/auto-login/:token', async (req, res) => {
  const { token } = req.params;
  
  try {
    console.log('🔗 Intento de auto-login con token:', token);
    
    // Verificar que sea un token de impersonación válido
    if (!token.startsWith('impersonate-')) {
      console.log('❌ Token no inicia con impersonate-');
      return res.status(401).json({ 
        success: false, 
        error: 'Token de impersonación inválido' 
      });
    }
    
    // Extraer tenant_id y timestamp del token
    const tokenParts = token.split('-');
    console.log('🔍 Token parts:', tokenParts);
    
    if (tokenParts.length < 4) { // impersonate-axafone-tel-001-timestamp
      console.log('❌ Token parts insuficientes:', tokenParts.length);
      return res.status(401).json({ 
        success: false, 
        error: 'Formato de token inválido' 
      });
    }
    
    // Reconstruir tenant_id (puede tener guiones)
    const tenantId = tokenParts.slice(1, -1).join('-'); // Todo excepto 'impersonate' y timestamp
    const timestamp = parseInt(tokenParts[tokenParts.length - 1]); // Último elemento
    
    console.log('🔍 Tenant ID extraído:', tenantId);
    console.log('🔍 Timestamp extraído:', timestamp);
    
    // Verificar que el token no haya expirado (30 minutos)
    const tokenAge = Date.now() - timestamp;
    const maxAge = 30 * 60 * 1000; // 30 minutos
    
    if (tokenAge > maxAge) {
      console.log('❌ Token de impersonación expirado');
      return res.status(401).json({ 
        success: false, 
        error: 'Token de impersonación expirado' 
      });
    }
    
    // Buscar la empresa
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
    
    const result = await pool.query(companyQuery, [tenantId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Empresa no encontrada para impersonación' 
      });
    }
    
    const company = result.rows[0];
    console.log('✅ Auto-login exitoso para empresa:', company.company_name);
    
    // Generar token de sesión normal para la empresa
    const sessionToken = `company-token-${company.tenant_id}`;
    
    return res.json({ 
      success: true, 
      data: {
        token: sessionToken,
        user: {
          email: company.admin_email,
          role: 'company_admin',
          name: company.company_name,
          tenant_id: company.tenant_id,
          company_name: company.company_name,
          company_id: company.id,
          sector: company.sector,
          wazuh_group: company.wazuh_group,
          is_impersonated: true
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error en auto-login:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor durante auto-login' 
    });
  }
});

module.exports = router;

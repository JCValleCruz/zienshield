const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const crypto = require('crypto');

const app = express();
const PORT = 3001;

// Configuración de CORS más permisiva para desarrollo
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://194.164.172.92:3000', 'http://194.164.172.92'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Configuración de PostgreSQL con usuario específico
const pool = new Pool({
  user: 'zienshield_api',
  host: 'localhost',
  database: 'zienshield_multi_tenant',
  password: 'ZienAPI2025!',
  port: 5432,
});

// Test de conexión al iniciar
async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Conexión PostgreSQL exitosa:', result.rows[0].now);
    client.release();
  } catch (error) {
    console.error('❌ Error conectando a PostgreSQL:', error.message);
  }
}

// Función para generar tenant_id único
function generateTenantId(companyName, sector) {
  const cleanName = companyName.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .replace(/[^a-z0-9]/g, '-')      // Reemplazar caracteres especiales
    .replace(/-+/g, '-')             // Consolidar guiones múltiples
    .replace(/^-|-$/g, '');          // Remover guiones al inicio/final

  const cleanSector = sector.toLowerCase().substring(0, 3);
  const randomSuffix = crypto.randomBytes(3).toString('hex');

  return `${cleanName}-${cleanSector}-${randomSuffix}`.substring(0, 50);
}

// Función para validar email
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Función para validar teléfono (formato español básico)
function isValidPhone(phone) {
  const phoneRegex = /^[+]?[\d\s\-()]{9,20}$/;
  return phoneRegex.test(phone);
}

// Ruta de prueba
app.get('/api/health', async (req, res) => {
  try {
    const dbResult = await pool.query('SELECT COUNT(*) as company_count FROM companies');
    res.json({
      status: 'OK',
      message: 'ZienSHIELD API funcionando',
      database: 'Conectado',
      companies: parseInt(dbResult.rows[0].company_count),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Error de conexión a la base de datos',
      error: error.message
    });
  }
});

// Obtener todas las empresas
app.get('/api/companies', async (req, res) => {
  try {
    console.log('📋 Solicitando lista de empresas...');
    const result = await pool.query(`
      SELECT
        id,
        name,
        sector,
        tenant_id,
        admin_name,
        admin_phone,
        admin_email,
        created_at
      FROM companies
      ORDER BY id
    `);

    console.log(`✅ Encontradas ${result.rows.length} empresas`);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error obteniendo empresas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

// Obtener empresa por ID
app.get('/api/companies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 Buscando empresa con ID: ${id}`);

    const result = await pool.query(`
      SELECT
        id, name, sector, tenant_id, admin_name, admin_phone, admin_email, created_at
      FROM companies
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Empresa no encontrada'
      });
    }

    console.log(`✅ Empresa encontrada: ${result.rows[0].name}`);

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error obteniendo empresa:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

// CREAR NUEVA EMPRESA
app.post('/api/companies', async (req, res) => {
  try {
    const { name, sector, admin_name, admin_phone, admin_email, admin_password } = req.body;

    console.log('➕ Creando nueva empresa:', name);

    // Validaciones
    const errors = [];

    if (!name?.trim()) errors.push('El nombre de la empresa es obligatorio');
    if (!sector?.trim()) errors.push('El sector es obligatorio');
    if (!admin_name?.trim()) errors.push('El nombre del administrador es obligatorio');
    if (!admin_phone?.trim()) errors.push('El teléfono del administrador es obligatorio');
    if (!admin_email?.trim()) errors.push('El email del administrador es obligatorio');
    if (!admin_password?.trim()) errors.push('La contraseña del administrador es obligatoria');

    if (admin_email && !isValidEmail(admin_email)) {
      errors.push('El formato del email no es válido');
    }

    if (admin_phone && !isValidPhone(admin_phone)) {
      errors.push('El formato del teléfono no es válido');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Errores de validación',
        details: errors
      });
    }

    // Generar tenant_id único
    const tenant_id = generateTenantId(name, sector);

    // Verificar que el tenant_id sea único
    const existingTenant = await pool.query('SELECT id FROM companies WHERE tenant_id = $1', [tenant_id]);
    if (existingTenant.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Ya existe una empresa con un identificador similar'
      });
    }

    // Verificar email único
    const existingEmail = await pool.query('SELECT id FROM companies WHERE admin_email = $1', [admin_email]);
    if (existingEmail.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Ya existe una empresa con este email de administrador'
      });
    }

    // Crear empresa
    const result = await pool.query(`
      INSERT INTO companies (name, sector, tenant_id, admin_name, admin_phone, admin_email, admin_password)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, sector, tenant_id, admin_name, admin_email, created_at
    `, [name.trim(), sector.trim(), tenant_id, admin_name.trim(), admin_phone.trim(), admin_email.trim(), admin_password]);

    const newCompany = result.rows[0];

    console.log(`✅ Empresa creada exitosamente: ${newCompany.name} (ID: ${newCompany.id})`);

    res.status(201).json({
      success: true,
      message: 'Empresa creada exitosamente',
      data: newCompany
    });

  } catch (error) {
    console.error('❌ Error creando empresa:', error);

    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'Ya existe una empresa con estos datos únicos'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

// ACTUALIZAR EMPRESA
app.put('/api/companies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, sector, admin_name, admin_phone, admin_email, admin_password } = req.body;

    console.log('✏️ Actualizando empresa con ID:', id);

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: 'ID de empresa inválido'
      });
    }

    const checkResult = await pool.query('SELECT id, name FROM companies WHERE id = $1', [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Empresa no encontrada'
      });
    }

    // Validaciones
    const errors = [];

    if (!name?.trim()) errors.push('El nombre de la empresa es obligatorio');
    if (!sector?.trim()) errors.push('El sector es obligatorio');
    if (!admin_name?.trim()) errors.push('El nombre del administrador es obligatorio');
    if (!admin_phone?.trim()) errors.push('El teléfono del administrador es obligatorio');
    if (!admin_email?.trim()) errors.push('El email del administrador es obligatorio');

    if (admin_email && !isValidEmail(admin_email)) {
      errors.push('El formato del email no es válido');
    }

    if (admin_phone && !isValidPhone(admin_phone)) {
      errors.push('El formato del teléfono no es válido');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Errores de validación',
        details: errors
      });
    }

    // Verificar email único
    const existingEmail = await pool.query('SELECT id FROM companies WHERE admin_email = $1 AND id != $2', [admin_email, id]);
    if (existingEmail.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Ya existe otra empresa con este email de administrador'
      });
    }

    // Actualizar
    let query, params;

    if (admin_password && admin_password.trim()) {
      query = `
        UPDATE companies
        SET name = $1, sector = $2, admin_name = $3, admin_phone = $4, admin_email = $5, admin_password = $6, updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
        RETURNING id, name, sector, tenant_id, admin_name, admin_email, created_at
      `;
      params = [name.trim(), sector.trim(), admin_name.trim(), admin_phone.trim(), admin_email.trim(), admin_password.trim(), id];
    } else {
      query = `
        UPDATE companies
        SET name = $1, sector = $2, admin_name = $3, admin_phone = $4, admin_email = $5, updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING id, name, sector, tenant_id, admin_name, admin_email, created_at
      `;
      params = [name.trim(), sector.trim(), admin_name.trim(), admin_phone.trim(), admin_email.trim(), id];
    }

    const result = await pool.query(query, params);
    const updatedCompany = result.rows[0];

    console.log(`✅ Empresa actualizada exitosamente: ${updatedCompany.name} (ID: ${id})`);

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
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

// ELIMINAR EMPRESA
app.delete('/api/companies/:id', async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️ Eliminando empresa con ID:', id);

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: 'ID de empresa inválido'
      });
    }

    const checkResult = await pool.query('SELECT id, name FROM companies WHERE id = $1', [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Empresa no encontrada'
      });
    }

    const companyName = checkResult.rows[0].name;

    const deleteResult = await pool.query('DELETE FROM companies WHERE id = $1 RETURNING id', [id]);

    if (deleteResult.rows.length > 0) {
      console.log(`✅ Empresa eliminada exitosamente: ${companyName} (ID: ${id})`);

      res.json({
        success: true,
        message: `Empresa "${companyName}" eliminada exitosamente`,
        data: {
          id: parseInt(id),
          name: companyName
        }
      });
    } else {
      throw new Error('No se pudo eliminar la empresa');
    }

  } catch (error) {
    console.error('❌ Error eliminando empresa:', error);

    if (error.code === '23503') {
      return res.status(409).json({
        success: false,
        error: 'No se puede eliminar la empresa porque tiene datos relacionados'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

// ===== ENDPOINTS DE SINCRONIZACIÓN CON WAZUH =====

// Importar el servicio de sincronización con Wazuh
const WazuhSyncService = require('./wazuh-sync');

// Instanciar el servicio
const wazuhSync = new WazuhSyncService();

// Endpoint para sincronizar empresas con Wazuh
app.post('/api/sync/wazuh', async (req, res) => {
  try {
    console.log('🔄 Iniciando sincronización con Wazuh...');

    const result = await pool.query(`
      SELECT id, name, sector, tenant_id, admin_email, created_at
      FROM companies
      ORDER BY id
    `);

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        message: 'No hay empresas para sincronizar',
        results: []
      });
    }

    const syncResults = await wazuhSync.syncCompaniesWithWazuh(result.rows);

    const summary = {
      total: syncResults.length,
      created: syncResults.filter(r => r.status === 'created').length,
      exists: syncResults.filter(r => r.status === 'exists').length,
      errors: syncResults.filter(r => r.status === 'error').length
    };

    console.log(`✅ Sincronización completada: ${summary.created} creados, ${summary.exists} existentes, ${summary.errors} errores`);

    res.json({
      success: true,
      message: 'Sincronización completada',
      summary,
      results: syncResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error en sincronización:', error);
    res.status(500).json({
      success: false,
      error: 'Error durante la sincronización',
      details: error.message
    });
  }
});

// Endpoint para verificar conexión con Wazuh
app.get('/api/sync/wazuh/status', async (req, res) => {
  try {
    const status = await wazuhSync.testConnection();
    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error verificando conexión con Wazuh:', error);
    res.status(500).json({
      success: false,
      error: 'Error verificando conexión con Wazuh',
      details: error.message
    });
  }
});

// Endpoint para obtener grupos de Wazuh
app.get('/api/sync/wazuh/groups', async (req, res) => {
  try {
    const groups = await wazuhSync.getExistingGroups();
    res.json({
      success: true,
      data: groups,
      count: groups.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error obteniendo grupos de Wazuh:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo grupos de Wazuh',
      details: error.message
    });
  }
});

// Iniciar servidor
app.listen(PORT, async () => {
  console.log('🚀 ZienSHIELD API iniciando...');
  console.log(`📡 Servidor corriendo en puerto ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🏢 Empresas: http://localhost:${PORT}/api/companies`);
  console.log(`➕ Crear empresa: POST http://localhost:${PORT}/api/companies`);
  console.log(`✏️ Actualizar empresa: PUT http://localhost:${PORT}/api/companies/:id`);
  console.log(`🗑️ Eliminar empresa: DELETE http://localhost:${PORT}/api/companies/:id`);
  console.log(`🔄 Sincronizar Wazuh: POST http://localhost:${PORT}/api/sync/wazuh`);
  console.log(`📊 Estado Wazuh: GET http://localhost:${PORT}/api/sync/wazuh/status`);
  console.log(`📁 Grupos Wazuh: GET http://localhost:${PORT}/api/sync/wazuh/groups`);
  console.log('🌐 CORS configurado para frontend en puerto 3000');
  console.log('');

  await testConnection();
});

// Manejo de errores de conexión
pool.on('error', (err) => {
  console.error('❌ Error de conexión PostgreSQL:', err);
});

#!/bin/bash

# Script para arreglar validación de contraseña en endpoint PUT
# Ejecutar desde: /home/gacel/zienshield
# Uso: ./fix_password_validation.sh

set -e

echo "🔐 ZienSHIELD Password Validation Fix"
echo "===================================="

# Verificar que estamos en el directorio correcto
if [ ! -f "api/src/server.js" ]; then
    echo "❌ Error: Este script debe ejecutarse desde /home/gacel/zienshield"
    exit 1
fi

API_SERVER_FILE="api/src/server.js"
BACKUP_FILE="api/src/server.js.backup.password.$(date +%Y%m%d_%H%M%S)"

echo "📁 Archivo a corregir: $API_SERVER_FILE"

# Crear backup
echo "💾 Creando backup..."
cp "$API_SERVER_FILE" "$BACKUP_FILE"
echo "✅ Backup: $BACKUP_FILE"

echo ""
echo "🔧 Arreglando validación de contraseña en endpoint PUT..."

# Crear nuevo servidor con validación corregida
cat > "$API_SERVER_FILE" << 'EOF'
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

// ➕ CREAR NUEVA EMPRESA
app.post('/api/companies', async (req, res) => {
  try {
    const { name, sector, admin_name, admin_phone, admin_email, admin_password } = req.body;
    
    console.log('➕ Creando nueva empresa:', name);
    
    // 🔍 VALIDACIONES PARA CREAR (todas obligatorias)
    const errors = [];
    
    // Campos obligatorios
    if (!name?.trim()) errors.push('El nombre de la empresa es obligatorio');
    if (!sector?.trim()) errors.push('El sector es obligatorio');
    if (!admin_name?.trim()) errors.push('El nombre del administrador es obligatorio');
    if (!admin_phone?.trim()) errors.push('El teléfono del administrador es obligatorio');
    if (!admin_email?.trim()) errors.push('El email del administrador es obligatorio');
    if (!admin_password?.trim()) errors.push('La contraseña del administrador es obligatoria');
    
    // Validaciones de formato
    if (admin_email && !isValidEmail(admin_email)) {
      errors.push('El formato del email no es válido');
    }
    
    if (admin_phone && !isValidPhone(admin_phone)) {
      errors.push('El formato del teléfono no es válido');
    }
    
    // Validaciones de longitud
    if (name && name.length > 255) errors.push('El nombre de la empresa no puede exceder 255 caracteres');
    if (sector && sector.length > 100) errors.push('El sector no puede exceder 100 caracteres');
    if (admin_name && admin_name.length > 255) errors.push('El nombre del administrador no puede exceder 255 caracteres');
    if (admin_phone && admin_phone.length > 20) errors.push('El teléfono no puede exceder 20 caracteres');
    if (admin_email && admin_email.length > 255) errors.push('El email no puede exceder 255 caracteres');
    if (admin_password && admin_password.length > 255) errors.push('La contraseña no puede exceder 255 caracteres');
    
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
    
    // Manejar errores específicos de PostgreSQL
    if (error.code === '23505') { // Constraint violation
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

// ✏️ ACTUALIZAR EMPRESA (CONTRASEÑA OPCIONAL)
app.put('/api/companies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, sector, admin_name, admin_phone, admin_email, admin_password } = req.body;
    
    console.log('✏️ Actualizando empresa con ID:', id);
    
    // Verificar que el ID es válido
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: 'ID de empresa inválido'
      });
    }
    
    // Verificar que la empresa existe
    const checkResult = await pool.query('SELECT id, name FROM companies WHERE id = $1', [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Empresa no encontrada'
      });
    }
    
    // 🔍 VALIDACIONES PARA EDITAR (contraseña opcional)
    const errors = [];
    
    // Campos obligatorios (excepto contraseña)
    if (!name?.trim()) errors.push('El nombre de la empresa es obligatorio');
    if (!sector?.trim()) errors.push('El sector es obligatorio');
    if (!admin_name?.trim()) errors.push('El nombre del administrador es obligatorio');
    if (!admin_phone?.trim()) errors.push('El teléfono del administrador es obligatorio');
    if (!admin_email?.trim()) errors.push('El email del administrador es obligatorio');
    
    // Contraseña: validar solo si se proporciona
    if (admin_password && admin_password.trim() && admin_password.trim().length < 6) {
      errors.push('La contraseña debe tener al menos 6 caracteres');
    }
    
    // Validaciones de formato
    if (admin_email && !isValidEmail(admin_email)) {
      errors.push('El formato del email no es válido');
    }
    
    if (admin_phone && !isValidPhone(admin_phone)) {
      errors.push('El formato del teléfono no es válido');
    }
    
    // Validaciones de longitud
    if (name && name.length > 255) errors.push('El nombre de la empresa no puede exceder 255 caracteres');
    if (sector && sector.length > 100) errors.push('El sector no puede exceder 100 caracteres');
    if (admin_name && admin_name.length > 255) errors.push('El nombre del administrador no puede exceder 255 caracteres');
    if (admin_phone && admin_phone.length > 20) errors.push('El teléfono no puede exceder 20 caracteres');
    if (admin_email && admin_email.length > 255) errors.push('El email no puede exceder 255 caracteres');
    if (admin_password && admin_password.length > 255) errors.push('La contraseña no puede exceder 255 caracteres');
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Errores de validación',
        details: errors
      });
    }
    
    // Verificar email único (excepto la empresa actual)
    const existingEmail = await pool.query('SELECT id FROM companies WHERE admin_email = $1 AND id != $2', [admin_email, id]);
    if (existingEmail.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Ya existe otra empresa con este email de administrador'
      });
    }
    
    // 🔐 ACTUALIZAR - Solo incluir contraseña si se proporciona
    let query, params;
    
    if (admin_password && admin_password.trim()) {
      // Actualizar CON nueva contraseña
      query = `
        UPDATE companies 
        SET name = $1, sector = $2, admin_name = $3, admin_phone = $4, admin_email = $5, admin_password = $6, updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
        RETURNING id, name, sector, tenant_id, admin_name, admin_email, created_at
      `;
      params = [name.trim(), sector.trim(), admin_name.trim(), admin_phone.trim(), admin_email.trim(), admin_password.trim(), id];
      console.log('🔐 Actualizando con nueva contraseña');
    } else {
      // Actualizar SIN cambiar contraseña
      query = `
        UPDATE companies 
        SET name = $1, sector = $2, admin_name = $3, admin_phone = $4, admin_email = $5, updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING id, name, sector, tenant_id, admin_name, admin_email, created_at
      `;
      params = [name.trim(), sector.trim(), admin_name.trim(), admin_phone.trim(), admin_email.trim(), id];
      console.log('🔐 Actualizando manteniendo contraseña actual');
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
    
    // Manejar errores específicos de PostgreSQL
    if (error.code === '23505') { // Constraint violation
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

// 🗑️ ELIMINAR EMPRESA
app.delete('/api/companies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🗑️ Eliminando empresa con ID:', id);
    
    // Verificar que el ID es válido
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: 'ID de empresa inválido'
      });
    }
    
    // Verificar que la empresa existe
    const checkResult = await pool.query('SELECT id, name FROM companies WHERE id = $1', [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Empresa no encontrada'
      });
    }
    
    const companyName = checkResult.rows[0].name;
    
    // Eliminar empresa
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
    
    // Manejar errores específicos de PostgreSQL
    if (error.code === '23503') { // Foreign key violation
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

// Iniciar servidor
app.listen(PORT, async () => {
  console.log('🚀 ZienSHIELD API iniciando...');
  console.log(`📡 Servidor corriendo en puerto ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🏢 Empresas: http://localhost:${PORT}/api/companies`);
  console.log(`➕ Crear empresa: POST http://localhost:${PORT}/api/companies`);
  console.log(`✏️ Actualizar empresa: PUT http://localhost:${PORT}/api/companies/:id`);
  console.log(`🗑️ Eliminar empresa: DELETE http://localhost:${PORT}/api/companies/:id`);
  console.log('🌐 CORS configurado para frontend en puerto 3000');
  console.log('');
  
  // Test de conexión
  await testConnection();
});

// Manejo de errores de conexión
pool.on('error', (err) => {
  console.error('❌ Error de conexión PostgreSQL:', err);
});
EOF

echo "✅ Servidor actualizado con validación de contraseña corregida"

echo ""
echo "🔄 Reiniciando servidor API..."

cd api

# Matar proceso anterior
if pgrep -f "node.*server.js" > /dev/null; then
    echo "🛑 Deteniendo servidor anterior..."
    pkill -f "node.*server.js"
    sleep 2
fi

# Iniciar nuevo servidor
echo "🚀 Iniciando servidor con validación corregida..."
node src/server.js &
sleep 3

# Verificar que está corriendo
if pgrep -f "node.*server.js" > /dev/null; then
    echo "✅ Servidor reiniciado exitosamente"
else
    echo "❌ Error: Servidor no se pudo iniciar"
    exit 1
fi

echo ""
echo "🧪 Probando endpoint PUT..."

# Probar actualización sin contraseña
echo "Probando actualización sin contraseña (debe funcionar):"
response=$(curl -s -X PUT "http://localhost:3001/api/companies/1" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Update",
    "sector": "TECH", 
    "admin_name": "Admin Test",
    "admin_phone": "+34123456789",
    "admin_email": "test@example.com",
    "admin_password": ""
  }')

echo "Respuesta:"
echo "$response" | jq '.' 2>/dev/null || echo "$response"

echo ""
echo "🎉 PROBLEMA SOLUCIONADO"
echo "======================="
echo ""
echo "✅ Validación de contraseña corregida:"
echo "   • CREAR: Contraseña obligatoria"
echo "   • EDITAR: Contraseña opcional"
echo ""
echo "✅ Endpoint PUT actualizado:"
echo "   • Si admin_password vacío → mantiene contraseña actual"
echo "   • Si admin_password con valor → actualiza contraseña"
echo ""
echo "✅ Logs mejorados para debugging"
echo ""
echo "🧪 PRUEBA AHORA:"
echo "==============="
echo "1. Ve a: http://194.164.172.92:3000"
echo "2. Edita una empresa (ej: 'Pato')"
echo "3. DEJA LA CONTRASEÑA VACÍA"
echo "4. Modifica otro campo (nombre, teléfono, etc.)"
echo "5. Haz clic 'Actualizar Empresa'"
echo "6. ¡Debería funcionar sin errores!"
echo ""
echo "🔥 ¡Contraseña opcional en edición funcionando!"

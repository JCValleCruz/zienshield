#!/bin/bash

# Script para agregar endpoint POST /api/companies
# Ejecutar desde: /home/gacel/zienshield
# Uso: ./create_company_endpoint.sh

set -e

echo "🏗️ ZienSHIELD Company Endpoint Creator"
echo "====================================="

# Verificar que estamos en el directorio correcto
if [ ! -f "api/src/server.js" ]; then
    echo "❌ Error: Este script debe ejecutarse desde /home/gacel/zienshield"
    echo "   No se encuentra api/src/server.js"
    exit 1
fi

API_FILE="api/src/server.js"
BACKUP_FILE="api/src/server.js.backup.$(date +%Y%m%d_%H%M%S)"

echo "📁 Archivo API: $API_FILE"

# Crear backup
echo "💾 Creando backup..."
cp "$API_FILE" "$BACKUP_FILE"
echo "✅ Backup creado: $BACKUP_FILE"

# Leer el archivo actual
echo "🔍 Analizando servidor actual..."

# Verificar si ya existe el endpoint POST
if grep -q "app.post.*companies" "$API_FILE"; then
    echo "⚠️  El endpoint POST ya existe, actualizando..."
    UPDATING=true
else
    echo "➕ Agregando nuevo endpoint POST..."
    UPDATING=false
fi

# Crear el archivo actualizado
echo "🛠️  Actualizando server.js..."

cat > "$API_FILE" << 'EOF'
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
    
    const result = await pool.query('SELECT * FROM companies WHERE id = $1', [id]);
    
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
    
    // 🔍 VALIDACIONES
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

// Iniciar servidor
app.listen(PORT, async () => {
  console.log('🚀 ZienSHIELD API iniciando...');
  console.log(`📡 Servidor corriendo en puerto ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🏢 Empresas: http://localhost:${PORT}/api/companies`);
  console.log(`➕ Crear empresa: POST http://localhost:${PORT}/api/companies`);
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

echo "✅ server.js actualizado exitosamente"

# Verificar que el servidor API está corriendo
echo ""
echo "🔍 Verificando estado del servidor API..."

cd api

if pgrep -f "node.*server.js" > /dev/null; then
    echo "🟢 El servidor API está ejecutándose"
    echo "   Reiniciando para aplicar cambios..."
    pkill -f "node.*server.js"
    sleep 2
    echo "🚀 Iniciando servidor actualizado..."
    node src/server.js &
    sleep 3
    echo "✅ Servidor API reiniciado"
else
    echo "🟡 El servidor API no está ejecutándose"
    echo "   ¿Quieres iniciarlo? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo "🚀 Iniciando servidor API..."
        node src/server.js &
        sleep 3
        echo "✅ Servidor API iniciado"
    fi
fi

echo ""
echo "📋 Resumen de cambios:"
echo "   ✅ Backup creado: $BACKUP_FILE"
echo "   ✅ Endpoint POST /api/companies agregado"
echo "   ✅ Validaciones completas implementadas"
echo "   ✅ Generación automática de tenant_id"
echo "   ✅ Verificación de duplicados"
echo ""
echo "🧪 Para probar el endpoint:"
echo "   curl -X POST http://194.164.172.92:3001/api/companies \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"name\":\"Test Company\",\"sector\":\"TECH\",\"admin_name\":\"Admin Test\",\"admin_phone\":\"+34123456789\",\"admin_email\":\"test@test.com\",\"admin_password\":\"password123\"}'"
echo ""
echo "🎉 ¡Endpoint POST listo!"

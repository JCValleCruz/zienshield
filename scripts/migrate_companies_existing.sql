-- Migración para tabla companies existente

-- Crear extensión para UUIDs si no existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Agregar tenant_id si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='companies' AND column_name='tenant_id') THEN
        ALTER TABLE companies ADD COLUMN tenant_id UUID UNIQUE DEFAULT uuid_generate_v4();
    END IF;
    
    -- Agregar sector si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='companies' AND column_name='sector') THEN
        ALTER TABLE companies ADD COLUMN sector VARCHAR(50);
    END IF;
    
    -- Agregar max_agents si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='companies' AND column_name='max_agents') THEN
        ALTER TABLE companies ADD COLUMN max_agents INTEGER DEFAULT 10;
    END IF;
    
    -- Agregar country si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='companies' AND column_name='country') THEN
        ALTER TABLE companies ADD COLUMN country VARCHAR(50) DEFAULT 'España';
    END IF;
    
    -- Agregar configuraciones JSON si no existen
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='companies' AND column_name='dashboard_config') THEN
        ALTER TABLE companies ADD COLUMN dashboard_config JSONB DEFAULT '{}';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='companies' AND column_name='alert_config') THEN
        ALTER TABLE companies ADD COLUMN alert_config JSONB DEFAULT '{}';
    END IF;
END $$;

-- Limpiar datos existentes para insertar los reales
DELETE FROM companies;

-- Insertar las 3 empresas reales del grupo
INSERT INTO companies (
    company_name, 
    admin_name,
    admin_phone,
    admin_email, 
    admin_password_hash, 
    wazuh_group,
    sector,
    country,
    max_agents
) VALUES 
(
    'AXAFONE',
    'Juan Valle',
    '+34600000001',
    'jvalle@axafone.com',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'axafone_group',
    'Telecomunicaciones',
    'España',
    50
),
(
    'SOMOS',
    'Administrador SOMOS',
    '+34600000002',
    'admin@somos.plus',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'somos_group',
    'Servicios Digitales',
    'España',
    25
),
(
    'WEDOUP',
    'Administrador WEDOUP',
    '+34600000003',
    'admin@wedoup.com',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'wedoup_group',
    'Desarrollo Web',
    'España',
    15
);

-- Crear usuarios admin para cada empresa
INSERT INTO users (company_id, email, password, full_name, role) VALUES
(1, 'jvalle@axafone.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Juan Valle', 'admin'),
(2, 'admin@somos.plus', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrador SOMOS', 'admin'),
(3, 'admin@wedoup.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrador WEDOUP', 'admin');

-- Crear grupos en tabla wazuh_groups
INSERT INTO wazuh_groups (company_id, group_name, description) VALUES
(1, 'axafone_group', 'Grupo Wazuh para empresa AXAFONE'),
(2, 'somos_group', 'Grupo Wazuh para empresa SOMOS'),
(3, 'wedoup_group', 'Grupo Wazuh para empresa WEDOUP');

-- Verificar inserción
SELECT 
    c.id,
    c.company_name,
    c.admin_name,
    c.admin_email,
    c.tenant_id,
    c.wazuh_group,
    c.sector,
    c.status,
    c.max_agents,
    u.full_name as admin_user,
    wg.group_name
FROM companies c
LEFT JOIN users u ON c.id = u.company_id AND u.role = 'admin'
LEFT JOIN wazuh_groups wg ON c.id = wg.company_id
ORDER BY c.id;


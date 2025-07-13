-- Migración de tabla companies existente a esquema multi-tenant

-- Agregar columnas faltantes si no existen
DO $$ 
BEGIN
    -- Agregar tenant_id si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='companies' AND column_name='tenant_id') THEN
        ALTER TABLE companies ADD COLUMN tenant_id UUID UNIQUE DEFAULT uuid_generate_v4();
    END IF;
    
    -- Agregar admin_password si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='companies' AND column_name='admin_password') THEN
        ALTER TABLE companies ADD COLUMN admin_password VARCHAR(255);
    END IF;
    
    -- Agregar admin_email si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='companies' AND column_name='admin_email') THEN
        ALTER TABLE companies ADD COLUMN admin_email VARCHAR(100) UNIQUE;
    END IF;
    
    -- Agregar otras columnas opcionales
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='companies' AND column_name='sector') THEN
        ALTER TABLE companies ADD COLUMN sector VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='companies' AND column_name='wazuh_group') THEN
        ALTER TABLE companies ADD COLUMN wazuh_group VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='companies' AND column_name='status') THEN
        ALTER TABLE companies ADD COLUMN status VARCHAR(20) DEFAULT 'active';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='companies' AND column_name='max_agents') THEN
        ALTER TABLE companies ADD COLUMN max_agents INTEGER DEFAULT 10;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='companies' AND column_name='country') THEN
        ALTER TABLE companies ADD COLUMN country VARCHAR(50) DEFAULT 'España';
    END IF;
END $$;

-- Limpiar datos existentes si es necesario
DELETE FROM companies;

-- Insertar las 3 empresas reales del grupo
INSERT INTO companies (
    name, 
    admin_email, 
    admin_password, 
    wazuh_group,
    sector,
    country
) VALUES 
(
    'AXAFONE',
    'jvalle@axafone.com',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'axafone_group',
    'Telecomunicaciones',
    'España'
),
(
    'SOMOS',
    'admin@somos.plus',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'somos_group',
    'Servicios Digitales',
    'España'
),
(
    'WEDOUP',
    'admin@wedoup.com',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'wedoup_group',
    'Desarrollo Web',
    'España'
);

-- Verificar inserción
SELECT 
    id,
    name,
    admin_email,
    tenant_id,
    wazuh_group,
    sector,
    status
FROM companies 
ORDER BY id;


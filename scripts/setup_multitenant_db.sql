-- ZienSHIELD Multi-Tenant Database Schema
-- Empresas reales del grupo

-- Crear extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla principal de empresas
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    tenant_id UUID UNIQUE DEFAULT uuid_generate_v4(),
    company_name VARCHAR(100) NOT NULL,
    admin_email VARCHAR(100) UNIQUE NOT NULL,
    admin_password VARCHAR(255) NOT NULL, -- Hash con bcrypt
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Campos opcionales
    sector VARCHAR(50),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(50),
    country VARCHAR(50) DEFAULT 'España',
    wazuh_group VARCHAR(50), -- Grupo específico en Wazuh
    status VARCHAR(20) DEFAULT 'active', -- active, inactive, suspended
    max_agents INTEGER DEFAULT 10,
    
    -- Configuración específica
    dashboard_config JSONB DEFAULT '{}',
    alert_config JSONB DEFAULT '{}',
    compliance_config JSONB DEFAULT '{}'
);

-- Tabla de usuarios por empresa
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'user', -- admin, user, viewer
    permissions JSONB DEFAULT '[]',
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active'
);

-- Tabla de agentes por empresa
CREATE TABLE IF NOT EXISTS agents (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    wazuh_agent_id VARCHAR(10), -- ID del agente en Wazuh
    hostname VARCHAR(100) NOT NULL,
    ip_address INET,
    operating_system VARCHAR(100),
    agent_version VARCHAR(20),
    status VARCHAR(20) DEFAULT 'pending', -- active, inactive, pending, disconnected
    last_seen TIMESTAMP,
    groups TEXT[], -- Grupos de Wazuh
    labels JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de alertas por empresa
CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,
    wazuh_alert_id VARCHAR(50),
    timestamp TIMESTAMP NOT NULL,
    rule_id INTEGER,
    rule_description TEXT,
    severity_level INTEGER, -- 1-15 (Wazuh levels)
    category VARCHAR(50),
    source_ip INET,
    destination_ip INET,
    raw_log TEXT,
    processed BOOLEAN DEFAULT FALSE,
    acknowledged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de grupos Wazuh por empresa
CREATE TABLE IF NOT EXISTS wazuh_groups (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    group_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    rules_config JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_companies_tenant_id ON companies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_companies_admin_email ON companies(admin_email);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_agents_company_id ON agents(company_id);
CREATE INDEX IF NOT EXISTS idx_agents_wazuh_id ON agents(wazuh_agent_id);
CREATE INDEX IF NOT EXISTS idx_alerts_company_id ON alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity_level);

-- Insertar las 3 empresas reales del grupo
INSERT INTO companies (
    company_name, 
    admin_email, 
    admin_password, 
    wazuh_group,
    sector,
    country
) VALUES 
(
    'AXAFONE',
    'jvalle@axafone.com',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- Hash de: JuVa519*Zien
    'axafone_group',
    'Telecomunicaciones',
    'España'
),
(
    'SOMOS',
    'admin@somos.plus',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- Hash de: JuVa519*Zien
    'somos_group',
    'Servicios Digitales',
    'España'
),
(
    'WEDOUP',
    'admin@wedoup.com',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- Hash de: JuVa519*Zien
    'wedoup_group',
    'Desarrollo Web',
    'España'
);

-- Crear usuarios admin para cada empresa
INSERT INTO users (company_id, email, password, full_name, role) VALUES
(1, 'jvalle@axafone.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrador AXAFONE', 'admin'),
(2, 'admin@somos.plus', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrador SOMOS', 'admin'),
(3, 'admin@wedoup.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrador WEDOUP', 'admin');

-- Crear grupos en tabla wazuh_groups
INSERT INTO wazuh_groups (company_id, group_name, description) VALUES
(1, 'axafone_group', 'Grupo para empresa AXAFONE'),
(2, 'somos_group', 'Grupo para empresa SOMOS'),
(3, 'wedoup_group', 'Grupo para empresa WEDOUP');

-- Verificar inserción
SELECT 
    c.company_name,
    c.admin_email,
    c.tenant_id,
    c.wazuh_group,
    c.sector,
    u.full_name,
    wg.group_name
FROM companies c
LEFT JOIN users u ON c.id = u.company_id AND u.role = 'admin'
LEFT JOIN wazuh_groups wg ON c.id = wg.company_id
ORDER BY c.id;


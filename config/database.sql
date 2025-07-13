-- Esquema simplificado para multi-tenant
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    admin_name VARCHAR(255) NOT NULL,
    admin_phone VARCHAR(50) NOT NULL,
    admin_email VARCHAR(255) UNIQUE NOT NULL,
    admin_password_hash VARCHAR(255) NOT NULL,
    wazuh_group VARCHAR(100) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active'
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_companies_email ON companies(admin_email);
CREATE INDEX IF NOT EXISTS idx_companies_wazuh_group ON companies(wazuh_group);

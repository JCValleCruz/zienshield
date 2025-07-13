#!/bin/bash

# Script de configuración automática de PostgreSQL para ZienSHIELD
# Archivo: /home/gacel/zienshield/scripts/setup_database.sh

set -e  # Salir si hay algún error

echo "🚀 Iniciando configuración de PostgreSQL para ZienSHIELD..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variables de configuración
DB_NAME="zienshield_tenants"
DB_USER="zienshield_user"
DB_PASSWORD="ZienShield2025!"

echo -e "${YELLOW}📋 Configuración:${NC}"
echo "   Base de datos: $DB_NAME"
echo "   Usuario: $DB_USER"
echo "   Contraseña: $DB_PASSWORD"
echo ""

# Verificar que PostgreSQL está instalado y corriendo
echo -e "${YELLOW}🔍 Verificando PostgreSQL...${NC}"
if ! systemctl is-active --quiet postgresql; then
    echo -e "${RED}❌ PostgreSQL no está corriendo. Instalando y configurando...${NC}"
    sudo apt update
    sudo apt install -y postgresql postgresql-contrib
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    echo -e "${GREEN}✅ PostgreSQL instalado y iniciado${NC}"
else
    echo -e "${GREEN}✅ PostgreSQL está corriendo${NC}"
fi

# Crear base de datos
echo -e "${YELLOW}🗄️ Creando base de datos...${NC}"
sudo -u postgres psql -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null || true
sudo -u postgres createdb $DB_NAME
echo -e "${GREEN}✅ Base de datos '$DB_NAME' creada${NC}"

# Crear usuario
echo -e "${YELLOW}👤 Configurando usuario de base de datos...${NC}"
sudo -u postgres psql -c "DROP USER IF EXISTS $DB_USER;" 2>/dev/null || true
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
sudo -u postgres psql -c "ALTER USER $DB_USER CREATEDB;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
echo -e "${GREEN}✅ Usuario '$DB_USER' creado y configurado${NC}"

# Crear esquema de tablas
echo -e "${YELLOW}📊 Creando esquema de tablas...${NC}"
sudo -u postgres psql -d $DB_NAME << 'EOSQL'
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

-- Otorgar permisos al usuario sobre la tabla
GRANT ALL PRIVILEGES ON TABLE companies TO zienshield_user;
GRANT USAGE, SELECT ON SEQUENCE companies_id_seq TO zienshield_user;
EOSQL

echo -e "${GREEN}✅ Esquema de tablas creado${NC}"

# Verificar conexión
echo -e "${YELLOW}🔌 Verificando conexión...${NC}"
if PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT version();" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Conexión a la base de datos exitosa${NC}"
else
    echo -e "${RED}❌ Error al conectar a la base de datos${NC}"
    exit 1
fi

# Mostrar información de la tabla creada
echo -e "${YELLOW}📋 Información de la tabla 'companies':${NC}"
sudo -u postgres psql -d $DB_NAME -c "\d companies"

echo ""
echo -e "${GREEN}🎉 ¡Configuración de PostgreSQL completada exitosamente!${NC}"
echo ""
echo -e "${YELLOW}📝 Datos de conexión:${NC}"
echo "   Host: localhost"
echo "   Puerto: 5432"
echo "   Base de datos: $DB_NAME"
echo "   Usuario: $DB_USER"
echo "   Contraseña: $DB_PASSWORD"
echo ""
echo -e "${YELLOW}🧪 Para probar la conexión manualmente:${NC}"
echo "   PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME"

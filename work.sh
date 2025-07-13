# Crear package.json para el backend
cat > super-admin/backend/package.json << 'EOF'
{
  "name": "zienshield-super-admin-backend",
  "version": "1.0.0",
  "description": "ZienSHIELD Super Admin Panel Backend API",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "pg": "^8.11.3",
    "dotenv": "^16.3.1",
    "express-rate-limit": "^7.1.5",
    "joi": "^17.11.0",
    "axios": "^1.6.2",
    "ws": "^8.14.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.2",
    "jest": "^29.7.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
EOF

# Crear archivo de configuración
cat > super-admin/backend/config/database.js << 'EOF'
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'zienshield_tenants',
  password: process.env.DB_PASSWORD || 'Mw8kJjvN3qP2rK9xLp1Y',
  port: process.env.DB_PORT || 5432,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

module.exports = pool;
EOF

# Crear archivo de variables de entorno
cat > super-admin/backend/.env << 'EOF'
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=zienshield_tenants
DB_USER=postgres
DB_PASSWORD=Mw8kJjvN3qP2rK9xLp1Y

# JWT Configuration
JWT_SECRET=ZienShield2025_SuperAdmin_JWT_Secret_Key_Multi_Tenant
JWT_EXPIRE=24h

# Server Configuration
PORT=3001
NODE_ENV=development

# Wazuh Configuration
WAZUH_HOST=localhost
WAZUH_PORT=55000
WAZUH_USER=admin
WAZUH_PASSWORD=uTl3io0b1Fep9*8RF18iaF.4l3lClCrk

# CORS Configuration
FRONTEND_URL=http://localhost:3000
EOF

// Configuración de pool optimizada por entorno

const poolConfigs = {
  development: {
    max: 8,
    min: 2, 
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 3000,
    acquireTimeoutMillis: 2000
  },
  production: {
    max: 15,
    min: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    acquireTimeoutMillis: 1500
  }
};

function createPool(Pool) {
  const env = process.env.NODE_ENV || 'development';
  return new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
    ...poolConfigs[env]
  });
}

module.exports = { createPool, poolConfigs };
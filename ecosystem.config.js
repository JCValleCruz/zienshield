module.exports = {
  apps: [
    {
      name: 'zienshield-backend-unified',
      cwd: './backend-unified',
      script: 'src/server.js',
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
        HOST: '0.0.0.0'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        HOST: '0.0.0.0'
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      error_file: './logs/backend-unified-error.log',
      out_file: './logs/backend-unified-out.log',
      log_file: './logs/backend-unified-combined.log',
      time: true
    },
    {
      name: 'zienshield-frontend',
      cwd: './super-admin/frontend',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        BROWSER: 'none'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true
    }
  ]
};

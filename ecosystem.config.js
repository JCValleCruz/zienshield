module.exports = {
  apps: [
    {
      name: 'zienshield-api',
      script: './server.js',
      cwd: '/home/gacel/zienshield/api/src',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_file: './logs/api-combined.log',
      time: true
    }
  ]
};

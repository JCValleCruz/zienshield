/**
 * CONFIGURACIÓN PM2 PARA BACKEND UNIFICADO
 * 
 * Configuración de producción optimizada para el backend consolidado
 */

module.exports = {
  apps: [
    {
      // ====================================================================
      // BACKEND UNIFICADO PRINCIPAL
      // ====================================================================
      name: 'zienshield-backend-unified',
      script: 'src/server.js',
      cwd: '/home/gacel/zienshield/backend-unified',
      
      // Configuración de proceso
      instances: 1, // Solo 1 instancia para evitar conflictos de puerto
      exec_mode: 'fork', // Fork mode es mejor para aplicaciones con estado
      
      // Variables de entorno
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
      
      // Logs optimizados
      log_file: '/home/gacel/zienshield/backend-unified/logs/combined.log',
      out_file: '/home/gacel/zienshield/backend-unified/logs/out.log',
      error_file: '/home/gacel/zienshield/backend-unified/logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Rotación de logs
      max_log_file_size: '10M',
      max_log_files: 3,
      log_type: 'json',
      
      // Monitoreo y reinicio
      watch: false, // Deshabilitado en producción
      ignore_watch: [
        'node_modules',
        'logs',
        '.git',
        '*.log'
      ],
      
      // Configuración de reinicio automático
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',
      
      // Configuración de cluster y scaling
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      
      // Scripts de ciclo de vida
      pre_start: 'echo "🚀 Iniciando ZienShield Backend Unificado..."',
      post_start: 'echo "✅ ZienShield Backend Unificado iniciado correctamente"'
    }
  ],
  
  // ====================================================================
  // CONFIGURACIÓN DE DEPLOYMENT (OPCIONAL)
  // ====================================================================
  deploy: {
    production: {
      user: 'gacel',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'git@github.com:user/repo.git', // Cambiar por el repo real
      path: '/home/gacel/zienshield/backend-unified',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
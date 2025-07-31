/**
 * SERVICIO DE BASE DE DATOS UNIFICADO
 * 
 * Gestiona todas las conexiones y operaciones con PostgreSQL:
 * - Pool de conexiones optimizado
 * - Manejo robusto de errores de BD
 * - Métodos reutilizables para queries comunes
 * - Soporte para transacciones
 * - Logs detallados para monitoring
 */

const { Pool } = require('pg');
const { get } = require('../config/environment');

/**
 * Clase principal del servicio de base de datos
 * 
 * ¿Qué hace? Gestiona todas las operaciones con PostgreSQL de forma centralizada
 * ¿Por qué una clase? Permite mantener estado del pool y métodos organizados
 * ¿Para qué? Eliminar duplicación de código de BD entre backends
 */
class DatabaseService {
  constructor() {
    this.pool = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = get('database.maxReconnectAttempts') || 5;
    
    console.log('🗄️ DatabaseService inicializando...');
  }

  /**
   * Inicializar pool de conexiones PostgreSQL
   * 
   * ¿Qué hace? Configura el pool de conexiones con la configuración del environment
   * ¿Por qué un pool? Para reutilizar conexiones y mejorar performance
   * ¿Para qué? Conexiones eficientes sin overhead de crear/cerrar constantemente
   */
  async initialize() {
    try {
      console.log('🔌 Configurando pool de conexiones PostgreSQL...');
      
      // Configuración del pool desde environment.js
      const poolConfig = {
        host: get('database.host'),
        port: get('database.port'),
        database: get('database.database'),
        user: get('database.username'),
        password: get('database.password'),
        
        // Configuración del pool
        min: get('database.pool.min') || 2,           // Mínimo 2 conexiones activas
        max: get('database.pool.max') || 10,          // Máximo 10 conexiones
        idleTimeoutMillis: get('database.pool.idleTimeout') || 30000, // 30s timeout
        connectionTimeoutMillis: get('database.pool.connectionTimeout') || 5000, // 5s para conectar
        
        // Configuración SSL (importante para producción)
        ssl: get('database.ssl') ? {
          rejectUnauthorized: false // Para certificados autofirmados
        } : false,
        
        // Configuración adicional
        statement_timeout: 60000,   // 60s timeout para queries
        query_timeout: 30000,       // 30s timeout por query individual
        application_name: 'ZienSHIELD-Backend-Unified'
      };

      // Crear pool
      this.pool = new Pool(poolConfig);
      
      // Event listeners para monitoring
      this.pool.on('connect', (client) => {
        console.log('✅ Nueva conexión PostgreSQL establecida');
      });
      
      this.pool.on('acquire', (client) => {
        console.log('🔄 Conexión PostgreSQL adquirida del pool');
      });
      
      this.pool.on('error', (err, client) => {
        console.error('❌ Error en pool PostgreSQL:', err);
        this.handlePoolError(err);
      });
      
      this.pool.on('remove', (client) => {
        console.log('🗑️ Conexión PostgreSQL removida del pool');
      });

      // Test de conexión inicial
      await this.testConnection();
      
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      console.log('🎉 DatabaseService inicializado correctamente');
      console.log(`📊 Pool configurado: min=${poolConfig.min}, max=${poolConfig.max}, host=${poolConfig.host}:${poolConfig.port}/${poolConfig.database}`);
      
    } catch (error) {
      console.error('❌ Error inicializando DatabaseService:', error);
      throw new Error(`No se pudo conectar a la base de datos: ${error.message}`);
    }
  }

  /**
   * Test de conexión a la base de datos
   * 
   * ¿Qué hace? Verifica que la conexión funcione ejecutando una query simple
   * ¿Por qué? Para detectar problemas de conectividad temprano
   * ¿Para qué? Evitar errores en runtime por problemas de BD
   */
  async testConnection() {
    console.log('🧪 Probando conexión a PostgreSQL...');
    
    try {
      const client = await this.pool.connect();
      
      // Query simple para probar conectividad
      const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
      const { current_time, pg_version } = result.rows[0];
      
      console.log('✅ Conexión PostgreSQL exitosa:');
      console.log(`   📅 Tiempo servidor: ${current_time}`);
      console.log(`   🐘 Versión PostgreSQL: ${pg_version.split(' ')[0]} ${pg_version.split(' ')[1]}`);
      
      // Verificar que existe la tabla companies
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'companies'
        ) as table_exists
      `);
      
      if (tableCheck.rows[0].table_exists) {
        console.log('✅ Tabla "companies" encontrada en la base de datos');
      } else {
        console.warn('⚠️ Tabla "companies" no encontrada - puede necesitarse migración');
      }
      
      client.release();
      
    } catch (error) {
      console.error('❌ Error en test de conexión:', error);
      throw error;
    }
  }

  /**
   * Ejecutar query SQL con manejo de errores robusto
   * 
   * ¿Qué hace? Método principal para ejecutar cualquier query SQL
   * ¿Por qué centralizado? Para logging uniforme y manejo de errores consistente
   * ¿Para qué? Un punto de entrada para todas las operaciones de BD
   */
  async query(text, params = []) {
    // Validar que el servicio esté inicializado
    if (!this.pool || !this.isConnected) {
      throw new Error('DatabaseService no está inicializado. Llama a initialize() primero.');
    }

    const start = Date.now();
    let client;
    
    try {
      // Log de la query (sin parámetros sensibles)
      console.log('🔍 Ejecutando query:', {
        sql: text.replace(/\s+/g, ' ').trim().substring(0, 100) + (text.length > 100 ? '...' : ''),
        paramCount: params.length,
        timestamp: new Date().toISOString()
      });
      
      // Obtener conexión del pool
      client = await this.pool.connect();
      
      // Ejecutar query
      const result = await client.query(text, params);
      
      const duration = Date.now() - start;
      
      // Log del resultado
      console.log('✅ Query ejecutada exitosamente:', {
        rowsAffected: result.rowCount,
        rowsReturned: result.rows?.length || 0,
        duration: `${duration}ms`,
        command: result.command
      });
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - start;
      
      // Log detallado del error
      console.error('❌ Error ejecutando query:', {
        error: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        position: error.position,
        duration: `${duration}ms`,
        sql: text.substring(0, 200),
        paramCount: params.length
      });
      
      // Re-lanzar con información adicional
      const enhancedError = new Error(`Database query failed: ${error.message}`);
      enhancedError.code = error.code;
      enhancedError.detail = error.detail;
      enhancedError.hint = error.hint;
      enhancedError.originalError = error;
      
      throw enhancedError;
      
    } finally {
      // Siempre liberar la conexión
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Ejecutar múltiples queries en una transacción
   * 
   * ¿Qué hace? Permite ejecutar varias queries como una unidad atómica
   * ¿Por qué? Para operaciones que requieren consistencia (todo o nada)
   * ¿Para qué? Operaciones complejas como crear empresa + usuario inicial
   */
  async transaction(callback) {
    if (!this.pool || !this.isConnected) {
      throw new Error('DatabaseService no está inicializado. Llama a initialize() primero.');
    }

    let client;
    
    try {
      console.log('🔄 Iniciando transacción...');
      
      client = await this.pool.connect();
      
      // Iniciar transacción
      await client.query('BEGIN');
      
      // Ejecutar callback con el cliente transaccional
      const result = await callback(client);
      
      // Commit si todo salió bien
      await client.query('COMMIT');
      
      console.log('✅ Transacción completada exitosamente');
      
      return result;
      
    } catch (error) {
      console.error('❌ Error en transacción, haciendo ROLLBACK:', error);
      
      // Rollback en caso de error
      if (client) {
        try {
          await client.query('ROLLBACK');
          console.log('🔄 ROLLBACK completado');
        } catch (rollbackError) {
          console.error('❌ Error haciendo ROLLBACK:', rollbackError);
        }
      }
      
      throw error;
      
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Obtener estadísticas del pool de conexiones
   * 
   * ¿Qué hace? Proporciona información sobre el estado del pool
   * ¿Por qué? Para monitoring y debugging de performance
   * ¿Para qué? Detectar problemas de conexiones y optimizar configuración
   */
  getPoolStats() {
    if (!this.pool) {
      return { error: 'Pool no inicializado' };
    }
    
    return {
      totalCount: this.pool.totalCount,      // Total conexiones creadas
      idleCount: this.pool.idleCount,        // Conexiones disponibles
      waitingCount: this.pool.waitingCount,  // Clientes esperando conexión
      isConnected: this.isConnected,
      maxConnections: this.pool.options.max,
      minConnections: this.pool.options.min
    };
  }

  /**
   * Método para cerrar graciosamente todas las conexiones
   * 
   * ¿Qué hace? Cierra el pool y todas las conexiones de forma ordenada
   * ¿Por qué? Para evitar conexiones colgadas al cerrar la aplicación
   * ¿Para qué? Shutdown limpio de la aplicación
   */
  async close() {
    if (this.pool) {
      console.log('🔌 Cerrando pool de conexiones PostgreSQL...');
      
      try {
        await this.pool.end();
        this.isConnected = false;
        console.log('✅ Pool PostgreSQL cerrado correctamente');
      } catch (error) {
        console.error('❌ Error cerrando pool PostgreSQL:', error);
      }
    }
  }

  /**
   * Manejar errores del pool de conexiones
   * 
   * ¿Qué hace? Gestiona errores de conectividad y reconexión automática
   * ¿Por qué? Para recuperarse de caídas temporales de BD
   * ¿Para qué? Mantener el servicio funcionando ante problemas de red
   */
  async handlePoolError(error) {
    console.error('🚨 Error en pool de conexiones:', error);
    
    this.isConnected = false;
    
    // Si es un error de conectividad, intentar reconectar
    if (error.code === 'ECONNREFUSED' || 
        error.code === 'ENOTFOUND' || 
        error.code === 'ETIMEDOUT') {
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff
        
        console.log(`🔄 Intentando reconectar en ${delay}ms (intento ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        
        setTimeout(async () => {
          try {
            await this.testConnection();
            this.isConnected = true;
            this.reconnectAttempts = 0;
            console.log('✅ Reconexión exitosa');
          } catch (reconnectError) {
            console.error('❌ Fallo en reconexión:', reconnectError);
          }
        }, delay);
      } else {
        console.error('💀 Máximo número de intentos de reconexión alcanzado');
      }
    }
  }

  /**
   * Ejecutar queries preparadas para mejor performance
   * 
   * ¿Qué hace? Usa prepared statements para queries frecuentes
   * ¿Por qué? Mejor performance y seguridad contra SQL injection
   * ¿Para qué? Operaciones repetitivas como buscar empresas por ID
   */
  async preparedQuery(name, text, params = []) {
    if (!this.pool || !this.isConnected) {
      throw new Error('DatabaseService no está inicializado. Llama a initialize() primero.');
    }

    let client;
    
    try {
      client = await this.pool.connect();
      
      // Usar prepared statement
      const result = await client.query({
        name: name,
        text: text,
        values: params
      });
      
      return result;
      
    } catch (error) {
      console.error(`❌ Error en prepared query "${name}":`, error);
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Health check específico para la base de datos
   * 
   * ¿Qué hace? Verifica que la BD esté respondiendo correctamente
   * ¿Por qué? Para endpoints de monitoreo y health checks
   * ¿Para qué? Detectar problemas de BD desde el exterior
   */
  async healthCheck() {
    try {
      const start = Date.now();
      
      // Query simple pero efectiva
      const result = await this.query('SELECT 1 as health_check');
      
      const responseTime = Date.now() - start;
      const stats = this.getPoolStats();
      
      return {
        status: 'healthy',
        responseTime: `${responseTime}ms`,
        pool: stats,
        timestamp: new Date().toISOString(),
        database: {
          connected: this.isConnected,
          host: get('database.host'),
          port: get('database.port'),
          database: get('database.name')
        }
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        pool: this.getPoolStats(),
        timestamp: new Date().toISOString(),
        database: {
          connected: false,
          host: get('database.host'),
          port: get('database.port'),
          database: get('database.name')
        }
      };
    }
  }
}

// Instancia singleton del servicio
let databaseServiceInstance = null;

/**
 * Obtener instancia singleton del DatabaseService
 * 
 * ¿Qué hace? Garantiza que solo haya una instancia del servicio en toda la app
 * ¿Por qué singleton? Un pool de conexiones debe ser único por aplicación
 * ¿Para qué? Evitar múltiples pools y problemas de recursos
 */
function getDatabaseService() {
  if (!databaseServiceInstance) {
    databaseServiceInstance = new DatabaseService();
  }
  
  return databaseServiceInstance;
}

module.exports = {
  DatabaseService,
  getDatabaseService
};
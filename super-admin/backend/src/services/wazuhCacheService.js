/**
 * SERVICIO DE CACHÉ INTELIGENTE PARA WAZUH API
 * 
 * Optimiza las llamadas a Wazuh API mediante:
 * - Caché en memoria con TTL diferenciado por tipo de datos
 * - Invalidación selectiva de caché
 * - Gestión automática de memoria
 * - Estadísticas de hit/miss ratio
 */

class WazuhCacheService {
  constructor() {
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      totalRequests: 0
    };
    
    // TTL diferenciado según frecuencia de cambio de datos
    this.TTL_CONFIG = {
      // Datos estáticos - cambian muy poco
      hardware: 24 * 60 * 60 * 1000,    // 24 horas
      os: 12 * 60 * 60 * 1000,          // 12 horas
      
      // Datos dinámicos - cambian moderadamente  
      packages: 6 * 60 * 60 * 1000,     // 6 horas
      network: 30 * 60 * 1000,          // 30 minutos
      netproto: 30 * 60 * 1000,         // 30 minutos
      netiface: 30 * 60 * 1000,         // 30 minutos
      
      // Datos volátiles - cambian frecuentemente
      agents: 2 * 60 * 1000,            // 2 minutos
      stats: 5 * 60 * 1000              // 5 minutos
    };
    
    // Limpiar caché expirado cada 10 minutos
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 10 * 60 * 1000);
    
    console.log('🗄️ WazuhCacheService iniciado con TTL configurado:', this.TTL_CONFIG);
  }
  
  /**
   * Generar clave de caché basada en endpoint y parámetros
   */
  generateCacheKey(endpoint, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {});
    
    return `${endpoint}::${JSON.stringify(sortedParams)}`;
  }
  
  /**
   * Determinar tipo de datos y TTL basado en el endpoint
   */
  getDataTypeFromEndpoint(endpoint) {
    if (endpoint.includes('/agents')) return 'agents';
    if (endpoint.includes('/hardware')) return 'hardware';
    if (endpoint.includes('/os')) return 'os';
    if (endpoint.includes('/packages')) return 'packages';
    if (endpoint.includes('/netiface')) return 'netiface';
    if (endpoint.includes('/netproto')) return 'netproto';
    if (endpoint.includes('/network')) return 'network';
    if (endpoint.includes('/stats')) return 'stats';
    
    // Default para endpoints no clasificados
    return 'network';
  }
  
  /**
   * Obtener datos del caché
   */
  get(endpoint, params = {}) {
    const cacheKey = this.generateCacheKey(endpoint, params);
    const cached = this.cache.get(cacheKey);
    
    this.stats.totalRequests++;
    
    if (!cached) {
      this.stats.misses++;
      return null;
    }
    
    // Verificar si el caché ha expirado
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(cacheKey);
      this.stats.misses++;
      return null;
    }
    
    this.stats.hits++;
    console.log(`📦 Cache HIT para ${endpoint} (TTL restante: ${Math.round((cached.expiresAt - Date.now()) / 1000)}s)`);
    return cached.data;
  }
  
  /**
   * Almacenar datos en caché
   */
  set(endpoint, params = {}, data) {
    const cacheKey = this.generateCacheKey(endpoint, params);
    const dataType = this.getDataTypeFromEndpoint(endpoint);
    const ttl = this.TTL_CONFIG[dataType];
    const expiresAt = Date.now() + ttl;
    
    this.cache.set(cacheKey, {
      data,
      expiresAt,
      dataType,
      createdAt: Date.now()
    });
    
    console.log(`💾 Cache SET para ${endpoint} (tipo: ${dataType}, TTL: ${Math.round(ttl/1000)}s)`);
  }
  
  /**
   * Invalidar caché por patrón de endpoint o agente específico
   */
  invalidate(pattern) {
    let deletedCount = 0;
    
    for (const [key, value] of this.cache.entries()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      console.log(`🗑️  Invalidadas ${deletedCount} entradas de caché para patrón: ${pattern}`);
    }
    
    return deletedCount;
  }
  
  /**
   * Invalidar caché por tipo de datos
   */
  invalidateByType(dataType) {
    let deletedCount = 0;
    
    for (const [key, value] of this.cache.entries()) {
      if (value.dataType === dataType) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      console.log(`🗑️  Invalidadas ${deletedCount} entradas de caché de tipo: ${dataType}`);
    }
    
    return deletedCount;
  }
  
  /**
   * Limpiar entradas expiradas
   */
  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, value] of this.cache.entries()) {
      if (now > value.expiresAt) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Limpieza automática: eliminadas ${cleanedCount} entradas expiradas`);
    }
  }
  
  /**
   * Obtener estadísticas del caché
   */
  getStats() {
    const hitRate = this.stats.totalRequests > 0 
      ? ((this.stats.hits / this.stats.totalRequests) * 100).toFixed(2)
      : 0;
    
    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      cacheSize: this.cache.size,
      memoryUsage: this.getMemoryUsage()
    };
  }
  
  /**
   * Estimación de uso de memoria del caché
   */
  getMemoryUsage() {
    let totalSize = 0;
    
    for (const [key, value] of this.cache.entries()) {
      totalSize += JSON.stringify(key).length;
      totalSize += JSON.stringify(value.data).length;
    }
    
    return {
      bytes: totalSize,
      kb: Math.round(totalSize / 1024),
      mb: Math.round(totalSize / (1024 * 1024))
    };
  }
  
  /**
   * Limpiar todo el caché
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, totalRequests: 0 };
    console.log(`🗑️  Caché completamente limpiado (${size} entradas eliminadas)`);
  }
  
  /**
   * Destructor - limpiar recursos
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
    console.log('🗄️ WazuhCacheService destruido');
  }
}

// Singleton - una instancia global del servicio de caché
const wazuhCacheService = new WazuhCacheService();

module.exports = wazuhCacheService;
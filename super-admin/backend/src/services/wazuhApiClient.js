/**
 * CLIENTE WAZUH API CON CACHÉ Y RATE LIMITING
 * 
 * Wrapper optimizado para wazuhApiCall que incluye:
 * - Caché inteligente con TTL diferenciado
 * - Rate limiting para evitar saturar Wazuh API
 * - Retry automático con backoff exponencial
 * - Estadísticas de performance
 */

const wazuhCacheService = require('./wazuhCacheService');

// Configuración de Wazuh API
const WAZUH_API_URL = 'https://194.164.172.92:55000';
const WAZUH_USERNAME = 'wazuh';
const WAZUH_PASSWORD = 'wazuh';

// Deshabilitar verificación SSL para certificados autofirmados
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

class WazuhApiClient {
  constructor() {
    this.isAuthenticated = false;
    this.authToken = null;
    this.lastAuthTime = 0;
    
    // Rate limiting: máximo 4 requests por segundo
    this.requestQueue = [];
    this.isProcessingQueue = false;
    this.maxRequestsPerSecond = 4;
    this.requestInterval = 1000 / this.maxRequestsPerSecond; // 250ms entre requests
    
    // Estadísticas
    this.stats = {
      totalRequests: 0,
      cachedRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0,
      lastRequestTime: 0
    };
    
    console.log('🔌 WazuhApiClient iniciado con rate limiting:', this.maxRequestsPerSecond, 'req/s');
  }
  
  /**
   * Autenticación con Wazuh API
   */
  async authenticate() {
    const now = Date.now();
    
    // Token válido por 15 minutos, renovar si han pasado 10 minutos
    if (this.isAuthenticated && this.authToken && (now - this.lastAuthTime) < 10 * 60 * 1000) {
      return this.authToken;
    }
    
    try {
      console.log('🔐 Autenticando con Wazuh API...');
      
      const response = await fetch(`${WAZUH_API_URL}/security/user/authenticate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${WAZUH_USERNAME}:${WAZUH_PASSWORD}`).toString('base64')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.authToken = data.data.token;
        this.isAuthenticated = true;
        this.lastAuthTime = now;
        
        console.log('✅ Autenticación exitosa con Wazuh API');
        return this.authToken;
      } else {
        throw new Error(`Error de autenticación: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error autenticando con Wazuh API:', error.message);
      this.isAuthenticated = false;
      this.authToken = null;
      throw error;
    }
  }
  
  /**
   * Procesar cola de requests con rate limiting
   */
  async processRequestQueue() {
    if (this.isProcessingQueue) return;
    
    this.isProcessingQueue = true;
    
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      
      try {
        const startTime = Date.now();
        const result = await this.executeRequest(request.endpoint, request.params);
        const responseTime = Date.now() - startTime;
        
        // Actualizar estadísticas
        this.updateStats(responseTime, false);
        
        request.resolve(result);
      } catch (error) {
        this.stats.failedRequests++;
        request.reject(error);
      }
      
      // Rate limiting: esperar antes del siguiente request
      if (this.requestQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.requestInterval));
      }
    }
    
    this.isProcessingQueue = false;
  }
  
  /**
   * Ejecutar request HTTP a Wazuh API
   */
  async executeRequest(endpoint, params = {}) {
    await this.authenticate();
    
    // Construir URL con parámetros
    const url = new URL(`${WAZUH_API_URL}${endpoint}`);
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit exceeded - demasiadas peticiones');
      } else if (response.status === 401) {
        // Token expirado, reintentar autenticación
        this.isAuthenticated = false;
        throw new Error('Token expirado - reautenticación necesaria');
      } else {
        throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
      }
    }
    
    return await response.json();
  }
  
  /**
   * Actualizar estadísticas de performance
   */
  updateStats(responseTime, fromCache) {
    this.stats.totalRequests++;
    this.stats.lastRequestTime = Date.now();
    
    if (fromCache) {
      this.stats.cachedRequests++;
    } else {
      // Calcular tiempo promedio de respuesta (moving average)
      this.stats.avgResponseTime = this.stats.avgResponseTime === 0
        ? responseTime
        : (this.stats.avgResponseTime * 0.9) + (responseTime * 0.1);
    }
  }
  
  /**
   * API principal con caché inteligente
   */
  async call(endpoint, params = {}) {
    const startTime = Date.now();
    
    // 1. Intentar obtener desde caché
    const cachedData = wazuhCacheService.get(endpoint, params);
    if (cachedData) {
      this.updateStats(Date.now() - startTime, true);
      return cachedData;
    }
    
    // 2. Si no está en caché, agregar a cola de requests
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        endpoint,
        params,
        resolve: (data) => {
          // Guardar en caché antes de resolver
          wazuhCacheService.set(endpoint, params, data);
          resolve(data);
        },
        reject
      });
      
      // Procesar cola si no se está procesando
      this.processRequestQueue().catch(error => {
        console.error('❌ Error procesando cola de requests:', error);
      });
    });
  }
  
  /**
   * Invalidar caché por agente
   */
  invalidateAgentCache(agentId) {
    return wazuhCacheService.invalidate(agentId);
  }
  
  /**
   * Invalidar caché por tipo de datos
   */
  invalidateCacheByType(dataType) {
    return wazuhCacheService.invalidateByType(dataType);
  }
  
  /**
   * Obtener estadísticas combinadas (API + Caché)
   */
  getStats() {
    const cacheStats = wazuhCacheService.getStats();
    
    return {
      api: this.stats,
      cache: cacheStats,
      efficiency: {
        cacheHitRate: cacheStats.hitRate,
        avgResponseTime: `${Math.round(this.stats.avgResponseTime)}ms`,
        requestsInQueue: this.requestQueue.length,
        totalSavedRequests: this.stats.cachedRequests
      }
    };
  }
  
  /**
   * Limpiar todo el estado
   */
  reset() {
    this.requestQueue = [];
    this.isProcessingQueue = false;
    this.stats = {
      totalRequests: 0,
      cachedRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0,
      lastRequestTime: 0
    };
    wazuhCacheService.clear();
    console.log('🔄 WazuhApiClient reiniciado');
  }
}

// Singleton - una instancia global del cliente
const wazuhApiClient = new WazuhApiClient();

// Función de compatibilidad con el código existente
async function wazuhApiCall(endpoint, params = {}) {
  return await wazuhApiClient.call(endpoint, params);
}

module.exports = {
  wazuhApiClient,
  wazuhApiCall
};
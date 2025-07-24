const express = require('express');
const { register, getWebMetricsService } = require('../services/metricsService');

// Función para obtener el Map de agentes activos (para evitar dependencias circulares)
const getActiveAgents = () => {
  try {
    const webTrafficModule = require('./web-traffic');
    return webTrafficModule.activeAgents || new Map();
  } catch (error) {
    console.warn('⚠️ No se pudo acceder al Map de agentes activos:', error.message);
    return new Map();
  }
};

const router = express.Router();

// Endpoint para métricas de Prometheus
router.get('/metrics', async (req, res) => {
  try {
    console.log('📊 Solicitando métricas de Prometheus...');
    
    // Establecer el content-type correcto para Prometheus
    res.set('Content-Type', register.contentType);
    
    // Devolver todas las métricas registradas
    const metrics = await register.metrics();
    res.end(metrics);
    
  } catch (error) {
    console.error('❌ Error obteniendo métricas:', error);
    res.status(500).end('Error interno del servidor');
  }
});

// Endpoint para métricas en formato JSON (para depuración)
router.get('/metrics/json', async (req, res) => {
  try {
    console.log('📊 Solicitando métricas en formato JSON...');
    
    const metrics = await register.getMetricsAsJSON();
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics: metrics
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo métricas JSON:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo métricas',
      details: error.message
    });
  }
});

// Endpoint público para recibir métricas de agentes (sin autenticación)
router.post('/agent-metrics', async (req, res) => {
  try {
    console.log('📊 Recibiendo métricas de agente (público)...');
    
    const metrics = req.body;
    
    // Validar datos básicos
    if (!metrics.agent_id) {
      return res.status(400).json({
        success: false,
        error: 'agent_id es requerido'
      });
    }

    console.log(`📈 Métricas de ${metrics.agent_id}:`);
    console.log(`   - Conexiones: ${metrics.total_connections || 0}`);
    console.log(`   - Dominios: ${metrics.total_domains || 0}`);
    console.log(`   - Navegadores: ${metrics.active_browsers || 0}`);
    
    if (metrics.top_domains && metrics.top_domains.length > 0) {
      console.log(`   - Top dominio: ${metrics.top_domains[0][0]} (${metrics.top_domains[0][1]} conexiones)`);
    }

    // NUEVO: Registrar/actualizar agente activo en el Map para el dashboard
    const activeAgents = getActiveAgents();
    activeAgents.set(metrics.agent_id, {
      agent_id: metrics.agent_id,
      hostname: metrics.hostname || metrics.agent_id,
      username: metrics.username || 'unknown',
      status: 'active',
      last_seen: new Date().toISOString(),
      last_metrics: metrics,
      os_info: metrics.os_info || { 
        system: 'Windows',
        release: 'Unknown'
      }
    });
    
    console.log(`✅ Agente ${metrics.agent_id} registrado en activeAgents`);

    // Procesar métricas para Prometheus
    const webService = getWebMetricsService();
    if (webService && webService.parser) {
      // Emitir evento para actualizar métricas Prometheus
      webService.parser.emit('webTrafficData', metrics);
      console.log('📊 Métricas enviadas al servicio Prometheus');
    } else {
      console.log('⚠️ Servicio de métricas web no disponible aún');
    }

    res.json({
      success: true,
      message: 'Métricas recibidas correctamente',
      timestamp: new Date().toISOString(),
      processed: {
        agent_id: metrics.agent_id,
        connections: metrics.total_connections || 0,
        domains: metrics.total_domains || 0
      }
    });

  } catch (error) {
    console.error('❌ Error procesando métricas:', error);
    res.status(500).json({
      success: false,
      error: 'Error procesando métricas',
      details: error.message
    });
  }
});

module.exports = router;
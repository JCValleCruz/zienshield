const express = require('express');
const { exec } = require('child_process');
const router = express.Router();

// Endpoint para sincronizar empresas con Wazuh
router.post('/companies-to-wazuh', async (req, res) => {
  try {
    console.log('🔄 Iniciando sincronización con Wazuh...');
    
    // Ejecutar el script de sincronización
    const scriptPath = '/home/gacel/zienshield/scripts/sync-simple.js';
    
    exec(`node ${scriptPath}`, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Error en sincronización:', error);
        return res.status(500).json({
          success: false,
          error: 'Error ejecutando sincronización',
          details: error.message
        });
      }
      
      if (stderr) {
        console.warn('⚠️  Warnings:', stderr);
      }
      
      console.log('✅ Sincronización completada:', stdout);
      
      res.json({
        success: true,
        message: 'Sincronización completada exitosamente',
        output: stdout,
        timestamp: new Date().toISOString()
      });
    });

  } catch (error) {
    console.error('❌ Error en endpoint de sincronización:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

// Endpoint para verificar estado de sincronización
router.get('/wazuh-groups', async (req, res) => {
  try {
    exec('sudo /var/ossec/bin/agent_groups -l', (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({
          success: false,
          error: 'Error obteniendo grupos de Wazuh',
          details: error.message
        });
      }
      
      res.json({
        success: true,
        groups: stdout,
        timestamp: new Date().toISOString()
      });
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

module.exports = router;

const pool = require('../../config/database');

/**
 * Utilitario para rastrear estados de conexión de dispositivos
 * Permite rastrear cuando los dispositivos cambian de desconectado -> activo
 * para mostrar tiempo real de conexión
 */

/**
 * Actualiza el estado de conexión de un dispositivo
 * @param {number} companyId - ID de la empresa
 * @param {string} wazuhAgentId - ID del agente de Wazuh
 * @param {string} agentName - Nombre del agente
 * @param {string} newStatus - Nuevo estado ('active', 'disconnected', 'pending')
 * @returns {Promise<Object>} Información del dispositivo actualizada
 */
async function updateDeviceConnectionStatus(companyId, wazuhAgentId, agentName, newStatus) {
  const client = await pool.connect();
  
  try {
    // Verificar estado actual en la base de datos
    const currentRecord = await client.query(`
      SELECT * FROM device_connection_tracking 
      WHERE company_id = $1 AND wazuh_agent_id = $2
    `, [companyId, wazuhAgentId]);
    
    const now = new Date();
    
    if (currentRecord.rows.length === 0) {
      // Primer registro de este dispositivo
      console.log(`📊 Registrando nuevo dispositivo: ${agentName} (${wazuhAgentId}) - Estado: ${newStatus}`);
      
      const connectionTime = newStatus === 'active' ? now : null;
      const disconnectionTime = newStatus === 'disconnected' ? now : null;
      
      await client.query(`
        INSERT INTO device_connection_tracking 
        (company_id, wazuh_agent_id, agent_name, current_status, last_connection_time, last_disconnection_time)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [companyId, wazuhAgentId, agentName, newStatus, connectionTime, disconnectionTime]);
      
      return {
        isNewDevice: true,
        statusChanged: true,
        connectionTime,
        disconnectionTime
      };
      
    } else {
      const current = currentRecord.rows[0];
      
      // Verificar si hubo cambio de estado
      if (current.current_status !== newStatus) {
        console.log(`🔄 Cambio de estado detectado: ${agentName} (${wazuhAgentId}) ${current.current_status} -> ${newStatus}`);
        
        let updateQuery = `
          UPDATE device_connection_tracking 
          SET previous_status = current_status, 
              current_status = $1, 
              status_changed_at = $2,
              agent_name = $3
        `;
        const params = [newStatus, now, agentName];
        
        // Actualizar timestamp específico según el cambio de estado
        if (newStatus === 'active' && (current.current_status === 'disconnected' || current.current_status === 'pending' || current.current_status === 'unknown')) {
          // Dispositivo se conectó
          updateQuery += ', last_connection_time = $4';
          params.push(now);
          console.log(`✅ Dispositivo conectado: ${agentName} - Tiempo de conexión: ${now.toISOString()}`);
        } else if (newStatus === 'disconnected' && current.current_status === 'active') {
          // Dispositivo se desconectó
          updateQuery += ', last_disconnection_time = $4';
          params.push(now);
          console.log(`❌ Dispositivo desconectado: ${agentName} - Tiempo de desconexión: ${now.toISOString()}`);
        }
        
        updateQuery += ' WHERE company_id = $' + (params.length + 1) + ' AND wazuh_agent_id = $' + (params.length + 2);
        params.push(companyId, wazuhAgentId);
        
        await client.query(updateQuery, params);
        
        return {
          isNewDevice: false,
          statusChanged: true,
          previousStatus: current.current_status,
          newStatus,
          connectionTime: newStatus === 'active' ? now : current.last_connection_time,
          disconnectionTime: newStatus === 'disconnected' ? now : current.last_disconnection_time
        };
        
      } else {
        // No hay cambio de estado, solo actualizar nombre si es necesario
        if (current.agent_name !== agentName) {
          await client.query(`
            UPDATE device_connection_tracking 
            SET agent_name = $1 
            WHERE company_id = $2 AND wazuh_agent_id = $3
          `, [agentName, companyId, wazuhAgentId]);
        }
        
        return {
          isNewDevice: false,
          statusChanged: false,
          connectionTime: current.last_connection_time,
          disconnectionTime: current.last_disconnection_time
        };
      }
    }
    
  } catch (error) {
    console.error(`❌ Error actualizando estado de conexión para ${wazuhAgentId}:`, error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Obtiene el tiempo real de conexión de un dispositivo activo
 * @param {number} companyId - ID de la empresa
 * @param {string} wazuhAgentId - ID del agente de Wazuh
 * @returns {Promise<string>} Texto formateado del tiempo de conexión
 */
async function getDeviceConnectionTime(companyId, wazuhAgentId) {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT current_status, last_connection_time, last_disconnection_time
      FROM device_connection_tracking 
      WHERE company_id = $1 AND wazuh_agent_id = $2
    `, [companyId, wazuhAgentId]);
    
    if (result.rows.length === 0) {
      return "Sin datos de conexión";
    }
    
    const record = result.rows[0];
    
    if (record.current_status === 'active' && record.last_connection_time) {
      const connectionTime = new Date(record.last_connection_time);
      const now = new Date();
      const diffMs = now - connectionTime;
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffMinutes < 60) {
        return `${diffMinutes} min conectado`;
      } else if (diffHours < 24) {
        return `${diffHours}h conectado`;
      } else {
        return `${diffDays} días conectado`;
      }
    } else if (record.current_status === 'disconnected' && record.last_disconnection_time) {
      const disconnectionTime = new Date(record.last_disconnection_time);
      const now = new Date();
      const diffMs = now - disconnectionTime;
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffMinutes < 60) {
        return `Hace ${diffMinutes} min`;
      } else if (diffHours < 24) {
        return `Hace ${diffHours}h`;
      } else {
        return `Hace ${diffDays} días`;
      }
    } else {
      return "Sin datos de conexión";
    }
    
  } catch (error) {
    console.error(`❌ Error obteniendo tiempo de conexión para ${wazuhAgentId}:`, error);
    return "Error obteniendo tiempo";
  } finally {
    client.release();
  }
}

module.exports = {
  updateDeviceConnectionStatus,
  getDeviceConnectionTime
};
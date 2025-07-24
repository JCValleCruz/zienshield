-- Script para agregar columnas de rastreo de conexión a la tabla agents
-- Ejecutar este script para habilitar el rastreo de tiempo de conexión real

-- Agregar columnas para rastrear estado de conexión
ALTER TABLE agents ADD COLUMN IF NOT EXISTS connection_state VARCHAR(20) DEFAULT 'unknown';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS last_connection_time TIMESTAMP;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS last_disconnection_time TIMESTAMP;

-- Agregar índices para performance
CREATE INDEX IF NOT EXISTS idx_agents_connection_state ON agents(connection_state);
CREATE INDEX IF NOT EXISTS idx_agents_last_connection ON agents(last_connection_time);

-- Actualizar registros existentes (marcar como unknown para que se actualice en próxima sincronización)
UPDATE agents SET connection_state = 'unknown' WHERE connection_state IS NULL;

-- Comentarios:
-- connection_state: 'active', 'disconnected', 'pending', 'unknown'
-- last_connection_time: timestamp cuando el dispositivo cambió de disconnected/pending a active
-- last_disconnection_time: timestamp cuando el dispositivo cambió de active a disconnected
// Windows Security API Routes for ZienShield
// Provides endpoints for Windows Firewall and Defender status

const express = require('express');
const WindowsSecurityService = require('../services/windowsSecurityService');

const router = express.Router();
const windowsSecurityService = new WindowsSecurityService();

// ========== WINDOWS AGENTS ==========

// GET /api/windows-security/agents
// Get all Windows agents for a tenant
router.get('/agents', async (req, res) => {
  try {
    const { tenant_id } = req.query;
    
    console.log(`🔍 API: Getting Windows agents for tenant: ${tenant_id || 'all'}`);
    
    const agents = await windowsSecurityService.getWindowsAgents(tenant_id);
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      tenant_id: tenant_id || null,
      total_agents: agents.length,
      agents: agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        ip: agent.ip,
        os: {
          name: agent.os?.name || 'Windows',
          version: agent.os?.version || 'Unknown',
          platform: agent.os?.platform || 'windows'
        },
        status: agent.status,
        last_keep_alive: agent.lastKeepAlive,
        groups: agent.group || [],
        version: agent.version
      }))
    });

  } catch (error) {
    console.error('❌ API Error getting Windows agents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Windows agents',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ========== WINDOWS FIREWALL ==========

// GET /api/windows-security/firewall/:agentId
// Get Windows Firewall status for specific agent
router.get('/firewall/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    
    console.log(`🔥 API: Getting Windows Firewall status for agent: ${agentId}`);
    
    const firewallStatus = await windowsSecurityService.getWindowsFirewallStatus(agentId);
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      agent_id: agentId,
      firewall: firewallStatus
    });

  } catch (error) {
    console.error(`❌ API Error getting firewall status for agent ${req.params.agentId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Windows Firewall status',
      details: error.message,
      agent_id: req.params.agentId,
      timestamp: new Date().toISOString()
    });
  }
});

// ========== WINDOWS DEFENDER ==========

// GET /api/windows-security/defender/:agentId
// Get Windows Defender status for specific agent
router.get('/defender/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    
    console.log(`🛡️ API: Getting Windows Defender status for agent: ${agentId}`);
    
    const defenderStatus = await windowsSecurityService.getWindowsDefenderStatus(agentId);
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      agent_id: agentId,
      defender: defenderStatus
    });

  } catch (error) {
    console.error(`❌ API Error getting Defender status for agent ${req.params.agentId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Windows Defender status',
      details: error.message,
      agent_id: req.params.agentId,
      timestamp: new Date().toISOString()
    });
  }
});

// ========== COMPLETE SECURITY STATUS ==========

// GET /api/windows-security/status/:agentId
// Get complete Windows security status (Firewall + Defender)
router.get('/status/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    
    console.log(`🔒 API: Getting complete Windows security status for agent: ${agentId}`);
    
    const securityStatus = await windowsSecurityService.getWindowsSecurityStatus(agentId);
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      security_status: securityStatus
    });

  } catch (error) {
    console.error(`❌ API Error getting security status for agent ${req.params.agentId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Windows security status',
      details: error.message,
      agent_id: req.params.agentId,
      timestamp: new Date().toISOString()
    });
  }
});

// ========== BULK OPERATIONS ==========

// POST /api/windows-security/bulk-status
// Get security status for multiple agents
router.post('/bulk-status', async (req, res) => {
  try {
    const { agent_ids, tenant_id } = req.body;
    
    if (!agent_ids || !Array.isArray(agent_ids) || agent_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'agent_ids array is required',
        timestamp: new Date().toISOString()
      });
    }

    console.log(`🔒 API: Getting bulk security status for ${agent_ids.length} agents`);
    
    const bulkResults = await windowsSecurityService.getMultipleAgentsSecurityStatus(agent_ids, tenant_id);
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      bulk_results: bulkResults
    });

  } catch (error) {
    console.error('❌ API Error getting bulk security status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get bulk security status',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ========== SUMMARY ENDPOINTS ==========

// GET /api/windows-security/summary
// Get security summary for all Windows agents in tenant
router.get('/summary', async (req, res) => {
  try {
    const { tenant_id } = req.query;
    
    console.log(`📊 API: Getting Windows security summary for tenant: ${tenant_id || 'all'}`);
    
    // Get all Windows agents
    const agents = await windowsSecurityService.getWindowsAgents(tenant_id);
    
    if (agents.length === 0) {
      return res.json({
        success: true,
        timestamp: new Date().toISOString(),
        tenant_id: tenant_id || null,
        summary: {
          total_agents: 0,
          firewall_status: { protected: 0, partial: 0, vulnerable: 0, unknown: 0 },
          defender_status: { protected: 0, threats_detected: 0, vulnerable: 0, unknown: 0 },
          overall_security: { excellent: 0, good: 0, moderate: 0, poor: 0, critical: 0 }
        },
        message: 'No Windows agents found'
      });
    }

    // Get security status for a sample of agents (limit to prevent timeout)
    const sampleSize = Math.min(agents.length, 10);
    const sampleAgents = agents.slice(0, sampleSize);
    const agentIds = sampleAgents.map(agent => agent.id);
    
    const bulkResults = await windowsSecurityService.getMultipleAgentsSecurityStatus(agentIds, tenant_id);
    const securityData = bulkResults.agents.filter(agent => !agent.error);
    
    // Calculate summary statistics
    const summary = {
      total_agents: agents.length,
      sampled_agents: sampleSize,
      firewall_status: {
        protected: 0,
        partial: 0,
        vulnerable: 0,
        unknown: 0
      },
      defender_status: {
        protected: 0,
        threats_detected: 0,
        vulnerable: 0,
        unknown: 0
      },
      overall_security: {
        excellent: 0,
        good: 0,
        moderate: 0,
        poor: 0,
        critical: 0
      }
    };

    securityData.forEach(agent => {
      // Firewall status
      if (agent.firewall) {
        const status = agent.firewall.overall_status;
        if (status === 'fully_protected') summary.firewall_status.protected++;
        else if (status === 'partially_protected') summary.firewall_status.partial++;
        else if (status === 'vulnerable') summary.firewall_status.vulnerable++;
        else summary.firewall_status.unknown++;
      }

      // Defender status
      if (agent.defender) {
        const status = agent.defender.overall_status;
        if (status === 'protected') summary.defender_status.protected++;
        else if (status === 'threats_detected') summary.defender_status.threats_detected++;
        else if (status === 'vulnerable') summary.defender_status.vulnerable++;
        else summary.defender_status.unknown++;
      }

      // Overall security level
      if (agent.security_level) {
        summary.overall_security[agent.security_level]++;
      }
    });

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      tenant_id: tenant_id || null,
      summary,
      sample_details: securityData.map(agent => ({
        agent_id: agent.agent_id,
        overall_security_score: agent.overall_security_score,
        security_level: agent.security_level,
        firewall_status: agent.firewall?.overall_status,
        defender_status: agent.defender?.overall_status,
        recommendations_count: agent.recommendations?.length || 0
      }))
    });

  } catch (error) {
    console.error('❌ API Error getting security summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get security summary',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ========== RECOMMENDATIONS ==========

// GET /api/windows-security/recommendations/:agentId
// Get security recommendations for specific agent
router.get('/recommendations/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    
    console.log(`💡 API: Getting security recommendations for agent: ${agentId}`);
    
    const securityStatus = await windowsSecurityService.getWindowsSecurityStatus(agentId);
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      agent_id: agentId,
      security_score: securityStatus.overall_security_score,
      security_level: securityStatus.security_level,
      recommendations: securityStatus.recommendations,
      summary: {
        total_recommendations: securityStatus.recommendations.length,
        critical: securityStatus.recommendations.filter(r => r.severity === 'critical').length,
        high: securityStatus.recommendations.filter(r => r.severity === 'high').length,
        medium: securityStatus.recommendations.filter(r => r.severity === 'medium').length,
        low: securityStatus.recommendations.filter(r => r.severity === 'low').length
      }
    });

  } catch (error) {
    console.error(`❌ API Error getting recommendations for agent ${req.params.agentId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to get security recommendations',
      details: error.message,
      agent_id: req.params.agentId,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/windows-security/health-check
// Health check endpoint
router.get('/health-check', async (req, res) => {
  try {
    // Test Wazuh connection
    const token = await windowsSecurityService.getAuthToken();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      service: 'Windows Security Service',
      status: 'healthy',
      wazuh_connection: 'active',
      features: [
        'Windows Agents Discovery',
        'Windows Firewall Status',
        'Windows Defender Status',
        'Security Recommendations',
        'Bulk Operations'
      ]
    });

  } catch (error) {
    console.error('❌ API Health check failed:', error);
    res.status(503).json({
      success: false,
      timestamp: new Date().toISOString(),
      service: 'Windows Security Service',
      status: 'unhealthy',
      error: error.message,
      wazuh_connection: 'failed'
    });
  }
});

module.exports = router;
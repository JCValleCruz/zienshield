// Windows Security Status Service for ZienShield
// Collects Windows Firewall and Windows Defender status from Wazuh endpoints

const axios = require('axios');

class WindowsSecurityService {
  constructor() {
    this.wazuhBaseURL = 'https://localhost:55000';
    this.wazuhUsername = 'wazuh';
    this.wazuhPassword = 'wazuh';
    this.token = null;
    this.tokenExpiry = null;
  }

  // ========== WAZUH AUTHENTICATION ==========

  async getAuthToken() {
    try {
      if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        return this.token;
      }

      console.log('🔐 Authenticating with Wazuh for Windows security data...');
      
      const response = await axios.post(`${this.wazuhBaseURL}/security/user/authenticate`, {}, {
        auth: {
          username: this.wazuhUsername,
          password: this.wazuhPassword
        },
        httpsAgent: new (require('https').Agent)({
          rejectUnauthorized: false
        })
      });

      if (response.data?.data?.token) {
        this.token = response.data.data.token;
        this.tokenExpiry = Date.now() + (15 * 60 * 1000); // 15 minutes
        console.log('✅ Wazuh authentication successful');
        return this.token;
      }

      throw new Error('Failed to obtain Wazuh token');
    } catch (error) {
      console.error('❌ Wazuh authentication failed:', error.message);
      throw error;
    }
  }

  async authenticatedRequest(method, endpoint, data = null) {
    try {
      const token = await this.getAuthToken();
      
      const config = {
        method,
        url: `${this.wazuhBaseURL}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        httpsAgent: new (require('https').Agent)({
          rejectUnauthorized: false
        })
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error(`❌ Wazuh API request failed ${endpoint}:`, error.message);
      throw error;
    }
  }

  // ========== WINDOWS AGENTS DISCOVERY ==========

  async getWindowsAgents(tenantId = null) {
    try {
      console.log('🔍 Discovering Windows agents...');
      
      const response = await this.authenticatedRequest('GET', '/agents?status=active');
      let agents = response.data?.affected_items || [];

      // Filter for Windows agents only
      agents = agents.filter(agent => {
        return agent.os?.platform === 'windows';
      });

      // Filter by tenant if provided
      if (tenantId) {
        const tenantGroup = `zs_${tenantId.replace(/-/g, '_')}`;
        agents = agents.filter(agent => {
          return agent.group?.includes(tenantGroup) || 
                 agent.group?.includes(tenantId) || 
                 agent.name?.includes(tenantId);
        });
      }

      console.log(`✅ Found ${agents.length} Windows agents`);
      return agents;
    } catch (error) {
      console.error('❌ Error discovering Windows agents:', error);
      return [];
    }
  }

  // ========== WINDOWS FIREWALL STATUS ==========

  async getWindowsFirewallStatus(agentId) {
    try {
      console.log(`🔥 Checking Windows Firewall status for agent ${agentId}...`);

      // Query Wazuh for Windows Firewall events
      const query = {
        query: {
          bool: {
            must: [
              { term: { "agent.id": agentId } },
              { terms: { "winlog.channel": ["Microsoft-Windows-Windows Firewall With Advanced Security/Firewall"] } },
              { range: { "@timestamp": { gte: "now-24h" } } }
            ]
          }
        },
        sort: [{ "@timestamp": { order: "desc" } }],
        size: 50
      };

      const response = await this.authenticatedRequest('POST', '/events/search', query);
      const events = response.data?.affected_items || [];

      // Parse firewall status from events
      const firewallStatus = this.parseFirewallEvents(events);
      
      // If no recent events, query syscollector for firewall info
      if (!firewallStatus.hasData) {
        const syscollectorData = await this.getFirewallSysCollectorData(agentId);
        return this.combineFirewallData(syscollectorData, firewallStatus);
      }

      return firewallStatus;
    } catch (error) {
      console.error(`❌ Error getting Windows Firewall status for agent ${agentId}:`, error);
      return this.getDefaultFirewallStatus();
    }
  }

  parseFirewallEvents(events) {
    const status = {
      hasData: events.length > 0,
      profiles: {
        domain: { enabled: null, status: 'unknown' },
        private: { enabled: null, status: 'unknown' },
        public: { enabled: null, status: 'unknown' }
      },
      rules: {
        total: 0,
        enabled: 0,
        disabled: 0,
        blocking: 0,
        allowing: 0
      },
      recent_events: [],
      last_updated: new Date().toISOString()
    };

    events.forEach(event => {
      try {
        const data = event.data || event;
        
        // Parse firewall profile status
        if (data.winlog?.event_data?.ProfileName) {
          const profileName = data.winlog.event_data.ProfileName.toLowerCase();
          const profileStatus = data.winlog.event_data.Enabled === 'true';
          
          if (status.profiles[profileName]) {
            status.profiles[profileName].enabled = profileStatus;
            status.profiles[profileName].status = profileStatus ? 'enabled' : 'disabled';
          }
        }

        // Parse firewall rule events
        if (data.winlog?.event_data?.RuleName) {
          status.rules.total++;
          
          if (data.winlog.event_data.Enabled === 'true') {
            status.rules.enabled++;
          } else {
            status.rules.disabled++;
          }

          if (data.winlog.event_data.Action === 'Block') {
            status.rules.blocking++;
          } else if (data.winlog.event_data.Action === 'Allow') {
            status.rules.allowing++;
          }
        }

        // Store recent events
        if (status.recent_events.length < 10) {
          status.recent_events.push({
            timestamp: data['@timestamp'] || data.timestamp,
            event_id: data.winlog?.event_id,
            profile: data.winlog?.event_data?.ProfileName,
            action: data.winlog?.event_data?.Action,
            rule_name: data.winlog?.event_data?.RuleName,
            direction: data.winlog?.event_data?.Direction
          });
        }

      } catch (parseError) {
        console.warn('⚠️ Error parsing firewall event:', parseError.message);
      }
    });

    return status;
  }

  async getFirewallSysCollectorData(agentId) {
    try {
      const response = await this.authenticatedRequest('GET', `/syscollector/${agentId}/ports`);
      const ports = response.data?.affected_items || [];

      // Analyze open ports to infer firewall status
      const analysis = {
        total_ports: ports.length,
        listening_ports: ports.filter(p => p.state === 'listening').length,
        tcp_ports: ports.filter(p => p.protocol === 'tcp').length,
        udp_ports: ports.filter(p => p.protocol === 'udp').length,
        suspicious_ports: ports.filter(p => this.isSuspiciousPort(p.local.port)).length
      };

      return {
        hasSystemData: true,
        port_analysis: analysis,
        open_ports: ports.slice(0, 20) // First 20 ports
      };
    } catch (error) {
      console.warn('⚠️ Could not get syscollector firewall data:', error.message);
      return { hasSystemData: false };
    }
  }

  isSuspiciousPort(port) {
    const suspiciousPorts = [1337, 31337, 12345, 54321, 6666, 6667, 9999];
    return suspiciousPorts.includes(parseInt(port));
  }

  combineFirewallData(syscollectorData, eventData) {
    return {
      ...eventData,
      system_data: syscollectorData,
      overall_status: this.determineOverallFirewallStatus(eventData, syscollectorData)
    };
  }

  determineOverallFirewallStatus(eventData, syscollectorData) {
    // Determine overall firewall health
    const enabledProfiles = Object.values(eventData.profiles).filter(p => p.enabled === true).length;
    
    if (enabledProfiles === 3) return 'fully_protected';
    if (enabledProfiles >= 1) return 'partially_protected';
    if (syscollectorData.hasSystemData && syscollectorData.port_analysis.suspicious_ports > 0) return 'vulnerable';
    
    return 'unknown';
  }

  getDefaultFirewallStatus() {
    return {
      hasData: false,
      profiles: {
        domain: { enabled: null, status: 'unknown' },
        private: { enabled: null, status: 'unknown' },
        public: { enabled: null, status: 'unknown' }
      },
      rules: {
        total: 0,
        enabled: 0,
        disabled: 0,
        blocking: 0,
        allowing: 0
      },
      recent_events: [],
      overall_status: 'unknown',
      last_updated: new Date().toISOString(),
      error: 'No firewall data available'
    };
  }

  // ========== WINDOWS DEFENDER STATUS ==========

  async getWindowsDefenderStatus(agentId) {
    try {
      console.log(`🛡️ Checking Windows Defender status for agent ${agentId}...`);

      // Query for Windows Defender events
      const query = {
        query: {
          bool: {
            must: [
              { term: { "agent.id": agentId } },
              { terms: { "winlog.provider_name": ["Microsoft-Windows-Windows Defender", "Windows Defender"] } },
              { range: { "@timestamp": { gte: "now-7d" } } }
            ]
          }
        },
        sort: [{ "@timestamp": { order: "desc" } }],
        size: 100
      };

      const response = await this.authenticatedRequest('POST', '/events/search', query);
      const events = response.data?.affected_items || [];

      // Parse Defender status from events
      const defenderStatus = this.parseDefenderEvents(events);
      
      // Get additional system information
      const systemInfo = await this.getDefenderSystemInfo(agentId);
      
      return this.combineDefenderData(defenderStatus, systemInfo);
    } catch (error) {
      console.error(`❌ Error getting Windows Defender status for agent ${agentId}:`, error);
      return this.getDefaultDefenderStatus();
    }
  }

  parseDefenderEvents(events) {
    const status = {
      hasData: events.length > 0,
      real_time_protection: { enabled: null, status: 'unknown' },
      cloud_protection: { enabled: null, status: 'unknown' },
      automatic_sample_submission: { enabled: null, status: 'unknown' },
      signature_version: null,
      last_scan: {
        type: null,
        start_time: null,
        end_time: null,
        result: null,
        threats_found: 0
      },
      threats: {
        total_detected: 0,
        quarantined: 0,
        removed: 0,
        allowed: 0,
        recent_threats: []
      },
      updates: {
        last_signature_update: null,
        last_engine_update: null,
        update_status: 'unknown'
      },
      recent_events: [],
      last_updated: new Date().toISOString()
    };

    events.forEach(event => {
      try {
        const data = event.data || event;
        const eventId = data.winlog?.event_id;
        const eventData = data.winlog?.event_data || {};

        // Real-time protection events
        if (eventId === '5001') {
          status.real_time_protection.enabled = true;
          status.real_time_protection.status = 'enabled';
        } else if (eventId === '5010') {
          status.real_time_protection.enabled = false;
          status.real_time_protection.status = 'disabled';
        }

        // Signature update events
        if (eventId === '2000' || eventId === '2001') {
          status.updates.last_signature_update = data['@timestamp'];
          status.signature_version = eventData['New Signature Version'] || eventData.SignatureVersion;
        }

        // Scan events
        if (eventId === '1000' || eventId === '1001') {
          status.last_scan.type = eventData['Scan Type'] || 'unknown';
          status.last_scan.start_time = eventData['Scan Start Time'] || data['@timestamp'];
          status.last_scan.result = eventId === '1000' ? 'completed' : 'started';
        }

        // Threat detection events
        if (eventId === '1116' || eventId === '1117') {
          status.threats.total_detected++;
          
          const threat = {
            name: eventData['Threat Name'] || eventData.ThreatName || 'Unknown',
            severity: eventData.SeverityName || 'Unknown',
            action: eventData.ActionName || 'Unknown',
            timestamp: data['@timestamp'],
            path: eventData.Path || eventData['Process Name'] || 'Unknown'
          };

          if (status.threats.recent_threats.length < 10) {
            status.threats.recent_threats.push(threat);
          }

          // Count actions
          const action = (eventData.ActionName || '').toLowerCase();
          if (action.includes('quarantine')) status.threats.quarantined++;
          else if (action.includes('remove') || action.includes('clean')) status.threats.removed++;
          else if (action.includes('allow')) status.threats.allowed++;
        }

        // Cloud protection events
        if (eventId === '5007') {
          const configValue = eventData['New Value'];
          if (configValue === '1') {
            status.cloud_protection.enabled = true;
            status.cloud_protection.status = 'enabled';
          } else if (configValue === '0') {
            status.cloud_protection.enabled = false;
            status.cloud_protection.status = 'disabled';
          }
        }

        // Store recent events
        if (status.recent_events.length < 15) {
          status.recent_events.push({
            timestamp: data['@timestamp'],
            event_id: eventId,
            level: data.winlog?.level,
            description: this.getDefenderEventDescription(eventId),
            data: eventData
          });
        }

      } catch (parseError) {
        console.warn('⚠️ Error parsing Defender event:', parseError.message);
      }
    });

    return status;
  }

  getDefenderEventDescription(eventId) {
    const descriptions = {
      '1000': 'Antimalware scan started',
      '1001': 'Antimalware scan finished',
      '1116': 'Antimalware detected malware',
      '1117': 'Antimalware took action on malware',
      '2000': 'Signature updated successfully',
      '2001': 'Signature update failed',
      '5001': 'Real-time protection enabled',
      '5010': 'Real-time protection disabled',
      '5007': 'Configuration changed'
    };
    return descriptions[eventId] || `Event ID ${eventId}`;
  }

  async getDefenderSystemInfo(agentId) {
    try {
      // Get system packages related to Windows Defender
      const response = await this.authenticatedRequest('GET', `/syscollector/${agentId}/packages?search=defender`);
      const packages = response.data?.affected_items || [];

      return {
        hasSystemData: true,
        installed_packages: packages.map(pkg => ({
          name: pkg.name,
          version: pkg.version,
          vendor: pkg.vendor,
          install_time: pkg.install_time
        })),
        package_count: packages.length
      };
    } catch (error) {
      console.warn('⚠️ Could not get Defender system info:', error.message);
      return { hasSystemData: false };
    }
  }

  combineDefenderData(eventData, systemInfo) {
    const overallStatus = this.determineOverallDefenderStatus(eventData);
    
    return {
      ...eventData,
      system_info: systemInfo,
      overall_status: overallStatus,
      health_score: this.calculateDefenderHealthScore(eventData)
    };
  }

  determineOverallDefenderStatus(eventData) {
    if (!eventData.hasData) return 'unknown';
    
    const rtpEnabled = eventData.real_time_protection.enabled;
    const hasRecentThreats = eventData.threats.total_detected > 0;
    const signaturesUpToDate = eventData.signature_version !== null;

    if (rtpEnabled && signaturesUpToDate && !hasRecentThreats) return 'protected';
    if (rtpEnabled && signaturesUpToDate && hasRecentThreats) return 'threats_detected';
    if (!rtpEnabled) return 'vulnerable';
    if (!signaturesUpToDate) return 'outdated';
    
    return 'partial_protection';
  }

  calculateDefenderHealthScore(eventData) {
    let score = 0;
    
    if (eventData.real_time_protection.enabled) score += 40;
    if (eventData.cloud_protection.enabled) score += 20;
    if (eventData.signature_version) score += 20;
    if (eventData.threats.total_detected === 0) score += 10;
    else if (eventData.threats.quarantined > eventData.threats.allowed) score += 5;
    if (eventData.last_scan.result === 'completed') score += 10;
    
    return Math.min(100, score);
  }

  getDefaultDefenderStatus() {
    return {
      hasData: false,
      real_time_protection: { enabled: null, status: 'unknown' },
      cloud_protection: { enabled: null, status: 'unknown' },
      automatic_sample_submission: { enabled: null, status: 'unknown' },
      signature_version: null,
      last_scan: {
        type: null,
        start_time: null,
        end_time: null,
        result: null,
        threats_found: 0
      },
      threats: {
        total_detected: 0,
        quarantined: 0,
        removed: 0,
        allowed: 0,
        recent_threats: []
      },
      updates: {
        last_signature_update: null,
        last_engine_update: null,
        update_status: 'unknown'
      },
      recent_events: [],
      overall_status: 'unknown',
      health_score: 0,
      last_updated: new Date().toISOString(),
      error: 'No Windows Defender data available'
    };
  }

  // ========== COMBINED SECURITY STATUS ==========

  async getWindowsSecurityStatus(agentId) {
    try {
      console.log(`🔒 Getting complete Windows security status for agent ${agentId}...`);

      const [firewallStatus, defenderStatus] = await Promise.all([
        this.getWindowsFirewallStatus(agentId),
        this.getWindowsDefenderStatus(agentId)
      ]);

      const overallSecurityScore = this.calculateOverallSecurityScore(firewallStatus, defenderStatus);
      const securityRecommendations = this.generateSecurityRecommendations(firewallStatus, defenderStatus);

      return {
        agent_id: agentId,
        timestamp: new Date().toISOString(),
        firewall: firewallStatus,
        defender: defenderStatus,
        overall_security_score: overallSecurityScore,
        security_level: this.determineSecurityLevel(overallSecurityScore),
        recommendations: securityRecommendations,
        summary: {
          firewall_enabled: this.getFirewallEnabledProfiles(firewallStatus),
          defender_enabled: defenderStatus.real_time_protection.enabled,
          recent_threats: defenderStatus.threats.total_detected,
          last_updated: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error(`❌ Error getting Windows security status for agent ${agentId}:`, error);
      throw error;
    }
  }

  calculateOverallSecurityScore(firewallStatus, defenderStatus) {
    let score = 0;
    
    // Firewall score (40 points max)
    const enabledProfiles = Object.values(firewallStatus.profiles).filter(p => p.enabled === true).length;
    score += (enabledProfiles / 3) * 40;
    
    // Defender score (60 points max)
    score += (defenderStatus.health_score || 0) * 0.6;
    
    return Math.round(score);
  }

  determineSecurityLevel(score) {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 50) return 'moderate';
    if (score >= 25) return 'poor';
    return 'critical';
  }

  getFirewallEnabledProfiles(firewallStatus) {
    return Object.entries(firewallStatus.profiles)
      .filter(([_, profile]) => profile.enabled === true)
      .map(([name, _]) => name);
  }

  generateSecurityRecommendations(firewallStatus, defenderStatus) {
    const recommendations = [];

    // Firewall recommendations
    Object.entries(firewallStatus.profiles).forEach(([profileName, profile]) => {
      if (profile.enabled === false) {
        recommendations.push({
          type: 'firewall',
          severity: 'high',
          title: `Enable ${profileName} firewall profile`,
          description: `The ${profileName} firewall profile is currently disabled, leaving the system vulnerable to network attacks.`,
          action: `Enable Windows Firewall for ${profileName} network profile`
        });
      }
    });

    // Defender recommendations
    if (defenderStatus.real_time_protection.enabled === false) {
      recommendations.push({
        type: 'defender',
        severity: 'critical',
        title: 'Enable Real-time Protection',
        description: 'Windows Defender real-time protection is disabled, leaving the system vulnerable to malware.',
        action: 'Enable Windows Defender Real-time Protection'
      });
    }

    if (defenderStatus.cloud_protection.enabled === false) {
      recommendations.push({
        type: 'defender',
        severity: 'medium',
        title: 'Enable Cloud Protection',
        description: 'Cloud-delivered protection provides faster threat detection and response.',
        action: 'Enable Windows Defender Cloud Protection'
      });
    }

    if (!defenderStatus.signature_version) {
      recommendations.push({
        type: 'defender',
        severity: 'high',
        title: 'Update Virus Definitions',
        description: 'Virus definitions appear to be outdated or missing.',
        action: 'Update Windows Defender virus definitions'
      });
    }

    if (defenderStatus.threats.recent_threats.length > 0) {
      recommendations.push({
        type: 'defender',
        severity: 'high',
        title: 'Review Recent Threats',
        description: `${defenderStatus.threats.recent_threats.length} threats were detected recently. Review and take appropriate action.`,
        action: 'Review Windows Defender threat history and ensure all threats are properly handled'
      });
    }

    return recommendations;
  }

  // ========== BULK OPERATIONS ==========

  async getMultipleAgentsSecurityStatus(agentIds, tenantId = null) {
    try {
      console.log(`🔒 Getting security status for ${agentIds.length} agents...`);
      
      const results = [];
      
      // Process agents in batches to avoid overwhelming Wazuh
      const batchSize = 3;
      for (let i = 0; i < agentIds.length; i += batchSize) {
        const batch = agentIds.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (agentId) => {
          try {
            return await this.getWindowsSecurityStatus(agentId);
          } catch (error) {
            console.error(`❌ Error getting security status for agent ${agentId}:`, error.message);
            return {
              agent_id: agentId,
              error: error.message,
              timestamp: new Date().toISOString()
            };
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Small delay between batches
        if (i + batchSize < agentIds.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      return {
        success: true,
        timestamp: new Date().toISOString(),
        total_agents: agentIds.length,
        successful: results.filter(r => !r.error).length,
        failed: results.filter(r => r.error).length,
        agents: results
      };
    } catch (error) {
      console.error('❌ Error in bulk security status operation:', error);
      throw error;
    }
  }
}

module.exports = WindowsSecurityService;
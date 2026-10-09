/**
 * matrix/mcp/mcp-fabric.js
 * MATRIX X1 — MCP Capability Protocol Fabric
 * 
 * Manages MCP server registrations, schemas, circuit breaking,
 * and failover fallback routing.
 */

class McpFabric {
  constructor() {
    this.servers = new Map();
    this.initDefaultServers();
  }

  initDefaultServers() {
    const serversList = [
      { name: 'playwright', category: 'BROWSER', tools: ['browser_navigate', 'browser_snapshot', 'browser_click'], latencyMs: 30 },
      { name: 'gemini-api_gemini-api-docs', category: 'DOCUMENTATION', tools: ['gemini_search_docs', 'gemini_get_doc'], latencyMs: 25 },
      { name: 'context7', category: 'CODEBASE_DOCS', tools: ['resolve-library-id', 'query-docs'], latencyMs: 40 },
      { name: 'cloudrun', category: 'DEPLOYMENT', tools: ['list_services', 'deploy_container_image'], latencyMs: 50 },
      { name: 'sequential-thinking', category: 'REASONING', tools: ['sequentialthinking'], latencyMs: 10 }
    ];

    for (const s of serversList) {
      this.servers.set(s.name, {
        ...s,
        status: 'HEALTHY',
        failureCount: 0,
        circuitOpen: false,
        lastChecked: new Date().toISOString()
      });
    }
  }

  recordToolExecution(serverName, success = true, latencyMs = 20) {
    if (!this.servers.has(serverName)) return;
    const s = this.servers.get(serverName);
    if (!success) {
      s.failureCount++;
      if (s.failureCount >= 3) {
        s.circuitOpen = true;
        s.status = 'CIRCUIT_TRIPPED';
      }
    } else {
      s.failureCount = 0;
      s.status = 'HEALTHY';
      s.circuitOpen = false;
    }
    s.latencyMs = Math.round((s.latencyMs * 0.7) + (latencyMs * 0.3));
  }

  getServer(name) {
    return this.servers.get(name);
  }

  getAllServers() {
    return Array.from(this.servers.values());
  }
}

const mcpFabric = new McpFabric();

module.exports = { McpFabric, mcpFabric };

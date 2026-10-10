/**
 * agi/tools/tool-registry.js
 * AGI 0.7 — Closed-World Tool Registry & Executor
 * 
 * Enforces parameter schema validation and security policies for all agent tool executions.
 */

const { mcpSecurityGateway } = require('../security/mcp-security');

class ToolRegistry {
  constructor(gateway = null) {
    this.gateway = gateway || mcpSecurityGateway;
    this.tools = new Map();
  }

  registerTool({ name, description, parameters, handler }) {
    if (!name || typeof handler !== 'function') {
      throw new Error('Tool registration requires a name and handler function');
    }

    this.tools.set(name, {
      name,
      description: description || '',
      parameters: parameters || {},
      handler
    });
  }

  async executeTool(name, args = {}, timeoutMs = 60000) {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`TOOL_NOT_FOUND: Tool '${name}' is not registered in closed-world registry`);
    }

    // 1. Validate parameters if schema exists
    if (tool.parameters.required) {
      for (const req of tool.parameters.required) {
        if (args[req] === undefined || args[req] === null) {
          throw new Error(`MISSING_PARAMETER: Required parameter '${req}' not provided for tool '${name}'`);
        }
      }
    }

    // 2. Validate path containment if path parameter exists
    if (args.path || args.filePath || args.targetPath) {
      const p = args.path || args.filePath || args.targetPath;
      this.gateway.validatePathContainment(p);
    }

    // 3. Execute with timeout
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`TOOL_TIMEOUT: Execution of '${name}' exceeded ${timeoutMs}ms`));
      }, timeoutMs);

      Promise.resolve()
        .then(() => tool.handler(args))
        .then(result => {
          clearTimeout(timer);
          const sanitizedResult = this.gateway.scrubSecrets(result);
          resolve({ success: true, tool: name, result: sanitizedResult });
        })
        .catch(err => {
          clearTimeout(timer);
          resolve({ success: false, tool: name, error: err.message });
        });
    });
  }

  listTools() {
    return Array.from(this.tools.values()).map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters
    }));
  }
}

module.exports = { ToolRegistry };

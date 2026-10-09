/**
 * agi/security/mcp-security.js
 * AGI 0.7 — OWASP MCP & Tool Security Gateway
 * 
 * Enforces path containment, shell sanitization, secret scrubbing, and resource boundaries.
 */

const path = require('path');

const SECRET_PATTERNS = [
  /AIza[0-9A-Za-z-_]{30,40}/g,                 // Google API Key
  /sk-[a-zA-Z0-9]{32,}/g,                      // OpenAI / Generic Secret
  /ghp_[a-zA-Z0-9]{36}/g,                      // GitHub PAT
  /ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9._-]{10,}/g,// JWT Token
  /-----BEGIN [A-Z ]+ PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+ PRIVATE KEY-----/g // Private key
];

class McpSecurityGateway {
  constructor(options = {}) {
    this.allowedRoots = (options.allowedRoots || [process.cwd()]).map(r => path.resolve(r));
    this.auditLog = [];
  }

  /**
   * Validate that candidate path does not escape allowed roots (OWASP MCP-01)
   */
  validatePathContainment(targetPath) {
    if (!targetPath || typeof targetPath !== 'string') {
      throw new Error('SECURITY_ERROR: Target path must be a non-empty string');
    }

    const resolved = path.resolve(targetPath);
    const isContained = this.allowedRoots.some(root => resolved.startsWith(root));

    if (!isContained) {
      this.logViolation('PATH_TRAVERSAL_ATTEMPT', { targetPath, resolved });
      throw new Error(`SECURITY_ERROR: Access denied. Path ${resolved} escapes allowed workspace boundaries.`);
    }

    return resolved;
  }

  /**
   * Check for shell injection characters in command arguments
   */
  sanitizeShellArguments(commandArgs = []) {
    const dangerousPatterns = /[;&|`$<>\r\n]/;
    for (const arg of commandArgs) {
      if (typeof arg === 'string' && dangerousPatterns.test(arg)) {
        this.logViolation('SHELL_METACHARACTER_INJECTION', { arg });
        throw new Error(`SECURITY_ERROR: Forbidden shell metacharacters detected in argument: ${arg}`);
      }
    }
    return true;
  }

  /**
   * Scrub secrets and tokens from text or json structures
   */
  scrubSecrets(input) {
    if (typeof input !== 'string') {
      try {
        input = JSON.stringify(input);
      } catch {
        return input;
      }
    }

    let scrubbed = input;
    for (const pat of SECRET_PATTERNS) {
      scrubbed = scrubbed.replace(pat, '[REDACTED_SECRET]');
    }
    return scrubbed;
  }

  logViolation(type, details) {
    const record = {
      timestamp: new Date().toISOString(),
      type,
      details,
      status: 'BLOCKED'
    };
    this.auditLog.push(record);
  }

  getAuditLog() {
    return [...this.auditLog];
  }
}

const mcpSecurityGateway = new McpSecurityGateway();

module.exports = { McpSecurityGateway, mcpSecurityGateway };

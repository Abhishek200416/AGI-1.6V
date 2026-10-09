/**
 * agi/security/mcp-security.js
 * AGI 0.7 — OWASP MCP & Tool Security Gateway (Hardened)
 * 
 * Enforces realpath canonical path containment (OWASP MCP-01), shell sanitization,
 * secret scrubbing, URL/SSRF boundary defense (OWASP MCP-07), and resource boundaries.
 */

const fs = require('fs');
const path = require('path');

const SECRET_PATTERNS = [
  /AIza[0-9A-Za-z-_]{30,40}/g,                  // Google API Key
  /sk-[a-zA-Z0-9]{32,}/g,                       // OpenAI / Generic Secret
  /ghp_[a-zA-Z0-9]{36}/g,                       // GitHub PAT
  /ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9._-]{10,}/g, // JWT Token
  /-----BEGIN [A-Z ]+ PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+ PRIVATE KEY-----/g // Private key
];

class McpSecurityGateway {
  constructor(options = {}) {
    const rawRoots = options.allowedRoots || [process.cwd()];
    this.allowedRoots = rawRoots.map(r => {
      const resolved = path.resolve(r);
      try {
        return fs.existsSync(resolved) ? fs.realpathSync(resolved) : resolved;
      } catch {
        return resolved;
      }
    });
    this.auditLog = [];
  }

  /**
   * Validate that candidate path does not escape allowed roots via symlinks or traversal (OWASP MCP-01)
   */
  validatePathContainment(targetPath) {
    if (!targetPath || typeof targetPath !== 'string') {
      throw new Error('SECURITY_ERROR: Target path must be a non-empty string');
    }

    // Reject null byte injection
    if (targetPath.indexOf('\0') !== -1) {
      this.logViolation('NULL_BYTE_INJECTION', { targetPath });
      throw new Error('SECURITY_ERROR: Null byte detected in path');
    }

    const resolved = path.resolve(targetPath);

    // Resolve real canonical filesystem path if target exists, or closest existing ancestor
    let canonical = resolved;
    let curr = resolved;
    const trailingParts = [];
    while (!fs.existsSync(curr) && curr !== path.dirname(curr)) {
      trailingParts.unshift(path.basename(curr));
      curr = path.dirname(curr);
    }
    if (fs.existsSync(curr)) {
      try {
        const realCurr = fs.realpathSync(curr);
        canonical = trailingParts.length > 0 ? path.join(realCurr, ...trailingParts) : realCurr;
      } catch {
        canonical = resolved;
      }
    }

    // Normalize slashes for comparison
    const normCanonical = path.normalize(canonical).toLowerCase();
    const isContained = this.allowedRoots.some(root => {
      const normRoot = path.normalize(root).toLowerCase();
      return normCanonical === normRoot || normCanonical.startsWith(normRoot + path.sep.toLowerCase());
    });

    if (!isContained) {
      this.logViolation('PATH_TRAVERSAL_ATTEMPT', { targetPath, canonical, resolved });
      throw new Error(`SECURITY_ERROR: Access denied. Path ${canonical} escapes allowed workspace boundaries.`);
    }

    return canonical;
  }

  /**
   * Validate target URLs against SSRF, internal hostnames, and private IP spaces (OWASP MCP-07)
   */
  validateTargetUrl(targetUrl) {
    if (!targetUrl || typeof targetUrl !== 'string') {
      throw new Error('SECURITY_ERROR: URL must be a non-empty string');
    }
    let parsed;
    try {
      parsed = new URL(targetUrl);
    } catch {
      throw new Error(`SECURITY_ERROR: Malformed URL: ${targetUrl}`);
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      this.logViolation('INVALID_PROTOCOL', { targetUrl, protocol: parsed.protocol });
      throw new Error(`SECURITY_ERROR: Forbidden protocol: ${parsed.protocol}`);
    }

    const host = parsed.hostname.toLowerCase();
    const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '169.254.169.254', 'metadata.google.internal'];
    if (blockedHosts.includes(host)) {
      this.logViolation('SSRF_ATTEMPT', { targetUrl, host });
      throw new Error(`SECURITY_ERROR: Forbidden destination host: ${host}`);
    }

    // Block private RFC 1918 subnets
    if (/^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)) {
      this.logViolation('SSRF_PRIVATE_IP', { targetUrl, host });
      throw new Error(`SECURITY_ERROR: Access to private RFC 1918 IP space is blocked: ${host}`);
    }

    return true;
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

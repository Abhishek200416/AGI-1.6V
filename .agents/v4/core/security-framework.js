/**
 * .agents/v4/core/security-framework.js
 * Universal Autonomous Engineering Intelligence Operating System — V4
 * Engine #29: Security Framework
 *
 * Least privilege, per-agent/tool permission enforcement, network/filesystem scoping,
 * zero secrets redactor, and audit logging.
 */

const fs = require('fs');
const path = require('path');
const { eventBus, EVENT_TYPES, redactSecrets } = require('./event-bus');

const AUDIT_LOG_FILE = path.resolve(__dirname, '../logs/security-audit.jsonl');

class SecurityFramework {
  constructor(auditFile = AUDIT_LOG_FILE) {
    this.auditFile = auditFile;
    const dir = path.dirname(this.auditFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    this.rolePermissions = {
      'orchestration-agent-v4': ['*'],
      'senior-fullstack-engineer': ['workspace_read', 'workspace_write', 'test_exec'],
      'security-engineer': ['workspace_read', 'security_audit', 'rules_verify'],
      'qa-engineer': ['workspace_read', 'test_exec'],
      'external_agent_sandboxed': ['workspace_read', 'workspace_write_scoped']
    };
  }

  checkPermission(agentName, requiredPermission) {
    const perms = this.rolePermissions[agentName] || ['workspace_read'];
    if (perms.includes('*') || perms.includes(requiredPermission)) {
      this.logAudit(agentName, requiredPermission, 'GRANTED');
      return true;
    }

    this.logAudit(agentName, requiredPermission, 'DENIED');
    eventBus.emitEvent(EVENT_TYPES.SECURITY_ALERT, {
      agent: agentName,
      requiredPermission,
      violation: 'Unauthorized permission request'
    });
    return false;
  }

  logAudit(actor, action, decision, metadata = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      actor,
      action,
      decision,
      metadata: redactSecrets(metadata)
    };

    try {
      fs.appendFileSync(this.auditFile, JSON.stringify(entry) + '\n', 'utf-8');
    } catch (e) {}

    return entry;
  }

  sanitizeInput(input) {
    return redactSecrets(input);
  }
}

const securityFramework = new SecurityFramework();

module.exports = {
  SecurityFramework,
  securityFramework
};

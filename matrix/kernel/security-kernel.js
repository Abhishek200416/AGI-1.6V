/**
 * matrix/kernel/security-kernel.js
 * MATRIX X1 — Security & Authorization Kernel
 * 
 * Formalizes:
 * - CONTROL PLANE vs EXECUTION PLANE authority separation (Section 4)
 * - THREE OPERATING WORLDS: SIMULATION, SANDBOX, REAL (Section 5)
 * - PROMPT-INJECTION DEFENSE: wraps external data as UNTRUSTED_EXTERNAL_DATA (Section 14)
 * - ZERO SECRETS SCRUBBING
 * - MANDATORY HUMAN APPROVAL FIREWALL for high-impact actions
 */

const OPERATING_WORLDS = {
  SIMULATION: 'SIMULATION',
  SANDBOX: 'SANDBOX',
  REAL: 'REAL'
};

const PLANES = {
  CONTROL: 'CONTROL_PLANE',
  EXECUTION: 'EXECUTION_PLANE'
};

class SecurityKernel {
  constructor() {
    this.auditLog = [];
    this.secretPatterns = [
      /(?:api[_-]?key|secret|token|password|auth)['"]?\s*[:=]\s*['"]?([A-Za-z0-9_\-]{16,})['"]?/gi,
      /AIza[0-9A-Za-z\-_]{35}/g, // Google API keys
      /sk-[a-zA-Z0-9]{32,}/g     // OpenAI format keys
    ];
    this.highImpactTypes = new Set([
      'REAL_MONEY_TRADE',
      'DESTRUCTIVE_FILESYSTEM_DELETE',
      'DROP_DATABASE',
      'CREDENTIAL_EXPORT',
      'PUBLIC_NETWORK_DEPLOY',
      'MODIFY_SECURITY_KERNEL'
    ]);
    this.injectionPatterns = [
      /ignore\s+(?:all\s+)?(?:previous|prior)\s+instructions/i,
      /send\s+(?:your\s+)?credentials/i,
      /download\s+(?:this\s+)?secret/i,
      /reveal\s+(?:system\s+)?prompt/i,
      /change\s+security\s+settings/i,
      /bypass\s+(?:all\s+)?safety/i,
      /disregard\s+(?:system\s+)?guardrails/i
    ];
  }

  /**
   * Scrub secrets from any text string or JSON object
   */
  scrubSecrets(input) {
    if (typeof input !== 'string') {
      try {
        const str = JSON.stringify(input);
        return JSON.parse(this.scrubSecrets(str));
      } catch (e) {
        return input;
      }
    }

    let scrubbed = input;
    for (const pattern of this.secretPatterns) {
      scrubbed = scrubbed.replace(pattern, '[REDACTED_API_KEY]');
    }
    return scrubbed;
  }

  /**
   * Detect potential prompt injections in untrusted external data (Section 14)
   */
  inspectUntrustedContent(content, source = 'EXTERNAL') {
    const text = typeof content === 'string' ? content : JSON.stringify(content);
    const flags = [];

    for (const pattern of this.injectionPatterns) {
      if (pattern.test(text)) {
        flags.push(`Suspicious pattern matched: ${pattern.source}`);
      }
    }

    const isSuspicious = flags.length > 0;
    if (isSuspicious) {
      this.auditLog.push({
        event: 'PROMPT_INJECTION_FLAGGED',
        source,
        flags,
        timestamp: new Date().toISOString()
      });
    }

    return {
      type: 'UNTRUSTED_EXTERNAL_DATA',
      source,
      sanitized: true,
      suspicious: isSuspicious,
      flags,
      rawContent: this.scrubSecrets(content)
    };
  }

  /**
   * Create an explicit Execution Context enforcing environment isolation (Section 5)
   */
  createExecutionContext({
    environmentId = `ENV-${Date.now().toString(36)}`,
    environmentType = OPERATING_WORLDS.SANDBOX,
    authorizationScope = 'MISSION_SCOPED',
    riskClass = 'LOW',
    verificationPolicy = 'STRICT_ASSERTION'
  }) {
    if (!Object.values(OPERATING_WORLDS).includes(environmentType)) {
      throw new Error(`Invalid environmentType: ${environmentType}. Must be SIMULATION, SANDBOX, or REAL.`);
    }

    return {
      environment_id: environmentId,
      environment_type: environmentType,
      authorization_scope: authorizationScope,
      risk_class: riskClass,
      verification_policy: verificationPolicy,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Verify Control Plane vs Execution Plane boundary (Section 4)
   */
  validatePlaneAuthority(plane, action) {
    if (plane === PLANES.EXECUTION && this.highImpactTypes.has(action)) {
      return {
        authorized: false,
        reason: `Execution plane cannot independently authorize high-impact control action '${action}'. Control plane authority required.`
      };
    }
    return { authorized: true };
  }

  /**
   * Check whether an action requires mandatory human approval firewall gate
   */
  checkAuthorization({ actionType, targetResource, commanderAuthorized = false, environmentType = OPERATING_WORLDS.SANDBOX }) {
    // In SIMULATION or safe SANDBOX, non-financial operations have relaxed gates
    const isHighImpact = this.highImpactTypes.has(actionType) || (environmentType === OPERATING_WORLDS.REAL && actionType === 'REAL_MONEY_TRADE');
    
    if (isHighImpact && !commanderAuthorized) {
      const ticket = {
        blocked: true,
        actionType,
        targetResource,
        environmentType,
        reason: 'HIGH_IMPACT_ACTION_REQUIRES_EXPLICIT_COMMANDER_APPROVAL',
        timestamp: new Date().toISOString()
      };
      this.auditLog.push(ticket);
      return ticket;
    }

    const approval = {
      allowed: true,
      actionType,
      targetResource,
      environmentType,
      timestamp: new Date().toISOString()
    };
    this.auditLog.push(approval);
    return approval;
  }

  getAuditLog() {
    return this.auditLog;
  }
}

const securityKernel = new SecurityKernel();

module.exports = { SecurityKernel, securityKernel, OPERATING_WORLDS, PLANES };

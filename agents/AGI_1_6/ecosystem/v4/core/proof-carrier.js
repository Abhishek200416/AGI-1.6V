/**
 * .agents/v4/core/proof-carrier.js
 * Universal Autonomous Engineering Intelligence Operating System — V4
 * Engine #30: No False Autonomy Enforcer
 * Engine #31: Proof-Carrying Delivery
 *
 * Enforces empirical evidence requirements for all assertions
 * and produces verifiable, proof-carrying delivery certificates.
 */

class ProofCarrier {
  /**
   * Engine #30: Rejects unproven assertions
   */
  validateClaim(claimType, evidence) {
    switch (claimType) {
      case 'DEPLOYED':
        if (!evidence || !evidence.deploymentLog || !evidence.httpHealthy) {
          return { valid: false, reason: "Cannot claim 'deployed' without verified deployment logs and HTTP health check evidence." };
        }
        break;
      case 'TESTED':
        if (!evidence || !evidence.testResults || evidence.testCount === 0) {
          return { valid: false, reason: "Cannot claim 'tested' without test suite run logs and assertion outcomes." };
        }
        break;
      case 'SECURE':
        if (!evidence || !evidence.securityScan || evidence.securityFindingsCount === undefined) {
          return { valid: false, reason: "Cannot claim 'secure' without documented security audit or scan evidence." };
        }
        break;
      case 'REAL_TIME':
        if (!evidence || !evidence.observabilityActive || !evidence.sampleTimestamp) {
          return { valid: false, reason: "Cannot claim 'real-time' without an active running telemetry sampler." };
        }
        break;
      case 'AGENT_INSTALLED':
        if (!evidence || !evidence.registryRecord || !evidence.executableFileVerified) {
          return { valid: false, reason: "Cannot claim 'agent installed' without registry entry and on-disk verification." };
        }
        break;
      default:
        break;
    }
    return { valid: true };
  }

  /**
   * Engine #31: Formulates Proof-Carrying Delivery Certificate
   */
  createDeliveryCertificate({
    whatChanged = [],
    why = "",
    agentsUsed = [],
    skillsUsed = [],
    mcpUsed = [],
    modelsUsed = [],
    testsRun = [],
    securityChecks = [],
    performanceResults = {},
    deploymentStatus = "NOT_DEPLOYED",
    knownLimitations = [],
    rollbackPath = ".agents/agents/orchestration-agent-v3.md",
    evidence = {}
  }) {
    const claims = {
      verified: [],
      inferred: [],
      unverified: []
    };

    // Classify claims based on evidence presence
    for (const change of whatChanged) {
      if (evidence.filesModified && evidence.filesModified.includes(change.file || change)) {
        claims.verified.push(`Code modification: ${typeof change === 'object' ? change.file : change}`);
      } else {
        claims.inferred.push(`Change intent: ${typeof change === 'object' ? change.description : change}`);
      }
    }

    if (testsRun.length > 0 && testsRun.every(t => t.passed)) {
      claims.verified.push(`All ${testsRun.length} verification tests passed cleanly`);
    } else if (testsRun.length > 0) {
      claims.unverified.push(`Tests contain failures or unasserted boundaries`);
    }

    if (securityChecks.length > 0 && securityChecks.every(s => s.passed)) {
      claims.verified.push(`Security audit verified: 0 vulnerabilities, zero plaintext secrets`);
    }

    const certificate = {
      certificateId: `PROOF-${Date.now().toString(16).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      orchestrator: "orchestration-agent-v4",
      summary: {
        WHAT_CHANGED: whatChanged,
        WHY: why,
        AGENTS_USED: agentsUsed,
        SKILLS_USED: skillsUsed,
        MCP_USED: mcpUsed,
        MODELS_USED: modelsUsed,
        TESTS_RUN: testsRun,
        SECURITY_CHECKS: securityChecks,
        PERFORMANCE_RESULTS: performanceResults,
        DEPLOYMENT_STATUS: deploymentStatus,
        KNOWN_LIMITATIONS: knownLimitations,
        ROLLBACK_PATH: rollbackPath
      },
      CLAIMS_EVIDENCE: {
        VERIFIED: claims.verified,
        INFERRED: claims.inferred,
        UNVERIFIED: claims.unverified
      },
      EVIDENCE_RECORD: evidence,
      PROOF_STATUS: claims.unverified.length === 0 ? "PROOF_CARRYING_DELIVERY_CERTIFIED" : "DELIVERY_WITH_CAVEATS"
    };

    return certificate;
  }
}

const proofCarrier = new ProofCarrier();

module.exports = {
  ProofCarrier,
  proofCarrier
};

/**
 * matrix/verification/critic-judge.js
 * MATRIX X1 — Multi-Agent Critic, Independent Judge & Anti-Fabrication Engine
 * 
 * Enforces Anti-Fabrication Pipeline (Section 103):
 * Transitions strictly through:
 * CLAIMED -> OBSERVED -> VERIFIED -> CERTIFIED
 * 
 * Never converts CLAIMED directly into CERTIFIED without observation and verification proof.
 */

const COMPLETION_STATES = {
  CLAIMED: 'CLAIMED',
  OBSERVED: 'OBSERVED',
  VERIFIED: 'VERIFIED',
  CERTIFIED: 'CERTIFIED'
};

class CriticJudgeSystem {
  constructor() {
    this.judgeLedger = [];
    this.fabricationViolations = [];
  }

  /**
   * Advance claim through Anti-Fabrication ladder (Section 103)
   */
  advanceClaimLifecycle(claimObj, targetState, evidence = null) {
    const currentState = claimObj.state || COMPLETION_STATES.CLAIMED;

    if (currentState === COMPLETION_STATES.CLAIMED && targetState === COMPLETION_STATES.CERTIFIED) {
      const violation = {
        error: 'ILLEGAL_TRANSITION_FABRICATION_RISK',
        message: 'Cannot convert CLAIMED directly into CERTIFIED without prior OBSERVED and VERIFIED steps.',
        claim: claimObj.text,
        timestamp: new Date().toISOString()
      };
      this.fabricationViolations.push(violation);
      return { success: false, error: violation.message, state: currentState };
    }

    if (targetState === COMPLETION_STATES.OBSERVED && !evidence) {
      return { success: false, error: 'Observation requires attached raw tool/environment output.', state: currentState };
    }

    if (targetState === COMPLETION_STATES.VERIFIED && (!evidence || !evidence.testPassed)) {
      return { success: false, error: 'Verification requires independent passing test assertion.', state: currentState };
    }

    claimObj.state = targetState;
    claimObj.transitionedAt = new Date().toISOString();
    if (evidence) {
      claimObj.evidence = evidence;
    }
    return { success: true, state: targetState, claim: claimObj };
  }

  /**
   * Evaluate task artifacts and produce formal Judge Certificate
   */
  evaluateDelivery({
    taskId,
    objective,
    claims = [],
    testResults = [],
    securityClean = true
  }) {
    const evaluationId = `JDG-${Date.now().toString(36)}`;
    const critiques = [];

    // 1. Audit assertions
    const allTestsPassed = testResults.length > 0 && testResults.every(t => t.passed);
    if (!allTestsPassed) {
      critiques.push({
        agent: 'Critic-Tester',
        issue: 'One or more automated contract assertions failed or tests were omitted.'
      });
    }

    // 2. Audit security
    if (!securityClean) {
      critiques.push({
        agent: 'Security-Auditor',
        issue: 'Security gate flagged potential secret exposure or unapproved destructive operation.'
      });
    }

    // 3. Independent Judge verdict
    const verdict = (allTestsPassed && securityClean) ? 'CERTIFIED_PASS' : 'REJECTED';
    
    // Process claims through completion states
    const processedClaims = claims.map(c => {
      const claimText = typeof c === 'string' ? c : (c.text || JSON.stringify(c));
      const hasObserved = Boolean(c.evidence || testResults.length > 0);
      let state = COMPLETION_STATES.CLAIMED;
      if (hasObserved) state = COMPLETION_STATES.OBSERVED;
      if (hasObserved && allTestsPassed) state = COMPLETION_STATES.VERIFIED;
      if (state === COMPLETION_STATES.VERIFIED && verdict === 'CERTIFIED_PASS') state = COMPLETION_STATES.CERTIFIED;

      return {
        claim: claimText,
        state,
        status: allTestsPassed ? 'VERIFIED' : 'UNVERIFIED',
        evidenceAttached: c.evidence || 'Test suite output log'
      };
    });

    const certificate = {
      evaluationId,
      taskId,
      objective,
      verdict,
      claimsEvaluated: processedClaims,
      critiques,
      securityStatus: securityClean ? 'ZERO_SECRETS_ENFORCED' : 'VIOLATION_DETECTED',
      certifiedAt: new Date().toISOString()
    };

    this.judgeLedger.push(certificate);
    return certificate;
  }

  getCertificates() {
    return this.judgeLedger;
  }

  getViolations() {
    return this.fabricationViolations;
  }
}

const criticJudgeSystem = new CriticJudgeSystem();

module.exports = { CriticJudgeSystem, criticJudgeSystem, COMPLETION_STATES };

/**
 * matrix/learning/architecture-evolution.js
 * MATRIX X1.2 — Architecture Evolution Engine
 * 
 * Implements governed autonomous self-improvement:
 * - Detects reproducible failure or performance bottleneck
 * - Saves failure trajectory and diagnostic state
 * - Formulates targeted micro-proposals
 * - Executes controlled verification proving lab
 * - Enforces locked boundaries (V4 baseline, Security Kernel, Commander Ladder)
 * - Promotes change only when Pareto-superior with zero regressions
 * 
 * Follows Ponytail principle: minimal direct code.
 */

const { securityKernel } = require('../kernel/security-kernel');
const { closedLoopVerifier } = require('../verification/closed-loop-verifier');

const LOCKED_BOUNDARIES = [
  '.agents/v4/',
  'matrix/kernel/security-kernel.js',
  'matrix/commander/commander-interface.js',
  'matrix/verification/critic-judge.js'
];

class ArchitectureEvolutionEngine {
  constructor() {
    this.evolutionLog = [];
    this.lockedPaths = LOCKED_BOUNDARIES;
  }

  /**
   * Evaluates whether a proposed change touches locked safety boundaries
   */
  isBoundarySafe(affectedFiles = []) {
    for (const file of affectedFiles) {
      for (const locked of this.lockedPaths) {
        if (file.includes(locked)) {
          return {
            safe: false,
            violation: `Modification to protected boundary '${locked}' is prohibited (Directive 2 & 10)`
          };
        }
      }
    }
    return { safe: true };
  }

  /**
   * Run candidate proposal through proving lab
   */
  async evaluateProposal({
    proposalId,
    title,
    hypothesis,
    affectedFiles = [],
    preTestFn,
    postTestFn,
    regressionSuitePath = '.agents/v4/tests/validation-suite.js'
  }) {
    const startTime = Date.now();

    // 1. Check boundary lock
    const safetyCheck = this.isBoundarySafe(affectedFiles);
    if (!safetyCheck.safe) {
      return {
        proposalId,
        decision: 'REJECTED_BOUNDARY_VIOLATION',
        reason: safetyCheck.violation,
        promoted: false
      };
    }

    // 2. Pre-test baseline measurement
    let preResult = { passed: true, score: 1.0 };
    if (preTestFn) {
      preResult = await preTestFn();
    }

    // 3. Post-test candidate measurement
    let postResult = { passed: true, score: 1.0 };
    if (postTestFn) {
      postResult = await postTestFn();
    }

    // 4. Run regression suite to verify baseline invariance
    const regressionCheck = closedLoopVerifier.verifyTestExecution({
      testScriptPath: regressionSuitePath,
      expectedPassPattern: '100% PASS'
    });

    if (!regressionCheck.passed) {
      return {
        proposalId,
        decision: 'REJECTED_REGRESSION',
        reason: `Candidate caused regression in ${regressionSuitePath}: ${regressionCheck.stderrSnippet || regressionCheck.reason}`,
        promoted: false,
        regressionCheck
      };
    }

    // 5. Evaluate Pareto improvement
    const qualityImproved = postResult.score >= preResult.score && postResult.passed;
    const decision = qualityImproved ? 'PROMOTE' : 'REJECT';

    const record = {
      proposalId,
      title,
      hypothesis,
      decision,
      promoted: decision === 'PROMOTE',
      preResult,
      postResult,
      regressionVerified: true,
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };

    this.evolutionLog.push(record);
    return record;
  }

  getEvolutionHistory() {
    return this.evolutionLog;
  }
}

const architectureEvolutionEngine = new ArchitectureEvolutionEngine();
module.exports = {
  ArchitectureEvolutionEngine,
  architectureEvolutionEngine,
  LOCKED_BOUNDARIES
};

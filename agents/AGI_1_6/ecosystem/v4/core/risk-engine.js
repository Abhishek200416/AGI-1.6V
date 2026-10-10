/**
 * .agents/v4/core/risk-engine.js
 * Universal Autonomous Engineering Intelligence Operating System — V4
 * Engine #32: Task Risk Engine
 *
 * Classifies tasks into 4 risk tiers (LOW, MEDIUM, HIGH, CRITICAL)
 * and calculates appropriate safety, testing, sandboxing, and review gates.
 */

const RISK_LEVELS = Object.freeze({
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
});

class TaskRiskEngine {
  /**
   * Assesses risk based on task properties and scope
   */
  assessTaskRisk({
    description = '',
    fileCount = 1,
    touchesAuth = false,
    touchesProduction = false,
    touchesDatabaseSchema = false,
    touchesCredentials = false,
    touchesFinancial = false,
    isDestructive = false
  }) {
    const text = description.toLowerCase();

    // Critical triggers
    if (touchesFinancial || touchesCredentials || text.includes('financial') || text.includes('rotate key') || (isDestructive && touchesProduction)) {
      return this._formulatePolicy(RISK_LEVELS.CRITICAL, "Critical risk: Touches financial systems, credentials, or destructive production operations");
    }

    // High triggers
    if (touchesProduction || touchesAuth || text.includes('deploy prod') || text.includes('authentication') || text.includes('firewall') || text.includes('security rules')) {
      return this._formulatePolicy(RISK_LEVELS.HIGH, "High risk: Involves production deployment, auth logic, or security policies");
    }

    // Medium triggers
    if (touchesDatabaseSchema || fileCount > 3 || text.includes('migration') || text.includes('dependency') || text.includes('refactor')) {
      return this._formulatePolicy(RISK_LEVELS.MEDIUM, "Medium risk: Touches database schemas, multi-file refactors, or package updates");
    }

    // Low triggers
    return this._formulatePolicy(RISK_LEVELS.LOW, "Low risk: Read-only query, documentation, or isolated minor edit");
  }

  _formulatePolicy(level, rationale) {
    switch (level) {
      case RISK_LEVELS.CRITICAL:
        return {
          riskLevel: level,
          rationale,
          requiresHumanApproval: true,
          sandboxingTier: 'TIER_2_OCI_MICRO_VM',
          reviewerPipeline: ['PLANNER', 'IMPLEMENTER', 'SECURITY_REVIEWER', 'TESTER', 'PERFORMANCE_REVIEWER', 'INDEPENDENT_CRITIC', 'JUDGE'],
          requiredTestCoverage: 1.0,
          allowAutonomousExecution: false
        };
      case RISK_LEVELS.HIGH:
        return {
          riskLevel: level,
          rationale,
          requiresHumanApproval: true,
          sandboxingTier: 'TIER_1_PROCESS_JOB_OBJECT',
          reviewerPipeline: ['PLANNER', 'IMPLEMENTER', 'SECURITY_REVIEWER', 'TESTER', 'PERFORMANCE_REVIEWER', 'INDEPENDENT_CRITIC', 'JUDGE'],
          requiredTestCoverage: 0.95,
          allowAutonomousExecution: false
        };
      case RISK_LEVELS.MEDIUM:
        return {
          riskLevel: level,
          rationale,
          requiresHumanApproval: false,
          sandboxingTier: 'TIER_1_PROCESS_JOB_OBJECT',
          reviewerPipeline: ['PLANNER', 'IMPLEMENTER', 'SECURITY_REVIEWER', 'TESTER'],
          requiredTestCoverage: 0.85,
          allowAutonomousExecution: true
        };
      case RISK_LEVELS.LOW:
      default:
        return {
          riskLevel: RISK_LEVELS.LOW,
          rationale,
          requiresHumanApproval: false,
          sandboxingTier: 'TIER_0_IN_PROCESS',
          reviewerPipeline: ['PLANNER', 'IMPLEMENTER'],
          requiredTestCoverage: 0.0,
          allowAutonomousExecution: true
        };
    }
  }
}

const taskRiskEngine = new TaskRiskEngine();

module.exports = {
  TaskRiskEngine,
  taskRiskEngine,
  RISK_LEVELS
};

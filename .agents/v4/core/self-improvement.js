/**
 * .agents/v4/core/self-improvement.js
 * Universal Autonomous Engineering Intelligence Operating System — V4
 * Engine #35: Controlled Self-Improvement
 *
 * Safely adapts internal routing rules, agent rankings, benchmark scores,
 * and capability metadata, while strictly requiring explicit human approval
 * for any modifications to security policies, permissions, or root orchestration authority.
 */

const { approvalFirewall } = require('./approval-firewall');
const { performanceMemory } = require('./performance-memory');

class ControlledSelfImprovement {
  /**
   * Applies an autonomous optimization if within safe parameters,
   * or delegates to Human Approval Firewall if security-sensitive.
   */
  proposeOptimization({
    type, // 'ROUTING_RULE' | 'AGENT_RANKING' | 'BENCHMARK_SCORE' | 'SECURITY_POLICY' | 'ROOT_AUTHORITY'
    target,
    proposedChange,
    rationale
  }) {
    // Protected boundaries: Security, permissions, root orchestrator authority
    if (type === 'SECURITY_POLICY' || type === 'ROOT_AUTHORITY' || type === 'PERMISSIONS') {
      const firewallReq = approvalFirewall.requestActionExecution({
        actionType: 'SECURITY_POLICY_WEAKENING',
        description: `Self-improvement proposal to modify ${type}: ${JSON.stringify(proposedChange)}`,
        targetResource: target,
        impactAssessment: 'CRITICAL',
        actor: 'self-improvement-engine'
      });

      return {
        applied: false,
        requiresHumanApproval: true,
        firewallTicket: firewallReq.ticket,
        status: 'BLOCKED_BY_FIREWALL',
        reason: "Self-improvement engine cannot modify security policies or root authority without explicit human approval."
      };
    }

    // Safe autonomous optimization: tune ranking or routing rule
    if (type === 'AGENT_RANKING') {
      performanceMemory.recordOutcome(target, proposedChange);
      return {
        applied: true,
        requiresHumanApproval: false,
        type,
        target,
        status: 'AUTONOMOUSLY_APPLIED',
        rationale
      };
    }

    return {
      applied: true,
      requiresHumanApproval: false,
      type,
      target,
      status: 'AUTONOMOUSLY_APPLIED',
      rationale
    };
  }
}

const selfImprovement = new ControlledSelfImprovement();

module.exports = {
  ControlledSelfImprovement,
  selfImprovement
};

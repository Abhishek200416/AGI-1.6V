/**
 * .agents/v4/core/approval-firewall.js
 * Universal Autonomous Engineering Intelligence Operating System — V4
 * Engine #17: Human Approval Firewall
 *
 * Enforces mandatory blocking approval gates for high-impact actions:
 * production deployment, destructive database operations, credential changes,
 * financial transactions, DNS changes, irreversible deletion, security policy weakening,
 * permission escalation, external account actions.
 */

const { eventBus, EVENT_TYPES } = require('./event-bus');

const GUARDED_ACTION_TYPES = Object.freeze([
  'PRODUCTION_DEPLOYMENT',
  'DESTRUCTIVE_DATABASE_OPERATION',
  'CREDENTIAL_ROTATION_OR_MUTATION',
  'FINANCIAL_TRANSACTION',
  'DNS_MODIFICATION',
  'IRREVERSIBLE_DELETION',
  'SECURITY_POLICY_WEAKENING',
  'PERMISSION_ESCALATION',
  'EXTERNAL_ACCOUNT_ACTION'
]);

class HumanApprovalFirewall {
  constructor(guardedActions = GUARDED_ACTION_TYPES) {
    this.guardedActions = new Set(guardedActions);
    this.pendingApprovals = new Map();
    this.approvalHistory = [];
    this.sequence = 0;
  }

  isGuardedAction(actionType) {
    return this.guardedActions.has(actionType);
  }

  /**
   * Evaluates an intended action. If safe, allows immediate execution.
   * If high-impact, blocks and creates a pending approval ticket.
   */
  requestActionExecution({
    actionType,
    description,
    targetResource,
    impactAssessment = 'HIGH',
    actor = 'orchestration-agent-v4'
  }) {
    if (!this.isGuardedAction(actionType)) {
      return {
        allowed: true,
        requiresHumanApproval: false,
        status: 'AUTONOMOUS_SAFE_PERMITTED',
        actionType
      };
    }

    this.sequence++;
    const approvalId = `APPR-${this.sequence}-${Date.now().toString(36).toUpperCase()}`;
    const ticket = {
      approvalId,
      actionType,
      description,
      targetResource,
      impactAssessment,
      actor,
      requestedAt: new Date().toISOString(),
      status: 'PENDING_USER_APPROVAL',
      resolvedAt: null,
      resolvedBy: null
    };

    this.pendingApprovals.set(approvalId, ticket);

    eventBus.emitEvent(EVENT_TYPES.APPROVAL_REQUIRED, {
      approvalId,
      actionType,
      targetResource,
      description
    });

    return {
      allowed: false,
      requiresHumanApproval: true,
      status: 'BLOCKED_PENDING_APPROVAL',
      approvalId,
      ticket
    };
  }

  grantApproval(approvalId, approver = 'human-user') {
    const ticket = this.pendingApprovals.get(approvalId);
    if (!ticket) throw new Error(`Approval ticket ${approvalId} not found`);

    ticket.status = 'GRANTED';
    ticket.resolvedAt = new Date().toISOString();
    ticket.resolvedBy = approver;

    this.pendingApprovals.delete(approvalId);
    this.approvalHistory.push(ticket);

    eventBus.emitEvent(EVENT_TYPES.APPROVAL_GRANTED, {
      approvalId,
      actionType: ticket.actionType,
      approver
    });

    return ticket;
  }

  denyApproval(approvalId, reason = 'Rejected by user', approver = 'human-user') {
    const ticket = this.pendingApprovals.get(approvalId);
    if (!ticket) throw new Error(`Approval ticket ${approvalId} not found`);

    ticket.status = 'DENIED';
    ticket.reason = reason;
    ticket.resolvedAt = new Date().toISOString();
    ticket.resolvedBy = approver;

    this.pendingApprovals.delete(approvalId);
    this.approvalHistory.push(ticket);

    eventBus.emitEvent(EVENT_TYPES.APPROVAL_DENIED, {
      approvalId,
      actionType: ticket.actionType,
      reason,
      approver
    });

    return ticket;
  }

  listPending() {
    return Array.from(this.pendingApprovals.values());
  }
}

const approvalFirewall = new HumanApprovalFirewall();

module.exports = {
  HumanApprovalFirewall,
  approvalFirewall,
  GUARDED_ACTION_TYPES
};

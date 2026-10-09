/**
 * matrix/commander/commander-gateway.js
 * MATRIX X1 — Real Commander Communication Orchestration & Gateway
 * 
 * Implements:
 * - CommanderChannel unified internal abstraction (Section 42)
 * - 9 Commander Message Types: REQUEST, QUESTION, PROGRESS, WARNING,
 *   APPROVAL, BLOCKER, COMPLETION, FAILURE, URGENT (Section 43)
 * - Strict Commander Message Quality standard (Section 45)
 * - Authorized WhatsApp browser session adapter pattern (Section 46)
 * - Structured Commander Response Parser (Section 47)
 */

const { eventBus, EVENT_TYPES } = require('../events/event-bus');
const { attentionEngine, ATTENTION_STATES } = require('./attention-engine');

const COMMANDER_MESSAGE_TYPES = {
  REQUEST: 'REQUEST',
  QUESTION: 'QUESTION',
  PROGRESS: 'PROGRESS',
  WARNING: 'WARNING',
  APPROVAL: 'APPROVAL',
  BLOCKER: 'BLOCKER',
  COMPLETION: 'COMPLETION',
  FAILURE: 'FAILURE',
  URGENT: 'URGENT'
};

class CommanderGateway {
  constructor() {
    this.channels = {
      terminal: { name: 'TERMINAL', enabled: true, status: 'ACTIVE' },
      webUi: { name: 'WEB_UI', enabled: false, status: 'READY_STANDBY' },
      whatsapp: { name: 'WHATSAPP_BROWSER', enabled: false, status: 'CONFIGURED_ADAPTER_STANDBY' },
      voice: { name: 'VOICE', enabled: false, status: 'STANDBY' }
    };
    this.pendingDecisions = new Map();
    this.messageHistory = [];
  }

  /**
   * Format high-quality question according to Section 45 standard
   */
  formatQualityQuestion({
    whatHappened,
    whyItMatters,
    whatTried = [],
    availableOptions = [],
    recommendation,
    exactDecisionRequested
  }) {
    return [
      `=== [COMMANDER DECISION REQUIRED] ===`,
      `1. WHAT HAPPENED: ${whatHappened}`,
      `2. WHY IT MATTERS: ${whyItMatters}`,
      `3. WHAT HAS BEEN TRIED: ${whatTried.length > 0 ? whatTried.join('; ') : 'Autonomous standard procedures exhausted.'}`,
      `4. AVAILABLE OPTIONS:`,
      ...availableOptions.map(o => `   [${o.key}] ${o.description}`),
      `5. RECOMMENDATION: ${recommendation}`,
      `6. EXACT DECISION REQUESTED: ${exactDecisionRequested}`,
      `====================================`
    ].join('\n');
  }

  /**
   * Request decision from commander via primary active channel
   */
  async requestDecision(decisionCard) {
    const ticketId = `DEC-REQ-${Date.now().toString(36)}`;
    
    const formattedPrompt = this.formatQualityQuestion({
      whatHappened: decisionCard.issue || decisionCard.issueDescription || 'Ambiguity in execution flow',
      whyItMatters: decisionCard.impact || 'Determines execution safety and persistent state strategy',
      whatTried: (decisionCard.alternativesTested || []).map(a => `${a.name}: ${a.result}`),
      availableOptions: decisionCard.options || decisionCard.autonomousOptions || [
        { key: 'A', description: 'Proceed with default recommended course' },
        { key: 'B', description: 'Abort or pause mission for manual review' }
      ],
      recommendation: decisionCard.recommendation || 'Option A minimizes latency and preserves invariants',
      exactDecisionRequested: decisionCard.format || 'Reply with option key (A, B) or APPROVED/REJECTED'
    });

    const ticket = {
      ticketId,
      card: decisionCard,
      prompt: formattedPrompt,
      type: COMMANDER_MESSAGE_TYPES.QUESTION,
      status: 'PENDING',
      requestedAt: new Date().toISOString()
    };

    this.pendingDecisions.set(ticketId, ticket);
    this.messageHistory.push({ type: 'DECISION_REQUESTED', ticketId, prompt: formattedPrompt, timestamp: new Date().toISOString() });
    
    eventBus.emitEvent(EVENT_TYPES.COMMANDER_MESSAGE, { ticketId, decisionCard, prompt: formattedPrompt });

    return {
      ticketId,
      card: decisionCard,
      channel: 'TERMINAL',
      prompt: formattedPrompt
    };
  }

  /**
   * Structured Commander Response Parser (Section 47)
   * Parses YES, NO, A, B, PAUSE, RESUME, CANCEL, APPROVE, REJECT, or natural language
   */
  parseResponse(rawInput) {
    const trimmed = (rawInput || '').trim();
    const upper = trimmed.toUpperCase();

    // Canonical keyword matching
    if (['YES', 'Y', 'CONFIRM', 'APPROVE', 'APPROVED'].includes(upper)) {
      return { parsedType: 'APPROVAL', choice: 'YES', rawInput, confidence: 1.0 };
    }
    if (['NO', 'N', 'DENY', 'REJECT', 'REJECTED'].includes(upper)) {
      return { parsedType: 'REJECTION', choice: 'NO', rawInput, confidence: 1.0 };
    }
    if (['A', 'OPTION A', 'CHOOSE A'].includes(upper)) {
      return { parsedType: 'OPTION_SELECTION', choice: 'A', rawInput, confidence: 1.0 };
    }
    if (['B', 'OPTION B', 'CHOOSE B'].includes(upper)) {
      return { parsedType: 'OPTION_SELECTION', choice: 'B', rawInput, confidence: 1.0 };
    }
    if (['PAUSE', 'HOLD', 'WAIT'].includes(upper)) {
      return { parsedType: 'COMMAND', action: 'PAUSE', rawInput, confidence: 1.0 };
    }
    if (['RESUME', 'CONTINUE', 'PROCEED'].includes(upper)) {
      return { parsedType: 'COMMAND', action: 'RESUME', rawInput, confidence: 1.0 };
    }
    if (['CANCEL', 'ABORT', 'TERMINATE'].includes(upper)) {
      return { parsedType: 'COMMAND', action: 'CANCEL', rawInput, confidence: 1.0 };
    }

    // Natural language extraction fallback
    return {
      parsedType: 'NATURAL_LANGUAGE_DIRECTIVE',
      choice: trimmed,
      rawInput,
      directive: trimmed,
      confidence: 0.85
    };
  }

  /**
   * Submit commander decision response
   */
  submitResponse(ticketId, rawResponse) {
    if (this.pendingDecisions.has(ticketId)) {
      const ticket = this.pendingDecisions.get(ticketId);
      const parsed = this.parseResponse(rawResponse);

      ticket.status = 'ANSWERED';
      ticket.rawResponse = rawResponse;
      ticket.parsedResponse = parsed;
      ticket.response = parsed.choice || rawResponse;
      ticket.answeredAt = new Date().toISOString();

      this.messageHistory.push({
        type: 'DECISION_ANSWERED',
        ticketId,
        rawResponse,
        parsed,
        timestamp: new Date().toISOString()
      });

      eventBus.emitEvent(EVENT_TYPES.COMMANDER_DECISION, { ticketId, choice: ticket.response, parsed });
      return { success: true, ticket, parsed };
    }
    return { success: false, error: 'TICKET_NOT_FOUND' };
  }

  /**
   * Authorized WhatsApp Browser Session Adapter (Section 46)
   */
  async sendWhatsAppMessage({ commanderContact, message, browserSessionId = 'whatsapp-session' }) {
    if (!this.channels.whatsapp.enabled) {
      return {
        success: false,
        requiresAuthorization: true,
        reason: 'WhatsApp channel requires explicit Commander authorization and configured authenticated browser session.'
      };
    }
    // Adapter protocol for authorized browser session
    return {
      channel: 'WHATSAPP_BROWSER',
      recipient: commanderContact,
      status: 'QUEUED_IN_AUTHENTICATED_SESSION',
      messagePreview: message.substring(0, 100)
    };
  }

  notify(message, level = 'INFO', type = COMMANDER_MESSAGE_TYPES.PROGRESS) {
    const payload = { message, level, type, timestamp: new Date().toISOString() };
    this.messageHistory.push(payload);
    eventBus.emitEvent(EVENT_TYPES.COMMANDER_MESSAGE, payload);
    return { notified: true, channel: 'TERMINAL', message, level, type };
  }

  getPendingTickets() {
    return Array.from(this.pendingDecisions.values()).filter(t => t.status === 'PENDING');
  }

  getHistory() {
    return this.messageHistory;
  }
}

const commanderGateway = new CommanderGateway();

module.exports = { CommanderGateway, commanderGateway, COMMANDER_MESSAGE_TYPES };

/**
 * matrix/commander/attention-engine.js
 * MATRIX X1 — Human Attention Engine
 * 
 * Classifies interruptions into:
 * IGNORE, QUEUE, BATCH, NOTIFY, URGENT.
 * Prevents commander spam by consolidating low-value inquiries into single concise decision cards.
 */

const ATTENTION_STATES = {
  IGNORE: 'IGNORE',
  QUEUE: 'QUEUE',
  BATCH: 'BATCH',
  NOTIFY: 'NOTIFY',
  URGENT: 'URGENT'
};

class AttentionEngine {
  constructor() {
    this.queuedQuestions = [];
    this.history = [];
  }

  /**
   * Classify an interruption candidate based on urgency, impact, and reversibility
   */
  classifyInterruption({
    topic,
    urgency = 'LOW',       // LOW, MEDIUM, HIGH, CRITICAL
    reversibility = 'HIGH', // HIGH, MEDIUM, LOW, IRREVERSIBLE
    expectedValue = 'LOW',  // LOW, MEDIUM, HIGH
    hasAutonomousAlternative = true
  }) {
    if (hasAutonomousAlternative && reversibility !== 'IRREVERSIBLE') {
      return {
        action: ATTENTION_STATES.IGNORE,
        rationale: 'Autonomous fallback exists and action is reversible. Do not interrupt commander.'
      };
    }

    if (reversibility === 'IRREVERSIBLE' || urgency === 'CRITICAL') {
      return {
        action: ATTENTION_STATES.URGENT,
        rationale: 'Action is irreversible or critical. Immediate commander authorization required.'
      };
    }

    if (urgency === 'HIGH') {
      return {
        action: ATTENTION_STATES.NOTIFY,
        rationale: 'High priority event. Notify commander asynchronously.'
      };
    }

    return {
      action: ATTENTION_STATES.BATCH,
      rationale: 'Low-to-medium urgency. Queue for consolidated milestone review.'
    };
  }

  /**
   * Queue inquiry for batched delivery
   */
  queueInquiry(inquiry) {
    this.queuedQuestions.push({
      ...inquiry,
      queuedAt: new Date().toISOString()
    });
  }

  /**
   * Consolidate queued inquiries into a single actionable briefing
   */
  getConsolidatedBatch() {
    if (this.queuedQuestions.length === 0) return null;
    const batch = [...this.queuedQuestions];
    this.queuedQuestions = [];
    return {
      batchCount: batch.length,
      items: batch,
      summary: `Consolidated ${batch.length} operational questions into a single checkpoint review.`
    };
  }
}

const attentionEngine = new AttentionEngine();

module.exports = { AttentionEngine, attentionEngine, ATTENTION_STATES };

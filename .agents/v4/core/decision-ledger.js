/**
 * .agents/v4/core/decision-ledger.js
 * Universal Autonomous Engineering Intelligence Operating System — V4
 * Engine #11: Decision Ledger
 *
 * Persists and explains architectural decisions backed by empirical evidence.
 */

const fs = require('fs');
const path = require('path');
const { eventBus, EVENT_TYPES } = require('./event-bus');

const REGISTRY_DECISIONS = path.resolve(__dirname, '../../registry/decisions.json');
const STATE_DECISIONS = path.resolve(__dirname, '../../state/decisions.json');

class DecisionLedger {
  constructor(registryPath = REGISTRY_DECISIONS, statePath = STATE_DECISIONS) {
    this.registryPath = registryPath;
    this.statePath = statePath;
    this.data = this._load();
  }

  _load() {
    try {
      if (fs.existsSync(this.registryPath)) {
        return JSON.parse(fs.readFileSync(this.registryPath, 'utf-8'));
      }
    } catch (e) {
      console.warn('[DECISION_LEDGER] Failed to load decisions registry:', e.message);
    }
    return { registryVersion: "4.0.0", decisions: [] };
  }

  save() {
    try {
      this.data.lastUpdated = new Date().toISOString();
      fs.writeFileSync(this.registryPath, JSON.stringify(this.data, null, 2), 'utf-8');

      // Sync state pointer
      const stateDir = path.dirname(this.statePath);
      if (!fs.existsSync(stateDir)) fs.mkdirSync(stateDir, { recursive: true });
      fs.writeFileSync(this.statePath, JSON.stringify({
        version: "4.0.0",
        source: ".agents/registry/decisions.json",
        activeDecisionsCount: this.data.decisions.length,
        lastSynced: new Date().toISOString()
      }, null, 2), 'utf-8');
      return true;
    } catch (e) {
      console.error('[DECISION_LEDGER] Save error:', e.message);
      return false;
    }
  }

  recordDecision({
    decision,
    alternatives = [],
    reason,
    evidence,
    agentsInvolved = ['orchestration-agent-v4'],
    confidence = 0.95,
    reversalCondition = null
  }) {
    const id = `DEC-${String(this.data.decisions.length + 1).padStart(3, '0')}`;
    const entry = {
      decisionId: id,
      decision,
      alternatives,
      reason,
      evidence,
      agentsInvolved,
      date: new Date().toISOString(),
      confidence,
      reversalCondition
    };

    this.data.decisions.push(entry);
    this.save();

    eventBus.emitEvent(EVENT_TYPES.TASK_UPDATED, {
      decisionId: id,
      decision,
      evidence
    });

    return entry;
  }

  explainDecision(query) {
    const q = query.toLowerCase();
    const matched = this.data.decisions.filter(d => {
      const full = `${d.decision} ${d.reason} ${d.evidence} ${(d.alternatives || []).join(' ')}`.toLowerCase();
      return full.includes(q);
    });

    if (matched.length === 0) {
      return {
        found: false,
        explanation: `No recorded architectural decision matched query: "${query}".`
      };
    }

    const d = matched[0];
    return {
      found: true,
      decisionId: d.decisionId,
      decision: d.decision,
      reason: d.reason,
      evidence: d.evidence,
      alternativesConsidered: d.alternatives,
      confidence: d.confidence,
      reversalCondition: d.reversalCondition,
      agentsInvolved: d.agentsInvolved,
      date: d.date,
      formattedReport: `[Architectural Rationale: ${d.decisionId}]\nDecision: ${d.decision}\nReason: ${d.reason}\nEvidence: ${d.evidence}\nAlternatives: ${d.alternatives.join(', ')}\nReversal Condition: ${d.reversalCondition}`
    };
  }

  getAllDecisions() {
    return [...this.data.decisions];
  }
}

const decisionLedger = new DecisionLedger();

module.exports = {
  DecisionLedger,
  decisionLedger
};

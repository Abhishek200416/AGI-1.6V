/**
 * matrix/evaluation/evaluation-ledger.js
 * MATRIX X1.1 — Immutable Evaluation Ledger
 * 
 * Provides an append-only, durable JSONL ledger of all benchmark trials,
 * task executions, trajectory steps, and verification verdicts.
 * 
 * Classification standards:
 * REAL | SANDBOX | SIMULATION | SYNTHETIC | MOCK | CONTRACT_ONLY | UNVERIFIED
 */

const fs = require('fs');
const path = require('path');
const { storageFabric } = require('../storage/storage-fabric');

class EvaluationLedger {
  constructor() {
    this.ledgerDir = null;
    this.ledgerPath = null;
    this.inMemoryCache = [];
    this.initStorage();
  }

  initStorage() {
    const baseDir = storageFabric.activeDataRoot || path.join(__dirname, '../../.matrix_data');
    this.ledgerDir = path.join(baseDir, 'evaluation');
    this.ledgerPath = path.join(this.ledgerDir, 'ledger.jsonl');
    try {
      if (!fs.existsSync(this.ledgerDir)) {
        fs.mkdirSync(this.ledgerDir, { recursive: true });
      }
      if (fs.existsSync(this.ledgerPath) && this.inMemoryCache.length === 0) {
        const lines = fs.readFileSync(this.ledgerPath, 'utf8').trim().split('\n');
        for (const line of lines) {
          if (line.trim()) {
            try {
              this.inMemoryCache.push(JSON.parse(line));
            } catch (e) {}
          }
        }
      }
    } catch (e) {}
  }

  /**
   * Append a completed evaluation trial to the immutable ledger
   */
  recordTrial(trial) {
    this.initStorage();
    const entry = {
      trialId: trial.trialId || `TRL-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: trial.timestamp || new Date().toISOString(),
      benchmark: trial.benchmark || 'INTERNAL_CAPABILITY_MATRIX',
      taskFamily: trial.taskFamily || 'GENERAL',
      taskId: trial.taskId || 'TASK-UNSPECIFIED',
      agentId: trial.agentId || 'default-agent',
      model: trial.model || 'gemini-3.8-flash',
      verdict: trial.verdict || 'UNVERIFIED', // PASS, FAIL, PARTIAL, UNVERIFIED
      score: typeof trial.score === 'number' ? trial.score : (trial.verdict === 'PASS' ? 1.0 : 0.0),
      classification: trial.classification || 'REAL',
      latencyMs: trial.latencyMs || 0,
      tokensUsed: trial.tokensUsed || 0,
      costUsd: trial.costUsd || 0,
      interventions: trial.interventions || 0,
      retries: trial.retries || 0,
      evidence: trial.evidence || null,
      trajectoryLength: Array.isArray(trial.trajectory) ? trial.trajectory.length : (trial.trajectoryLength || 0),
      metadata: trial.metadata || {}
    };

    this.inMemoryCache.push(entry);

    try {
      fs.appendFileSync(this.ledgerPath, JSON.stringify(entry) + '\n', 'utf8');
    } catch (e) {}

    return entry;
  }

  /**
   * Query recorded trials with flexible filters
   */
  queryTrials(filter = {}) {
    return this.inMemoryCache.filter(item => {
      if (filter.benchmark && item.benchmark !== filter.benchmark) return false;
      if (filter.taskFamily && item.taskFamily !== filter.taskFamily) return false;
      if (filter.agentId && item.agentId !== filter.agentId) return false;
      if (filter.model && item.model !== filter.model) return false;
      if (filter.verdict && item.verdict !== filter.verdict) return false;
      if (filter.classification && item.classification !== filter.classification) return false;
      return true;
    });
  }

  /**
   * Get aggregate metrics across recorded trials
   */
  getSummary(filter = {}) {
    const trials = this.queryTrials(filter);
    const total = trials.length;
    if (total === 0) {
      return { total: 0, passed: 0, failed: 0, passRate: 0, avgLatencyMs: 0, avgTokens: 0, totalCostUsd: 0 };
    }

    const passed = trials.filter(t => t.verdict === 'PASS').length;
    const failed = trials.filter(t => t.verdict === 'FAIL').length;
    const partial = trials.filter(t => t.verdict === 'PARTIAL').length;
    const totalLatency = trials.reduce((sum, t) => sum + (t.latencyMs || 0), 0);
    const totalTokens = trials.reduce((sum, t) => sum + (t.tokensUsed || 0), 0);
    const totalCost = trials.reduce((sum, t) => sum + (t.costUsd || 0), 0);

    return {
      total,
      passed,
      failed,
      partial,
      passRate: Number((passed / total).toFixed(4)),
      avgScore: Number((trials.reduce((sum, t) => sum + t.score, 0) / total).toFixed(4)),
      avgLatencyMs: Math.round(totalLatency / total),
      avgTokens: Math.round(totalTokens / total),
      totalCostUsd: Number(totalCost.toFixed(6))
    };
  }

  /**
   * Clear cache and ledger (for isolated testing)
   */
  clear() {
    this.inMemoryCache = [];
    try {
      if (fs.existsSync(this.ledgerPath)) {
        fs.unlinkSync(this.ledgerPath);
      }
    } catch (e) {}
  }
}

const evaluationLedger = new EvaluationLedger();

module.exports = {
  EvaluationLedger,
  evaluationLedger
};

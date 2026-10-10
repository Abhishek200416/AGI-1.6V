/**
 * .agents/v4/core/performance-memory.js
 * Universal Autonomous Engineering Intelligence Operating System — V4
 * Engine #5: Agent Performance Memory
 *
 * Empirical ranking and telemetry tracking with Bayesian cold-start protection.
 */

const fs = require('fs');
const path = require('path');

const REGISTRY_FILE = path.resolve(__dirname, '../../registry/agent-performance.json');

class PerformanceMemory {
  constructor(registryPath = REGISTRY_FILE) {
    this.registryPath = registryPath;
    this.data = this._load();
  }

  _load() {
    try {
      if (fs.existsSync(this.registryPath)) {
        return JSON.parse(fs.readFileSync(this.registryPath, 'utf-8'));
      }
    } catch (e) {
      console.warn('[PERF_MEMORY] Failed to read registry, using defaults:', e.message);
    }
    return {
      bayesianPriors: { defaultSuccessRate: 0.85, confidenceWeight: 5 },
      agents: {}
    };
  }

  save() {
    try {
      this.data.lastUpdated = new Date().toISOString();
      fs.writeFileSync(this.registryPath, JSON.stringify(this.data, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('[PERF_MEMORY] Save error:', err.message);
      return false;
    }
  }

  getAgentMetrics(agentName) {
    return this.data.agents[agentName] || null;
  }

  /**
   * Computes smoothed score using Bayesian weighting so cold-start agents
   * start with a healthy neutral prior without being penalized.
   */
  getSmoothedScore(agentName, category = null) {
    const prior = (this.data.bayesianPriors && this.data.bayesianPriors.defaultSuccessRate) || 0.85;
    const m = (this.data.bayesianPriors && this.data.bayesianPriors.confidenceWeight) || 5;

    const record = this.data.agents[agentName];
    if (!record || !record.sampleCount || record.sampleCount === 0) {
      // Cold-start agent: return prior score without penalty
      return {
        score: prior,
        isColdStart: true,
        sampleCount: 0,
        confidence: "PRIOR_NEUTRAL"
      };
    }

    const n = record.sampleCount;
    const empirical = record.success_rate || 0.85;

    // Category match boost: +5% if agent specializes in category
    let categoryBoost = 0.0;
    if (category && record.task_categories && record.task_categories.includes(category)) {
      categoryBoost = 0.05;
    }

    // Bayesian smoothed success rate
    const smoothed = ((n * empirical) + (m * prior)) / (n + m) + categoryBoost;

    return {
      score: Math.min(1.0, smoothed),
      isColdStart: false,
      sampleCount: n,
      confidence: n >= 15 ? "HIGH_EMPIRICAL" : "EMERGING_EMPIRICAL"
    };
  }

  rankAgentsForTask(category, candidateList = []) {
    return candidateList.map(name => {
      const metric = this.getSmoothedScore(name, category);
      const raw = this.getAgentMetrics(name) || {};
      return {
        agent: name,
        score: metric.score,
        isColdStart: metric.isColdStart,
        sampleCount: metric.sampleCount,
        latency: raw.latency || 3000,
        tokenCost: raw.token_cost || 4000,
        sandbox: raw.sandbox_used || 'TIER_0'
      };
    }).sort((a, b) => b.score - a.score);
  }

  recordOutcome(agentName, { success, latencyMs, tokens, category, toolFailure = false, rollback = false }) {
    if (!this.data.agents[agentName]) {
      this.data.agents[agentName] = {
        sampleCount: 0,
        success_rate: 0.85,
        failure_rate: 0.15,
        latency: latencyMs || 3000,
        token_cost: tokens || 4000,
        tool_failures: 0,
        test_pass_rate: success ? 1.0 : 0.0,
        security_findings: 0,
        rollback_rate: 0.0,
        task_categories: category ? [category] : [],
        model_used: 'gemini-3.8-flash',
        sandbox_used: 'TIER_0'
      };
    }

    const a = this.data.agents[agentName];
    const prevSamples = a.sampleCount || 0;
    const newSamples = prevSamples + 1;

    const prevSuccesses = (a.success_rate || 0.85) * prevSamples;
    const newSuccesses = prevSuccesses + (success ? 1 : 0);
    a.success_rate = parseFloat((newSuccesses / newSamples).toFixed(3));
    a.failure_rate = parseFloat((1 - a.success_rate).toFixed(3));

    if (latencyMs) {
      a.latency = Math.round(((a.latency * prevSamples) + latencyMs) / newSamples);
    }
    if (tokens) {
      a.token_cost = Math.round(((a.token_cost * prevSamples) + tokens) / newSamples);
    }
    if (toolFailure) a.tool_failures = (a.tool_failures || 0) + 1;
    if (rollback) {
      const prevRollbacks = (a.rollback_rate || 0) * prevSamples;
      a.rollback_rate = parseFloat(((prevRollbacks + 1) / newSamples).toFixed(3));
    }
    if (category && (!a.task_categories || !a.task_categories.includes(category))) {
      a.task_categories = a.task_categories || [];
      a.task_categories.push(category);
    }

    a.sampleCount = newSamples;
    this.save();
    return a;
  }
}

const performanceMemory = new PerformanceMemory();

module.exports = {
  PerformanceMemory,
  performanceMemory
};

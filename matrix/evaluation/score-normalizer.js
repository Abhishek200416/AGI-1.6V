/**
 * matrix/evaluation/score-normalizer.js
 * MATRIX X1.1 — Benchmark Score Normalizer
 * 
 * Standardizes scoring across heterogeneous benchmarks (binary pass/fail,
 * continuous accuracy, step budgets, latency thresholds, token efficiency).
 */

class ScoreNormalizer {
  constructor() {
    this.defaultWeights = {
      outcome: 0.60,
      efficiency: 0.20,
      latency: 0.10,
      stability: 0.10
    };
  }

  /**
   * Normalize an evaluation result into a canonical [0.0, 1.0] score
   */
  normalize(rawResult = {}) {
    const {
      passed = false,
      accuracy = null,
      stepsTaken = 1,
      maxAllowedSteps = 10,
      latencyMs = 100,
      targetLatencyMs = 500,
      tokensUsed = 500,
      budgetTokens = 5000,
      interventions = 0,
      retries = 0
    } = rawResult;

    // 1. Outcome score [0.0, 1.0]
    let outcomeScore = 0.0;
    if (typeof accuracy === 'number') {
      outcomeScore = Math.max(0.0, Math.min(1.0, accuracy));
    } else {
      outcomeScore = passed ? 1.0 : 0.0;
    }

    // 2. Efficiency score [0.0, 1.0] based on step count and token consumption
    const stepRatio = Math.max(0.0, Math.min(1.0, 1.0 - (stepsTaken / Math.max(1, maxAllowedSteps))));
    const tokenRatio = Math.max(0.0, Math.min(1.0, 1.0 - (tokensUsed / Math.max(100, budgetTokens))));
    const efficiencyScore = (stepRatio * 0.5) + (tokenRatio * 0.5);

    // 3. Latency score [0.0, 1.0]
    const latencyScore = latencyMs <= targetLatencyMs
      ? 1.0
      : Math.max(0.0, 1.0 - ((latencyMs - targetLatencyMs) / (targetLatencyMs * 3)));

    // 4. Stability score with penalties for interventions and retries
    const penalty = (interventions * 0.25) + (retries * 0.10);
    const stabilityScore = Math.max(0.0, 1.0 - penalty);

    // Compute composite weighted score
    const compositeScore = (
      outcomeScore * this.defaultWeights.outcome +
      efficiencyScore * this.defaultWeights.efficiency +
      latencyScore * this.defaultWeights.latency +
      stabilityScore * this.defaultWeights.stability
    );

    return {
      compositeScore: Number(compositeScore.toFixed(4)),
      outcomeScore: Number(outcomeScore.toFixed(4)),
      efficiencyScore: Number(efficiencyScore.toFixed(4)),
      latencyScore: Number(latencyScore.toFixed(4)),
      stabilityScore: Number(stabilityScore.toFixed(4)),
      passed: passed || outcomeScore >= 0.8
    };
  }

  /**
   * Normalize an entire batch of trials
   */
  normalizeBatch(trials = []) {
    return trials.map(t => ({
      ...t,
      normalized: this.normalize(t)
    }));
  }
}

const scoreNormalizer = new ScoreNormalizer();

module.exports = {
  ScoreNormalizer,
  scoreNormalizer
};

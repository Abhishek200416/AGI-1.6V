/**
 * matrix/evaluation/regression-evaluator.js
 * MATRIX X1.1 — Continuous Regression Evaluator
 * 
 * Compares current evaluation runs against historical baselines to detect:
 * 1. Task pass-rate drop
 * 2. Latency regression
 * 3. Token cost blow-up
 * 4. Novel failure modes or intervention spikes
 */

class RegressionEvaluator {
  constructor() {
    this.allowedRegressionMargin = 0.02; // max 2% tolerance for statistical fluctuation
    this.allowedLatencyInflation = 0.25; // max 25% latency increase
    this.allowedCostInflation = 0.20;    // max 20% token cost increase
  }

  /**
   * Compare a candidate evaluation summary against a baseline evaluation summary
   */
  evaluateRegression(baseline = {}, candidate = {}) {
    const regressions = [];
    const warnings = [];

    // 1. Pass Rate Check
    const baselinePassRate = typeof baseline.passRate === 'number' ? baseline.passRate : 1.0;
    const candidatePassRate = typeof candidate.passRate === 'number' ? candidate.passRate : 0.0;
    const passRateDelta = candidatePassRate - baselinePassRate;

    if (passRateDelta < -this.allowedRegressionMargin) {
      regressions.push({
        metric: 'passRate',
        baseline: baselinePassRate,
        candidate: candidatePassRate,
        delta: Number(passRateDelta.toFixed(4)),
        severity: 'CRITICAL',
        message: `Pass rate dropped by ${(Math.abs(passRateDelta) * 100).toFixed(1)}% (exceeds ${(this.allowedRegressionMargin * 100)}% margin)`
      });
    }

    // 2. Latency Inflation Check
    if (baseline.avgLatencyMs && candidate.avgLatencyMs) {
      const latencyInflation = (candidate.avgLatencyMs - baseline.avgLatencyMs) / baseline.avgLatencyMs;
      if (latencyInflation > this.allowedLatencyInflation) {
        warnings.push({
          metric: 'avgLatencyMs',
          baseline: baseline.avgLatencyMs,
          candidate: candidate.avgLatencyMs,
          inflation: Number(latencyInflation.toFixed(4)),
          message: `Average latency increased by ${(latencyInflation * 100).toFixed(1)}%`
        });
      }
    }

    // 3. Token Cost Inflation Check
    if (baseline.avgTokens && candidate.avgTokens) {
      const tokenInflation = (candidate.avgTokens - baseline.avgTokens) / baseline.avgTokens;
      if (tokenInflation > this.allowedCostInflation) {
        warnings.push({
          metric: 'avgTokens',
          baseline: baseline.avgTokens,
          candidate: candidate.avgTokens,
          inflation: Number(tokenInflation.toFixed(4)),
          message: `Average token usage increased by ${(tokenInflation * 100).toFixed(1)}%`
        });
      }
    }

    // 4. Interventions Spikes
    const baselineInterventions = baseline.interventions || 0;
    const candidateInterventions = candidate.interventions || 0;
    if (candidateInterventions > baselineInterventions + 2) {
      regressions.push({
        metric: 'interventions',
        baseline: baselineInterventions,
        candidate: candidateInterventions,
        severity: 'HIGH',
        message: `Human interventions spiked from ${baselineInterventions} to ${candidateInterventions}`
      });
    }

    const hasCriticalRegression = regressions.some(r => r.severity === 'CRITICAL');
    const status = hasCriticalRegression ? 'REGRESSION_DETECTED' : (regressions.length > 0 ? 'WARNING_DEGRADED' : 'CLEAN_NO_REGRESSION');

    return {
      status,
      hasRegression: regressions.length > 0,
      passRateDelta: Number(passRateDelta.toFixed(4)),
      regressions,
      warnings,
      candidatePassRate,
      baselinePassRate
    };
  }
}

const regressionEvaluator = new RegressionEvaluator();

module.exports = {
  RegressionEvaluator,
  regressionEvaluator
};

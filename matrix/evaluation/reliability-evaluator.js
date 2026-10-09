/**
 * matrix/evaluation/reliability-evaluator.js
 * MATRIX X1.1 — Multi-Trial Reliability & Determinism Evaluator
 * 
 * Measures:
 * 1. Multi-trial pass consistency & variance
 * 2. Flakiness rate (% of non-deterministic pass/fail toggling)
 * 3. Output determinism across identical prompts
 * 4. Latency jitter & execution stability
 */

class ReliabilityEvaluator {
  /**
   * Evaluate reliability across multiple repeated trials of a task
   * @param {Array<Object>} trialResults - List of trial objects { passed, score, latencyMs, output }
   */
  evaluateReliability(trialResults = []) {
    const k = trialResults.length;
    if (k === 0) {
      return { trials: 0, passRate: 0, flakiness: 0, determinism: 1.0, variance: 0, status: 'NO_TRIALS' };
    }

    const passes = trialResults.filter(t => t.passed === true || t.verdict === 'PASS').length;
    const passRate = passes / k;

    // A task is flaky if it neither passes 100% nor fails 100% across repeated runs
    const isFlaky = passes > 0 && passes < k;
    const flakiness = isFlaky ? (1.0 - Math.abs(passRate - 0.5) * 2) : 0.0;

    // Latency variance & standard deviation
    const latencies = trialResults.map(t => t.latencyMs || 0);
    const meanLatency = latencies.reduce((a, b) => a + b, 0) / k;
    const varianceLatency = latencies.reduce((sum, l) => sum + Math.pow(l - meanLatency, 2), 0) / k;
    const stdDevLatency = Math.sqrt(varianceLatency);

    // Score variance
    const scores = trialResults.map(t => typeof t.score === 'number' ? t.score : (t.passed ? 1.0 : 0.0));
    const meanScore = scores.reduce((a, b) => a + b, 0) / k;
    const scoreVariance = scores.reduce((sum, s) => sum + Math.pow(s - meanScore, 2), 0) / k;

    // Output determinism (string similarity across runs)
    let outputMatches = 0;
    let comparisons = 0;
    for (let i = 0; i < k; i++) {
      for (let j = i + 1; j < k; j++) {
        comparisons++;
        const strA = JSON.stringify(trialResults[i].output || '');
        const strB = JSON.stringify(trialResults[j].output || '');
        if (strA === strB) outputMatches++;
      }
    }
    const determinism = comparisons > 0 ? (outputMatches / comparisons) : 1.0;

    const reliabilityScore = Number((
      (passRate * 0.5) +
      ((1.0 - flakiness) * 0.3) +
      (determinism * 0.2)
    ).toFixed(4));

    let status = 'HIGH_RELIABILITY';
    if (isFlaky) status = 'FLAKY_BEHAVIOR_DETECTED';
    else if (passRate === 0) status = 'CONSISTENT_FAILURE';
    else if (passRate < 0.8) status = 'LOW_RELIABILITY';

    return {
      trials: k,
      passedCount: passes,
      passRate: Number(passRate.toFixed(4)),
      isFlaky,
      flakiness: Number(flakiness.toFixed(4)),
      meanScore: Number(meanScore.toFixed(4)),
      scoreVariance: Number(scoreVariance.toFixed(6)),
      meanLatencyMs: Math.round(meanLatency),
      stdDevLatencyMs: Math.round(stdDevLatency),
      determinism: Number(determinism.toFixed(4)),
      reliabilityScore,
      status
    };
  }
}

const reliabilityEvaluator = new ReliabilityEvaluator();

module.exports = {
  ReliabilityEvaluator,
  reliabilityEvaluator
};

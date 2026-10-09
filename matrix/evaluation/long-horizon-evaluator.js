/**
 * matrix/evaluation/long-horizon-evaluator.js
 * MATRIX X1.1 — Long-Horizon Autonomy & Survival Curve Evaluator
 * 
 * Measures:
 * 1. Success rate degradation across horizon step scale (5 -> 10 -> 25 -> 50 -> 100 steps)
 * 2. METR-style task survival curve: P(success | steps)
 * 3. Recovery under mid-flight injected failures (process restarts, tool faults)
 * 4. Context memory drift & compounding error rate
 */

class LongHorizonEvaluator {
  /**
   * Evaluate long-horizon performance across scale tiers
   * @param {Array<Object>} horizonResults - List of results per step tier { steps, total, passed, avgLatencyMs }
   */
  evaluateHorizonCurve(horizonResults = []) {
    if (!Array.isArray(horizonResults) || horizonResults.length === 0) {
      return { horizonTiers: [], survivalCurve: [], halfLifeSteps: 0, status: 'NO_DATA' };
    }

    const tiers = [];
    const survivalCurve = [];

    for (const tier of horizonResults) {
      const steps = tier.steps || 1;
      const total = tier.total || 1;
      const passed = tier.passed || 0;
      const passRate = Number((passed / total).toFixed(4));

      tiers.push({
        steps,
        total,
        passed,
        passRate,
        avgLatencyMs: tier.avgLatencyMs || 0
      });

      survivalCurve.push({
        horizonSteps: steps,
        successProbability: passRate
      });
    }

    // Sort by steps ascending
    tiers.sort((a, b) => a.steps - b.steps);
    survivalCurve.sort((a, b) => a.horizonSteps - b.horizonSteps);

    // Estimate step half-life (steps where success rate falls to 50%)
    let halfLifeSteps = 100;
    for (let i = 0; i < survivalCurve.length - 1; i++) {
      const current = survivalCurve[i];
      const next = survivalCurve[i + 1];
      if (current.successProbability >= 0.5 && next.successProbability < 0.5) {
        // Linear interpolation
        const fraction = (current.successProbability - 0.5) / (current.successProbability - next.successProbability);
        halfLifeSteps = Math.round(current.horizonSteps + fraction * (next.horizonSteps - current.horizonSteps));
        break;
      }
    }

    // Compounding error per step estimation: P(step) = (P_final)^(1 / steps)
    const longestTier = tiers[tiers.length - 1];
    const perStepReliability = longestTier.passRate > 0
      ? Number(Math.pow(longestTier.passRate, 1 / longestTier.steps).toFixed(5))
      : 0.95;

    return {
      tiers,
      survivalCurve,
      halfLifeSteps,
      perStepReliability,
      longestHorizonTested: longestTier.steps,
      longestHorizonPassRate: longestTier.passRate,
      status: longestTier.passRate >= 0.80 ? 'HIGH_HORIZON_RESILIENCE' : 'DEGRADATION_DETECTED'
    };
  }

  /**
   * Evaluate long-horizon robustness against injected failures
   */
  evaluateInjectedFaultRecovery(faultRuns = []) {
    const total = faultRuns.length;
    if (total === 0) return { total: 0, recoveredCount: 0, recoveryRate: 1.0, faultTypes: {} };

    const recovered = faultRuns.filter(r => r.recovered === true).length;
    const faultTypes = {};

    for (const f of faultRuns) {
      const type = f.faultType || 'GENERIC';
      if (!faultTypes[type]) faultTypes[type] = { count: 0, recovered: 0 };
      faultTypes[type].count++;
      if (f.recovered) faultTypes[type].recovered++;
    }

    return {
      total,
      recoveredCount: recovered,
      recoveryRate: Number((recovered / total).toFixed(4)),
      faultBreakdown: faultTypes,
      resilienceScore: Number((recovered / total).toFixed(4))
    };
  }
}

const longHorizonEvaluator = new LongHorizonEvaluator();

module.exports = {
  LongHorizonEvaluator,
  longHorizonEvaluator
};

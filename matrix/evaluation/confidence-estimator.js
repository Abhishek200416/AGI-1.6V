/**
 * matrix/evaluation/confidence-estimator.js
 * MATRIX X1.1 — Statistical Confidence & Credible Interval Estimator
 * 
 * Computes:
 * - Wilson Score Interval (recommended for binomial pass-rates with small N)
 * - Bayesian Credible Interval (Beta(1,1) uniform prior)
 * - Standard Error & margin of error at 95% confidence level
 */

class ConfidenceEstimator {
  /**
   * Compute 95% Wilson Score Interval for binomial proportion
   * @param {number} successes - Number of passed tasks
   * @param {number} total - Total number of tasks
   * @param {number} z - Z-score for confidence (default 1.96 for 95%)
   */
  estimateWilsonInterval(successes, total, z = 1.96) {
    if (total <= 0) {
      return { p: 0, lower: 0, upper: 0, margin: 0, n: 0 };
    }

    const p = successes / total;
    const z2 = z * z;
    const denominator = 1 + z2 / total;
    const centerAdjusted = p + z2 / (2 * total);
    const standardError = Math.sqrt((p * (1 - p) + z2 / (4 * total)) / total);

    const lower = Math.max(0, (centerAdjusted - z * standardError) / denominator);
    const upper = Math.min(1, (centerAdjusted + z * standardError) / denominator);
    const margin = (upper - lower) / 2;

    return {
      n: total,
      successes,
      p: Number(p.toFixed(4)),
      lower: Number(lower.toFixed(4)),
      upper: Number(upper.toFixed(4)),
      margin: Number(margin.toFixed(4)),
      confidenceLevel: 0.95
    };
  }

  /**
   * Compute Bayesian Beta-Binomial Credible Interval with Beta(alpha, beta) prior
   */
  estimateBayesianCredibleInterval(successes, total, priorAlpha = 1, priorBeta = 1) {
    if (total <= 0) return { mean: 0.5, lower: 0, upper: 1, variance: 0.083 };

    const alphaPost = priorAlpha + successes;
    const betaPost = priorBeta + (total - successes);
    const mean = alphaPost / (alphaPost + betaPost);
    const variance = (alphaPost * betaPost) / (Math.pow(alphaPost + betaPost, 2) * (alphaPost + betaPost + 1));
    const stdDev = Math.sqrt(variance);

    // Approximate 95% credible bounds via normal approximation of beta posterior
    const lower = Math.max(0, mean - 1.96 * stdDev);
    const upper = Math.min(1, mean + 1.96 * stdDev);

    return {
      n: total,
      posteriorAlpha: alphaPost,
      posteriorBeta: betaPost,
      mean: Number(mean.toFixed(4)),
      lower: Number(lower.toFixed(4)),
      upper: Number(upper.toFixed(4)),
      variance: Number(variance.toFixed(6))
    };
  }

  /**
   * Aggregate confidence estimates for a set of benchmark results
   */
  evaluateBenchmarkConfidence(trials = []) {
    const total = trials.length;
    const successes = trials.filter(t => t.verdict === 'PASS' || t.passed === true).length;
    const wilson = this.estimateWilsonInterval(successes, total);
    const bayesian = this.estimateBayesianCredibleInterval(successes, total);

    return {
      sampleSize: total,
      successes,
      passRate: wilson.p,
      wilson95: { lower: wilson.lower, upper: wilson.upper, margin: wilson.margin },
      bayesian95: { mean: bayesian.mean, lower: bayesian.lower, upper: bayesian.upper }
    };
  }
}

const confidenceEstimator = new ConfidenceEstimator();

module.exports = {
  ConfidenceEstimator,
  confidenceEstimator
};

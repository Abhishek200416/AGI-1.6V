/**
 * matrix/evaluation/generalization-evaluator.js
 * MATRIX X1.1 — Cross-Domain Generalization & Transfer Evaluator
 * 
 * Measures:
 * 1. Out-of-Distribution (OOD) transfer capability
 * 2. Generalization Gap: S_in_distribution - S_out_of_distribution
 * 3. Transfer Ratio: S_ood / S_iid
 * 4. Constraint adaptation under tool restrictions or format shifts
 */

class GeneralizationEvaluator {
  /**
   * Evaluate generalization performance
   * @param {Object} inDomainSummary - { passRate, avgScore }
   * @param {Object} oodSummary - { passRate, avgScore }
   * @param {Array<Object>} shiftResults - Results across specific shift types (domain, constraint, representation)
   */
  evaluateGeneralization(inDomainSummary = {}, oodSummary = {}, shiftResults = []) {
    const iidScore = typeof inDomainSummary.avgScore === 'number' ? inDomainSummary.avgScore : (inDomainSummary.passRate || 1.0);
    const oodScore = typeof oodSummary.avgScore === 'number' ? oodSummary.avgScore : (oodSummary.passRate || 0.0);

    const generalizationGap = Math.max(0, iidScore - oodScore);
    const transferRatio = iidScore > 0 ? Math.min(1.0, oodScore / iidScore) : 0.0;

    // Breakdown by shift dimensions
    const dimensionScores = {
      domainShift: 1.0,
      constraintShift: 1.0,
      representationShift: 1.0
    };

    if (Array.isArray(shiftResults) && shiftResults.length > 0) {
      for (const res of shiftResults) {
        if (res.dimension && dimensionScores[res.dimension] !== undefined) {
          const s = typeof res.score === 'number' ? res.score : (res.passed ? 1.0 : 0.0);
          dimensionScores[res.dimension] = s;
        }
      }
    }

    let verdict = 'EXCELLENT_GENERALIZATION';
    if (generalizationGap > 0.35 || transferRatio < 0.65) {
      verdict = 'POOR_GENERALIZATION_MEMORIZATION_RISK';
    } else if (generalizationGap > 0.15 || transferRatio < 0.85) {
      verdict = 'MODERATE_GENERALIZATION';
    }

    return {
      inDomainScore: Number(iidScore.toFixed(4)),
      outOfDomainScore: Number(oodScore.toFixed(4)),
      generalizationGap: Number(generalizationGap.toFixed(4)),
      transferRatio: Number(transferRatio.toFixed(4)),
      dimensionScores,
      verdict,
      transferRobustness: Number(((transferRatio * 0.7) + ((1.0 - generalizationGap) * 0.3)).toFixed(4))
    };
  }
}

const generalizationEvaluator = new GeneralizationEvaluator();

module.exports = {
  GeneralizationEvaluator,
  generalizationEvaluator
};

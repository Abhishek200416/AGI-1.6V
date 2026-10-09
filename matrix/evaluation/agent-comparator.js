/**
 * matrix/evaluation/agent-comparator.js
 * MATRIX X1.1 — Empirical Agent & Model Comparator
 * 
 * Performs pairwise and matrix comparisons across:
 * - Specialist agents vs Generalist baseline
 * - Reasoning model tiers (Gemini 3.8 Flash vs Gemini 3.8 Pro vs Local)
 * - Pareto frontier analysis (Cost / Latency vs Accuracy)
 */

class AgentComparator {
  /**
   * Compare two agents or models across identical benchmark tasks
   * @param {Array<Object>} agentAResults - [{ taskId, passed, score, latencyMs, tokensUsed, costUsd }]
   * @param {Array<Object>} agentBResults - [{ taskId, passed, score, latencyMs, tokensUsed, costUsd }]
   * @param {string} nameA
   * @param {string} nameB
   */
  comparePairwise(agentAResults = [], agentBResults = [], nameA = 'Agent_A', nameB = 'Agent_B') {
    const mapB = new Map(agentBResults.map(r => [r.taskId, r]));
    let winsA = 0;
    let winsB = 0;
    let ties = 0;
    let sharedTasks = 0;

    let totalScoreA = 0;
    let totalScoreB = 0;
    let totalLatencyA = 0;
    let totalLatencyB = 0;
    let totalCostA = 0;
    let totalCostB = 0;

    for (const a of agentAResults) {
      const b = mapB.get(a.taskId);
      if (!b) continue;

      sharedTasks++;
      const scoreA = typeof a.score === 'number' ? a.score : (a.passed ? 1.0 : 0.0);
      const scoreB = typeof b.score === 'number' ? b.score : (b.passed ? 1.0 : 0.0);

      totalScoreA += scoreA;
      totalScoreB += scoreB;
      totalLatencyA += (a.latencyMs || 0);
      totalLatencyB += (b.latencyMs || 0);
      totalCostA += (a.costUsd || 0);
      totalCostB += (b.costUsd || 0);

      if (scoreA > scoreB) winsA++;
      else if (scoreB > scoreA) winsB++;
      else ties++;
    }

    if (sharedTasks === 0) {
      return { sharedTasks: 0, status: 'NO_SHARED_TASKS' };
    }

    const meanScoreA = Number((totalScoreA / sharedTasks).toFixed(4));
    const meanScoreB = Number((totalScoreB / sharedTasks).toFixed(4));
    const meanLatencyA = Math.round(totalLatencyA / sharedTasks);
    const meanLatencyB = Math.round(totalLatencyB / sharedTasks);

    const scoreDelta = Number((meanScoreA - meanScoreB).toFixed(4));
    const costRatio = totalCostB > 0 ? Number((totalCostA / totalCostB).toFixed(2)) : 1.0;
    const speedup = meanLatencyA > 0 ? Number((meanLatencyB / meanLatencyA).toFixed(2)) : 1.0;

    let winner = 'TIE';
    if (winsA > winsB) winner = nameA;
    else if (winsB > winsA) winner = nameB;

    return {
      nameA,
      nameB,
      sharedTasks,
      winsA,
      winsB,
      ties,
      winner,
      meanScoreA,
      meanScoreB,
      scoreDelta,
      meanLatencyA,
      meanLatencyB,
      speedup,
      totalCostA: Number(totalCostA.toFixed(6)),
      totalCostB: Number(totalCostB.toFixed(6)),
      costRatio,
      winRateA: Number((winsA / sharedTasks).toFixed(4)),
      winRateB: Number((winsB / sharedTasks).toFixed(4))
    };
  }

  /**
   * Build comparison matrix across multiple agents/models
   */
  buildComparisonMatrix(evaluations = {}) {
    const keys = Object.keys(evaluations);
    const matrix = {};

    for (let i = 0; i < keys.length; i++) {
      const aKey = keys[i];
      matrix[aKey] = {};
      for (let j = 0; j < keys.length; j++) {
        const bKey = keys[j];
        if (i === j) {
          matrix[aKey][bKey] = { self: true };
        } else {
          matrix[aKey][bKey] = this.comparePairwise(evaluations[aKey], evaluations[bKey], aKey, bKey);
        }
      }
    }

    return matrix;
  }
}

const agentComparator = new AgentComparator();

module.exports = {
  AgentComparator,
  agentComparator
};

/**
 * matrix/evaluation/agent-evaluator.js
 * MATRIX X1.1 — Comprehensive Individual Agent Evaluator
 * 
 * Runs end-to-end evaluation campaigns against specialist agents:
 * - Measures task success, evidence validity, tool correctness, latency,
 *   token costs, failure rate, intervention rate, and determinism.
 * - Updates persistent Agent Performance Memory.
 */

const { evaluationLedger } = require('./evaluation-ledger');
const { agentPerformanceMemory } = require('./agent-performance-memory');
const { outcomeVerifier } = require('./outcome-verifier');
const { trajectoryEvaluator } = require('./trajectory-evaluator');
const { scoreNormalizer } = require('./score-normalizer');
const { confidenceEstimator } = require('./confidence-estimator');
const { reliabilityEvaluator } = require('./reliability-evaluator');

class AgentEvaluator {
  /**
   * Evaluate an individual agent on a suite of tasks
   * @param {Object} agent - Agent instance or mock wrapper { id, specialization, model, executeTask }
   * @param {Array<Object>} tasks - Array of evaluation tasks
   * @param {Object} options - Evaluation options { trialsPerTask, classification }
   */
  async evaluateAgent(agent, tasks = [], options = {}) {
    const trialsPerTask = options.trialsPerTask || 1;
    const classification = options.classification || 'REAL';
    const startTime = Date.now();

    const taskResults = [];
    const allTrials = [];

    for (const task of tasks) {
      const taskTrials = [];

      for (let t = 0; t < trialsPerTask; t++) {
        const trialStart = Date.now();
        let runRes;
        try {
          runRes = await agent.executeTask(task);
        } catch (err) {
          runRes = { success: false, error: err.message, output: null, trajectory: [] };
        }
        const latencyMs = Date.now() - trialStart;

        const verification = outcomeVerifier.verify(runRes.output, task.expected || {});
        const trajectoryAudit = trajectoryEvaluator.evaluateTrajectory(runRes.trajectory || []);
        const normalized = scoreNormalizer.normalize({
          passed: verification.passed,
          accuracy: verification.score,
          stepsTaken: trajectoryAudit.stepCount,
          maxAllowedSteps: task.maxSteps || 10,
          latencyMs,
          tokensUsed: runRes.tokensUsed || 500,
          budgetTokens: task.budgetTokens || 5000,
          interventions: runRes.interventions || 0,
          retries: runRes.retries || 0
        });

        const trialRecord = {
          trialId: `TRL-${agent.id || agent.specialization}-${task.id}-${t}`,
          benchmark: task.benchmark || 'INTERNAL_CAPABILITY_MATRIX',
          taskFamily: task.family || 'GENERAL',
          taskId: task.id,
          agentId: agent.id || agent.specialization || 'agent',
          model: agent.model || 'gemini-3.8-flash',
          verdict: verification.verdict,
          score: normalized.compositeScore,
          classification,
          latencyMs,
          tokensUsed: runRes.tokensUsed || 500,
          costUsd: runRes.costUsd || 0.0001,
          interventions: runRes.interventions || 0,
          retries: runRes.retries || 0,
          evidence: { verification, trajectoryAudit, normalized },
          metadata: { taskName: task.name, trialIndex: t }
        };

        evaluationLedger.recordTrial(trialRecord);

        // Update persistent memory
        agentPerformanceMemory.recordTrialResult({
          specialization: agent.specialization || agent.id,
          agentId: agent.id,
          model: agent.model || 'gemini-3.8-flash',
          taskFamily: task.family || 'GENERAL',
          passed: verification.passed,
          latencyMs,
          tokensUsed: runRes.tokensUsed || 500,
          costUsd: runRes.costUsd || 0.0001
        });

        taskTrials.push({
          trialIndex: t,
          passed: verification.passed,
          verdict: verification.verdict,
          score: normalized.compositeScore,
          latencyMs,
          tokensUsed: runRes.tokensUsed || 500,
          output: runRes.output
        });

        allTrials.push(trialRecord);
      }

      // Compute task-level reliability across trials
      const taskReliability = reliabilityEvaluator.evaluateReliability(taskTrials);

      taskResults.push({
        taskId: task.id,
        taskFamily: task.family,
        taskName: task.name,
        trials: taskTrials,
        passed: taskReliability.passRate >= 0.8,
        passRate: taskReliability.passRate,
        reliability: taskReliability
      });
    }

    const totalDurationMs = Date.now() - startTime;
    const totalTasks = taskResults.length;
    const passedTasks = taskResults.filter(t => t.passed).length;
    const overallPassRate = totalTasks > 0 ? Number((passedTasks / totalTasks).toFixed(4)) : 0;

    const confidence = confidenceEstimator.estimateWilsonInterval(passedTasks, totalTasks);
    const bayesian = confidenceEstimator.estimateBayesianCredibleInterval(passedTasks, totalTasks);

    const totalTokens = allTrials.reduce((sum, t) => sum + (t.tokensUsed || 0), 0);
    const totalCostUsd = allTrials.reduce((sum, t) => sum + (t.costUsd || 0), 0);
    const avgLatencyMs = allTrials.length > 0 ? Math.round(allTrials.reduce((sum, t) => sum + t.latencyMs, 0) / allTrials.length) : 0;

    return {
      agentId: agent.id || agent.specialization,
      specialization: agent.specialization || 'Generalist',
      model: agent.model || 'gemini-3.8-flash',
      classification,
      totalTasks,
      passedTasks,
      passRate: overallPassRate,
      confidenceInterval95: {
        lower: confidence.lower,
        upper: confidence.upper,
        margin: confidence.margin
      },
      bayesianPosterior: {
        mean: bayesian.mean,
        lower: bayesian.lower,
        upper: bayesian.upper
      },
      avgLatencyMs,
      totalTokens,
      totalCostUsd: Number(totalCostUsd.toFixed(6)),
      totalDurationMs,
      taskResults
    };
  }
}

const agentEvaluator = new AgentEvaluator();

module.exports = {
  AgentEvaluator,
  agentEvaluator
};

/**
 * matrix/evaluation/trajectory-evaluator.js
 * MATRIX X1.1 — Trajectory Evaluator
 * 
 * Performs fine-grained audit on multi-step action trajectories:
 * - Detects looping / redundant tool calls
 * - Measures step efficiency ratio against shortest observed path
 * - Evaluates recovery from intermediate errors
 * - Detects illegal or hallucinated tool invocations
 */

class TrajectoryEvaluator {
  /**
   * Evaluate an action trajectory
   * @param {Array<Object>} trajectory - Array of action steps { step, action, tool, input, output, success, durationMs }
   * @param {Object} context - Optional expectations { availableTools, minSteps, maxSteps }
   */
  evaluateTrajectory(trajectory = [], context = {}) {
    if (!Array.isArray(trajectory) || trajectory.length === 0) {
      return {
        stepCount: 0,
        efficiencyScore: 0.0,
        loopDetected: false,
        redundantStepsCount: 0,
        recoveryRate: 1.0,
        illegalToolCalls: [],
        trajectoryScore: 0.0,
        summary: 'EMPTY_TRAJECTORY'
      };
    }

    const availableTools = new Set(context.availableTools || []);
    const seenActionHashes = new Map();
    let redundantStepsCount = 0;
    const illegalToolCalls = [];
    let intermediateErrors = 0;
    let successfulRecoveries = 0;

    for (let i = 0; i < trajectory.length; i++) {
      const step = trajectory[i];
      const actionKey = `${step.action || step.tool}:${JSON.stringify(step.input || {})}`;

      // Check redundancy
      if (seenActionHashes.has(actionKey)) {
        redundantStepsCount++;
      } else {
        seenActionHashes.set(actionKey, i);
      }

      // Check tool validity
      if (step.tool && availableTools.size > 0 && !availableTools.has(step.tool)) {
        illegalToolCalls.push({ step: i, tool: step.tool });
      }

      // Check error and recovery
      if (step.success === false || step.error) {
        intermediateErrors++;
        // Check if subsequent step succeeded
        if (i + 1 < trajectory.length && trajectory[i + 1].success !== false && !trajectory[i + 1].error) {
          successfulRecoveries++;
        }
      }
    }

    const loopDetected = redundantStepsCount >= 2;
    const stepCount = trajectory.length;
    const maxAllowed = context.maxSteps || Math.max(10, stepCount * 1.5);
    const stepEfficiency = Math.max(0.1, Math.min(1.0, 1.0 - ((stepCount - 1) / maxAllowed)));

    const recoveryRate = intermediateErrors > 0 ? (successfulRecoveries / intermediateErrors) : 1.0;
    const legalityScore = illegalToolCalls.length === 0 ? 1.0 : Math.max(0, 1.0 - (illegalToolCalls.length * 0.3));
    const redundancyPenalty = Math.min(0.5, redundantStepsCount * 0.1);

    const trajectoryScore = Math.max(0, Math.min(1.0, (
      (stepEfficiency * 0.4) +
      (recoveryRate * 0.3) +
      (legalityScore * 0.3) -
      redundancyPenalty
    )));

    return {
      stepCount,
      efficiencyScore: Number(stepEfficiency.toFixed(4)),
      loopDetected,
      redundantStepsCount,
      intermediateErrors,
      successfulRecoveries,
      recoveryRate: Number(recoveryRate.toFixed(4)),
      illegalToolCalls,
      trajectoryScore: Number(trajectoryScore.toFixed(4)),
      summary: loopDetected ? 'REDUNDANT_LOOP_DETECTED' : (illegalToolCalls.length > 0 ? 'ILLEGAL_TOOLS_USED' : 'CLEAN_TRAJECTORY')
    };
  }
}

const trajectoryEvaluator = new TrajectoryEvaluator();

module.exports = {
  TrajectoryEvaluator,
  trajectoryEvaluator
};

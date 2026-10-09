/**
 * matrix/evaluation/benchmark-adapter.js
 * MATRIX X1.1 — Standardized Benchmark Adapters
 * 
 * Provides base adapter and concrete runners for external benchmarks:
 * - GAIA
 * - BrowseComp
 * - OSWorld-Verified
 * - OSWorld-2.0
 * - WebArena
 * - SWE-bench-Verified
 * - Terminal-Bench-4.0
 * - Agents-Last-Exam
 * - METR-Horizon
 * - DeepSWE
 * - HLE-Verified
 */

const { evaluationLedger } = require('./evaluation-ledger');
const { outcomeVerifier } = require('./outcome-verifier');
const { scoreNormalizer } = require('./score-normalizer');
const { trajectoryEvaluator } = require('./trajectory-evaluator');

class BenchmarkAdapter {
  constructor(benchmarkKey, benchmarkInfo = {}) {
    this.benchmarkKey = benchmarkKey;
    this.info = benchmarkInfo;
  }

  async setup(task) {
    return { status: 'READY', taskId: task.id };
  }

  async runTask(task, agent) {
    const startTime = Date.now();
    const trajectory = [];

    try {
      // Execute through agent
      const runRes = await agent.executeTask(task);
      const latencyMs = Date.now() - startTime;

      if (Array.isArray(runRes.trajectory)) {
        trajectory.push(...runRes.trajectory);
      } else {
        trajectory.push({
          step: 1,
          action: 'EXECUTE',
          tool: runRes.toolUsed || 'native',
          input: task.prompt,
          output: runRes.output,
          success: runRes.success !== false,
          durationMs: latencyMs
        });
      }

      return {
        success: runRes.success !== false,
        output: runRes.output,
        trajectory,
        latencyMs,
        tokensUsed: runRes.tokensUsed || 500,
        costUsd: runRes.costUsd || 0.0001,
        interventions: runRes.interventions || 0,
        retries: runRes.retries || 0
      };
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      return {
        success: false,
        error: err.message,
        output: null,
        trajectory: [{ step: 1, action: 'FAIL', error: err.message, durationMs: latencyMs }],
        latencyMs,
        tokensUsed: 200,
        costUsd: 0.00005,
        interventions: 0,
        retries: 1
      };
    }
  }

  async verifyOutcome(task, runResult) {
    if (!runResult.success) {
      return { passed: false, verdict: 'FAIL', score: 0.0, checks: [{ passed: false, error: runResult.error }] };
    }
    return outcomeVerifier.verify(runResult.output, task.expected || {});
  }

  async teardown(task) {
    return { status: 'CLEANED_UP', taskId: task.id };
  }

  async evaluateTask(task, agent, classification = 'REAL') {
    await this.setup(task);
    const runResult = await this.runTask(task, agent);
    const verification = await this.verifyOutcome(task, runResult);
    const trajectoryAudit = trajectoryEvaluator.evaluateTrajectory(runResult.trajectory);
    await this.teardown(task);

    const normalized = scoreNormalizer.normalize({
      passed: verification.passed,
      accuracy: verification.score,
      stepsTaken: trajectoryAudit.stepCount,
      maxAllowedSteps: task.maxSteps || 10,
      latencyMs: runResult.latencyMs,
      tokensUsed: runResult.tokensUsed,
      budgetTokens: task.budgetTokens || 5000,
      interventions: runResult.interventions,
      retries: runResult.retries
    });

    const trialRecord = {
      benchmark: this.benchmarkKey,
      taskFamily: task.family || 'GENERAL',
      taskId: task.id,
      agentId: agent.id || agent.name || 'agent',
      model: agent.model || 'gemini-3.8-flash',
      verdict: verification.verdict,
      score: normalized.compositeScore,
      classification,
      latencyMs: runResult.latencyMs,
      tokensUsed: runResult.tokensUsed,
      costUsd: runResult.costUsd,
      interventions: runResult.interventions,
      retries: runResult.retries,
      evidence: { verification, trajectoryAudit, normalized },
      metadata: { taskName: task.name }
    };

    evaluationLedger.recordTrial(trialRecord);

    return {
      taskId: task.id,
      benchmark: this.benchmarkKey,
      passed: verification.passed,
      verdict: verification.verdict,
      score: normalized.compositeScore,
      latencyMs: runResult.latencyMs,
      tokensUsed: runResult.tokensUsed,
      verification,
      trajectoryAudit,
      normalized
    };
  }
}

// Concrete Benchmark Adapters
class GAIAAdapter extends BenchmarkAdapter {
  constructor() {
    super('GAIA', { requiresWeb: true, requiresTools: true });
  }
}

class BrowseCompAdapter extends BenchmarkAdapter {
  constructor() {
    super('BrowseComp', { requiresBrowser: true });
  }
}

class OSWorldAdapter extends BenchmarkAdapter {
  constructor() {
    super('OSWorld-Verified', { requiresOS: true });
  }
}

class WebArenaAdapter extends BenchmarkAdapter {
  constructor() {
    super('WebArena', { requiresBrowser: true, requiresMultiTab: true });
  }
}

class SWEBenchAdapter extends BenchmarkAdapter {
  constructor() {
    super('SWE-bench-Verified', { requiresTerminal: true, requiresCode: true });
  }
}

class TerminalBenchAdapter extends BenchmarkAdapter {
  constructor() {
    super('Terminal-Bench-4.0', { requiresTerminal: true });
  }
}

class AgentsLastExamAdapter extends BenchmarkAdapter {
  constructor() {
    super('Agents-Last-Exam', { requiresDeepReasoning: true });
  }
}

class METRHorizonAdapter extends BenchmarkAdapter {
  constructor() {
    super('METR-Horizon', { requiresLongHorizon: true, requiresCheckpoint: true });
  }
}

class DeepSWEAdapter extends BenchmarkAdapter {
  constructor() {
    super('DeepSWE', { requiresMultiFileCode: true });
  }
}

class HLEAdapter extends BenchmarkAdapter {
  constructor() {
    super('HLE-Verified', { requiresFormalReasoning: true });
  }
}

module.exports = {
  BenchmarkAdapter,
  GAIAAdapter,
  BrowseCompAdapter,
  OSWorldAdapter,
  WebArenaAdapter,
  SWEBenchAdapter,
  TerminalBenchAdapter,
  AgentsLastExamAdapter,
  METRHorizonAdapter,
  DeepSWEAdapter,
  HLEAdapter
};

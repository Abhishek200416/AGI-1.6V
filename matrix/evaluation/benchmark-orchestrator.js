/**
 * matrix/evaluation/benchmark-orchestrator.js
 * MATRIX X1.1 — Master Benchmark & Evaluation Orchestrator
 * 
 * Coordinates multi-agent evaluation campaigns across:
 * - Internal 100-Task Capability Matrix
 * - External Benchmark Suite Adapters
 * - Continuous Regression Detection
 * - Automated Ledger Persistence
 */

const { taskGenerator } = require('./task-generator');
const { benchmarkRegistry } = require('./benchmark-registry');
const { evaluationLedger } = require('./evaluation-ledger');
const { confidenceEstimator } = require('./confidence-estimator');
const { regressionEvaluator } = require('./regression-evaluator');
const { agentEvaluator } = require('./agent-evaluator');
const {
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
} = require('./benchmark-adapter');

class BenchmarkOrchestrator {
  constructor() {
    this.adapters = {
      'GAIA': new GAIAAdapter(),
      'BrowseComp': new BrowseCompAdapter(),
      'OSWorld-Verified': new OSWorldAdapter(),
      'WebArena': new WebArenaAdapter(),
      'SWE-bench-Verified': new SWEBenchAdapter(),
      'Terminal-Bench-4.0': new TerminalBenchAdapter(),
      'Agents-Last-Exam': new AgentsLastExamAdapter(),
      'METR-Horizon': new METRHorizonAdapter(),
      'DeepSWE': new DeepSWEAdapter(),
      'HLE-Verified': new HLEAdapter()
    };
  }

  /**
   * Run the full Internal Capability Matrix (held-out tasks per family)
   */
  async runCapabilityMatrix(agent, options = {}) {
    const tasksPerFamily = options.tasksPerFamily || 5;
    const tasks = taskGenerator.generateMatrix(tasksPerFamily, options);
    
    const evalResult = await agentEvaluator.evaluateAgent(agent, tasks, {
      trialsPerTask: options.trialsPerTask || 1,
      classification: options.classification || 'REAL'
    });

    // Family-level breakdowns
    const familyBreakdown = {};
    for (const r of evalResult.taskResults) {
      const f = r.taskFamily || 'GENERAL';
      if (!familyBreakdown[f]) {
        familyBreakdown[f] = { total: 0, passed: 0 };
      }
      familyBreakdown[f].total += 1;
      if (r.passed) familyBreakdown[f].passed += 1;
    }

    for (const [f, stat] of Object.entries(familyBreakdown)) {
      stat.passRate = Number((stat.passed / stat.total).toFixed(4));
    }

    return {
      type: 'INTERNAL_CAPABILITY_MATRIX',
      agentId: agent.id || agent.specialization,
      totalTasks: evalResult.totalTasks,
      passedTasks: evalResult.passedTasks,
      passRate: evalResult.passRate,
      confidenceInterval95: evalResult.confidenceInterval95,
      bayesianPosterior: evalResult.bayesianPosterior,
      avgLatencyMs: evalResult.avgLatencyMs,
      totalTokens: evalResult.totalTokens,
      totalCostUsd: evalResult.totalCostUsd,
      familyBreakdown,
      taskResults: evalResult.taskResults
    };
  }

  /**
   * Run an external benchmark adapter on a target agent
   */
  async runExternalBenchmark(benchmarkKey, agent, sampleTasks = [], options = {}) {
    const adapter = this.adapters[benchmarkKey];
    if (!adapter) {
      throw new Error(`Benchmark adapter '${benchmarkKey}' is not registered`);
    }

    const classification = options.classification || 'REAL';
    const results = [];

    for (const task of sampleTasks) {
      const trial = await adapter.evaluateTask(task, agent, classification);
      results.push(trial);
    }

    const total = results.length;
    const passed = results.filter(r => r.passed).length;
    const passRate = total > 0 ? Number((passed / total).toFixed(4)) : 0;
    const avgScore = total > 0 ? Number((results.reduce((s, r) => s + r.score, 0) / total).toFixed(4)) : 0;
    const confidence = confidenceEstimator.estimateWilsonInterval(passed, total);

    return {
      benchmark: benchmarkKey,
      agentId: agent.id || agent.specialization,
      model: agent.model || 'gemini-3.8-flash',
      classification,
      totalTasks: total,
      passedTasks: passed,
      passRate,
      avgScore,
      confidenceInterval95: { lower: confidence.lower, upper: confidence.upper },
      results
    };
  }

  /**
   * Run full regression evaluation comparing current run vs baseline
   */
  evaluateAgainstBaseline(baselineSummary, currentSummary) {
    return regressionEvaluator.evaluateRegression(baselineSummary, currentSummary);
  }
}

const benchmarkOrchestrator = new BenchmarkOrchestrator();

module.exports = {
  BenchmarkOrchestrator,
  benchmarkOrchestrator
};

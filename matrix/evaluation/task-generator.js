/**
 * matrix/evaluation/task-generator.js
 * MATRIX X1.1 — Held-Out Evaluation Task Generator
 * 
 * Generates reproducible, parameterized evaluation tasks across the
 * 18 major capability families to prevent memorization and test true generalization.
 */

const crypto = require('crypto');

const TASK_FAMILIES = [
  'REASONING',
  'RESEARCH',
  'WEB',
  'BROWSER',
  'COMPUTER_USE',
  'CODING',
  'TERMINAL',
  'FILE_SYSTEM',
  'MEMORY',
  'GENERALIZATION',
  'CAPABILITY_ACQUISITION',
  'SELF_IMPROVEMENT',
  'FAILURE_RECOVERY',
  'LONG_HORIZON',
  'MULTI_AGENT',
  'SECURITY',
  'VERIFICATION',
  'RESOURCE_ECONOMY'
];

class TaskGenerator {
  constructor() {
    this.families = TASK_FAMILIES;
  }

  /**
   * Generate a unique pseudo-random seed
   */
  generateSeed(base = '') {
    return crypto.createHash('sha256').update(base + Date.now().toString()).digest('hex').substring(0, 8);
  }

  /**
   * Generate an evaluation task for a specific family
   */
  generateTask(family, index = 1, options = {}) {
    const seed = options.seed || this.generateSeed(`${family}-${index}`);
    const isPerturbed = Boolean(options.perturbed);

    switch (family) {
      case 'REASONING': {
        const a = (parseInt(seed.substring(0, 2), 16) % 50) + 10;
        const b = (parseInt(seed.substring(2, 4), 16) % 50) + 10;
        const target = a * b + (isPerturbed ? 5 : 0);
        return {
          id: `TSK-REAS-${index}-${seed}`,
          family,
          name: `Mathematical Deduction & Symbolic Constraint #${index}`,
          prompt: `Calculate the product of ${a} and ${b}${isPerturbed ? ' and then add 5' : ''}. Return exact integer.`,
          expected: { exact: target, numericTarget: target },
          familyCategory: 'REASONING',
          maxSteps: 3,
          budgetTokens: 500
        };
      }

      case 'RESEARCH': {
        return {
          id: `TSK-RES-${index}-${seed}`,
          family,
          name: `Multi-Source Factual Synthesis #${index}`,
          prompt: `Synthesize physical properties of high-altitude balloon lift gas: helium vs hydrogen with reference to molecular mass and lift density.`,
          expected: { requiredKeywords: ['helium', 'hydrogen', 'density', 'lift'] },
          familyCategory: 'RESEARCH',
          maxSteps: 5,
          budgetTokens: 2000
        };
      }

      case 'WEB': {
        return {
          id: `TSK-WEB-${index}-${seed}`,
          family,
          name: `Live Public Endpoint Verification #${index}`,
          prompt: `Fetch live public endpoint and verify status code 200 and schema payload.`,
          url: 'https://httpbin.org/get',
          expected: { exactStatus: 200, requiredKeywords: ['origin', 'headers'] },
          familyCategory: 'WEB',
          maxSteps: 4,
          budgetTokens: 1000
        };
      }

      case 'BROWSER': {
        return {
          id: `TSK-BRW-${index}-${seed}`,
          family,
          name: `DOM Navigation, Form Input & Snapshot #${index}`,
          prompt: `Navigate to page, locate search input, enter query '${seed}', submit form, and verify title change.`,
          expected: { requiredKeywords: ['search', 'success'] },
          familyCategory: 'BROWSER',
          maxSteps: 6,
          budgetTokens: 2500
        };
      }

      case 'COMPUTER_USE': {
        return {
          id: `TSK-CPU-${index}-${seed}`,
          family,
          name: `Desktop Window & Process State Differencing #${index}`,
          prompt: `Inspect active host processes, filter for node runtime, and capture before/after memory footprint delta.`,
          expected: { customVerifier: res => res && typeof res.processesCount === 'number' && res.processesCount > 0 },
          familyCategory: 'COMPUTER_USE',
          maxSteps: 4,
          budgetTokens: 1500
        };
      }

      case 'CODING': {
        const funcName = `fibonacci_${seed.substring(0, 4)}`;
        return {
          id: `TSK-CODE-${index}-${seed}`,
          family,
          name: `Algorithmic Function Synthesis #${index}`,
          prompt: `Implement function ${funcName}(n) that returns the n-th Fibonacci number. Verify fib(10) == 55.`,
          expected: { customVerifier: res => res && res.result === 55 },
          familyCategory: 'CODING',
          maxSteps: 5,
          budgetTokens: 2000
        };
      }

      case 'TERMINAL': {
        return {
          id: `TSK-TERM-${index}-${seed}`,
          family,
          name: `Streaming Command & Process Lifecycle Execution #${index}`,
          prompt: `Execute shell command with stdout streaming, capture output buffer, and exit cleanly with code 0.`,
          command: `echo "MATRIX_TERMINAL_${seed}"`,
          expected: { requiredKeywords: [`MATRIX_TERMINAL_${seed}`] },
          familyCategory: 'TERMINAL',
          maxSteps: 3,
          budgetTokens: 1000
        };
      }

      case 'FILE_SYSTEM': {
        const fileName = `test_file_${seed}.txt`;
        return {
          id: `TSK-FS-${index}-${seed}`,
          family,
          name: `Atomic Disk Write & Integrity Verification #${index}`,
          prompt: `Write file ${fileName} with checksum verification and confirm non-empty file stats.`,
          expected: { customVerifier: res => res && res.written === true && res.bytes > 0 },
          familyCategory: 'FILE_SYSTEM',
          maxSteps: 3,
          budgetTokens: 800
        };
      }

      case 'MEMORY': {
        return {
          id: `TSK-MEM-${index}-${seed}`,
          family,
          name: `Multi-Scope Epistemic Graph Persistence & Recall #${index}`,
          prompt: `Store proposition P_${seed} with epistemic status VERIFIED, simulate restart, and query graph by node key.`,
          expected: { requiredKeywords: [`P_${seed}`, 'VERIFIED'] },
          familyCategory: 'MEMORY',
          maxSteps: 4,
          budgetTokens: 1500
        };
      }

      case 'GENERALIZATION': {
        return {
          id: `TSK-GEN-${index}-${seed}`,
          family,
          name: `Out-of-Distribution Representation Transfer #${index}`,
          prompt: `Convert nested JSON dataset with novel key format into canonical tabular structure without losing leaf values.`,
          expected: { customVerifier: res => res && Array.isArray(res.rows) && res.rows.length > 0 },
          familyCategory: 'GENERALIZATION',
          maxSteps: 4,
          budgetTokens: 1500
        };
      }

      case 'CAPABILITY_ACQUISITION': {
        return {
          id: `TSK-ACQ-${index}-${seed}`,
          family,
          name: `Sandbox Proving & Dynamic Node Registration #${index}`,
          prompt: `Prove candidate tool 'Adler32Checksum_${seed}' in quarantine sandbox with benchmark verification before graph registration.`,
          expected: { customVerifier: res => res && res.proven === true && res.registered === true },
          familyCategory: 'CAPABILITY_ACQUISITION',
          maxSteps: 5,
          budgetTokens: 2500
        };
      }

      case 'SELF_IMPROVEMENT': {
        return {
          id: `TSK-OPT-${index}-${seed}`,
          family,
          name: `Empirical Nanosecond A/B Optimization #${index}`,
          prompt: `Evaluate algorithmic candidate against baseline with high-resolution timer. Promote only if speedup > 5% and regression tests pass.`,
          expected: { customVerifier: res => res && (res.promoted === true || res.rejectedDueToRegression === true) },
          familyCategory: 'SELF_IMPROVEMENT',
          maxSteps: 6,
          budgetTokens: 3000
        };
      }

      case 'FAILURE_RECOVERY': {
        return {
          id: `TSK-REC-${index}-${seed}`,
          family,
          name: `Autonomous Post-Mortem & Failover Strategy Shift #${index}`,
          prompt: `Inject synthetic service timeout, record structured post-mortem FAIL_${seed}, and successfully execute alternative secondary path.`,
          expected: { requiredKeywords: ['post-mortem', 'recovered'] },
          familyCategory: 'FAILURE_RECOVERY',
          maxSteps: 5,
          budgetTokens: 2000
        };
      }

      case 'LONG_HORIZON': {
        return {
          id: `TSK-LH-${index}-${seed}`,
          family,
          name: `Multi-Phase Mission with Heartbeat & Checkpoints #${index}`,
          prompt: `Execute 5-milestone pipeline, persist checkpoint at step 3, simulate interrupt, and complete milestone 5 with zero state corruption.`,
          expected: { customVerifier: res => res && res.milestonesCompleted === 5 },
          familyCategory: 'LONG_HORIZON',
          maxSteps: 10,
          budgetTokens: 4000
        };
      }

      case 'MULTI_AGENT': {
        return {
          id: `TSK-MAGT-${index}-${seed}`,
          family,
          name: `Specialist Collaboration & Adversarial Critic Arbitration #${index}`,
          prompt: `Compile specialist workforce (Specialist + Critic + Judge), debate trade-off proposition, and produce certified consensus verdict.`,
          expected: { requiredKeywords: ['verdict', 'consensus'] },
          familyCategory: 'MULTI_AGENT',
          maxSteps: 6,
          budgetTokens: 3500
        };
      }

      case 'SECURITY': {
        return {
          id: `TSK-SEC-${index}-${seed}`,
          family,
          name: `Zero Credential Leakage & Boundary Enforcement #${index}`,
          prompt: `Execute pipeline with dummy API key 'sk-proj-supersecret9981' and confirm all telemetry and ledger entries scrub the key to [REDACTED].`,
          expected: { customVerifier: res => res && !res.rawOutput.includes('supersecret9981') },
          familyCategory: 'SECURITY',
          maxSteps: 4,
          budgetTokens: 1200
        };
      }

      case 'VERIFICATION': {
        return {
          id: `TSK-VER-${index}-${seed}`,
          family,
          name: `Proof-Carrying Delivery & Independent Judge Certification #${index}`,
          prompt: `Produce deliverable D_${seed} with empirical assertions. Run independent Critic/Judge to certify evidence validity.`,
          expected: { customVerifier: res => res && res.certified === true },
          familyCategory: 'VERIFICATION',
          maxSteps: 5,
          budgetTokens: 2000
        };
      }

      case 'RESOURCE_ECONOMY': {
        return {
          id: `TSK-ECO-${index}-${seed}`,
          family,
          name: `Token & Latency Pre-Flight Optimization #${index}`,
          prompt: `Optimize prompt and model selection to achieve cost reduction while preserving 100% output accuracy.`,
          expected: { customVerifier: res => res && res.costSavingsPercent > 0 && res.accuracy === 1.0 },
          familyCategory: 'RESOURCE_ECONOMY',
          maxSteps: 4,
          budgetTokens: 1000
        };
      }

      default: {
        return {
          id: `TSK-GEN-${index}-${seed}`,
          family: 'GENERAL',
          name: `Default Task #${index}`,
          prompt: `Echo verification string ${seed}`,
          expected: { exact: seed },
          familyCategory: 'GENERAL',
          maxSteps: 2,
          budgetTokens: 500
        };
      }
    }
  }

  /**
   * Generate an entire held-out capability matrix of N tasks per family
   */
  generateMatrix(tasksPerFamily = 5, options = {}) {
    const matrix = [];
    for (const family of this.families) {
      for (let i = 1; i <= tasksPerFamily; i++) {
        matrix.push(this.generateTask(family, i, options));
      }
    }
    return matrix;
  }
}

const taskGenerator = new TaskGenerator();

module.exports = {
  TASK_FAMILIES,
  TaskGenerator,
  taskGenerator
};

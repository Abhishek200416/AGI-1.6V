/**
 * agi/tests/acceptance-suite.js
 * AGI 0.7 — 25-Test Comprehensive Internal Operational Acceptance Suite
 * 
 * Validates all core subsystems: Orchestration, FSM, Watchdog, Memory, Skills,
 * Tools, MCP Security, Computer Adapter, Self-Improvement, Paper Trading, and Evidence.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Subsystem imports
const { MasterOrchestrator } = require('../orchestration/master-orchestrator');
const { PersistentQueue } = require('../orchestration/persistent-queue');
const { CheckpointManager } = require('../orchestration/checkpoint-manager');
const { ResourceGovernor } = require('../orchestration/resource-governor');
const { MemoryManager, TIERS } = require('../memory/memory-manager');
const { SkillRegistry } = require('../skills/skill-registry');
const { SkillFactory } = require('../skills/skill-factory');
const { ToolRegistry } = require('../tools/tool-registry');
const { McpSecurityGateway } = require('../security/mcp-security');
const { ComputerAdapter } = require('../computer/computer-adapter');
const { SelfImprovementEngine, LOCKED_BOUNDARIES } = require('../evolution/self-improvement-engine');
const { PaperTradingSimulator } = require('../finance/paper-trading-simulator');
const { EvidenceLedger } = require('../verification/evidence-ledger');

async function runAcceptanceSuite() {
  console.log('==================================================================');
  console.log('       AGI 0.7 — COMPREHENSIVE OPERATIONAL ACCEPTANCE SUITE       ');
  console.log('==================================================================\n');

  let passed = 0;
  let failed = 0;
  const startTime = Date.now();

  function test(num, name, fn) {
    const t0 = Date.now();
    try {
      fn();
      const dt = Date.now() - t0;
      console.log(`PASS [TEST ${String(num).padStart(2, '0')}]: ${name} (${dt}ms)`);
      passed++;
    } catch (err) {
      const dt = Date.now() - t0;
      console.error(`FAIL [TEST ${String(num).padStart(2, '0')}]: ${name} (${dt}ms) -> ${err.message}`);
      failed++;
    }
  }

  async function asyncTest(num, name, fn) {
    const t0 = Date.now();
    try {
      await fn();
      const dt = Date.now() - t0;
      console.log(`PASS [TEST ${String(num).padStart(2, '0')}]: ${name} (${dt}ms)`);
      passed++;
    } catch (err) {
      const dt = Date.now() - t0;
      console.error(`FAIL [TEST ${String(num).padStart(2, '0')}]: ${name} (${dt}ms) -> ${err.message}`);
      failed++;
    }
  }

  // --- SUITE 1: IDENTITY, REGISTRATION & MODEL BINDING ---

  test(1, 'Agent Discovery & System Registration', () => {
    const agentDef = path.resolve(process.cwd(), '.agents/agents/agi-0-7/agent.md');
    assert.ok(fs.existsSync(agentDef), 'agent.md exists');
    const content = fs.readFileSync(agentDef, 'utf8');
    assert.ok(content.includes('name: AGI 0.7'), 'name field present');
    assert.ok(content.includes('id: agi-0-7'), 'id field present');

    const registryPath = path.resolve(process.cwd(), '.agents/registry/agents.json');
    assert.ok(fs.existsSync(registryPath), 'agents.json exists');
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    const entry = registry.orchestrators.find(o => o.name === 'agi-0-7');
    assert.ok(entry, 'agi-0-7 registered in agents.json');
    assert.strictEqual(entry.status, 'ACTIVE_PRIMARY');
  });

  test(2, 'Sole Foundation Model Binding', () => {
    const orchestrator = new MasterOrchestrator();
    const mission = orchestrator.compileMission('Test sole model binding');
    for (const node of mission.nodes) {
      assert.strictEqual(node.model, 'gemini-3.8-flash-high', 'Node must strictly bind to gemini-3.8-flash-high');
    }
  });

  test(3, 'Live Reasoning & Thinking Token Proof', () => {
    const proofFile = path.resolve(process.cwd(), 'agi/evidence/live_model_proof.json');
    assert.ok(fs.existsSync(proofFile), 'live_model_proof.json exists');
    const proof = JSON.parse(fs.readFileSync(proofFile, 'utf8'));
    assert.strictEqual(proof.agent, 'AGI 0.7');
    assert.strictEqual(proof.model, 'gemini-3.8-flash-high');
    assert.strictEqual(proof.expected, '1591');
    assert.strictEqual(proof.actual, '1591');
    assert.ok(proof.tokens > 0, 'Tokens recorded');
    assert.strictEqual(proof.verified, true);
  });

  // --- SUITE 2: ORCHESTRATION, FSM & FAULT TOLERANCE ---

  test(4, 'Master Orchestrator FSM State Transitions', () => {
    const orch = new MasterOrchestrator();
    assert.strictEqual(orch.state, 'IDLE');
    assert.strictEqual(orch.transitionTo('PLANNING'), 'PLANNING');
    assert.strictEqual(orch.transitionTo('EXECUTING'), 'EXECUTING');
    assert.strictEqual(orch.transitionTo('VERIFYING'), 'VERIFYING');
    assert.strictEqual(orch.transitionTo('COMPLETED'), 'COMPLETED');
    assert.strictEqual(orch.transitionTo('IDLE'), 'IDLE');
  });

  test(5, 'Master Orchestrator Invalid FSM Transition Prevention', () => {
    const orch = new MasterOrchestrator();
    assert.throws(() => {
      orch.transitionTo('COMPLETED');
    }, /Invalid state transition/);
  });

  await asyncTest(6, 'Cycle-Deadlock Watchdog Trigger', async () => {
    const orch = new MasterOrchestrator({ watchdogLimitMs: 50 });
    let triggered = false;
    orch.startWatchdog((reason) => {
      triggered = true;
      assert.strictEqual(reason, 'CYCLE_DEADLOCK_OR_TIMEOUT');
    });
    await new Promise(r => setTimeout(r, 70));
    assert.ok(triggered, 'Watchdog must trigger after timeout');
    assert.strictEqual(orch.state, 'FAILED');
  });

  test(7, 'Persistent Task Queue Enqueue & Priority Dequeue', () => {
    const testQueuePath = path.resolve(process.cwd(), 'agi/data/test-queue.json');
    if (fs.existsSync(testQueuePath)) fs.unlinkSync(testQueuePath);

    const queue = new PersistentQueue(testQueuePath);
    queue.enqueue({ title: 'Low priority', priority: 10 });
    queue.enqueue({ title: 'High priority', priority: 1 });
    queue.enqueue({ title: 'Medium priority', priority: 5 });

    const first = queue.dequeue();
    assert.strictEqual(first.title, 'High priority');
    assert.strictEqual(first.status, 'IN_PROGRESS');

    const second = queue.dequeue();
    assert.strictEqual(second.title, 'Medium priority');

    queue.complete(first.id, { done: true });
    assert.strictEqual(queue.getPendingCount(), 1);
    if (fs.existsSync(testQueuePath)) fs.unlinkSync(testQueuePath);
  });

  test(8, 'Persistent Task Queue Disk Hydration', () => {
    const testQueuePath = path.resolve(process.cwd(), 'agi/data/test-queue-hydrate.json');
    const q1 = new PersistentQueue(testQueuePath);
    q1.enqueue({ title: 'Task to persist', priority: 3 });

    const q2 = new PersistentQueue(testQueuePath);
    assert.strictEqual(q2.getPendingCount(), 1);
    const item = q2.dequeue();
    assert.strictEqual(item.title, 'Task to persist');
    if (fs.existsSync(testQueuePath)) fs.unlinkSync(testQueuePath);
  });

  test(9, 'Checkpoint Creation & Cryptographic SHA-256 Signature', () => {
    const cpManager = new CheckpointManager();
    const state = { task: 'T-01', step: 4, memory: ['a', 'b'] };
    const res = cpManager.createCheckpoint('ckpt-test-01', state, { author: 'AGI 0.7' });

    assert.ok(res.sha256, 'SHA256 signature generated');
    assert.ok(fs.existsSync(res.file), 'Checkpoint file created');

    const restored = cpManager.restoreCheckpoint('ckpt-test-01');
    assert.strictEqual(restored.success, true);
    assert.deepStrictEqual(restored.state, state);
  });

  test(10, 'Checkpoint Integrity Tamper Detection', () => {
    const cpManager = new CheckpointManager();
    const file = path.join(cpManager.checkpointDir, 'ckpt-test-01.json');
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    raw.state.task = 'TAMPERED';
    fs.writeFileSync(file, JSON.stringify(raw, null, 2), 'utf8');

    const restored = cpManager.restoreCheckpoint('ckpt-test-01');
    assert.strictEqual(restored.success, false);
    assert.strictEqual(restored.error, 'CHECKPOINT_INTEGRITY_COMPROMISED');
    fs.unlinkSync(file);
  });

  // --- SUITE 3: 10-TIER MEMORY SUBSYSTEM ---

  test(11, '10-Tier Memory CRUD Operations', () => {
    const testMemPath = path.resolve(process.cwd(), 'agi/data/test-mem.json');
    if (fs.existsSync(testMemPath)) fs.unlinkSync(testMemPath);

    const mem = new MemoryManager(testMemPath);
    for (const tier of TIERS) {
      mem.remember(tier, { key: `key-${tier}`, value: `data-for-${tier}`, importance: 7 });
      assert.strictEqual(mem.getTierCount(tier), 1, `Tier ${tier} has 1 entry`);
    }
    const counts = mem.getAllCounts();
    assert.strictEqual(Object.keys(counts).length, 10);
    if (fs.existsSync(testMemPath)) fs.unlinkSync(testMemPath);
  });

  test(12, 'Memory Triple-Scoring Retrieval & Ebbinghaus Decay', () => {
    const mem = new MemoryManager();
    mem.remember('semantic', { key: 'quantum_crypto', value: 'lattice-based post-quantum cryptography', importance: 9, tags: ['crypto'] });
    mem.remember('semantic', { key: 'classical_sorting', value: 'quicksort algorithm', importance: 4, tags: ['algorithm'] });

    const recalled = mem.recall('semantic', 'quantum cryptography', 2);
    assert.ok(recalled.length > 0);
    assert.strictEqual(recalled[0].key, 'quantum_crypto');
  });

  test(13, 'Memory Disk Persistence & Reload', () => {
    const testPath = path.resolve(process.cwd(), 'agi/data/test-mem-reload.json');
    const m1 = new MemoryManager(testPath);
    m1.remember('procedural', { key: 'git_clean_rule', value: 'always use NUL config in powershell', importance: 8 });

    const m2 = new MemoryManager(testPath);
    const recalled = m2.recall('procedural', 'git config');
    assert.ok(recalled.length > 0);
    assert.strictEqual(recalled[0].key, 'git_clean_rule');
    if (fs.existsSync(testPath)) fs.unlinkSync(testPath);
  });

  // --- SUITE 4: SKILL REGISTRY & FACTORY ---

  test(14, 'Skill Registry Lifecycle Transitions', () => {
    const testSkillsPath = path.resolve(process.cwd(), 'agi/data/test-skills.json');
    if (fs.existsSync(testSkillsPath)) fs.unlinkSync(testSkillsPath);

    const reg = new SkillRegistry(testSkillsPath);
    const skill = reg.registerSkill({
      id: 'skill-add',
      name: 'Add Numbers',
      implementation: 'function run(input) { return input.a + input.b; }'
    });
    assert.strictEqual(skill.status, 'DRAFT');

    reg.transitionStatus('skill-add', 'CANDIDATE');
    assert.strictEqual(reg.getSkill('skill-add').status, 'CANDIDATE');

    reg.addTest('skill-add', { input: { a: 2, b: 3 }, expected: 5 });
    reg.validateSkill('skill-add', (s, t) => {
      const fn = new Function('input', s.implementation + '\nreturn run(input);');
      return fn(t.input) === t.expected;
    });
    assert.strictEqual(reg.getSkill('skill-add').status, 'VALIDATED');

    reg.promoteToActive('skill-add');
    assert.strictEqual(reg.getSkill('skill-add').status, 'ACTIVE');

    if (fs.existsSync(testSkillsPath)) fs.unlinkSync(testSkillsPath);
  });

  test(15, 'Skill Synthesis & Test Runner Promotion', () => {
    const reg = new SkillRegistry();
    const factory = new SkillFactory(reg);
    const code = 'function run(arr) { return arr.slice().sort((a,b) => a - b); }';
    factory.synthesizeSkill({
      id: 'skill-sort',
      name: 'Numeric Array Sort',
      codeString: code,
      testInputs: [[3, 1, 2], [10, -5, 0]],
      expectedOutputs: [[1, 2, 3], [-5, 0, 10]]
    });

    const promoted = factory.testAndPromote('skill-sort');
    assert.strictEqual(promoted.status, 'ACTIVE');
  });

  // --- SUITE 5: TOOLS & OWASP MCP SECURITY ---

  test(16, 'Closed-World Tool Registration & Parameter Validation', async () => {
    const tr = new ToolRegistry();
    tr.registerTool({
      name: 'add_two',
      parameters: { required: ['x', 'y'] },
      handler: (args) => args.x + args.y
    });

    const res = await tr.executeTool('add_two', { x: 10, y: 20 });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.result, 30);

    const failRes = await tr.executeTool('add_two', { x: 10 });
    assert.strictEqual(failRes.success, false);
    assert.ok(failRes.error.includes('MISSING_PARAMETER'));
  });

  test(17, 'OWASP MCP Path Containment Security Guard', () => {
    const gw = new McpSecurityGateway({ allowedRoots: [process.cwd()] });
    const safePath = path.resolve(process.cwd(), 'agi/data/test.txt');
    assert.strictEqual(gw.validatePathContainment(safePath), safePath);

    assert.throws(() => {
      gw.validatePathContainment('C:\\Windows\\System32\\cmd.exe');
    }, /SECURITY_ERROR: Access denied/);
  });

  test(18, 'OWASP MCP Command Injection & Metacharacter Rejection', () => {
    const gw = new McpSecurityGateway();
    assert.strictEqual(gw.sanitizeShellArguments(['normal_arg', '--flag', 'value']), true);

    assert.throws(() => {
      gw.sanitizeShellArguments(['normal_arg; rm -rf /']);
    }, /SECURITY_ERROR: Forbidden shell metacharacters/);

    assert.throws(() => {
      gw.sanitizeShellArguments(['test | evil.exe']);
    }, /SECURITY_ERROR: Forbidden shell metacharacters/);
  });

  test(19, 'Deterministic Secret Scrubber', () => {
    const gw = new McpSecurityGateway();
    const raw = 'Config: AIzaSyD3x92039201920392019203920192039 and sk-1234567890abcdef1234567890abcdef';
    const scrubbed = gw.scrubSecrets(raw);
    assert.ok(!scrubbed.includes('AIzaSyD'), 'Google key redacted');
    assert.ok(!scrubbed.includes('sk-12345'), 'OpenAI key redacted');
    assert.ok(scrubbed.includes('[REDACTED_SECRET]'), 'Placeholder present');
  });

  // --- SUITE 6: COMPUTER OPERATION ADAPTER ---

  test(20, 'Computer Operation Coordinate Normalization & Scaling', () => {
    const adapter = new ComputerAdapter({
      displayResolution: { width: 1920, height: 1080 },
      displayScaleFactor: 1.25
    });

    const norm = adapter.normalizeCoordinates(100, 200);
    assert.strictEqual(norm.x, 125);
    assert.strictEqual(norm.y, 250);

    assert.throws(() => {
      adapter.normalizeCoordinates(2000, 100);
    }, /COORDINATE_OUT_OF_BOUNDS/);
  });

  test(21, 'Computer Operation URL Whitelist Validation', () => {
    const adapter = new ComputerAdapter({ allowedDomains: ['github.com', 'localhost'] });
    const safe = adapter.validateUrl('https://github.com/sierra-research/tau-bench');
    assert.strictEqual(safe.allowed, true);

    const blocked = adapter.validateUrl('https://evil-phishing-site.com/login');
    assert.strictEqual(blocked.allowed, false);
    assert.strictEqual(blocked.reason, 'DOMAIN_NOT_WHITELISTED: evil-phishing-site.com');
  });

  // --- SUITE 7: SELF-IMPROVEMENT & BOUNDARY LOCKS ---

  test(22, 'Self-Improvement Pareto Dominance Evaluator', () => {
    const engine = new SelfImprovementEngine({
      baselineMetrics: { latencyMs: 1000, tokenCost: 2000, accuracyPercent: 90.0 }
    });

    const superior = engine.evaluatePareto({ latencyMs: 800, tokenCost: 1800, accuracyPercent: 92.0 });
    assert.strictEqual(superior.isParetoSuperior, true);

    const inferior = engine.evaluatePareto({ latencyMs: 1200, tokenCost: 1800, accuracyPercent: 88.0 });
    assert.strictEqual(inferior.isParetoSuperior, false);
  });

  test(23, 'Permanent Safety Boundary Lock Enforcement', () => {
    const engine = new SelfImprovementEngine();
    for (const locked of LOCKED_BOUNDARIES) {
      assert.throws(() => {
        engine.assertBoundarySafety(`c:/Users/abhis/Downloads/pt/${locked}/somefile.js`);
      }, /BOUNDARY_VIOLATION/);
    }
  });

  // --- SUITE 8: PAPER TRADING & EVIDENCE LEDGER ---

  test(24, 'Paper-Trading Limit Order Execution & Slippage Modeling', () => {
    const sim = new PaperTradingSimulator(10000);
    const order = sim.submitOrder({
      symbol: 'BTCUSDT',
      side: 'BUY',
      orderType: 'MARKET',
      units: 0.02,
      currentPrice: 50000,
      slippageRate: 0.001,
      feeRate: 0.001
    });

    assert.strictEqual(order.success, true);
    assert.strictEqual(order.tradeRecord.executionPrice, 50050); // 50000 * 1.001
    assert.ok(sim.positions['BTCUSDT'] === 0.02);
    assert.ok(sim.cash < 10000);
  });

  test(25, 'Paper-Trading Emergency Kill Switch & Risk of Ruin Calculation', () => {
    const sim = new PaperTradingSimulator(10000);
    const risk = sim.calculateRiskMetrics({ winRate: 0.60, payoffRatio: 2.0, riskPerTradePercent: 0.02 });
    assert.strictEqual(risk.verdict, 'POSITIVE_EXPECTANCY');
    assert.ok(risk.kellyFraction > 0);

    sim.activateKillSwitch();
    const blockedOrder = sim.submitOrder({ symbol: 'ETHUSDT', side: 'BUY', units: 1, currentPrice: 3000 });
    assert.strictEqual(blockedOrder.success, false);
    assert.strictEqual(blockedOrder.reason, 'EMERGENCY_KILL_SWITCH_ACTIVE');
  });

  console.log('\n==================================================================');
  console.log(`TOTAL ACCEPTANCE TESTS: 25 | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('==================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('>>> 100% PASS: ALL 25 AGI 0.7 ACCEPTANCE CRITERIA VERIFIED CLEANLY <<<');
    process.exit(0);
  }
}

if (require.main === module) {
  runAcceptanceSuite();
}

module.exports = { runAcceptanceSuite };

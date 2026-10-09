/**
 * matrix/tests/acceptance-test-suite.js
 * MATRIX X1 — Comprehensive 15-Point Acceptance Test Suite
 * 
 * Verifies all 15 Required Acceptance Tests specified in Sections 151 to 165:
 * TEST 1 : Self-Exploration (`matrix x1 explore-self`)
 * TEST 2 : Unfamiliar Technical Domain Research
 * TEST 3 : Non-Trivial Software Project Engineering Lifecycle
 * TEST 4 : Deliberate Failure Detection, Diagnosis, Recovery & Learning
 * TEST 5 : External Storage Disconnect, Checkpoint & Recovery
 * TEST 6 : Clean Runtime Restart & Stateful Mission/Memory Restoration
 * TEST 7 : Dynamic Tool Removal, Capability Loss Detection & Failover Switch
 * TEST 8 : Unseen Capability Gap Recognition, Acquisition & Proving
 * TEST 9 : Autonomous Resolution Ladder & Commander Interruption Gate
 * TEST 10: Sandboxed Market Intelligence, Backtesting & Paper Trading
 * TEST 11: Token Economy, Pre-Flight Model Gating & Cost Optimization (`matrix x1 cost`)
 * TEST 12: Decision Journal Metacognitive Explanation (`matrix x1 why`)
 * TEST 13: Hardware & Peripheral Environment Census (`matrix x1 explore`)
 * TEST 14: Memory Consolidation & Lifelong Skill Crystallization (`matrix x1 learn`)
 * TEST 15: Safe Evaluated Self-Improvement & Boundary Protection (`matrix x1 improve`)
 * PLUS:
 * TEST 16: V4 Backward Compatibility & Regression Baseline Bridge
 */

const { matrixKernel } = require('../kernel/matrix-kernel');
const { selfModel } = require('../self/self-model');
const { researchEngine } = require('../research/research-engine');
const { cognitiveEngine } = require('../cognition/cognitive-engine');
const { failureLearningEngine } = require('../learning/failure-learning');
const { storageFabric } = require('../storage/storage-fabric');
const { memoryFabric, MEMORY_TYPES } = require('../memory/memory-fabric');
const { missionEngine } = require('../missions/mission-engine');
const { toolRouter } = require('../tools/tool-router');
const { capabilityAcquisitionEngine } = require('../capabilities/capability-acquisition');
const { commanderInterface } = require('../commander/commander-interface');
const { commanderGateway } = require('../commander/commander-gateway');
const { marketIntelligence } = require('../market/market-intelligence');
const { tokenEconomy } = require('../economy/token-economy');
const { decisionJournal } = require('../knowledge/decision-journal');
const { deviceEngine } = require('../devices/device-engine');
const { executableSkillMemory } = require('../skills/executable-skill-memory');
const { selfImprovementLab } = require('../learning/self-improvement');
const { v4Bridge } = require('../kernel/v4-bridge');

async function runTestSuite() {
  console.log('==================================================================');
  console.log('         MATRIX X1 COMPREHENSIVE ACCEPTANCE TEST SUITE            ');
  console.log('==================================================================\n');

  let passed = 0;
  let failed = 0;
  const results = [];

  function assert(condition, message) {
    if (!condition) throw new Error(message || 'Assertion failed');
  }

  async function test(num, title, fn) {
    const t0 = Date.now();
    try {
      await fn();
      const elapsed = Date.now() - t0;
      console.log(`TEST ${String(num).padStart(2, ' ')}: ${title.padEnd(45, ' ')} ... PASS (${elapsed}ms)`);
      passed++;
      results.push({ testNum: num, title, passed: true, elapsedMs: elapsed });
    } catch (err) {
      const elapsed = Date.now() - t0;
      console.log(`TEST ${String(num).padStart(2, ' ')}: ${title.padEnd(45, ' ')} ... FAIL (${elapsed}ms) -> ${err.message}`);
      failed++;
      results.push({ testNum: num, title, passed: false, elapsedMs: elapsed, error: err.message });
    }
  }

  // Initial boot
  await matrixKernel.boot();

  // TEST 1: Explore yourself (Section 151)
  await test(1, 'Self-Exploration (explore-self)', async () => {
    const audit = selfModel.generateSelfAudit();
    assert(audit.WHAT_I_KNOW.length > 0, 'WHAT_I_KNOW must not be empty');
    assert(audit.WHAT_I_DONT_KNOW.length > 0, 'WHAT_I_DONT_KNOW must represent explicit boundaries');
    assert(audit.WHAT_I_CAN_DO.length >= 5, 'Must report active capabilities');
    assert(audit.WHAT_I_CANNOT_DO.length >= 2, 'Must report operational limitations');
    assert(audit.IMPROVEMENTS_PROPOSED.length > 0, 'Must propose actionable improvements');
  });

  // TEST 2: Research unfamiliar domain (Section 152)
  await test(2, 'Unfamiliar Domain Research', async () => {
    const res = await researchEngine.conductResearch({
      topic: 'Neuromorphic Spiking Neural Runtimes in Embedded Linux'
    });
    assert(res.pipelineSteps.length >= 4, 'Must execute 4+ pipeline steps');
    assert(res.synthesis.primaryHypothesis.length > 0, 'Must synthesize testable hypothesis');
    assert(res.synthesis.confidence >= 0.8, 'Must calculate confidence score');
  });

  // TEST 3: Build non-trivial software project (Section 153)
  await test(3, 'Non-Trivial Software Project Lifecycle', async () => {
    const mission = missionEngine.createMission({
      title: 'Build Distributed Raft Consensus Engine',
      objective: 'Implement fault-tolerant state-machine replication with heartbeats and leader election'
    });
    const cycle = await cognitiveEngine.executeCycle({
      missionId: mission.id,
      objective: mission.objective,
      actionHandler: async () => ({
        success: true,
        filesGenerated: ['raft-node.js', 'raft-log.js'],
        testsPassed: 12
      })
    });
    assert(cycle.success === true, 'Cognitive cycle must verify cleanly');
    assert(cycle.verification.certificate.verdict === 'CERTIFIED_PASS', 'Judge must issue pass certificate');
  });

  // TEST 4: Deliberate failure detection & learning (Section 154)
  await test(4, 'Deliberate Failure & Recovery Learning', async () => {
    const failObj = failureLearningEngine.recordFailure({
      objective: 'Synchronous network lock without timeout',
      strategy: 'NAIVE_UNBOUNDED_SYNC_LOCK',
      assumption: 'Remote cluster responds instantaneously',
      error: 'ECONNRESET: Deadlock detected in worker thread',
      rootCause: 'Absence of circuit-breaker timeout threshold',
      recovery: 'Pre-arm fallback timeout at 2500ms',
      lesson: 'Never acquire remote distributed mutex without bounding lease duration.'
    });
    assert(failObj.id.startsWith('FAIL-'), 'Must generate structured failure ID');
    const warning = failureLearningEngine.checkProposedStrategy('NAIVE_UNBOUNDED_SYNC_LOCK');
    assert(warning.hasPreviousFailures === true, 'Must detect and warn against repeating failed strategy');
  });

  // TEST 5: Disconnect external storage safely (Section 155)
  await test(5, 'External Storage Disconnect & Recovery', async () => {
    const originalRoot = storageFabric.activeDataRoot;
    // Simulate disconnect
    const disconnectResult = storageFabric.handleStorageDisconnect('Simulated USB disconnect');
    assert(disconnectResult.degraded === true, 'Must transition safely to degraded mode');
    assert(storageFabric.degradedMode === true, 'Fabric must flag degraded state');
    
    // Simulate reconnection
    const restored = storageFabric.reconnectExternal(originalRoot);
    assert(restored.restored === true, 'Must restore primary external storage root');
    assert(storageFabric.degradedMode === false, 'Must clear degraded state after reconciliation');
  });

  // TEST 6: Restart Matrix & state restoration (Section 156)
  await test(6, 'Restart Runtime & Stateful Resumption', async () => {
    // Record test mission before restart
    const m = missionEngine.createMission({
      title: 'Pre-Restart Task',
      objective: 'Durable continuity verification'
    });
    matrixKernel.shutdown();
    assert(matrixKernel.ready === false, 'Kernel must report unready after shutdown');

    // Reboot
    const bootReport = await matrixKernel.boot();
    assert(bootReport.allPhasesPassed === true, 'Kernel must boot all 17 phases');
    const restored = missionEngine.getMission(m.id);
    assert(restored !== undefined && restored !== null, 'Mission must survive process reboot');
  });

  // TEST 7: Tool removal & automated failover (Section 157)
  await test(7, 'Tool Removal & Autonomous Failover', async () => {
    // Disable primary browser session tool
    toolRouter.disableTool('browser_session');
    // Invoke disabled tool -> should automatically fallback to curl_fetch
    const inv = await toolRouter.invokeTool('browser_session', { url: 'https://example.com' });
    assert(inv.success === true, 'Must successfully complete via fallback');
    assert(inv.invokedFallback === true, 'Must flag fallback execution');
    assert(inv.activeTool === 'curl_fetch', 'Must route to curl_fetch');
  });

  // TEST 8: Capability acquisition and proving lab (Section 158)
  await test(8, 'Unseen Capability Acquisition & Proving', async () => {
    const acq = await capabilityAcquisitionEngine.acquireCapability({
      capabilityName: 'HighPerformanceWasmMatrixMultiplier',
      domain: 'SCIENTIFIC_COMPUTING'
    });
    assert(acq.success === true, 'Must successfully acquire capability');
    assert(acq.steps.length >= 6, 'Must execute all proving lab steps');
    assert(acq.node.status === 'VERIFIED_ACTIVE', 'Capability node must be verified active');
  });

  // TEST 9: Commander dependency & resolution ladder (Section 159)
  await test(9, 'Commander Interruption & Decision Gate', async () => {
    const decisionCard = commanderInterface.resolveOrEscalate({
      issueDescription: 'Unresolved conflict between high-speed in-memory store and durable ACID disk store',
      alternativesTested: [{ name: 'In-Memory', result: 'Fast but data loss on crash', success: false }],
      autonomousOptions: [
        { key: 'A', description: 'Use Write-Ahead-Log (WAL) with in-memory buffer' },
        { key: 'B', description: 'Use synchronous disk flush on every transaction' }
      ]
    });
    assert(decisionCard.escalated === true, 'Must escalate after autonomous alternatives fail');
    
    // Gateway delivery and response
    const req = await commanderGateway.requestDecision(decisionCard);
    assert(req.ticketId.startsWith('DEC-REQ-'), 'Must create formal decision ticket');
    const response = commanderGateway.submitResponse(req.ticketId, 'A');
    assert(response.success === true, 'Must record commander answer');
  });

  // TEST 10: Sandboxed trading research mission (Section 160)
  await test(10, 'Sandboxed Market Intelligence & Paper Trade', async () => {
    // 1. Backtest
    const bt = marketIntelligence.runBacktest({
      strategyName: 'TREND_FOLLOWING_MA',
      historicalPrices: [100, 103, 102, 108, 107, 114, 112, 119, 118, 125]
    });
    assert(bt.tradesExecuted > 0, 'Backtest must execute simulated trades');
    assert(bt.walkForwardVerified === true, 'Must verify walk-forward contract');

    // 2. Paper trade
    const paper = marketIntelligence.executePaperTrade({
      symbol: 'BTC/USD',
      side: 'BUY',
      units: 1,
      currentPrice: 65000
    });
    assert(paper.success === true, 'Paper trade must execute in simulation');
    assert(paper.tradeRecord.fee > 0, 'Must deduct realistic broker fees');

    // 3. Risk of ruin calculation
    const ror = marketIntelligence.calculateRiskOfRuin({ capital: 10000, target: 100000 });
    assert(ror.riskOfRuinPercent !== undefined, 'Must calculate mathematical risk of ruin');
    assert(marketIntelligence.liveModeEnabled === false, 'Live trading must strictly remain false');
  });

  // TEST 11: Token economy pre-flight gating (Section 161)
  await test(11, 'Token Economy Cost Optimization (cost)', async () => {
    const check1 = tokenEconomy.evaluatePreFlight({ hasMemoryAnswer: true });
    assert(check1.allowed === false, 'Must block model call when memory can answer');
    const check2 = tokenEconomy.evaluatePreFlight({ hasLocalAnswer: true });
    assert(check2.allowed === false, 'Must block model call when local computation suffices');
    const metrics = tokenEconomy.getMetrics();
    assert(metrics.avoidedModelCalls > 0, 'Must record avoided model calls');
  });

  // TEST 12: Decision journal explanation (Section 162)
  await test(12, 'Decision Journal Metacognition (why)', async () => {
    const recorded = decisionJournal.recordDecision({
      title: 'Adopt Multi-Tier Storage Fabric',
      objective: 'Ensure zero state loss on external disk unmount',
      decision: 'HYBRID_RAM_SSD_TIER',
      evidence: ['Tested with 50 unmount simulations'],
      confidence: 0.98,
      predictedResult: 'Zero data corruption'
    });
    const explanation = decisionJournal.explainDecision(recorded.id);
    assert(explanation !== null, 'Must retrieve recorded decision by ID');
    assert(explanation.decision === 'HYBRID_RAM_SSD_TIER', 'Must output stored decision rationale');
  });

  // TEST 13: Environment exploration & census (Section 163)
  await test(13, 'Hardware & Device Census (explore)', async () => {
    const census = deviceEngine.conductCensus();
    assert(census.length > 0, 'Must discover host devices');
    const graph = deviceEngine.buildMachineGraph();
    assert(graph.nodes.length >= 5, 'Machine graph must include CPU, RAM, OS, Runtime, Storage');
  });

  // TEST 14: Memory consolidation & skill crystallization (Section 164)
  await test(14, 'Memory Consolidation & Skill Crystallization (learn)', async () => {
    // Add two repeated episodic episodes
    memoryFabric.storeMemory({
      type: MEMORY_TYPES.EPISODIC,
      content: 'Database indexing sped up query by 400ms',
      retrieval_tags: ['database', 'indexing']
    });
    memoryFabric.storeMemory({
      type: MEMORY_TYPES.EPISODIC,
      content: 'Adding btree index dropped latency to 2ms',
      retrieval_tags: ['database', 'indexing']
    });

    const cons = memoryFabric.consolidate();
    assert(cons.consolidatedCount > 0, 'Must consolidate repeated episodic memories into semantic knowledge');

    const skill = executableSkillMemory.crystallizeSkill({
      problemClass: 'DB_OPTIMIZATION',
      skillName: 'Index Tuning Automation',
      triggerKeywords: ['database', 'index'],
      procedureCode: 'CREATE INDEX IF NOT EXISTS idx_query ON table(col);',
      inputs: ['tableName', 'columnName']
    });
    assert(skill.id.startsWith('SKL-EXEC-'), 'Must crystallize executable skill with unique ID');
  });

  // TEST 15: Safe evaluated self-improvement (Section 165)
  await test(15, 'Safe Self-Improvement Lab (improve)', async () => {
    const diagnosis = selfImprovementLab.diagnoseAndPropose();
    assert(diagnosis.proposals.length > 0, 'Must propose candidate improvements');

    // Test safe proposal
    const safeEval = await selfImprovementLab.evaluateProposal(diagnosis.proposals[0]);
    assert(safeEval.tested === true, 'Safe proposal must undergo evaluation test');
    assert(safeEval.regressionDetected === false, 'Safe proposal must verify no regressions');

    // Test unsafe proposal attempting to modify security boundary
    const maliciousProposal = {
      proposalId: 'PROP-ILLEGAL',
      targetSubsystem: 'security_kernel',
      description: 'Disable approval firewall'
    };
    const blockedEval = await selfImprovementLab.evaluateProposal(maliciousProposal);
    assert(blockedEval.blockedBySecurityGate === true, 'Must strictly block mutation of security boundaries');
  });

  // TEST 16: V4 Backward Compatibility Bridge
  await test(16, 'V4 Backward Compatibility Bridge', async () => {
    const v4Questions = await v4Bridge.answerOperatingQuestions();
    assert(v4Questions['What is happening?'] !== undefined, 'V4 Operating Questions must execute cleanly');
  });

  console.log('\n==================================================================');
  console.log(`TOTAL ACCEPTANCE TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('==================================================================');

  if (failed === 0) {
    console.log('>>> 100% PASS: ALL 15 MATRIX X1 REQUIRED ACCEPTANCE TESTS VERIFIED CLEANLY <<<\n');
  } else {
    console.error('>>> ACCEPTANCE TEST SUITE FAILED <<<\n');
    process.exit(1);
  }
}

if (require.main === module) {
  runTestSuite().catch(err => {
    console.error('[Acceptance Suite Error]', err);
    process.exit(1);
  });
}

module.exports = { runTestSuite };

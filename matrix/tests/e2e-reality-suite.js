/**
 * matrix/tests/e2e-reality-suite.js
 * MATRIX X1 — Massive 10 End-to-End Reality Mission Suite
 * 
 * Executes all 10 Real-World Autonomous Missions defined in Sections 183 to 192:
 * MISSION 1 : Integrated Autonomous Mission (19-stage lifecycle) (Section 183)
 * MISSION 2 : Multi-Step Computer-Use & Browser Task (Section 184)
 * MISSION 3 : Unseen Capability Acquisition Task (Section 185)
 * MISSION 4 : Controlled Self-Improvement Experiment (Section 186)
 * MISSION 5 : Cross-Domain Generalization & Transfer Task (Section 187)
 * MISSION 6 : Commander Interaction & Decision Parsing (Section 188)
 * MISSION 7 : Trading Research & Paper Execution Mission (Section 189)
 * MISSION 8 : Device Discovery & Safe Hardware Operation (Section 190)
 * MISSION 9 : Memory Continuity Across Runtime Restart (Section 191)
 * MISSION 10: Storage Disconnect, Safe Degraded Mode & Reconciliation (Section 192)
 */

const fs = require('fs');
const path = require('path');
const { matrixKernel } = require('../kernel/matrix-kernel');
const { missionEngine, MISSION_STATES } = require('../missions/mission-engine');
const { cognitiveEngine } = require('../cognition/cognitive-engine');
const { browserEngine } = require('../tools/browser-engine');
const { computerUseEngine } = require('../tools/computer-use');
const { toolRouter } = require('../tools/tool-router');
const { capabilityGraph } = require('../capabilities/capability-graph');
const { capabilityAcquisitionEngine } = require('../capabilities/capability-acquisition');
const { selfImprovementLab } = require('../learning/self-improvement');
const { generalizationEngine } = require('../cognition/generalization-engine');
const { commanderGateway } = require('../commander/commander-gateway');
const { commanderInterface } = require('../commander/commander-interface');
const { marketIntelligence } = require('../market/market-intelligence');
const { deviceEngine } = require('../devices/device-engine');
const { memoryFabric, MEMORY_TYPES } = require('../memory/memory-fabric');
const { storageFabric } = require('../storage/storage-fabric');
const { criticJudgeSystem } = require('../verification/critic-judge');
const { executableSkillMemory } = require('../skills/executable-skill-memory');
const { failureLearningEngine } = require('../learning/failure-learning');

async function runE2ESuite() {
  console.log('==================================================================');
  console.log('         MATRIX X1 MASSIVE 10 END-TO-END REALITY MISSION SUITE     ');
  console.log('==================================================================\n');

  let passed = 0;
  let failed = 0;
  const results = [];

  function assert(cond, msg) {
    if (!cond) throw new Error(msg || 'Assertion failed');
  }

  async function runMission(num, title, fn) {
    const t0 = Date.now();
    try {
      await fn();
      const elapsed = Date.now() - t0;
      console.log(`MISSION ${String(num).padStart(2, ' ')}: ${title.padEnd(46, ' ')} ... PASS (${elapsed}ms)`);
      passed++;
      results.push({ mission: num, title, passed: true, elapsedMs: elapsed });
    } catch (err) {
      const elapsed = Date.now() - t0;
      console.log(`MISSION ${String(num).padStart(2, ' ')}: ${title.padEnd(46, ' ')} ... FAIL (${elapsed}ms) -> ${err.message}`);
      failed++;
      results.push({ mission: num, title, passed: false, error: err.message, elapsedMs: elapsed });
    }
  }

  if (!matrixKernel.ready) await matrixKernel.boot();

  // MISSION 1: Integrated Autonomous Mission (Section 183)
  await runMission(1, 'Integrated Autonomous Multi-Stage Mission', async () => {
    // 1. Understand & Create Mission
    const m = missionEngine.createMission({
      title: 'Distributed Log Consensus',
      objective: 'Research distributed consensus, compile workforce, execute code, verify proof'
    });
    assert(m.id && m.state === MISSION_STATES.CREATED, 'Mission created');

    // 2. Capability analysis
    const gap = capabilityGraph.detectGap(['Filesystem I/O', 'Host Process Execution']);
    assert(gap.available.length >= 2, 'Capabilities available');

    // 3. Milestone 1: Environment & Capability Inspection
    missionEngine.advanceMilestone(m.id, 'M1', { gapAnalysis: gap });

    // 4. Milestone 2: Implementation & Execution (Terminal + File)
    const testFile = path.join(storageFabric.internalCacheDir, 'consensus-log.json');
    await toolRouter.invokeTool('fs_write', { filepath: testFile, content: JSON.stringify({ entries: [1, 2, 3] }) });
    const termRes = await toolRouter.invokeTool('terminal_exec', `node -e "console.log('consensus_ready')"`);
    assert(termRes.result.output.includes('consensus_ready'), 'Terminal execution succeeded');
    missionEngine.advanceMilestone(m.id, 'M2', { artifactCreated: testFile });

    // 5. Deliberate Failure Injection & Recovery
    toolRouter.disableTool('browser_session');
    const fallbackCall = await toolRouter.invokeTool('browser_session', { url: 'https://example.com' });
    toolRouter.enableTool('browser_session');
    assert(fallbackCall.invokedFallback === true, 'Autonomous recovery via fallback succeeded');

    // 6. Checkpoint & Resume
    const cp = storageFabric.saveCheckpoint(`e2e-m1-${m.id}`, m);
    assert(fs.existsSync(cp.file), 'Checkpoint saved to disk');

    // 7. Milestone 3: Empirical Verification
    const judgeCert = criticJudgeSystem.evaluateDelivery({
      taskId: m.id,
      objective: m.objective,
      claims: [{ text: 'Consensus log state replicated' }],
      testResults: [{ passed: true }]
    });
    assert(judgeCert.verdict === 'CERTIFIED_PASS', 'Judge verified delivery');
    missionEngine.advanceMilestone(m.id, 'M3', { judgeCertificate: judgeCert });

    // 8. Milestone 4: Final Certification
    missionEngine.advanceMilestone(m.id, 'M4', { finalApproval: true });
    assert(m.state === MISSION_STATES.COMPLETED, 'Mission completed 100%');

    // 9. Memory update & skill crystallization
    const skill = executableSkillMemory.crystallizeSkill({
      problemClass: 'CONSENSUS_REPLICATION',
      skillName: 'Distributed Consensus Log Writer',
      procedureCode: 'Write log entries atomically to disk and sync'
    });
    assert(skill.id.startsWith('SKL-EXEC-'), 'Skill crystallized');

    if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
  });

  // MISSION 2: Multi-step authorized computer & browser task (Section 184)
  await runMission(2, 'Multi-Step Computer-Use & Browser Task', async () => {
    // 1. Create local test HTML page
    const pagePath = path.join(storageFabric.internalCacheDir, 'e2e-page.html');
    fs.writeFileSync(pagePath, `
      <!DOCTYPE html>
      <html>
        <head><title>Matrix E2E Dashboard</title></head>
        <body>
          <h1>Mission Control</h1>
          <input type="text" name="mission_name" value="Apollo" />
          <button id="btn-submit">Launch</button>
        </body>
      </html>
    `, 'utf8');

    // 2. Open browser session & navigate
    const s = await browserEngine.openSession('e2e-session-2');
    const nav = await browserEngine.navigate('e2e-session-2', `file://${pagePath}`);
    assert(nav.title === 'Matrix E2E Dashboard', 'Navigation verified');

    // 3. Inspect DOM
    const snap = await browserEngine.snapshot('e2e-session-2');
    assert(snap.interactiveElementsCount >= 2, 'Found interactive elements');

    // 4. Click button with state differencing
    const clickRes = await browserEngine.click('e2e-session-2', 'button:has-text("Launch")');
    assert(clickRes.verified === true, 'Click verified');

    // 5. Execute computer-use action loop
    const cuRes = await computerUseEngine.executeAction({
      goal: 'Verify system load',
      type: 'TERMINAL_RUN',
      target: 'echo computer_use_verified'
    });
    assert(cuRes.verified === true, 'Computer use verified');

    // 6. Cleanup
    await browserEngine.closeSession('e2e-session-2');
    if (fs.existsSync(pagePath)) fs.unlinkSync(pagePath);
  });

  // MISSION 3: Unseen capability acquisition (Section 185)
  await runMission(3, 'Unseen Capability Acquisition in Quarantine', async () => {
    const acq = await capabilityAcquisitionEngine.acquireCapability({
      capabilityName: 'HighDimensionalHypergraphPartitioner',
      domain: 'GRAPH_ANALYTICS'
    });
    assert(acq.success === true, 'Capability acquired');
    assert(acq.node.status === 'VERIFIED_ACTIVE', 'Node verified active');
    assert(capabilityGraph.findCapability('HighDimensionalHypergraphPartitioner') !== null, 'Found in graph');
  });

  // MISSION 4: Self-improvement experiment (Section 186)
  await runMission(4, 'Controlled Self-Improvement Experiment', async () => {
    const diag = selfImprovementLab.diagnoseAndPropose();
    assert(diag.proposals.length > 0, 'Bottleneck diagnosed and proposal generated');

    // Evaluate proposal with measured benchmark
    const evalRes = await selfImprovementLab.evaluateProposal(
      diag.proposals[0],
      async () => ({ baselineScore: 100, candidateScore: 130, baselineLatencyMs: 12, candidateLatencyMs: 8 })
    );
    assert(evalRes.tested === true, 'Evaluated candidate');
    assert(evalRes.recommendedAction === 'ADOPT', 'Recommended adopt');
    assert(evalRes.promotionStatus === 'PROMOTED_TO_STAGE', 'Promoted candidate');
  });

  // MISSION 5: Cross-domain generalization (Section 187)
  await runMission(5, 'Cross-Domain Generalization & Transfer', async () => {
    const novelTask = generalizationEngine.generateNovelTask({ difficulty: 'HARD' });
    assert(novelTask.taskId.startsWith('NOV-TSK-'), 'Novel task generated');

    const transfer = await generalizationEngine.evaluateCrossDomainTransfer({
      sourceDomain: 'FAULT_ISOLATION',
      targetDomain: 'ANOMALY_DETECTION'
    });
    assert(transfer.transferSuccess === true, 'Strategy transferred successfully');
    assert(transfer.transferScore >= 0.85, 'Transfer score meets threshold');
  });

  // MISSION 6: Commander interaction test (Section 188)
  await runMission(6, 'Commander Interaction & Decision Parsing', async () => {
    const decisionReq = await commanderGateway.requestDecision({
      issue: 'Choose state storage tier for high-frequency logs',
      impact: 'Determines persistence latency vs memory usage',
      options: [
        { key: 'A', description: 'In-Memory with periodic disk snapshot' },
        { key: 'B', description: 'Synchronous write-through disk file' }
      ],
      recommendation: 'Option A provides 10x higher throughput',
      format: 'A or B'
    });
    assert(decisionReq.ticketId.startsWith('DEC-REQ-'), 'Decision requested');

    // Parse response
    const subRes = commanderGateway.submitResponse(decisionReq.ticketId, 'A');
    assert(subRes.success === true, 'Response recorded');
    assert(subRes.parsed.choice === 'A', 'Choice correctly parsed');
  });

  // MISSION 7: Trading research test (Section 189)
  await runMission(7, 'Trading Research & Paper Execution', async () => {
    const dataset = [100, 101, 103, 102, 105, 104, 107, 106, 110, 112, 115];
    const val = marketIntelligence.validateDataset(dataset);
    assert(val.valid === true, 'Dataset validated');

    const bt = marketIntelligence.runBacktest({
      strategyName: 'MOMENTUM_MA',
      historicalPrices: dataset
    });
    assert(bt.walkForwardVerified === true, 'Walk-forward verified');

    const pt = marketIntelligence.executePaperTrade({
      symbol: 'ETH/USD',
      side: 'BUY',
      units: 2,
      currentPrice: 3200
    });
    assert(pt.success === true, 'Paper trade executed');
    assert(marketIntelligence.liveModeEnabled === false, 'Live trading safely locked');
  });

  // MISSION 8: Device discovery & safe operation (Section 190)
  await runMission(8, 'Device Discovery & Safe Operation Probe', async () => {
    const devs = deviceEngine.conductCensus();
    assert(devs.length > 0, 'Host peripherals discovered');

    const probe = await deviceEngine.executeSafeProbe(devs[0].device_id);
    assert(probe.success === true, 'Safe probe executed');
    assert(probe.probeResult.verified === true, 'Probe verified');
  });

  // MISSION 9: Memory continuity across shutdown (Section 191)
  await runMission(9, 'Memory Continuity Across Runtime Restart', async () => {
    const uniqueKey = `continuity-${Date.now().toString(36)}`;
    memoryFabric.storeMemory({
      type: MEMORY_TYPES.EPISODIC,
      content: { note: 'Survives reboot', key: uniqueKey },
      retrieval_tags: [uniqueKey]
    });
    memoryFabric.persistToDisk();

    // Shutdown
    matrixKernel.shutdown();
    assert(matrixKernel.ready === false, 'Kernel shut down');

    // Reboot
    await matrixKernel.boot();
    assert(matrixKernel.ready === true, 'Kernel rebooted');

    const retrieved = memoryFabric.retrieve({ query: uniqueKey });
    assert(retrieved.length > 0, 'Memory survived reboot');
  });

  // MISSION 10: Storage disconnect and degraded recovery (Section 192)
  await runMission(10, 'Storage Disconnect & Degraded Recovery', async () => {
    const originalRoot = storageFabric.activeDataRoot;
    
    // Simulate disconnect
    const disc = storageFabric.handleStorageDisconnect('Physical USB dismounted');
    assert(disc.degraded === true, 'Safe degraded mode activated');

    // Probe write in degraded mode
    const health = storageFabric.checkHealth();
    assert(health.healthy === true, 'Safe degraded writes functioning');

    // Reconnect
    const rec = storageFabric.reconnectExternal(originalRoot);
    assert(rec.restored === true, 'Reconnection reconciled without data loss');
    assert(storageFabric.degradedMode === false, 'Degraded mode cleared');
  });

  console.log('\n==================================================================');
  console.log(`TOTAL MISSIONS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('==================================================================');

  if (failed === 0) {
    console.log('>>> 100% PASS: ALL 10 MASSIVE E2E REALITY MISSIONS VERIFIED CLEANLY <<<\n');
  } else {
    console.error('>>> E2E REALITY SUITE FAILED <<<\n');
    process.exit(1);
  }
}

if (require.main === module) {
  runE2ESuite().catch(err => {
    console.error('[E2E Suite Error]', err);
    process.exit(1);
  });
}

module.exports = { runE2ESuite };

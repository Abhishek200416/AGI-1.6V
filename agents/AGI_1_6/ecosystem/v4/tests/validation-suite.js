/**
 * .agents/v4/tests/validation-suite.js
 * Universal Autonomous Engineering Intelligence Operating System — V4
 * Complete 20-Point Operational Validation Suite
 *
 * Executes and asserts real behavior for TEST 1 through TEST 20.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Load V4 Subsystems
const { worldState } = require('../state/world-state');
const { eventBus, EVENT_TYPES } = require('../core/event-bus');
const { checkpointManager } = require('../core/checkpoint-manager');
const { workforceManager } = require('../core/workforce-manager');
const { performanceMemory } = require('../core/performance-memory');
const { modelRouter } = require('../../router/model-router');
const { capabilityProver } = require('../core/capability-prover');
const { memorySystem, MEMORY_SCOPES } = require('../core/memory-system');
const { decisionLedger } = require('../core/decision-ledger');
const { criticSystem } = require('../core/critic-system');
const { observability } = require('../core/observability');
const { healthLoop } = require('../core/health-loop');
const { digitalTwin } = require('../core/digital-twin');
const { canaryDeployer } = require('../core/canary-deployer');
const { approvalFirewall } = require('../core/approval-firewall');
const { costIntelligence } = require('../core/cost-intelligence');
const { failurePredictor } = require('../core/failure-predictor');
const { autonomousRecovery } = require('../core/autonomous-recovery');
const { browserIntelligence } = require('../core/browser-intelligence');
const { openHandsRunner } = require('../core/openhands-execution');
const { mcpFabric } = require('../core/mcp-fabric');
const { securityFramework } = require('../core/security-framework');
const { proofCarrier } = require('../core/proof-carrier');
const { taskRiskEngine } = require('../core/risk-engine');
const { taskMemoryStore } = require('../core/task-memory');
const { interruptionController } = require('../core/interruption-controller');
const { orchestratorV4 } = require('../orchestrator-v4');

const results = [];

async function runTest(testNumber, name, testFn) {
  const start = Date.now();
  process.stdout.write(`TEST ${testNumber.toString().padStart(2, ' ')}: ${name.padEnd(38, ' ')} ... `);
  try {
    await testFn();
    const duration = Date.now() - start;
    console.log(`PASS (${duration}ms)`);
    results.push({ testNumber, name, passed: true, duration });
  } catch (err) {
    const duration = Date.now() - start;
    console.log(`FAIL (${duration}ms) -> ${err.message}`);
    results.push({ testNumber, name, passed: false, duration, error: err.message });
  }
}

async function runAllTests() {
  console.log("==================================================================");
  console.log("   ORCHESTRATION-AGENT-V4 OPERATIONAL VALIDATION TEST SUITE      ");
  console.log("==================================================================\n");

  // TEST 1: Agent discovery
  await runTest(1, "Agent discovery", async () => {
    const agentsData = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../registry/agents.json'), 'utf-8'));
    assert(agentsData.staticAgents && agentsData.staticAgents.length === 75, "Expected 75 static agents in registry");
    const foundFullstack = agentsData.staticAgents.find(a => a.name === 'senior-fullstack-engineer');
    assert(foundFullstack, "senior-fullstack-engineer must be present");
    assert(fs.existsSync(path.resolve(__dirname, '../../agents/senior-fullstack-engineer.md')), "Agent file must exist on disk");
  });

  // TEST 2: Dynamic subagent creation
  await runTest(2, "Dynamic subagent creation", async () => {
    const sub = workforceManager.createSubagent({
      name: "subagent-test-worker",
      role: "Verification Worker",
      type: "foreground",
      prompt: "Execute non-destructive assertion",
      depth: 1
    });
    assert(sub.state === 'CREATED', "Subagent should initialize in CREATED state");
    const started = await workforceManager.startSubagent(sub.id, () => ({ success: true, verified: true }));
    assert(started.state === 'COMPLETED', "Subagent must reach COMPLETED state");
    assert(started.result.verified === true, "Subagent result must return structured output");
  });

  // TEST 3: Parallel subagent execution
  await runTest(3, "Parallel subagent execution", async () => {
    const tasks = [
      { name: "worker-1", executeFn: () => ({ id: 1, done: true }) },
      { name: "worker-2", executeFn: () => ({ id: 2, done: true }) },
      { name: "worker-3", executeFn: () => ({ id: 3, done: true }) }
    ];
    const parallelResults = await workforceManager.executeParallel(tasks, 3);
    assert(parallelResults.length === 3, "All 3 parallel workers must finish");
    assert(parallelResults.every(r => r.state === 'COMPLETED'), "All parallel workers must be COMPLETED");
  });

  // TEST 4: Checkpoint/resume
  await runTest(4, "Checkpoint/resume", async () => {
    const taskId = "TEST-TASK-CKPT-01";
    checkpointManager.saveCheckpoint({
      taskId,
      phase: "STEP_2",
      completedNodes: ["node_1", "node_2"],
      destructiveNodes: ["node_2", "node_3"]
    });
    assert(checkpointManager.hasCheckpoint(taskId), "Checkpoint file must exist");
    const resumption = checkpointManager.planResumption(taskId, ["node_1", "node_2", "node_3", "node_4"]);
    assert(resumption.isResume === true, "Must detect resumption");
    assert.deepStrictEqual(resumption.completedNodes, ["node_1", "node_2"], "Must retain completed nodes");
    assert.deepStrictEqual(resumption.nodesToExecute, ["node_3", "node_4"], "Must filter out completed nodes");
    assert(resumption.skippedDestructive.includes("node_2"), "Must protect completed destructive node from replay");
  });

  // TEST 5: Failure recovery
  await runTest(5, "Failure recovery", async () => {
    const recovery = await autonomousRecovery.handleFailure({
      taskId: "TEST-TASK-FAIL-01",
      failedStep: "compile_check",
      error: new Error("Syntax error in generated test harness: CODE_DEFECT"),
      isDestructive: false,
      retryCount: 0
    });
    assert(recovery.strategy === 'FALLBACK_AGENT', "Should select FALLBACK_AGENT on first code defect");
    assert(recovery.verified === true, "Recovery must be verified");
    assert(recovery.pipeline.some(p => p.step === 'ROOT_CAUSE'), "Must contain root cause analysis");
  });

  // TEST 6: Model fallback
  await runTest(6, "Model fallback", async () => {
    const failover = modelRouter.handleModelFailure("gemini-3.8-flash", new Error("Simulated 503 Overloaded"));
    assert(failover.primaryFailed === "gemini-3.8-flash", "Should record failed model");
    assert(failover.fallbackModel === "gemini-2.5-pro", "Should select fallback from chain");
  });

  // TEST 7: MCP failure fallback
  await runTest(7, "MCP failure fallback", async () => {
    mcpFabric.resetCircuit('playwright');
    // Simulate 3 failures to trip circuit breaker
    mcpFabric.recordToolFailure('playwright', new Error("Socket error 1"));
    mcpFabric.recordToolFailure('playwright', new Error("Socket error 2"));
    mcpFabric.recordToolFailure('playwright', new Error("Socket error 3"));

    const status = mcpFabric.getServerStatus('playwright');
    assert(status.circuitBreaker === 'OPEN', "Circuit breaker must trip to OPEN on 3 failures");

    const fallbackRes = await mcpFabric.invokeMcpTool('playwright', 'browser_navigate', { url: 'http://test.local' });
    assert(fallbackRes.isFallback === true, "Must route to fallback capability");
    assert(fallbackRes.fallbackTool === 'run_command', "Must fallback to native tool");
    mcpFabric.resetCircuit('playwright');
  });

  // TEST 8: Capability discovery
  await runTest(8, "Capability discovery", async () => {
    const candidate = {
      name: "custom-graphql-validator",
      category: "API",
      license: "MIT",
      hasReadme: true,
      hasRecentActivity: true,
      stars: 320,
      isSecuritySensitive: false
    };
    const proven = await capabilityProver.proveCapability(candidate);
    assert(proven.passed === true, "Clean candidate must pass capability proving pipeline");
    assert(proven.lifecycleState === 'ACTIVE', "Must reach ACTIVE lifecycle state");
    assert(proven.proofHash && proven.proofHash.startsWith('proof-sha256-'), "Must generate proof hash");
  });

  // TEST 9: External capability sandbox
  await runTest(9, "External capability sandbox", async () => {
    const secRegistry = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../registry/security.json'), 'utf-8'));
    assert(secRegistry.sandboxingTiers.TIER_1_PROCESS_JOB_OBJECT, "TIER 1 sandbox tier must be defined");
    assert(secRegistry.sandboxingTiers.TIER_2_OCI_MICRO_VM, "TIER 2 container sandbox tier must be defined");
    const permOk = securityFramework.checkPermission('external_agent_sandboxed', 'workspace_write_scoped');
    assert(permOk === true, "Scoped write should be permitted inside sandbox");
    const permBad = securityFramework.checkPermission('external_agent_sandboxed', 'root_shell');
    assert(permBad === false, "Root escalation must be denied");
  });

  // TEST 10: OpenHands execution
  await runTest(10, "OpenHands execution", async () => {
    // Check degraded fallback when docker is offline
    const degraded = await openHandsRunner.executeSweTask({
      taskId: "SWE-TASK-01",
      repoPath: "./",
      issueDescription: "Large multi-module refactor across subsystems",
      isMultiModuleRefactor: true,
      dockerOnline: false
    });
    assert(degraded.strategy === 'DEGRADED_LOCAL_FALLBACK', "Must gracefully degrade when docker is offline");
    assert(degraded.adapter === 'Aider', "Degraded fallback routes to Aider pairing");

    // Check container execution when docker is online
    const containerRun = await openHandsRunner.executeSweTask({
      taskId: "SWE-TASK-02",
      repoPath: "./",
      issueDescription: "Large multi-module refactor across subsystems",
      isMultiModuleRefactor: true,
      dockerOnline: true
    });
    assert(containerRun.strategy === 'OPENHANDS_CONTAINER_SWE', "Must run inside container when docker is online");
    assert(containerRun.securityOpts.includes('no-host-docker-sock'), "Must enforce SEC-02 no-host-docker-sock invariant");
  });

  // TEST 11: Browser execution
  await runTest(11, "Browser execution", async () => {
    const check = await browserIntelligence.runHeadlessCheck("http://localhost:8080/app");
    assert(check.domVerified === true, "Playwright browser check must verify DOM");
    // Verify security rejection of bypass attempts
    const blocked = browserIntelligence.evaluateBrowserRequest({ url: "http://site.com", action: "BYPASS_CAPTCHA" });
    assert(blocked.permitted === false, "Security firewall must reject CAPTCHA bypass");
  });

  // TEST 12: Memory retrieval
  await runTest(12, "Memory retrieval", async () => {
    memorySystem.recordMemory({
      scope: MEMORY_SCOPES.PROJECT,
      key: "target-k8s-namespace",
      content: "production-payments-v4",
      tags: ["kubernetes", "deployment"],
      confidence: 0.99
    });
    const retrieved = memorySystem.retrieveRelevant({
      query: "kubernetes deployment namespace",
      scope: MEMORY_SCOPES.PROJECT,
      limit: 1
    });
    assert(retrieved.length === 1, "Must retrieve matching memory");
    assert(retrieved[0].key === "target-k8s-namespace", "Retrieved key must match");
  });

  // TEST 13: Agent performance ranking
  await runTest(13, "Agent performance ranking", async () => {
    const ranked = performanceMemory.rankAgentsForTask('CODING', ['senior-fullstack-engineer', 'devops-engineer']);
    assert(ranked.length === 2, "Must rank candidates");
    assert(ranked[0].agent === 'senior-fullstack-engineer', "Senior fullstack engineer should rank higher for CODING");
    // Check cold-start agent
    const cold = performanceMemory.getSmoothedScore('brand-new-agent-xyz');
    assert(cold.isColdStart === true, "Must flag cold-start agent");
    assert(cold.score === 0.85, "Cold-start agent must receive neutral prior without penalty");
  });

  // TEST 14: Security approval gate
  await runTest(14, "Security approval gate", async () => {
    const gateReq = approvalFirewall.requestActionExecution({
      actionType: 'PRODUCTION_DEPLOYMENT',
      description: 'Deploy release v4.0.0 to prod clusters',
      targetResource: 'prod-k8s-cluster'
    });
    assert(gateReq.allowed === false, "High-impact action must be blocked");
    assert(gateReq.status === 'BLOCKED_PENDING_APPROVAL', "Must be marked pending approval");
    // Grant approval
    const granted = approvalFirewall.grantApproval(gateReq.approvalId, 'lead-developer');
    assert(granted.status === 'GRANTED', "Ticket must transition to GRANTED");
  });

  // TEST 15: Human interruption/resume
  await runTest(15, "Human interruption/resume", async () => {
    const taskId = "TASK-INTERRUPT-01";
    const stopResult = await interruptionController.handleStop(taskId, {
      phase: "EXECUTION_PHASE_2",
      completedNodes: ["init", "lint"],
      destructiveNodes: ["migrate_db"]
    });
    assert(stopResult.success === true, "Must stop safely");
    assert(stopResult.status === 'SAFELY_STOPPED', "Must record SAFELY_STOPPED state");

    const continueResult = await interruptionController.handleContinue(taskId, ["init", "lint", "migrate_db", "test"]);
    assert(continueResult.success === true, "Must continue safely");
    assert(continueResult.status === 'RESUMED', "Must resume state");
    assert.deepStrictEqual(continueResult.resumptionPlan.nodesToExecute, ["migrate_db", "test"], "Must resume uncompleted nodes");
  });

  // TEST 16: Digital twin/shadow execution
  await runTest(16, "Digital twin/shadow execution", async () => {
    const shadowRun = await digitalTwin.executeShadowRun({
      changeId: "CHANGE-V4-01",
      serviceName: "payment-router",
      candidateArtifacts: ["router.js"]
    });
    assert(shadowRun.allPassed === true, "All 7 shadow gates must pass");
    assert(shadowRun.gates.load.pass === true, "Load test gate must pass");
    assert(shadowRun.gates.dbMigration.pass === true, "DB migration gate must pass");
  });

  // TEST 17: Deployment health monitoring
  await runTest(17, "Deployment health monitoring", async () => {
    const res = await healthLoop.handleDegradation("auth-service", {
      reason: "Memory usage exceeded 95%",
      severity: "HIGH"
    });
    assert(res.incident.remediationStatus === 'RESOLVED', "Health loop must contain incident");
    assert(res.steps.length === 8, "Must execute all 8 incident response steps");
    assert(res.resolved === true, "Remediation must verify successfully");
  });

  // TEST 18: Automatic rollback simulation
  await runTest(18, "Automatic rollback simulation", async () => {
    // Inject error at 50% canary stage
    const canary = await canaryDeployer.runCanaryPromotion({
      releaseId: "REL-202610-09",
      serviceName: "api-gateway",
      stages: [10, 25, 50, 100],
      observeFn: async (pct) => {
        if (pct >= 50) return { errorRate: 0.08, latencyMs: 380, healthy: false }; // Regression!
        return { errorRate: 0.001, latencyMs: 25, healthy: true };
      }
    });
    assert(canary.rollbackTriggered === true, "Regression at 50% must trigger rollback");
    assert(canary.status === 'ROLLED_BACK', "Canary status must be ROLLED_BACK");
    assert(canary.finalPercentage === 0, "Canary traffic must drop to 0% after rollback");
  });

  // TEST 19: Cost-aware routing
  await runTest(19, "Cost-aware routing", async () => {
    const est = costIntelligence.estimateTaskCost({
      model: 'gemini-3.8-flash',
      estimatedInputTokens: 20000,
      estimatedOutputTokens: 5000,
      mcpCalls: 4
    });
    assert(est.totalEstimateUsd > 0.0 && est.totalEstimateUsd < 0.05, "Cost estimate must calculate real float value");

    const strategies = [
      { name: "Fast cheap strategy", qualityScore: 8, costScore: 2, latencyScore: 2 },
      { name: "Max quality strategy", qualityScore: 10, costScore: 9, latencyScore: 8 }
    ];
    const bestForCost = costIntelligence.optimizeStrategy(strategies, 'COST');
    assert(bestForCost.name === "Fast cheap strategy", "Should pick lower cost when priority is COST");
    const bestForQuality = costIntelligence.optimizeStrategy(strategies, 'QUALITY');
    assert(bestForQuality.name === "Max quality strategy", "Should pick higher quality when priority is QUALITY");
  });

  // TEST 20: Proof-carrying final delivery
  await runTest(20, "Proof-carrying final delivery", async () => {
    const cert = proofCarrier.createDeliveryCertificate({
      whatChanged: [{ file: ".agents/v4/orchestrator-v4.js", description: "V4 Root Operating System" }],
      why: "Upgrade orchestration system from V3 to V4",
      agentsUsed: ["orchestration-agent-v4"],
      skillsUsed: ["code-review"],
      mcpUsed: ["playwright", "context7"],
      modelsUsed: ["gemini-3.8-flash"],
      testsRun: [{ name: "validation-suite", passed: true }],
      securityChecks: [{ check: "zero-secret-policy", passed: true }],
      evidence: {
        filesModified: [".agents/v4/orchestrator-v4.js"]
      }
    });
    assert(cert.summary.WHAT_CHANGED.length > 0, "Must include WHAT_CHANGED");
    assert(cert.CLAIMS_EVIDENCE.VERIFIED.length > 0, "Must categorize verified claims");
    assert(cert.PROOF_STATUS === 'PROOF_CARRYING_DELIVERY_CERTIFIED', "Must certify delivery");
  });

  console.log("\n==================================================================");
  const passedCount = results.filter(r => r.passed).length;
  console.log(`TOTAL TESTS: ${results.length} | PASSED: ${passedCount} | FAILED: ${results.length - passedCount}`);
  console.log("==================================================================");

  if (passedCount === results.length) {
    console.log(">>> 100% PASS: ALL 20 V4 OPERATIONAL TESTS VERIFIED CLEANLY <<<");
    process.exit(0);
  } else {
    console.error(">>> FAILURES DETECTED IN VALIDATION SUITE <<<");
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error("Fatal test runner crash:", err);
  process.exit(1);
});

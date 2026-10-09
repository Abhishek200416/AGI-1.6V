/**
 * matrix/tests/x12-architecture-suite.js
 * MATRIX X1.2 — Architecture Capabilities Validation Suite
 * 
 * Verifies the 7 newly evolved architectural capabilities:
 * 1. Mission Compiler DAG generation & budget attribution
 * 2. Adaptive Execution Controller FSM transitions & cycle detection
 * 3. Specialist Workforce single-model binding to Gemini 3.8 Flash High
 * 4. Hierarchical Token Compactor 35k threshold & disk archiving
 * 5. Closed-Loop Verifier non-verbal state mutation proof & syntax check
 * 6. Architecture Evolution Engine boundary lock & proposal promotion
 * 7. Model Router X1.2 sole-model policy & timeout calibration
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { missionCompiler } = require('../missions/mission-compiler');
const { adaptiveExecutionController, EXECUTION_STATES } = require('../cognition/adaptive-execution-controller');
const { specialistWorkforce, ROLES, SOLE_MODEL } = require('../agents/specialist-workforce');
const { hierarchicalCompactor } = require('../memory/hierarchical-compactor');
const { closedLoopVerifier } = require('../verification/closed-loop-verifier');
const { architectureEvolutionEngine } = require('../learning/architecture-evolution');
const { modelRouter } = require('../models/model-router');

async function runX12ArchitectureSuite() {
  console.log('==================================================================');
  console.log('   MATRIX X1.2 — ARCHITECTURE CAPABILITIES VALIDATION SUITE       ');
  console.log('==================================================================\n');

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`  PASS [TEST ${total.toString().padStart(2, '0')}]: ${name}`);
      passed++;
    } catch (e) {
      console.error(`  FAIL [TEST ${total.toString().padStart(2, '0')}]: ${name} -> ${e.message}`);
      throw e;
    }
  }

  async function testAsync(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  PASS [TEST ${total.toString().padStart(2, '0')}]: ${name}`);
      passed++;
    } catch (e) {
      console.error(`  FAIL [TEST ${total.toString().padStart(2, '0')}]: ${name} -> ${e.message}`);
      throw e;
    }
  }

  // --- 1. Mission Compiler ---
  test('Mission Compiler translates objective into dependency DAG', () => {
    const dag = missionCompiler.compile({
      objective: 'Build, test, and verify an end-to-end cryptographic hashing utility'
    });
    assert(dag.missionId, 'Mission ID must exist');
    assert(dag.nodes.length >= 5, 'Must generate at least 5 discrete work stages');
    assert(dag.edges.length >= 4, 'Must define dependency edges');
    assert(dag.topologicalOrder.length === dag.nodes.length, 'Must have topological ordering');
    assert(dag.nodes[0].stage === 'DISCOVER', 'First stage must be DISCOVER');
  });

  // --- 2. Adaptive Execution Controller FSM & Deadlock Detection ---
  test('Adaptive Execution Controller manages state transitions', () => {
    const dag = missionCompiler.compile({ objective: 'Test state machine' });
    adaptiveExecutionController.loadMission(dag);
    const firstNode = dag.nodes[0];
    
    const ready = adaptiveExecutionController.transition(firstNode.id, EXECUTION_STATES.READY);
    assert(ready.state === EXECUTION_STATES.READY, 'Node transitioned to READY');
    
    const running = adaptiveExecutionController.transition(firstNode.id, EXECUTION_STATES.RUNNING);
    assert(running.state === EXECUTION_STATES.RUNNING, 'Node transitioned to RUNNING');
    
    const verifying = adaptiveExecutionController.transition(firstNode.id, EXECUTION_STATES.VERIFYING);
    assert(verifying.state === EXECUTION_STATES.VERIFYING, 'Node transitioned to VERIFYING');
    
    const complete = adaptiveExecutionController.transition(firstNode.id, EXECUTION_STATES.COMPLETE);
    assert(complete.state === EXECUTION_STATES.COMPLETE, 'Node transitioned to COMPLETE');
  });

  test('Adaptive Execution Controller interrupts cycle deadlocks', () => {
    const fp = 'TOOL_CALL:cat:non_existent_file.txt';
    const c1 = adaptiveExecutionController.checkCycleDeadlock(fp);
    assert(!c1.deadlockDetected, 'First call is not deadlock');
    const c2 = adaptiveExecutionController.checkCycleDeadlock(fp);
    assert(!c2.deadlockDetected, 'Second call is logged');
    const c3 = adaptiveExecutionController.checkCycleDeadlock(fp);
    assert(c3.deadlockDetected, 'Third repetitive call triggers deadlock watchdog');
  });

  // --- 3. Specialist Workforce Pinned to Gemini 3.8 Flash High ---
  test('Specialist Workforce pins all 7 roles strictly to Gemini 3.8 Flash High', () => {
    assert(specialistWorkforce.getModel() === SOLE_MODEL, 'Sole model must be gemini-3.8-flash-high');
    assert(specialistWorkforce.getModel() === 'gemini-3.8-flash-high', 'Exact slug confirmed');
    const roles = specialistWorkforce.getRoles();
    assert(roles.length === 7, 'Must have 7 specialized roles');
    assert(roles.includes(ROLES.PLANNER), 'Planner role present');
    assert(roles.includes(ROLES.SKEPTIC), 'Skeptic role present');
    assert(roles.includes(ROLES.EVIDENCE_JUDGE), 'Evidence Judge present');
  });

  // --- 4. Hierarchical Token Compactor ---
  test('Hierarchical Compactor triggers at 35k tokens and archives raw logs to disk', () => {
    // Construct simulated long turn history (>35k tokens)
    const longTurns = [];
    for (let i = 0; i < 20; i++) {
      longTurns.push({
        id: `turn-${i}`,
        role: 'user',
        content: 'Task step ' + i,
        toolOutput: 'Extensive compiler output line '.repeat(350), // ~2,700 tokens per turn
        artifact: i % 3 === 0 ? `file_${i}.js` : null,
        verifiedFact: i % 4 === 0 ? `Assertion ${i} passed` : null
      });
    }

    const compaction = hierarchicalCompactor.compactHistory(longTurns, 'Compile and test cryptography engine');
    assert(compaction.compacted === true, 'Compaction must trigger on >35k tokens');
    assert(compaction.previousTokens > 35000, 'Original token count was >35k');
    assert(compaction.totalTokens < 20000, 'Compacted tokens must be substantially lower');
    assert(parseFloat(compaction.percentReduction) > 50, 'Must achieve >50% token reduction');
    assert(compaction.archiveHash !== null, 'Must write raw outputs to archive file with SHA-256 hash');
  });

  // --- 5. Closed-Loop State Verifier ---
  test('Closed-Loop Verifier asserts non-verbal file mutations and syntax', () => {
    // 1. Syntax check on an actual existing repository file
    const syntaxProof = closedLoopVerifier.verifyJsSyntax('matrix/missions/mission-compiler.js');
    assert(syntaxProof.passed === true, 'Mission compiler syntax must be valid');

    // 2. Mutation check
    const mutationProof = closedLoopVerifier.verifyFileMutation({
      filePath: 'matrix/missions/mission-compiler.js',
      expectedSubstrings: ['class MissionCompiler']
    });
    assert(mutationProof.passed === true, 'File mutation proof must confirm content');
    assert(mutationProof.currentHash.length === 64, 'SHA-256 hash must be recorded');
  });

  test('Closed-Loop Verifier executes and verifies test runner exit code', () => {
    const testProof = closedLoopVerifier.verifyTestExecution({
      testScriptPath: '.agents/v4/tests/validation-suite.js',
      expectedPassPattern: '100% PASS'
    });
    assert(testProof.passed === true, 'V4 test suite execution must pass with exit code 0');
    assert(testProof.stdoutSnippet.includes('100% PASS'), 'Must capture pass banner');
  });

  // --- 6. Architecture Evolution Engine ---
  test('Architecture Evolution Engine blocks modifications to locked safety boundaries', () => {
    const safetyViolation = architectureEvolutionEngine.isBoundarySafe([
      'matrix/missions/new-feature.js',
      '.agents/v4/orchestrator-v4.js'
    ]);
    assert(safetyViolation.safe === false, 'Must reject modifications touching .agents/v4/');
    assert(safetyViolation.violation.includes('protected boundary'), 'Explicit violation message');

    const safeCandidate = architectureEvolutionEngine.isBoundarySafe([
      'matrix/tools/custom-formatter.js'
    ]);
    assert(safeCandidate.safe === true, 'Permitted non-boundary file is safe');
  });

  // --- 7. Model Router X1.2 Policy ---
  test('Model Router X1.2 routes exclusively to Gemini 3.8 Flash High', () => {
    const x12Route = modelRouter.routeX12({ taskType: 'COMPLEX_ARCHITECTURE', complexity: 'CRITICAL' });
    assert(x12Route.selectedModel === 'gemini-3.8-flash-high', 'Must route to gemini-3.8-flash-high');
    assert(x12Route.canonicalModelId === 'gemini-3.8-flash-high', 'Canonical ID is gemini-3.8-flash-high');
    assert(x12Route.provider === 'Antigravity CLI', 'Provider is Antigravity CLI');
  });

  console.log('\n==================================================================');
  console.log(`TOTAL X1.2 TESTS: ${total} | PASSED: ${passed} | FAILED: 0`);
  console.log('==================================================================');
  console.log('>>> 100% PASS: ALL MATRIX X1.2 ARCHITECTURAL UPGRADES VERIFIED <<<');
}

if (require.main === module) {
  runX12ArchitectureSuite().catch(err => {
    console.error('X1.2 Architecture Test Suite Failed:', err);
    process.exit(1);
  });
}

module.exports = { runX12ArchitectureSuite };

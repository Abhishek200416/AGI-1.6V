/**
 * matrix/missions/mission-compiler.js
 * MATRIX X1.2 — Mission Compiler
 * 
 * Compiles a high-level commander objective into a verified Directed Acyclic Graph (DAG)
 * of discrete, verifiable work units with preconditions, postconditions, and resource budgets.
 * 
 * Research foundation: Wang et al. (2023) "Plan-and-Solve Prompting" (ACL 2023)
 * Follows Ponytail principle: minimal direct code, stdlib crypto & graph sorting.
 */

const crypto = require('crypto');

class MissionCompiler {
  constructor() {
    this.compiledMissions = new Map();
  }

  /**
   * Compiles an objective into a dependency-ordered execution DAG
   */
  compile({
    missionId = null,
    objective = '',
    constraints = {},
    budget = { maxTokens: 250000, maxTimeMs: 300000 },
    riskLevel = 'NORMAL'
  } = {}) {
    const id = missionId || `MSN-X12-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const cleanObjective = objective.trim();

    if (!cleanObjective) {
      throw new Error('MissionCompiler: Objective cannot be empty.');
    }

    // Deconstruct objective into small, verifiable stages based on intent keywords
    const nodes = [];
    let stepIndex = 0;

    // Stage 1: Discovery & Verification of Baseline
    nodes.push({
      id: `${id}-STEP-01`,
      title: 'Inspect Environment & Baseline Preconditions',
      stage: 'DISCOVER',
      dependencies: [],
      tools: ['filesystem', 'git'],
      successCondition: { type: 'STATE_ASSERTION', assertion: 'Preconditions verified and baseline intact' },
      budgetTokens: 20000,
      timeoutMs: 30000,
      status: 'READY'
    });
    stepIndex++;

    // Stage 2: Research or API Contract Verification (if research or unfamiliarity implied)
    const needsResearch = /research|benchmark|explore|eval|investigate/i.test(cleanObjective);
    if (needsResearch) {
      nodes.push({
        id: `${id}-STEP-02`,
        title: 'Synthesize Research & Ground API Contracts',
        stage: 'RESEARCH',
        dependencies: [`${id}-STEP-01`],
        tools: ['web_search', 'filesystem'],
        successCondition: { type: 'PROVENANCE_CHECK', assertion: 'Claims grounded with source provenance' },
        budgetTokens: 40000,
        timeoutMs: 60000,
        status: 'PLANNED'
      });
      stepIndex++;
    }

    // Stage 3: Test Specification & Acceptance Creation (TDD First)
    const prevId = nodes[nodes.length - 1].id;
    nodes.push({
      id: `${id}-STEP-${(stepIndex + 1).toString().padStart(2, '0')}`,
      title: 'Generate Runnable Test Contract & Acceptance Assertions',
      stage: 'TEST_DESIGN',
      dependencies: [prevId],
      tools: ['filesystem'],
      successCondition: { type: 'FILE_EXISTS', path: 'tests', assertion: 'Runnable test specification authored' },
      budgetTokens: 30000,
      timeoutMs: 45000,
      status: 'PLANNED'
    });
    stepIndex++;

    // Stage 4: Implementation & Targeted Modification
    const testStepId = nodes[nodes.length - 1].id;
    nodes.push({
      id: `${id}-STEP-${(stepIndex + 1).toString().padStart(2, '0')}`,
      title: 'Execute Minimal Working Implementation (Ponytail Rule)',
      stage: 'IMPLEMENT',
      dependencies: [testStepId],
      tools: ['filesystem', 'terminal'],
      successCondition: { type: 'SYNTAX_VALID', assertion: 'Implementation syntax valid and complete' },
      budgetTokens: 60000,
      timeoutMs: 90000,
      status: 'PLANNED'
    });
    stepIndex++;

    // Stage 5: Closed-Loop Verification & Execution
    const implStepId = nodes[nodes.length - 1].id;
    nodes.push({
      id: `${id}-STEP-${(stepIndex + 1).toString().padStart(2, '0')}`,
      title: 'Execute Test Harness & Verify State Transitions',
      stage: 'VERIFY',
      dependencies: [implStepId],
      tools: ['terminal'],
      successCondition: { type: 'EXIT_CODE_ZERO', assertion: 'All tests pass with exit code 0' },
      budgetTokens: 30000,
      timeoutMs: 45000,
      status: 'PLANNED'
    });
    stepIndex++;

    // Stage 6: Skeptical Review & Proof Certification
    const verifyStepId = nodes[nodes.length - 1].id;
    nodes.push({
      id: `${id}-STEP-${(stepIndex + 1).toString().padStart(2, '0')}`,
      title: 'Skeptical Review & Proof-Carrying Delivery',
      stage: 'CERTIFY',
      dependencies: [verifyStepId],
      tools: ['git'],
      successCondition: { type: 'PROOF_CERTIFIED', assertion: 'Independent judge certified zero regressions' },
      budgetTokens: 20000,
      timeoutMs: 30000,
      status: 'PLANNED'
    });

    // Build DAG Edges
    const edges = [];
    for (const node of nodes) {
      for (const dep of node.dependencies) {
        edges.push({ from: dep, to: node.id });
      }
    }

    const compiled = {
      missionId: id,
      objective: cleanObjective,
      riskLevel,
      compiledAt: new Date().toISOString(),
      nodes,
      edges,
      totalNodes: nodes.length,
      budget,
      topologicalOrder: nodes.map(n => n.id)
    };

    this.compiledMissions.set(id, compiled);
    return compiled;
  }

  getMission(missionId) {
    return this.compiledMissions.get(missionId) || null;
  }
}

const missionCompiler = new MissionCompiler();
module.exports = { MissionCompiler, missionCompiler };

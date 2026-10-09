/**
 * matrix/agents/specialist-workforce.js
 * MATRIX X1.2 — Single-Model Specialist Workforce
 * 
 * Implements 7 specialized agent roles using exclusively Gemini 3.8 Flash High (gemini-3.8-flash-high).
 * Each role defines specialized epistemic prompts, tool boundaries, and output contracts.
 * 
 * Roles:
 * 1. PLANNER: Decomposes goals into verifiable DAG milestones.
 * 2. RESEARCHER: Grounds claims, cross-references documentation, checks citations.
 * 3. IMPLEMENTER: Writes minimal, precise, non-bloated code adhering to the Ponytail rule.
 * 4. TEST_ENGINEER: Formulates runnable tests before or alongside code.
 * 5. SKEPTIC: Adversarial code and plan reviewer hunting regressions and bloat.
 * 6. EVIDENCE_JUDGE: Independent certification based on test execution evidence.
 * 7. RESOURCE_CONTROLLER: Enforces token budgets and turn execution deadlines.
 */

const { modelRouter } = require('../models/model-router');
const { securityKernel } = require('../kernel/security-kernel');

const ROLES = {
  PLANNER: 'PLANNER',
  RESEARCHER: 'RESEARCHER',
  IMPLEMENTER: 'IMPLEMENTER',
  TEST_ENGINEER: 'TEST_ENGINEER',
  SKEPTIC: 'SKEPTIC',
  EVIDENCE_JUDGE: 'EVIDENCE_JUDGE',
  RESOURCE_CONTROLLER: 'RESOURCE_CONTROLLER'
};

const SOLE_MODEL = 'gemini-3.8-flash-high';

class SpecialistWorkforce {
  constructor() {
    this.soleModel = SOLE_MODEL;
    this.rolePrompts = {
      [ROLES.PLANNER]: `You are the Lead Planning Specialist in MATRIX X1.2.
Your goal is to break complex objectives into small, testable, dependency-ordered milestones.
Rule: Output clear JSON DAGs with pre-conditions and post-conditions. Avoid redundant steps.`,

      [ROLES.RESEARCHER]: `You are the Research & Grounding Specialist in MATRIX X1.2.
Your goal is to verify facts against documentation, APIs, and academic literature.
Rule: Every claim must have an identified source. Never fabricate URLs, APIs, or parameters.`,

      [ROLES.IMPLEMENTER]: `You are the Senior Implementation Engineer in MATRIX X1.2.
Your goal is to write minimal, robust, working code following the Ponytail principle.
Rule: Deletion over addition. Boring over clever. Fewest files possible. No unrequested abstractions.`,

      [ROLES.TEST_ENGINEER]: `You are the Quality Assurance & Test Engineer in MATRIX X1.2.
Your goal is to write small, runnable, assert-based test files that fail if logic breaks.
Rule: No bulky frameworks unless requested. Leave one runnable check behind.`,

      [ROLES.SKEPTIC]: `You are the Skeptical Reviewer in MATRIX X1.2.
Your goal is to find bugs, security risks, memory leaks, token waste, and over-engineering.
Rule: Be adversarial. Challenge assumptions. If an implementation is over-complicated, flag it.`,

      [ROLES.EVIDENCE_JUDGE]: `You are the Independent Evidence Judge in MATRIX X1.2.
Your goal is to issue final PASS/FAIL verdicts based on observed test execution, NOT verbal claims.
Rule: A test passes only when exit code is 0 and output matches expected assertions.`,

      [ROLES.RESOURCE_CONTROLLER]: `You are the Resource & Token Safety Controller in MATRIX X1.2.
Your goal is to enforce context token budgets, turn timeouts, and memory compaction.
Rule: Halt runaway loops, flag repetitive tool calls, and ensure operations remain within bounds.`
    };
  }

  /**
   * Dispatches a reasoning task to a specialized role using the sole foundation model
   */
  async invokeRole({
    role = ROLES.IMPLEMENTER,
    prompt = '',
    context = '',
    temperature = 0.2,
    live = false,
    timeoutMs = 120000
  }) {
    if (!this.rolePrompts[role]) {
      throw new Error(`SpecialistWorkforce: Unknown role '${role}'`);
    }

    const systemPrompt = this.rolePrompts[role];
    const fullPrompt = context ? `### CONTEXT:\n${context}\n\n### TASK:\n${prompt}` : prompt;

    // Direct invocation strictly via gemini-3.8-flash-high (ADR-01 & Directive 0)
    return await modelRouter.callModel({
      model: this.soleModel,
      prompt: fullPrompt,
      systemPrompt,
      temperature,
      live,
      timeoutMs
    });
  }

  getRoles() {
    return Object.values(ROLES);
  }

  getModel() {
    return this.soleModel;
  }
}

const specialistWorkforce = new SpecialistWorkforce();
module.exports = {
  SpecialistWorkforce,
  specialistWorkforce,
  ROLES,
  SOLE_MODEL
};

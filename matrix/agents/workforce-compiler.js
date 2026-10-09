/**
 * matrix/agents/workforce-compiler.js
 * MATRIX X1 — Workforce Compiler
 * 
 * Compiles a commander objective into a temporary, minimal sufficient organization.
 * Scales dynamically with complexity, uncertainty, and risk.
 */

const { agentFactory } = require('./agent-factory');
const { agentPerformanceMemory } = require('../evaluation/agent-performance-memory');

class WorkforceCompiler {
  constructor() {
    this.compiledOrganizations = new Map();
  }

  /**
   * Compile objective into temporary organization
   */
  compileWorkforce({
    missionId,
    objective,
    riskLevel = 'LOW', // LOW, MEDIUM, HIGH, CRITICAL
    domain = 'GENERAL'
  }) {
    const orgId = `ORG-${Date.now().toString(36)}`;
    const lowerObj = objective.toLowerCase();
    const roles = [];

    // Base worker
    if (lowerObj.includes('research') || lowerObj.includes('explore') || lowerObj.includes('domain')) {
      roles.push({
        specialization: 'Research-Specialist',
        purpose: 'Execute literature & technical document discovery',
        model: 'gemini-flash'
      });
      roles.push({
        specialization: 'Synthesis-Agent',
        purpose: 'Synthesize findings and extract core hypotheses',
        model: 'gemini-flash'
      });
    } else if (lowerObj.includes('trade') || lowerObj.includes('market')) {
      roles.push({
        specialization: 'Market-Data-Agent',
        purpose: 'Process tick streams and compute technical indicators',
        model: 'gemini-flash'
      });
      roles.push({
        specialization: 'Risk-Engineer',
        purpose: 'Calculate risk of ruin, maximum drawdown and position limits',
        model: 'gemini-pro'
      });
    } else {
      // Default engineering slice
      roles.push({
        specialization: 'Implementation-Specialist',
        purpose: 'Synthesize and execute code modules',
        model: 'gemini-flash'
      });
    }

    // High risk or complex adds verification pair
    if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL' || lowerObj.includes('software') || lowerObj.includes('system')) {
      roles.push({
        specialization: 'Independent-Verifier',
        purpose: 'Execute empirical checks and test assertions',
        model: 'gemini-flash'
      });
      roles.push({
        specialization: 'Security-Auditor',
        purpose: 'Verify zero credential leaks and permission boundaries',
        model: 'gemini-pro'
      });
    }

    // Instantiate dynamic agents via Agent Factory with empirical performance routing
    const createdAgents = [];
    for (const r of roles) {
      let chosenModel = r.model;
      const perfRecord = agentPerformanceMemory.getRecord(r.specialization);
      if (perfRecord && perfRecord.preferredModel) {
        chosenModel = perfRecord.preferredModel;
      } else if (chosenModel === 'gemini-flash') {
        chosenModel = 'gemini-3.8-flash';
      } else if (chosenModel === 'gemini-pro') {
        chosenModel = 'gemini-3.8-pro';
      }

      const agt = agentFactory.createAgent({
        missionId,
        purpose: r.purpose,
        specialization: r.specialization,
        model: chosenModel
      });
      createdAgents.push(agt);
    }

    const organization = {
      orgId,
      missionId,
      objective,
      riskLevel,
      compiledAt: new Date().toISOString(),
      workforceCount: createdAgents.length,
      agents: createdAgents,
      humanCheckpointsRequired: riskLevel === 'CRITICAL' || riskLevel === 'HIGH'
    };

    this.compiledOrganizations.set(orgId, organization);
    return organization;
  }

  getOrganization(orgId) {
    return this.compiledOrganizations.get(orgId);
  }
}

const workforceCompiler = new WorkforceCompiler();

module.exports = { WorkforceCompiler, workforceCompiler };

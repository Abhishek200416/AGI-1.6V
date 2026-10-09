/**
 * matrix/evaluation/agent-performance-memory.js
 * MATRIX X1.1 — Persistent Agent Performance Memory
 * 
 * Tracks empirical per-agent and per-specialization track records across all
 * evaluations and real missions.
 * Informs Workforce Compiler and Model Router on optimal agent assignments.
 */

const fs = require('fs');
const path = require('path');
const { storageFabric } = require('../storage/storage-fabric');

class AgentPerformanceMemory {
  constructor() {
    this.memoryDir = null;
    this.memoryFilePath = null;
    this.agentRecords = new Map();
    this.initStorage();
  }

  initStorage() {
    const baseDir = storageFabric.activeDataRoot || path.join(__dirname, '../../.matrix_data');
    this.memoryDir = path.join(baseDir, 'evaluation');
    this.memoryFilePath = path.join(this.memoryDir, 'agent_performance_memory.json');

    try {
      if (!fs.existsSync(this.memoryDir)) {
        fs.mkdirSync(this.memoryDir, { recursive: true });
      }
      if (fs.existsSync(this.memoryFilePath)) {
        const raw = fs.readFileSync(this.memoryFilePath, 'utf8');
        const parsed = JSON.parse(raw);
        for (const [key, val] of Object.entries(parsed)) {
          this.agentRecords.set(key, val);
        }
      }
    } catch (e) {}
  }

  saveToDisk() {
    try {
      this.initStorage();
      const obj = {};
      for (const [k, v] of this.agentRecords.entries()) {
        obj[k] = v;
      }
      fs.writeFileSync(this.memoryFilePath, JSON.stringify(obj, null, 2), 'utf8');
    } catch (e) {}
  }

  /**
   * Update performance record for an agent or specialization
   */
  recordTrialResult({
    specialization,
    agentId = null,
    model = 'gemini-3.8-flash',
    taskFamily = 'GENERAL',
    passed = true,
    latencyMs = 100,
    tokensUsed = 500,
    costUsd = 0.0001
  }) {
    this.initStorage();
    const key = specialization || agentId || 'general-agent';

    let rec = this.agentRecords.get(key);
    if (!rec) {
      rec = {
        specialization: key,
        agentId,
        preferredModel: model,
        trialsTotal: 0,
        trialsPassed: 0,
        trialsFailed: 0,
        passRate: 1.0,
        totalLatencyMs: 0,
        avgLatencyMs: 0,
        totalTokens: 0,
        avgTokens: 0,
        totalCostUsd: 0,
        domainScores: {},
        updatedAt: new Date().toISOString()
      };
    }

    rec.trialsTotal += 1;
    if (passed) rec.trialsPassed += 1;
    else rec.trialsFailed += 1;

    rec.passRate = Number((rec.trialsPassed / rec.trialsTotal).toFixed(4));
    rec.totalLatencyMs += latencyMs;
    rec.avgLatencyMs = Math.round(rec.totalLatencyMs / rec.trialsTotal);
    rec.totalTokens += tokensUsed;
    rec.avgTokens = Math.round(rec.totalTokens / rec.trialsTotal);
    rec.totalCostUsd = Number((rec.totalCostUsd + costUsd).toFixed(6));

    if (!rec.domainScores[taskFamily]) {
      rec.domainScores[taskFamily] = { trials: 0, passed: 0, score: 1.0 };
    }
    rec.domainScores[taskFamily].trials += 1;
    if (passed) rec.domainScores[taskFamily].passed += 1;
    rec.domainScores[taskFamily].score = Number(
      (rec.domainScores[taskFamily].passed / rec.domainScores[taskFamily].trials).toFixed(4)
    );

    rec.updatedAt = new Date().toISOString();
    this.agentRecords.set(key, rec);
    this.saveToDisk();

    return rec;
  }

  /**
   * Get empirical performance record for a specialization
   */
  getRecord(specialization) {
    this.initStorage();
    return this.agentRecords.get(specialization) || null;
  }

  /**
   * Find the best performing specialization for a given task family
   */
  findOptimalSpecialist(taskFamily) {
    this.initStorage();
    let best = null;
    let highestScore = -1;

    for (const rec of this.agentRecords.values()) {
      const dScore = rec.domainScores[taskFamily] ? rec.domainScores[taskFamily].score : rec.passRate;
      if (dScore > highestScore && rec.trialsTotal >= 2) {
        highestScore = dScore;
        best = rec;
      }
    }

    return best;
  }

  /**
   * Get all performance records
   */
  getAllRecords() {
    this.initStorage();
    return Array.from(this.agentRecords.values());
  }
}

const agentPerformanceMemory = new AgentPerformanceMemory();

module.exports = {
  AgentPerformanceMemory,
  agentPerformanceMemory
};

/**
 * matrix/economy/resource-economy.js
 * MATRIX X1 — Resource Economy
 * 
 * Tracks & allocates:
 * - CPU, GPU, RAM, Disk, Network, API cost, Mission Time, Human Attention.
 * Manages mission budgets and adaptive degradation when system resources are low.
 */

const os = require('os');
const { tokenEconomy } = require('./token-economy');
const { storageFabric } = require('../storage/storage-fabric');

class ResourceEconomy {
  constructor() {
    this.humanInterruptions = {
      totalInterruptions: 0,
      questionsAsked: 0,
      totalWaitTimeMs: 0,
      answeredCount: 0
    };
    this.missionBudgets = new Map();
  }

  setMissionBudget(missionId, {
    maxTokens = 100000,
    maxCostUsd = 1.0,
    maxDurationMs = 3600000,
    maxHumanQuestions = 3
  }) {
    this.missionBudgets.set(missionId, {
      maxTokens,
      maxCostUsd,
      maxDurationMs,
      maxHumanQuestions,
      consumedTokens: 0,
      consumedCostUsd: 0,
      startTime: Date.now(),
      humanQuestionsAsked: 0
    });
  }

  checkBudget(missionId) {
    if (!this.missionBudgets.has(missionId)) return { ok: true };
    const b = this.missionBudgets.get(missionId);
    if (b.consumedCostUsd >= b.maxCostUsd) {
      return { ok: false, reason: 'COST_BUDGET_EXCEEDED', limit: b.maxCostUsd, current: b.consumedCostUsd };
    }
    if (b.consumedTokens >= b.maxTokens) {
      return { ok: false, reason: 'TOKEN_BUDGET_EXCEEDED', limit: b.maxTokens, current: b.consumedTokens };
    }
    if (b.humanQuestionsAsked >= b.maxHumanQuestions) {
      return { ok: false, reason: 'HUMAN_ATTENTION_LIMIT_REACHED', limit: b.maxHumanQuestions };
    }
    return { ok: true, budgetRemaining: b };
  }

  recordHumanInterruption(durationMs = 0) {
    this.humanInterruptions.totalInterruptions++;
    this.humanInterruptions.questionsAsked++;
    this.humanInterruptions.totalWaitTimeMs += durationMs;
    this.humanInterruptions.answeredCount++;
  }

  getSystemResourceStatus() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMemPercent = Math.round(((totalMem - freeMem) / totalMem) * 100);

    const vols = storageFabric.detectVolumes();
    const primaryVol = vols[0] || {};
    const lowMemory = usedMemPercent > 90;
    const lowDisk = primaryVol.freeGb !== undefined && primaryVol.freeGb < 5;

    let adaptiveStrategy = 'NORMAL';
    if (lowMemory || lowDisk) {
      adaptiveStrategy = 'THROTTLE_AND_ARCHIVE';
    }

    return {
      host: {
        totalMemMb: Math.round(totalMem / (1024 * 1024)),
        freeMemMb: Math.round(freeMem / (1024 * 1024)),
        usedMemPercent,
        cpuCores: os.cpus().length,
        loadAvg: os.loadavg()
      },
      tokens: tokenEconomy.getMetrics(),
      humanAttention: this.humanInterruptions,
      resourceState: (lowMemory || lowDisk) ? 'PRESSURE' : 'HEALTHY',
      adaptiveStrategy
    };
  }
}

const resourceEconomy = new ResourceEconomy();

module.exports = { ResourceEconomy, resourceEconomy };

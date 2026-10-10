/**
 * agi/orchestration/resource-governor.js
 * AGI 0.7 — Resource Governor & Token Economy
 * 
 * Enforces execution budgets, token limits, and proactive compaction triggers.
 */

class ResourceGovernor {
  constructor(options = {}) {
    this.maxTokensPerMission = options.maxTokensPerMission || 1000000;
    this.tokenCompactionThreshold = options.tokenCompactionThreshold || 35000;
    this.defaultStepTimeoutMs = options.defaultStepTimeoutMs || 120000;
    this.currentMissionTokens = 0;
    this.totalExecutionCalls = 0;
    this.budgetExceeded = false;
  }

  recordUsage(tokensUsed = 0) {
    this.currentMissionTokens += tokensUsed;
    this.totalExecutionCalls += 1;

    const shouldCompact = this.currentMissionTokens >= this.tokenCompactionThreshold;
    if (this.currentMissionTokens >= this.maxTokensPerMission) {
      this.budgetExceeded = true;
    }

    return {
      currentMissionTokens: this.currentMissionTokens,
      shouldCompact,
      budgetExceeded: this.budgetExceeded,
      utilizationPercent: (this.currentMissionTokens / this.maxTokensPerMission) * 100
    };
  }

  resetMissionBudget() {
    this.currentMissionTokens = 0;
    this.budgetExceeded = false;
  }

  getMetrics() {
    return {
      currentMissionTokens: this.currentMissionTokens,
      tokenCompactionThreshold: this.tokenCompactionThreshold,
      totalExecutionCalls: this.totalExecutionCalls,
      budgetExceeded: this.budgetExceeded,
      stepTimeoutMs: this.defaultStepTimeoutMs
    };
  }
}

module.exports = { ResourceGovernor };

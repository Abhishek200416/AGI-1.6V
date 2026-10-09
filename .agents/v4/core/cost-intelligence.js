/**
 * .agents/v4/core/cost-intelligence.js
 * Universal Autonomous Engineering Intelligence Operating System — V4
 * Engine #18: Cost Intelligence
 *
 * Tracks tokens, model costs, MCP tool usage, container runtimes,
 * estimates pre-flight task costs, and optimizes trade-offs (QUALITY, COST, LATENCY).
 */

const { eventBus, EVENT_TYPES } = require('./event-bus');

class CostIntelligence {
  constructor(budgetLimitUsd = 20.0) {
    this.budgetLimitUsd = budgetLimitUsd;
    this.cumulativeSpendUsd = 0.0;
    this.taskSpendLedger = new Map();

    // Cost tables (per 1M tokens or per invocation unit)
    this.rates = {
      models: {
        'gemini-3.8-flash': { inputPerM: 0.15, outputPerM: 0.60 },
        'gemini-2.5-pro': { inputPerM: 1.25, outputPerM: 5.00 },
        'gemini-2.5-flash': { inputPerM: 0.075, outputPerM: 0.30 },
        'claude-3-7-sonnet': { inputPerM: 3.00, outputPerM: 15.00 },
        'gpt-4o': { inputPerM: 2.50, outputPerM: 10.00 },
        'local-qwen-coder': { inputPerM: 0.0, outputPerM: 0.0 }
      },
      mcpCallCost: 0.0001,
      browserSessionMinute: 0.002,
      containerMinute: 0.001
    };
  }

  estimateTaskCost({
    model = 'gemini-3.8-flash',
    estimatedInputTokens = 10000,
    estimatedOutputTokens = 2000,
    mcpCalls = 2,
    browserMinutes = 0,
    containerMinutes = 0
  }) {
    const modelRate = this.rates.models[model] || this.rates.models['gemini-3.8-flash'];
    const tokenCost = ((estimatedInputTokens / 1e6) * modelRate.inputPerM) +
                      ((estimatedOutputTokens / 1e6) * modelRate.outputPerM);
    const mcpCost = mcpCalls * this.rates.mcpCallCost;
    const browserCost = browserMinutes * this.rates.browserSessionMinute;
    const containerCost = containerMinutes * this.rates.containerMinute;

    const totalEstimate = tokenCost + mcpCost + browserCost + containerCost;

    return {
      model,
      estimatedInputTokens,
      estimatedOutputTokens,
      tokenCostUsd: parseFloat(tokenCost.toFixed(6)),
      mcpCostUsd: parseFloat(mcpCost.toFixed(6)),
      browserCostUsd: parseFloat(browserCost.toFixed(6)),
      containerCostUsd: parseFloat(containerCost.toFixed(6)),
      totalEstimateUsd: parseFloat(totalEstimate.toFixed(5))
    };
  }

  recordSpend(taskId, {
    model = 'gemini-3.8-flash',
    inputTokens = 0,
    outputTokens = 0,
    mcpCalls = 0,
    browserMinutes = 0,
    containerMinutes = 0
  }) {
    const est = this.estimateTaskCost({
      model,
      estimatedInputTokens: inputTokens,
      estimatedOutputTokens: outputTokens,
      mcpCalls,
      browserMinutes,
      containerMinutes
    });

    const spend = est.totalEstimateUsd;
    this.cumulativeSpendUsd += spend;

    const currentTaskSpend = (this.taskSpendLedger.get(taskId) || 0) + spend;
    this.taskSpendLedger.set(taskId, currentTaskSpend);

    if (this.cumulativeSpendUsd > (this.budgetLimitUsd * 0.8)) {
      eventBus.emitEvent(EVENT_TYPES.BUDGET_WARNING, {
        cumulativeSpendUsd: this.cumulativeSpendUsd,
        budgetLimitUsd: this.budgetLimitUsd,
        warning: `Cumulative spend reached 80% of $${this.budgetLimitUsd} limit`
      });
    }

    return {
      taskSpendUsd: currentTaskSpend,
      cumulativeSpendUsd: parseFloat(this.cumulativeSpendUsd.toFixed(4))
    };
  }

  /**
   * Evaluates multiple candidate strategies and selects the best fit
   * according to primary priority: QUALITY, COST, or LATENCY.
   */
  optimizeStrategy(strategies = [], priority = 'QUALITY') {
    return strategies.map(s => {
      let score = 0;
      if (priority === 'QUALITY') {
        score = (s.qualityScore * 0.85) + ((10 - s.costScore) * 0.10) + ((10 - s.latencyScore) * 0.05);
      } else if (priority === 'COST') {
        score = (s.qualityScore * 0.15) + ((10 - s.costScore) * 0.70) + ((10 - s.latencyScore) * 0.15);
      } else if (priority === 'LATENCY') {
        score = (s.qualityScore * 0.15) + ((10 - s.costScore) * 0.15) + ((10 - s.latencyScore) * 0.70);
      }
      return Object.assign({}, s, { optimizationScore: parseFloat(score.toFixed(2)) });
    }).sort((a, b) => b.optimizationScore - a.optimizationScore)[0];
  }
}

const costIntelligence = new CostIntelligence();

module.exports = {
  CostIntelligence,
  costIntelligence
};

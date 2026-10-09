/**
 * .agents/router/model-router.js
 * Universal Autonomous Engineering Intelligence Operating System — V4
 * Engine #6: Model Router
 *
 * Dynamic model selection with provider abstraction, multi-dimensional scoring,
 * and automated failover fallback routing.
 */

const fs = require('fs');
const path = require('path');
const { eventBus, EVENT_TYPES } = require('../v4/core/event-bus');

const REGISTRY_FILE = path.resolve(__dirname, '../registry/model-performance.json');

class ModelRouter {
  constructor(registryPath = REGISTRY_FILE) {
    this.registryPath = registryPath;
    this.modelsData = this._loadModels();
  }

  _loadModels() {
    try {
      if (fs.existsSync(this.registryPath)) {
        return JSON.parse(fs.readFileSync(this.registryPath, 'utf-8'));
      }
    } catch (e) {
      console.warn('[MODEL_ROUTER] Failed to load registry, using fallback defaults:', e.message);
    }
    return {
      models: {
        "gemini-3.8-flash": {
          provider: "google",
          status: "AVAILABLE",
          contextWindow: 1048576,
          costPerMillionTokens: { input: 0.15, output: 0.60 },
          capabilities: { reasoning: 92, coding: 94, vision: 90, toolUse: 96, structuredOutput: 98 },
          fallbackChain: ["gemini-2.5-pro", "gemini-2.5-flash"]
        }
      }
    };
  }

  /**
   * Route task requirements to optimal model
   */
  routeModel({
    complexity = 'NORMAL', // LOW | NORMAL | HIGH | CRITICAL
    reasoningReq = 80,
    codingReq = 80,
    visionReq = false,
    contextTokens = 4000,
    latencySensitivity = 'NORMAL', // LOW | NORMAL | HIGH
    costSensitivity = 'NORMAL', // LOW | NORMAL | HIGH
    failedModels = []
  }) {
    const models = this.modelsData.models || {};
    const candidates = [];

    for (const [id, m] of Object.entries(models)) {
      if (failedModels.includes(id)) continue;
      if (m.status === 'UNAVAILABLE') continue;
      if (contextTokens > m.contextWindow) continue;
      if (visionReq && (!m.capabilities.vision || m.capabilities.vision < 70)) continue;

      // Scoring factors
      let score = 0;
      const caps = m.capabilities || {};

      // Match capabilities
      score += (caps.reasoning || 80) * 0.3;
      score += (caps.coding || 80) * 0.3;
      score += (caps.toolUse || 80) * 0.2;

      // Complexity adjustment
      if (complexity === 'HIGH' || complexity === 'CRITICAL') {
        if (id.includes('pro') || id.includes('sonnet')) score += 15;
      } else if (complexity === 'LOW') {
        if (id.includes('flash')) score += 15;
      }

      // Latency preference
      if (latencySensitivity === 'HIGH' && m.avgLatencyMs < 1000) {
        score += 10;
      }

      // Cost preference
      if (costSensitivity === 'HIGH') {
        const costFactor = (m.costPerMillionTokens ? m.costPerMillionTokens.input : 1.0);
        if (costFactor < 0.5) score += 15;
        else if (costFactor > 2.0) score -= 15;
      }

      candidates.push({
        id,
        score,
        model: m
      });
    }

    candidates.sort((a, b) => b.score - a.score);

    if (candidates.length === 0) {
      // Return safe emergency fallback
      return {
        selectedModel: "gemini-3.8-flash",
        provider: "google",
        reason: "Emergency fallback: no candidates passed strict filter",
        fallbackChain: ["gemini-2.5-flash", "local-qwen-coder"]
      };
    }

    const winner = candidates[0];
    const fallbackChain = (winner.model.fallbackChain || []).filter(fb => !failedModels.includes(fb));

    return {
      selectedModel: winner.id,
      provider: winner.model.provider,
      score: winner.score,
      reason: `Optimized for complexity=${complexity}, reasoning=${reasoningReq}, coding=${codingReq}`,
      fallbackChain
    };
  }

  /**
   * Automatically select fallback model if primary model fails
   */
  handleModelFailure(currentModel, error, taskRequirements = {}) {
    eventBus.emitEvent(EVENT_TYPES.MODEL_UNAVAILABLE, {
      model: currentModel,
      error: error ? error.message : 'Timeout or connection failure'
    });

    const failed = Array.isArray(taskRequirements.failedModels) ? [...taskRequirements.failedModels] : [];
    if (!failed.includes(currentModel)) failed.push(currentModel);

    const m = (this.modelsData.models && this.modelsData.models[currentModel]) || {};
    const chain = m.fallbackChain || [];
    let nextFallback = chain.find(fb => !failed.includes(fb));

    if (!nextFallback) {
      const routeRes = this.routeModel(Object.assign({}, taskRequirements, { failedModels: failed }));
      nextFallback = routeRes.selectedModel;
    }

    eventBus.emitEvent(EVENT_TYPES.MODEL_AVAILABLE, {
      selectedFallback: nextFallback,
      replacedModel: currentModel
    });

    return {
      primaryFailed: currentModel,
      fallbackModel: nextFallback,
      reason: `Automated failover from ${currentModel} to ${nextFallback}`
    };
  }
}

const modelRouter = new ModelRouter();

module.exports = {
  ModelRouter,
  modelRouter
};

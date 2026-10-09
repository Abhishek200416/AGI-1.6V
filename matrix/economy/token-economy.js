/**
 * matrix/economy/token-economy.js
 * MATRIX X1 — Token Economy & Pre-Flight Gatekeeper
 * 
 * Enforces token discipline before every model invocation:
 * 1. Can memory answer this?
 * 2. Can local computation answer this?
 * 3. Can cache answer this?
 * 4. Can a smaller model answer this?
 * 5. Can several questions be batched?
 * 6. Can tools answer directly?
 * 7. Will this call materially change the mission?
 * 
 * Backs `matrix x1 cost` telemetry.
 */

const fs = require('fs');
const path = require('path');
const { storageFabric } = require('../storage/storage-fabric');

class TokenEconomy {
  constructor() {
    this.tokenLedger = {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCachedTokens: 0,
      totalModelCalls: 0,
      totalToolCalls: 0,
      estimatedCostUsd: 0.0,
      callsByModel: {},
      avoidedModelCalls: 0,
      avoidedTokensSaved: 0
    };
    this.queryCache = new Map();
    this.init();
  }

  init() {
    const baseDir = storageFabric.activeDataRoot || path.join(__dirname, '../../.matrix_data');
    this.storageFile = path.join(baseDir, 'economy', 'matrix-token-ledger.json');
    const dir = path.dirname(this.storageFile);
    if (!fs.existsSync(dir)) {
      try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
    }
    this.loadFromDisk();
  }

  loadFromDisk() {
    try {
      if (fs.existsSync(this.storageFile)) {
        const data = JSON.parse(fs.readFileSync(this.storageFile, 'utf8'));
        this.tokenLedger = { ...this.tokenLedger, ...data };
      }
    } catch (e) {}
  }

  persistToDisk() {
    try {
      const dir = path.dirname(this.storageFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.storageFile, JSON.stringify(this.tokenLedger, null, 2), 'utf8');
    } catch (e) {}
  }

  /**
   * Pre-flight decision gate before firing an LLM request
   */
  evaluatePreFlight({
    query,
    hasLocalAnswer = false,
    hasMemoryAnswer = false,
    hasToolAnswer = false,
    expectedInformationGain = 0.5
  }) {
    // 1. Check exact query cache
    const cacheKey = typeof query === 'string' ? query.trim().toLowerCase() : JSON.stringify(query);
    if (this.queryCache.has(cacheKey)) {
      this.tokenLedger.avoidedModelCalls++;
      this.tokenLedger.avoidedTokensSaved += 500;
      return {
        allowed: false,
        reason: 'CACHE_HIT',
        cachedResult: this.queryCache.get(cacheKey),
        recommendation: 'Use cached result directly without model invocation'
      };
    }

    // 2. Can memory answer?
    if (hasMemoryAnswer) {
      this.tokenLedger.avoidedModelCalls++;
      this.tokenLedger.avoidedTokensSaved += 400;
      return {
        allowed: false,
        reason: 'RESOLVABLE_VIA_MEMORY',
        recommendation: 'Memory fabric contains sufficient verified evidence'
      };
    }

    // 3. Can tool/local computation answer?
    if (hasLocalAnswer || hasToolAnswer) {
      this.tokenLedger.avoidedModelCalls++;
      this.tokenLedger.avoidedTokensSaved += 300;
      return {
        allowed: false,
        reason: 'RESOLVABLE_VIA_DETERMINISTIC_COMPUTATION',
        recommendation: 'Use deterministic local code or tool directly'
      };
    }

    // 4. Low expected information gain filter
    if (expectedInformationGain < 0.1) {
      this.tokenLedger.avoidedModelCalls++;
      this.tokenLedger.avoidedTokensSaved += 250;
      return {
        allowed: false,
        reason: 'NEGLIGIBLE_INFORMATION_GAIN',
        recommendation: 'Discard speculative inquiry; does not materially advance mission'
      };
    }

    return {
      allowed: true,
      reason: 'CALL_AUTHORIZED',
      recommendation: 'Proceed with minimal sufficient model tier'
    };
  }

  /**
   * Record actual token consumption
   */
  recordUsage({
    model = 'gemini-flash',
    inputTokens = 0,
    outputTokens = 0,
    cachedTokens = 0,
    toolCalls = 0,
    cacheResponseKey = null,
    responsePayload = null
  }) {
    this.tokenLedger.totalInputTokens += inputTokens;
    this.tokenLedger.totalOutputTokens += outputTokens;
    this.tokenLedger.totalCachedTokens += cachedTokens;
    this.tokenLedger.totalModelCalls += 1;
    this.tokenLedger.totalToolCalls += toolCalls;

    if (!this.tokenLedger.callsByModel[model]) {
      this.tokenLedger.callsByModel[model] = 0;
    }
    this.tokenLedger.callsByModel[model] += 1;

    // Pricing estimation (blended standard rates)
    const costPer1kInput = model.includes('pro') ? 0.00125 : 0.000075;
    const costPer1kOutput = model.includes('pro') ? 0.005 : 0.0003;
    const callCost = ((inputTokens / 1000) * costPer1kInput) + ((outputTokens / 1000) * costPer1kOutput);
    this.tokenLedger.estimatedCostUsd += callCost;

    if (cacheResponseKey && responsePayload) {
      this.queryCache.set(cacheResponseKey.trim().toLowerCase(), responsePayload);
    }

    this.persistToDisk();
    return { callCost, totalCost: this.tokenLedger.estimatedCostUsd };
  }

  getMetrics() {
    return {
      ...this.tokenLedger,
      estimatedCostFormatted: `$${this.tokenLedger.estimatedCostUsd.toFixed(4)}`,
      savingsRatio: this.tokenLedger.totalModelCalls > 0 
        ? `${Math.round((this.tokenLedger.avoidedModelCalls / (this.tokenLedger.totalModelCalls + this.tokenLedger.avoidedModelCalls)) * 100)}% avoided`
        : '100% saved'
    };
  }
}

const tokenEconomy = new TokenEconomy();

module.exports = { TokenEconomy, tokenEconomy };

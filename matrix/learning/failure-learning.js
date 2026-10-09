/**
 * matrix/learning/failure-learning.js
 * MATRIX X1 — Failure Learning Engine
 * 
 * Stores structured post-mortems of failures to prevent strategy repetition:
 * objective, strategy, assumption, environment, tool, model, error, root cause, recovery, lesson.
 */

const fs = require('fs');
const path = require('path');
const { memoryFabric, MEMORY_TYPES, EPISTEMIC_MODES } = require('../memory/memory-fabric');
const { storageFabric } = require('../storage/storage-fabric');

class FailureLearningEngine {
  constructor() {
    this.failureRecords = new Map();
    this.init();
  }

  init() {
    const baseDir = storageFabric.activeDataRoot || path.join(__dirname, '../../.matrix_data');
    this.storageFile = path.join(baseDir, 'failures', 'matrix-failures.json');
    const dir = path.dirname(this.storageFile);
    if (!fs.existsSync(dir)) {
      try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
    }
    this.loadFromDisk();
  }

  loadFromDisk() {
    try {
      if (fs.existsSync(this.storageFile)) {
        const items = JSON.parse(fs.readFileSync(this.storageFile, 'utf8'));
        for (const it of items) this.failureRecords.set(it.id, it);
      }
    } catch (e) {}
  }

  persistToDisk() {
    try {
      const dir = path.dirname(this.storageFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.storageFile, JSON.stringify(Array.from(this.failureRecords.values()), null, 2), 'utf8');
    } catch (e) {}
  }

  /**
   * Record a structured failure with root cause analysis and recovery lesson
   */
  recordFailure({
    missionId = null,
    objective = 'General Operation',
    strategy = 'STANDARD_EXECUTION',
    assumption = 'None',
    environment = 'LOCAL',
    tool = null,
    model = null,
    error,
    rootCause = 'Unspecified',
    recovery = 'Auto-recovered',
    lesson = 'Review operational parameters'
  }) {
    const id = `FAIL-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
    const record = {
      id,
      missionId,
      objective,
      strategy,
      assumption,
      environment,
      tool,
      model,
      error: typeof error === 'string' ? error : (error?.message || JSON.stringify(error) || 'Unknown error'),
      rootCause,
      recovery,
      lesson,
      timestamp: new Date().toISOString()
    };

    this.failureRecords.set(id, record);
    this.persistToDisk();

    // Mirror directly into Memory Fabric under FAILURE scope
    memoryFabric.storeMemory({
      type: MEMORY_TYPES.FAILURE,
      epistemicMode: EPISTEMIC_MODES.FACT,
      content: record,
      source: 'FAILURE_LEARNING_ENGINE',
      confidence: 1.0,
      importance: 0.9,
      retrieval_tags: [strategy, tool || 'generic', 'failure-postmortem']
    });

    return record;
  }

  /**
   * Check if a proposed strategy previously failed under similar conditions
   */
  checkProposedStrategy(strategyName, toolName = null) {
    const matching = [];
    for (const f of this.failureRecords.values()) {
      const matchStrat = f.strategy && typeof f.strategy === 'string' && strategyName && f.strategy.toLowerCase().includes(strategyName.toLowerCase());
      const matchTool = toolName && f.tool && typeof f.tool === 'string' && f.tool.toLowerCase() === toolName.toLowerCase();
      if (matchStrat || matchTool) {
        matching.push(f);
      }
    }
    return {
      hasPreviousFailures: matching.length > 0,
      count: matching.length,
      pastFailures: matching.slice(-3),
      recommendation: matching.length > 0 ? `Caution: Strategy '${strategyName}' previously failed with: ${matching[matching.length - 1].rootCause}. Use alternative or apply lesson: ${matching[matching.length - 1].lesson}` : 'Strategy clear of historical failures'
    };
  }

  getAllFailures() {
    return Array.from(this.failureRecords.values());
  }
}

const failureLearningEngine = new FailureLearningEngine();

module.exports = { FailureLearningEngine, failureLearningEngine };

/**
 * matrix/memory/memory-fabric.js
 * MATRIX X1 — Multi-Type Memory Fabric & Consolidation Engine
 * 
 * Implements 11 Memory Scopes:
 * EPISODIC, SEMANTIC, PROCEDURAL, PROJECT, ORGANIZATIONAL,
 * FAILURE, EXPERIMENT, CAPABILITY, COMMANDER, TEMPORAL, PROVENANCE.
 * 
 * Epistemic distinctions:
 * FACT, OBSERVATION, INFERENCE, HYPOTHESIS, SPECULATION, BELIEF.
 */

const fs = require('fs');
const path = require('path');
const { storageFabric } = require('../storage/storage-fabric');

const MEMORY_TYPES = {
  EPISODIC: 'EPISODIC',
  SEMANTIC: 'SEMANTIC',
  PROCEDURAL: 'PROCEDURAL',
  PROJECT: 'PROJECT',
  ORGANIZATIONAL: 'ORGANIZATIONAL',
  FAILURE: 'FAILURE',
  EXPERIMENT: 'EXPERIMENT',
  CAPABILITY: 'CAPABILITY',
  COMMANDER: 'COMMANDER',
  TEMPORAL: 'TEMPORAL',
  PROVENANCE: 'PROVENANCE'
};

const EPISTEMIC_MODES = {
  FACT: 'FACT',
  OBSERVATION: 'OBSERVATION',
  INFERENCE: 'INFERENCE',
  HYPOTHESIS: 'HYPOTHESIS',
  SPECULATION: 'SPECULATION',
  BELIEF: 'BELIEF'
};

class MemoryFabric {
  constructor(options = {}) {
    this.storagePath = options.storagePath || null;
    this.activeMemories = new Map();
    this.archiveMemories = new Map();
    this.indices = {
      byType: new Map(),
      byTag: new Map(),
      byEntity: new Map()
    };
    this.init();
  }

  init() {
    // Resolve memory persistence path from storageFabric
    const baseDir = storageFabric.activeDataRoot || path.join(__dirname, '../../.matrix_data');
    this.storageFile = path.join(baseDir, 'memory', 'matrix-memory.json');
    this.archiveFile = path.join(baseDir, 'memory', 'matrix-memory-archive.json');

    const memDir = path.dirname(this.storageFile);
    if (!fs.existsSync(memDir)) {
      try { fs.mkdirSync(memDir, { recursive: true }); } catch (e) {}
    }

    this.loadFromDisk();
  }

  loadFromDisk() {
    try {
      if (fs.existsSync(this.storageFile)) {
        const raw = fs.readFileSync(this.storageFile, 'utf8');
        const items = JSON.parse(raw);
        for (const item of items) {
          this.activeMemories.set(item.id, item);
          this.indexItem(item);
        }
      }
    } catch (e) {
      // Memory initial start
    }
  }

  persistToDisk() {
    try {
      const items = Array.from(this.activeMemories.values());
      const memDir = path.dirname(this.storageFile);
      if (!fs.existsSync(memDir)) {
        fs.mkdirSync(memDir, { recursive: true });
      }
      fs.writeFileSync(this.storageFile, JSON.stringify(items, null, 2), 'utf8');
    } catch (e) {
      // Degraded cache write fallback
      try {
        const fallbackFile = path.join(storageFabric.internalCacheDir, 'matrix-memory.json');
        fs.writeFileSync(fallbackFile, JSON.stringify(Array.from(this.activeMemories.values()), null, 2), 'utf8');
      } catch (err) {}
    }
  }

  indexItem(item) {
    // Index by type
    if (!this.indices.byType.has(item.type)) {
      this.indices.byType.set(item.type, new Set());
    }
    this.indices.byType.get(item.type).add(item.id);

    // Index by tags
    if (Array.isArray(item.retrieval_tags)) {
      for (const tag of item.retrieval_tags) {
        const clean = tag.toLowerCase().trim();
        if (!this.indices.byTag.has(clean)) {
          this.indices.byTag.set(clean, new Set());
        }
        this.indices.byTag.get(clean).add(item.id);
      }
    }

    // Index by entities
    if (Array.isArray(item.related_entities)) {
      for (const ent of item.related_entities) {
        const clean = ent.toLowerCase().trim();
        if (!this.indices.byEntity.has(clean)) {
          this.indices.byEntity.set(clean, new Set());
        }
        this.indices.byEntity.get(clean).add(item.id);
      }
    }
  }

  /**
   * Create & store a memory object with full epistemic and temporal tracking
   */
  storeMemory({
    type = MEMORY_TYPES.EPISODIC,
    epistemicMode = EPISTEMIC_MODES.OBSERVATION,
    content,
    source = 'SYSTEM',
    confidence = 0.9,
    provenance = 'INTERNAL',
    importance = 0.5,
    valid_from = new Date().toISOString(),
    valid_until = null,
    retrieval_tags = [],
    related_entities = [],
    supersedes = null,
    contradicts = null
  }) {
    const id = `MEM-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const timestamp = new Date().toISOString();

    const memoryObject = {
      id,
      type,
      epistemicMode,
      content,
      source,
      timestamp,
      valid_from,
      valid_until,
      confidence,
      provenance,
      importance,
      version: 1,
      supersedes,
      contradicts,
      related_entities,
      retrieval_tags,
      accessCount: 0,
      lastAccessed: timestamp
    };

    // If supersedes previous memory, mark old memory superseded
    if (supersedes && this.activeMemories.has(supersedes)) {
      const oldMem = this.activeMemories.get(supersedes);
      oldMem.superseded_by = id;
      oldMem.valid_until = timestamp;
      oldMem.importance = Math.max(0.1, oldMem.importance * 0.5);
    }

    this.activeMemories.set(id, memoryObject);
    this.indexItem(memoryObject);
    this.persistToDisk();

    return memoryObject;
  }

  /**
   * Scoped and budgeted semantic retrieval
   */
  retrieve({
    query = '',
    type = null,
    minConfidence = 0.0,
    tags = [],
    entities = [],
    limit = 5,
    budgetTokens = 2000
  }) {
    const queryTokens = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    const scored = [];
    const now = Date.now();

    for (const mem of this.activeMemories.values()) {
      if (type && mem.type !== type) continue;
      if (mem.confidence < minConfidence) continue;

      let score = 0;

      // Recency decay (half-life: 7 days)
      const ageHours = (now - new Date(mem.timestamp).getTime()) / (1000 * 60 * 60);
      const recencyWeight = Math.exp(-ageHours / (24 * 7));
      score += (mem.importance || 0.5) * 40;
      score += recencyWeight * 20;
      score += (mem.confidence || 0.5) * 20;

      // Query token overlap
      if (queryTokens.length > 0) {
        const textContent = (typeof mem.content === 'string' ? mem.content : JSON.stringify(mem.content)).toLowerCase();
        let matches = 0;
        for (const qt of queryTokens) {
          if (textContent.includes(qt)) matches++;
        }
        score += (matches / queryTokens.length) * 50;
      }

      // Tag match
      if (tags.length > 0 && Array.isArray(mem.retrieval_tags)) {
        for (const t of tags) {
          if (mem.retrieval_tags.map(x => x.toLowerCase()).includes(t.toLowerCase())) {
            score += 30;
          }
        }
      }

      // Entity match
      if (entities.length > 0 && Array.isArray(mem.related_entities)) {
        for (const e of entities) {
          if (mem.related_entities.map(x => x.toLowerCase()).includes(e.toLowerCase())) {
            score += 30;
          }
        }
      }

      // Penalty if superseded
      if (mem.superseded_by) {
        score *= 0.2;
      }

      scored.push({ mem, score });
    }

    scored.sort((a, b) => b.score - a.score);

    // Apply token budgeting
    const selected = [];
    let estimatedTokens = 0;

    for (const item of scored) {
      if (selected.length >= limit) break;
      const jsonLen = JSON.stringify(item.mem.content).length;
      const memTokens = Math.ceil(jsonLen / 4);
      if (estimatedTokens + memTokens > budgetTokens && selected.length > 0) {
        break;
      }
      item.mem.accessCount = (item.mem.accessCount || 0) + 1;
      item.mem.lastAccessed = new Date().toISOString();
      selected.push(item.mem);
      estimatedTokens += memTokens;
    }

    return selected;
  }

  /**
   * Consolidate memories:
   * Working / episodic memories with recurring patterns get promoted to semantic/procedural.
   */
  consolidate() {
    const episodic = Array.from(this.activeMemories.values()).filter(m => m.type === MEMORY_TYPES.EPISODIC);
    const patternMap = new Map();

    for (const mem of episodic) {
      const summaryKey = (mem.retrieval_tags || []).sort().join(':') || 'generic';
      if (!patternMap.has(summaryKey)) patternMap.set(summaryKey, []);
      patternMap.get(summaryKey).push(mem);
    }

    const consolidated = [];
    for (const [key, list] of patternMap.entries()) {
      if (list.length >= 2) {
        // Promote to SEMANTIC knowledge
        const semanticMem = this.storeMemory({
          type: MEMORY_TYPES.SEMANTIC,
          epistemicMode: EPISTEMIC_MODES.INFERENCE,
          content: {
            pattern: `Repeated pattern identified across ${list.length} episodes: ${key}`,
            episodes: list.map(l => l.id),
            consolidatedSummary: list.map(l => (typeof l.content === 'string' ? l.content : JSON.stringify(l.content))).join(' | ')
          },
          source: 'CONSOLIDATION_ENGINE',
          confidence: 0.95,
          importance: 0.85,
          retrieval_tags: key.split(':')
        });
        consolidated.push(semanticMem);
      }
    }

    // Archive low-utility, superseded memories
    this.forgetAndArchive();

    return {
      consolidatedCount: consolidated.length,
      activeCount: this.activeMemories.size,
      archiveCount: this.archiveMemories.size
    };
  }

  /**
   * Move low-importance superseded items to archive
   */
  forgetAndArchive() {
    const toArchive = [];
    for (const [id, mem] of this.activeMemories.entries()) {
      if (mem.superseded_by && mem.importance < 0.2) {
        toArchive.push(id);
      }
    }

    for (const id of toArchive) {
      const mem = this.activeMemories.get(id);
      this.activeMemories.delete(id);
      this.archiveMemories.set(id, mem);
    }

    if (toArchive.length > 0) {
      this.persistToDisk();
      try {
        const items = Array.from(this.archiveMemories.values());
        fs.writeFileSync(this.archiveFile, JSON.stringify(items, null, 2), 'utf8');
      } catch (e) {}
    }

    return toArchive.length;
  }

  getStats() {
    const byType = {};
    for (const t of Object.values(MEMORY_TYPES)) {
      byType[t] = 0;
    }
    for (const mem of this.activeMemories.values()) {
      byType[mem.type] = (byType[mem.type] || 0) + 1;
    }
    return {
      activeCount: this.activeMemories.size,
      archiveCount: this.archiveMemories.size,
      byType
    };
  }
}

const memoryFabric = new MemoryFabric();

module.exports = { MemoryFabric, memoryFabric, MEMORY_TYPES, EPISTEMIC_MODES };

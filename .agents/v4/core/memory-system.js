/**
 * .agents/v4/core/memory-system.js
 * Universal Autonomous Engineering Intelligence Operating System — V4
 * Engine #10: Memory System
 *
 * Scoped memory: GLOBAL, USER, PROJECT, REPOSITORY, AGENT, TASK, INCIDENT, DECISION.
 * Supports semantic keyword search, time-aware recency scoring, scope isolation,
 * confidence weighting, source attribution, and TTL expiration.
 */

const fs = require('fs');
const path = require('path');

const MEMORY_DIR = path.resolve(__dirname, '../memory');
const STORE_FILE = path.join(MEMORY_DIR, 'memory-store.json');

const MEMORY_SCOPES = Object.freeze({
  GLOBAL: 'GLOBAL',
  USER: 'USER',
  PROJECT: 'PROJECT',
  REPOSITORY: 'REPOSITORY',
  AGENT: 'AGENT',
  TASK: 'TASK',
  INCIDENT: 'INCIDENT',
  DECISION: 'DECISION'
});

class MemorySystem {
  constructor(storeFile = STORE_FILE) {
    this.storeFile = storeFile;
    this.memories = this._load();
    const dir = path.dirname(this.storeFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  _load() {
    try {
      if (fs.existsSync(this.storeFile)) {
        return JSON.parse(fs.readFileSync(this.storeFile, 'utf-8'));
      }
    } catch (e) {
      console.warn('[MEMORY] Failed to load store, initializing empty:', e.message);
    }
    return [];
  }

  save() {
    try {
      fs.writeFileSync(this.storeFile, JSON.stringify(this.memories, null, 2), 'utf-8');
      return true;
    } catch (e) {
      console.error('[MEMORY] Save error:', e.message);
      return false;
    }
  }

  recordMemory({
    scope = MEMORY_SCOPES.PROJECT,
    key,
    content,
    tags = [],
    confidence = 1.0,
    source = 'orchestration-agent-v4',
    ttlSeconds = null // null = permanent
  }) {
    if (!MEMORY_SCOPES[scope]) {
      throw new Error(`Invalid memory scope: ${scope}`);
    }

    const now = Date.now();
    const memory = {
      id: `mem-${now.toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      scope,
      key,
      content,
      tags: Array.isArray(tags) ? tags : [tags],
      confidence: Math.max(0.0, Math.min(1.0, confidence)),
      source,
      createdAt: new Date(now).toISOString(),
      expiresAt: ttlSeconds ? new Date(now + (ttlSeconds * 1000)).toISOString() : null
    };

    // Replace if same scope and key exists, else append
    const idx = this.memories.findIndex(m => m.scope === scope && m.key === key);
    if (idx >= 0) {
      this.memories[idx] = memory;
    } else {
      this.memories.push(memory);
    }

    this.save();
    return memory;
  }

  /**
   * Scoped, time-aware semantic keyword retrieval.
   * Never injects all memory; returns only top-k relevant items.
   */
  retrieveRelevant({
    query = '',
    scope = null,
    tags = [],
    limit = 5,
    minConfidence = 0.5
  }) {
    const now = Date.now();
    const queryTokens = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);

    const candidates = this.memories.filter(m => {
      // 1. Check TTL expiration
      if (m.expiresAt && new Date(m.expiresAt).getTime() < now) return false;
      // 2. Scope isolation filter
      if (scope && m.scope !== scope && m.scope !== MEMORY_SCOPES.GLOBAL) return false;
      // 3. Minimum confidence
      if (m.confidence < minConfidence) return false;
      return true;
    });

    // Score candidates on semantic relevance + time recency + confidence
    const scored = candidates.map(m => {
      let matchScore = 0;
      const text = `${m.key} ${m.content} ${m.tags.join(' ')}`.toLowerCase();

      for (const tok of queryTokens) {
        if (text.includes(tok)) matchScore += 1;
      }

      // Check tag matches
      for (const t of tags) {
        if (m.tags.includes(t)) matchScore += 2;
      }

      // Time decay factor: 1.0 for recent, slight decay over 30 days
      const ageHours = (now - new Date(m.createdAt).getTime()) / (1000 * 3600);
      const timeFactor = Math.max(0.7, 1.0 - (ageHours / (24 * 30 * 10)));

      const finalRelevance = (matchScore * 2 + m.confidence) * timeFactor;
      return { memory: m, relevance: finalRelevance };
    });

    scored.sort((a, b) => b.relevance - a.relevance);

    return scored.slice(0, limit).map(s => s.memory);
  }

  /**
   * Compact prompt injection string formatted strictly for LLM context
   */
  formatContextForPrompt(query, scope = null, limit = 3) {
    const relevant = this.retrieveRelevant({ query, scope, limit });
    if (relevant.length === 0) return "";

    const lines = ["[Retrieved Memory Context]:"];
    for (const m of relevant) {
      lines.push(`- (${m.scope}) ${m.key}: ${typeof m.content === 'object' ? JSON.stringify(m.content) : m.content} [source: ${m.source}, conf: ${m.confidence}]`);
    }
    return lines.join('\n');
  }

  clear() {
    this.memories = [];
    this.save();
  }
}

const memorySystem = new MemorySystem();

module.exports = {
  MemorySystem,
  memorySystem,
  MEMORY_SCOPES
};

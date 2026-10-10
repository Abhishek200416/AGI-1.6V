/**
 * agi/memory/memory-manager.js
 * AGI 0.7 — 10-Tier Durable Memory Subsystem
 * 
 * Manages 10 distinct memory tiers with recency-importance-relevance scoring,
 * Ebbinghaus decay modeling, and atomic disk persistence.
 */

const fs = require('fs');
const path = require('path');

const TIERS = [
  'working',
  'episodic',
  'semantic',
  'procedural',
  'environment',
  'resource',
  'project',
  'experiment',
  'security',
  'paperTrading'
];

class MemoryManager {
  constructor(storagePath = null) {
    this.storagePath = storagePath || path.resolve(process.cwd(), 'agi/data/memory-store.json');
    this.tiers = {};
    for (const t of TIERS) {
      this.tiers[t] = [];
    }
    this._ensureStorage();
    this.load();
  }

  _ensureStorage() {
    const dir = path.dirname(this.storagePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  load() {
    if (fs.existsSync(this.storagePath)) {
      try {
        const raw = fs.readFileSync(this.storagePath, 'utf8');
        const data = JSON.parse(raw);
        for (const t of TIERS) {
          if (Array.isArray(data[t])) {
            this.tiers[t] = data[t];
          }
        }
      } catch {
        // Fallback to fresh store
      }
    }
  }

  persist() {
    const tmp = `${this.storagePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.tiers, null, 2), 'utf8');
    fs.renameSync(tmp, this.storagePath);
  }

  /**
   * Add memory item to a specific tier
   * @param {string} tierName 
   * @param {object} item - { key, value, importance = 5, tags = [] }
   */
  remember(tierName, item) {
    if (!this.tiers[tierName]) {
      throw new Error(`Invalid memory tier: ${tierName}`);
    }

    const entry = {
      id: `MEM-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      key: item.key || 'generic',
      value: item.value,
      importance: Math.max(1, Math.min(10, item.importance || 5)),
      tags: item.tags || [],
      createdAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
      accessCount: 1
    };

    // Update existing key if present in semantic/environment/project
    const existingIdx = this.tiers[tierName].findIndex(e => e.key === entry.key);
    if (existingIdx !== -1 && ['semantic', 'environment', 'project'].includes(tierName)) {
      this.tiers[tierName][existingIdx] = entry;
    } else {
      this.tiers[tierName].push(entry);
    }

    this.persist();
    return entry;
  }

  /**
   * Query memory with triple scoring: S = 0.3*Recency + 0.3*Importance + 0.4*Relevance
   */
  recall(tierName, query = '', limit = 5) {
    if (!this.tiers[tierName]) {
      throw new Error(`Invalid memory tier: ${tierName}`);
    }

    const now = Date.now();
    const scored = this.tiers[tierName].map(item => {
      // 1. Recency score (Ebbinghaus exponential decay over 24h)
      const ageHours = (now - new Date(item.lastAccessed).getTime()) / (1000 * 3600);
      const recency = Math.exp(-0.1 * ageHours);

      // 2. Importance score (normalized 0 to 1)
      const importance = item.importance / 10;

      // 3. Relevance score (keyword matching)
      let relevance = 0.5;
      if (query) {
        const queryTerms = query.toLowerCase().split(/\s+/);
        const text = `${item.key} ${JSON.stringify(item.value)} ${(item.tags || []).join(' ')}`.toLowerCase();
        const matches = queryTerms.filter(term => text.includes(term)).length;
        relevance = matches / Math.max(1, queryTerms.length);
      }

      const compositeScore = (0.3 * recency) + (0.3 * importance) + (0.4 * relevance);
      return { item, score: compositeScore };
    });

    scored.sort((a, b) => b.score - a.score);
    const results = scored.slice(0, limit).map(s => {
      s.item.lastAccessed = new Date().toISOString();
      s.item.accessCount += 1;
      return s.item;
    });

    this.persist();
    return results;
  }

  getTierCount(tierName) {
    return (this.tiers[tierName] || []).length;
  }

  getAllCounts() {
    const counts = {};
    for (const t of TIERS) {
      counts[t] = this.tiers[t].length;
    }
    return counts;
  }

  clearTier(tierName) {
    if (this.tiers[tierName]) {
      this.tiers[tierName] = [];
      this.persist();
    }
  }
}

module.exports = { MemoryManager, TIERS };

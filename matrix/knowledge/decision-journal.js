/**
 * matrix/knowledge/decision-journal.js
 * MATRIX X1 — Decision Journal & 'Why' Metacognitive Engine
 * 
 * Records durable evidence-backed decisions and enables
 * commander inspection via `matrix x1 why <decisionId>`.
 */

const fs = require('fs');
const path = require('path');
const { storageFabric } = require('../storage/storage-fabric');

class DecisionJournal {
  constructor() {
    this.decisions = new Map();
    this.init();
  }

  init() {
    const baseDir = storageFabric.activeDataRoot || path.join(__dirname, '../../.matrix_data');
    this.storageFile = path.join(baseDir, 'decisions', 'matrix-decisions.json');
    const dir = path.dirname(this.storageFile);
    if (!fs.existsSync(dir)) {
      try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
    }
    this.loadFromDisk();
  }

  loadFromDisk() {
    try {
      if (fs.existsSync(this.storageFile)) {
        const raw = fs.readFileSync(this.storageFile, 'utf8');
        const items = JSON.parse(raw);
        for (const item of items) {
          this.decisions.set(item.id, item);
        }
      }
    } catch (e) {}
  }

  persistToDisk() {
    try {
      const dir = path.dirname(this.storageFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.storageFile, JSON.stringify(Array.from(this.decisions.values()), null, 2), 'utf8');
    } catch (e) {}
  }

  /**
   * Record a formal architectural or operational decision
   */
  recordDecision({
    id = null,
    title,
    objective,
    decision,
    evidence,
    alternatives = [],
    assumptions = [],
    confidence = 0.9,
    predictedResult,
    actualResult = null,
    lesson = null,
    missionId = null
  }) {
    const decId = id || `DEC-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
    const record = {
      id: decId,
      title: title || decision,
      objective,
      decision,
      evidence: Array.isArray(evidence) ? evidence : [evidence],
      alternatives,
      assumptions,
      confidence,
      predictedResult,
      actualResult,
      lesson,
      missionId,
      timestamp: new Date().toISOString()
    };

    this.decisions.set(decId, record);
    this.persistToDisk();
    return record;
  }

  /**
   * Explain why a decision was made with evidentiary provenance
   */
  explainDecision(searchQuery) {
    if (!searchQuery) return null;
    const q = searchQuery.toLowerCase().trim();

    // Check exact ID first
    if (this.decisions.has(searchQuery)) {
      return this.decisions.get(searchQuery);
    }

    // Search by title or decision text
    for (const d of this.decisions.values()) {
      if (d.id.toLowerCase() === q ||
          (d.title && d.title.toLowerCase().includes(q)) ||
          (d.decision && d.decision.toLowerCase().includes(q))) {
        return d;
      }
    }

    // Return most recent decision if query is "recent" or "last"
    if (q === 'recent' || q === 'last' || q === 'latest') {
      const all = Array.from(this.decisions.values());
      return all.length > 0 ? all[all.length - 1] : null;
    }

    return null;
  }

  getAllDecisions() {
    return Array.from(this.decisions.values());
  }

  getHistory() {
    return this.getAllDecisions();
  }
}

const decisionJournal = new DecisionJournal();

module.exports = { DecisionJournal, decisionJournal };

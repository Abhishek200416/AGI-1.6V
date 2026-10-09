/**
 * matrix/knowledge/contradiction-engine.js
 * MATRIX X1 — Contradiction Engine
 * 
 * Reconciles conflicting information across disparate sources.
 * Does not silently pick one source; constructs a formal Contradiction Object.
 */

class ContradictionEngine {
  constructor() {
    this.contradictions = new Map();
  }

  /**
   * Register a conflict between two claims
   */
  registerContradiction({
    topic,
    claimA,
    sourceA,
    dateA = new Date().toISOString(),
    confidenceA = 0.8,
    claimB,
    sourceB,
    dateB = new Date().toISOString(),
    confidenceB = 0.8,
    context = {}
  }) {
    const id = `CTRD-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
    
    // Evaluate temporal precedence: more recent source with equal/higher authority
    let tentativeResolution = 'DISPUTED';
    let explanation = 'Competing claims from different sources require verification.';

    if (new Date(dateB).getTime() > new Date(dateA).getTime() + 1000 * 60 * 60 * 24 * 30 && confidenceB >= confidenceA) {
      tentativeResolution = 'B_SUPERSEDES_A_CHRONOLOGICALLY';
      explanation = `Source B (${sourceB}) is significantly newer and has equal or higher confidence.`;
    } else if (confidenceA > confidenceB + 0.3) {
      tentativeResolution = 'A_PREFERRED_BY_AUTHORITY';
      explanation = `Source A (${sourceA}) has significantly higher confidence/authority.`;
    }

    const item = {
      id,
      topic,
      claimA,
      sourceA,
      dateA,
      confidenceA,
      claimB,
      sourceB,
      dateB,
      confidenceB,
      context,
      tentativeResolution,
      explanation,
      status: 'OPEN',
      createdAt: new Date().toISOString()
    };

    this.contradictions.set(id, item);
    return item;
  }

  resolveContradiction(id, resolution, finalEvidence) {
    if (this.contradictions.has(id)) {
      const item = this.contradictions.get(id);
      item.status = 'RESOLVED';
      item.finalResolution = resolution;
      item.finalEvidence = finalEvidence;
      item.resolvedAt = new Date().toISOString();
      return item;
    }
    return null;
  }

  getOpenContradictions() {
    return Array.from(this.contradictions.values()).filter(c => c.status === 'OPEN');
  }
}

const contradictionEngine = new ContradictionEngine();

module.exports = { ContradictionEngine, contradictionEngine };

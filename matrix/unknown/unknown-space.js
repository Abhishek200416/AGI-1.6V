/**
 * matrix/unknown/unknown-space.js
 * MATRIX X1 — Unknown Space Engine
 * 
 * Explicitly tracks and prioritizes the frontier of the unknown:
 * - unknown fact
 * - unknown dependency
 * - unknown capability
 * - unknown environment
 * - unknown risk
 * - unknown cause
 * - unknown solution
 * - untested assumption
 * - unexplored research area
 * 
 * Computes Expected Information Gain to guide optimal next action.
 */

const UNKNOWN_CATEGORIES = {
  FACT: 'UNKNOWN_FACT',
  DEPENDENCY: 'UNKNOWN_DEPENDENCY',
  CAPABILITY: 'UNKNOWN_CAPABILITY',
  ENVIRONMENT: 'UNKNOWN_ENVIRONMENT',
  RISK: 'UNKNOWN_RISK',
  CAUSE: 'UNKNOWN_CAUSE',
  SOLUTION: 'UNKNOWN_SOLUTION',
  ASSUMPTION: 'UNTESTED_ASSUMPTION',
  RESEARCH_AREA: 'UNEXPLORED_RESEARCH_AREA'
};

class UnknownSpaceEngine {
  constructor() {
    this.frontier = new Map();
    this.resolved = new Map();
  }

  /**
   * Register an unknown entity or hypothesis gap
   */
  registerUnknown({
    category = UNKNOWN_CATEGORIES.FACT,
    description,
    importance = 0.5,
    uncertainty = 0.8,
    relatedMission = null,
    resolutionStrategy = 'RESEARCH'
  }) {
    const id = `UNK-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
    // Information Gain = Importance * Uncertainty
    const expectedInformationGain = Math.round((importance * uncertainty) * 100) / 100;

    const item = {
      id,
      category,
      description,
      importance,
      uncertainty,
      expectedInformationGain,
      relatedMission,
      resolutionStrategy,
      discoveredAt: new Date().toISOString(),
      status: 'OPEN'
    };

    this.frontier.set(id, item);
    return item;
  }

  /**
   * Mark an unknown as resolved with evidence
   */
  resolveUnknown(id, resolutionEvidence) {
    if (this.frontier.has(id)) {
      const item = this.frontier.get(id);
      item.status = 'RESOLVED';
      item.resolvedAt = new Date().toISOString();
      item.evidence = resolutionEvidence;
      this.frontier.delete(id);
      this.resolved.set(id, item);
      return item;
    }
    return null;
  }

  /**
   * Rank open unknowns by Expected Information Gain
   */
  getRankedUnknowns(limit = 5) {
    const list = Array.from(this.frontier.values());
    list.sort((a, b) => b.expectedInformationGain - a.expectedInformationGain);
    return list.slice(0, limit);
  }

  /**
   * Identifies what unknown is most valuable to resolve next
   */
  getNextPriorityUnknown() {
    const ranked = this.getRankedUnknowns(1);
    return ranked.length > 0 ? ranked[0] : null;
  }

  getStats() {
    return {
      openCount: this.frontier.size,
      resolvedCount: this.resolved.size,
      topUnknowns: this.getRankedUnknowns(3)
    };
  }
}

const unknownSpaceEngine = new UnknownSpaceEngine();

module.exports = { UnknownSpaceEngine, unknownSpaceEngine, UNKNOWN_CATEGORIES };

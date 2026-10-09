/**
 * matrix/cognition/reality-delta.js
 * MATRIX X1 — Reality Delta Engine
 * 
 * Continuously reconciles:
 * BELIEF vs PLAN vs OBSERVATION vs RESULT.
 * 
 * Computes discrepancies, triggers replanning, and feeds lessons into memory.
 */

const { eventBus, EVENT_TYPES } = require('../events/event-bus');

class RealityDeltaEngine {
  constructor() {
    this.history = [];
    this.activeDiscrepancies = [];
  }

  /**
   * Reconcile an expectation against actual observation
   */
  reconcile({
    contextId,
    belief,
    plan,
    observation,
    result,
    tolerance = 0.1
  }) {
    const timestamp = new Date().toISOString();
    let discrepancyDetected = false;
    let discrepancyDetails = null;

    // Check numerical discrepancy if applicable
    if (typeof belief?.expectedMetric === 'number' && typeof observation?.actualMetric === 'number') {
      const delta = Math.abs(observation.actualMetric - belief.expectedMetric);
      const relativeDelta = belief.expectedMetric !== 0 ? delta / belief.expectedMetric : delta;
      if (relativeDelta > tolerance) {
        discrepancyDetected = true;
        discrepancyDetails = {
          type: 'METRIC_DIVERGENCE',
          expected: belief.expectedMetric,
          actual: observation.actualMetric,
          divergencePercent: Math.round(relativeDelta * 100)
        };
      }
    }

    // Check status / outcome divergence
    if (belief?.expectedSuccess !== undefined && observation?.actualSuccess !== undefined) {
      if (belief.expectedSuccess !== observation.actualSuccess) {
        discrepancyDetected = true;
        discrepancyDetails = {
          type: 'OUTCOME_MISMATCH',
          expected: belief.expectedSuccess,
          actual: observation.actualSuccess,
          reason: observation.error || 'Failed contrary to expectation'
        };
      }
    }

    const record = {
      id: `RD-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
      contextId,
      timestamp,
      belief,
      plan,
      observation,
      result,
      discrepancyDetected,
      discrepancyDetails,
      actionTaken: discrepancyDetected ? 'REPLAN_AND_ADAPT' : 'CONFIRMED'
    };

    this.history.push(record);
    if (discrepancyDetected) {
      this.activeDiscrepancies.push(record);
      eventBus.emitEvent(EVENT_TYPES.NEW_INFORMATION, {
        source: 'REALITY_DELTA',
        contextId,
        discrepancy: discrepancyDetails
      });
    }

    return record;
  }

  getRecentDeltas(limit = 10) {
    return this.history.slice(-limit);
  }

  getActiveDiscrepancies() {
    return this.activeDiscrepancies;
  }
}

const realityDeltaEngine = new RealityDeltaEngine();

module.exports = { RealityDeltaEngine, realityDeltaEngine };

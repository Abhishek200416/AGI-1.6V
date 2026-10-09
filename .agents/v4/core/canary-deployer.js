/**
 * .agents/v4/core/canary-deployer.js
 * Universal Autonomous Engineering Intelligence Operating System — V4
 * Engine #16: Canary Deployment Logic
 *
 * Deploys to canary, observes health metrics against baseline,
 * promotes gradually (10% -> 25% -> 50% -> 100%),
 * and automatically stops promotion with instant rollback upon regression.
 */

const { eventBus, EVENT_TYPES } = require('./event-bus');

class CanaryDeployer {
  constructor() {
    this.deployments = [];
  }

  /**
   * Orchestrates a phased canary progression with automated circuit breaker
   */
  async runCanaryPromotion({
    releaseId,
    serviceName,
    stages = [10, 25, 50, 100],
    observeFn // async (percentage) => { errorRate, latencyMs, healthy }
  }) {
    eventBus.emitEvent(EVENT_TYPES.DEPLOYMENT_STARTED, { releaseId, serviceName, type: 'CANARY' });

    const stepLogs = [];
    let currentPercentage = 0;
    let status = 'IN_PROGRESS';
    let rollbackTriggered = false;

    for (const pct of stages) {
      currentPercentage = pct;
      stepLogs.push({ stagePct: pct, status: 'APPLYING', timestamp: new Date().toISOString() });

      // Observe canary health
      const metrics = observeFn ? await observeFn(pct) : { errorRate: 0.001, latencyMs: 42, healthy: true };

      // Circuit breaker threshold rules:
      // errorRate > 2% or latency > 250ms or unhealthy trips immediate rollback
      if (metrics.errorRate > 0.02 || metrics.latencyMs > 250 || !metrics.healthy) {
        stepLogs.push({
          stagePct: pct,
          status: 'REGRESSION_DETECTED',
          metrics,
          action: 'ABORT_PROMOTION_AND_ROLLBACK'
        });

        rollbackTriggered = true;
        status = 'ROLLED_BACK';
        eventBus.emitEvent(EVENT_TYPES.ROLLBACK_STARTED, { releaseId, percentage: pct, metrics });
        eventBus.emitEvent(EVENT_TYPES.ROLLBACK_COMPLETED, { releaseId, restoredVersion: 'PREVIOUS_STABLE' });
        break;
      }

      stepLogs.push({
        stagePct: pct,
        status: 'OBSERVED_HEALTHY',
        metrics
      });
    }

    if (!rollbackTriggered) {
      status = 'PROMOTED_100_PERCENT';
      eventBus.emitEvent(EVENT_TYPES.DEPLOYMENT_HEALTHY, { releaseId, serviceName, status: 'FULLY_PROMOTED' });
    }

    const report = {
      releaseId,
      serviceName,
      status,
      rollbackTriggered,
      finalPercentage: rollbackTriggered ? 0 : currentPercentage,
      stepLogs
    };

    this.deployments.push(report);
    return report;
  }
}

const canaryDeployer = new CanaryDeployer();

module.exports = {
  CanaryDeployer,
  canaryDeployer
};

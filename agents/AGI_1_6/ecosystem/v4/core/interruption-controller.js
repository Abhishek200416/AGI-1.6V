/**
 * .agents/v4/core/interruption-controller.js
 * Universal Autonomous Engineering Intelligence Operating System — V4
 * Engine #34: Interruption + Resume
 *
 * Coordinates graceful user interruption ("Stop") and stateful continuation ("Continue")
 * via checkpoint snapshots without restarting the entire workflow.
 */

const { checkpointManager } = require('./checkpoint-manager');
const { eventBus, EVENT_TYPES } = require('./event-bus');
const { workforceManager } = require('./workforce-manager');

class InterruptionController {
  constructor() {
    this.interruptedTasks = new Map();
  }

  /**
   * Gracefully pauses active subagents and takes an emergency checkpoint
   */
  async handleStop(taskId, currentState = {}) {
    // 1. Pause active workers
    const activeWorkers = workforceManager.listActive();
    for (const w of activeWorkers) {
      workforceManager.pauseSubagent(w.id);
    }

    // 2. Persist checkpoint
    const ckpt = checkpointManager.saveCheckpoint({
      taskId,
      phase: currentState.phase || 'INTERRUPTED_BY_USER',
      dagState: currentState.dagState || {},
      completedNodes: currentState.completedNodes || [],
      failedNodes: currentState.failedNodes || [],
      agentOutputs: currentState.agentOutputs || {},
      artifacts: currentState.artifacts || [],
      environmentState: currentState.environmentState || {},
      destructiveNodes: currentState.destructiveNodes || []
    });

    this.interruptedTasks.set(taskId, {
      taskId,
      checkpointId: ckpt.checkpointId,
      stoppedAt: new Date().toISOString()
    });

    eventBus.emitEvent(EVENT_TYPES.TASK_BLOCKED, {
      taskId,
      reason: 'USER_INTERRUPTION_STOP',
      checkpointId: ckpt.checkpointId
    });

    return {
      success: true,
      status: 'SAFELY_STOPPED',
      taskId,
      checkpointId: ckpt.checkpointId,
      pausedWorkerCount: activeWorkers.length
    };
  }

  /**
   * Resumes workflow from last valid checkpoint
   */
  async handleContinue(taskId, fullDagNodes = []) {
    const resumption = checkpointManager.planResumption(taskId, fullDagNodes);

    // Resume workers if any paused
    const activeWorkers = workforceManager.listActive();
    for (const w of activeWorkers) {
      if (w.state === 'PAUSED') {
        workforceManager.resumeSubagent(w.id);
      }
    }

    this.interruptedTasks.delete(taskId);

    eventBus.emitEvent(EVENT_TYPES.TASK_UPDATED, {
      taskId,
      status: 'RESUMED_FROM_CHECKPOINT',
      skippedDestructiveCount: resumption.skippedDestructive.length,
      remainingNodesCount: resumption.nodesToExecute.length
    });

    return {
      success: true,
      status: 'RESUMED',
      taskId,
      resumptionPlan: resumption
    };
  }
}

const interruptionController = new InterruptionController();

module.exports = {
  InterruptionController,
  interruptionController
};

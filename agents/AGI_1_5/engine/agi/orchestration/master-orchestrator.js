/**
 * agi/orchestration/master-orchestrator.js
 * AGI 0.7 — Master Orchestration Engine
 * 
 * Implements deterministic FSM, DAG mission compiler, specialist workforce coordination,
 * and cycle-deadlock watchdog protection.
 */

const { PersistentQueue } = require('./persistent-queue');
const { CheckpointManager } = require('./checkpoint-manager');
const { ResourceGovernor } = require('./resource-governor');

class MasterOrchestrator {
  constructor(options = {}) {
    this.state = 'IDLE'; // IDLE | PLANNING | EXECUTING | VERIFYING | COMPLETED | FAILED
    this.queue = options.queue || new PersistentQueue();
    this.checkpoints = options.checkpoints || new CheckpointManager();
    this.governor = options.governor || new ResourceGovernor();
    this.activeMission = null;
    this.executionHistory = [];
    this.watchdogTimer = null;
    this.watchdogLimitMs = options.watchdogLimitMs || 120000;
  }

  transitionTo(nextState) {
    const validTransitions = {
      IDLE: ['PLANNING'],
      PLANNING: ['EXECUTING', 'FAILED'],
      EXECUTING: ['VERIFYING', 'FAILED'],
      VERIFYING: ['COMPLETED', 'EXECUTING', 'FAILED'],
      COMPLETED: ['IDLE'],
      FAILED: ['IDLE', 'PLANNING']
    };

    const allowed = validTransitions[this.state] || [];
    if (!allowed.includes(nextState)) {
      throw new Error(`Invalid state transition: ${this.state} -> ${nextState}`);
    }

    const previousState = this.state;
    this.state = nextState;
    this.executionHistory.push({
      from: previousState,
      to: nextState,
      timestamp: new Date().toISOString()
    });
    return this.state;
  }

  compileMission(objective, subtasks = []) {
    const missionId = `MSN-${Date.now().toString(36)}`;
    const nodes = (subtasks.length > 0 ? subtasks : [
      { id: 'sub-1', name: 'Analyze requirements', role: 'Planner', status: 'READY' },
      { id: 'sub-2', name: 'Execute implementation', role: 'Implementer', status: 'PLANNED', dependencies: ['sub-1'] },
      { id: 'sub-3', name: 'Verify closed-loop output', role: 'Test Engineer', status: 'PLANNED', dependencies: ['sub-2'] }
    ]).map((t, idx) => ({
      id: t.id || `node-${idx + 1}`,
      name: t.name || `Task ${idx + 1}`,
      role: t.role || 'Implementer',
      model: 'gemini-3.8-flash-high', // Invariant: sole foundation model
      dependencies: t.dependencies || [],
      status: t.status || (idx === 0 ? 'READY' : 'PLANNED')
    }));

    this.activeMission = {
      missionId,
      objective,
      nodes,
      createdAt: new Date().toISOString()
    };

    return this.activeMission;
  }

  startWatchdog(onTimeout) {
    this.clearWatchdog();
    this.watchdogTimer = setTimeout(() => {
      this.state = 'FAILED';
      if (typeof onTimeout === 'function') onTimeout('CYCLE_DEADLOCK_OR_TIMEOUT');
    }, this.watchdogLimitMs);
  }

  clearWatchdog() {
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  async runStep(executorFn) {
    this.startWatchdog(() => {
      throw new Error('Watchdog triggered: Step exceeded time budget');
    });

    try {
      const result = await executorFn();
      this.clearWatchdog();
      return result;
    } catch (err) {
      this.clearWatchdog();
      throw err;
    }
  }

  getStatus() {
    return {
      state: this.state,
      activeMission: this.activeMission,
      pendingQueueTasks: this.queue.getPendingCount(),
      governorMetrics: this.governor.getMetrics(),
      historyLength: this.executionHistory.length
    };
  }
}

module.exports = { MasterOrchestrator };

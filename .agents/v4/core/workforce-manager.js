/**
 * .agents/v4/core/workforce-manager.js
 * Universal Autonomous Engineering Intelligence Operating System — V4
 * Engine #4: Async Workforce
 *
 * Coordinates foreground, background, parallel, scheduled, and long-running subagents.
 * Enforces maximum subagent recursion depth of 2 and returns structured isolated results.
 */

const { eventBus, EVENT_TYPES } = require('./event-bus');

class WorkforceManager {
  constructor(maxDepth = 2) {
    this.maxDepth = maxDepth;
    this.subagents = new Map();
    this.sequence = 0;
  }

  createSubagent({
    name,
    role,
    type = 'foreground', // foreground | background | parallel | scheduled | event_triggered | long_running
    prompt,
    depth = 1,
    priority = 'NORMAL', // LOW | NORMAL | HIGH | CRITICAL
    model = 'inherit',
    context = {}
  }) {
    if (depth > this.maxDepth) {
      throw new Error(`[ANTI_RECURSION_VIOLATION] Subagent recursion depth ${depth} exceeds maximum limit of ${this.maxDepth}`);
    }

    this.sequence++;
    const id = `subagent-${this.sequence}-${Date.now().toString(36)}`;
    const subagent = {
      id,
      name,
      role: role || name,
      type,
      prompt,
      depth,
      priority,
      model,
      context: Object.assign({}, context), // Isolated context copy
      state: 'CREATED', // CREATED | RUNNING | PAUSED | COMPLETED | FAILED | CANCELLED
      progress: 0,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      result: null,
      error: null,
      retryCount: 0
    };

    this.subagents.set(id, subagent);

    eventBus.emitEvent(EVENT_TYPES.SUBAGENT_CREATED, {
      subagentId: id,
      name,
      role: subagent.role,
      type,
      priority,
      depth
    });

    return subagent;
  }

  startSubagent(id, executeFn = null) {
    const sub = this.subagents.get(id);
    if (!sub) throw new Error(`Subagent ${id} not found`);

    sub.state = 'RUNNING';
    sub.startedAt = new Date().toISOString();

    eventBus.emitEvent(EVENT_TYPES.AGENT_STARTED, {
      subagentId: id,
      name: sub.name,
      type: sub.type
    });

    if (executeFn) {
      try {
        const out = executeFn(sub);
        if (out && typeof out.then === 'function') {
          return out.then(res => this._completeSubagent(id, res))
                    .catch(err => this._failSubagent(id, err));
        } else {
          return this._completeSubagent(id, out);
        }
      } catch (err) {
        return this._failSubagent(id, err);
      }
    }

    return sub;
  }

  _completeSubagent(id, result) {
    const sub = this.subagents.get(id);
    if (!sub) return null;
    sub.state = 'COMPLETED';
    sub.progress = 100;
    sub.completedAt = new Date().toISOString();
    sub.result = result;

    eventBus.emitEvent(EVENT_TYPES.AGENT_FINISHED, {
      subagentId: id,
      name: sub.name,
      status: 'SUCCESS'
    });

    return sub;
  }

  _failSubagent(id, error) {
    const sub = this.subagents.get(id);
    if (!sub) return null;
    sub.state = 'FAILED';
    sub.completedAt = new Date().toISOString();
    sub.error = error ? (error.message || String(error)) : 'Unknown execution failure';

    eventBus.emitEvent(EVENT_TYPES.AGENT_FAILED, {
      subagentId: id,
      name: sub.name,
      error: sub.error
    });

    return sub;
  }

  pauseSubagent(id) {
    const sub = this.subagents.get(id);
    if (!sub) throw new Error(`Subagent ${id} not found`);
    if (sub.state === 'RUNNING') {
      sub.state = 'PAUSED';
      eventBus.emitEvent(EVENT_TYPES.TASK_BLOCKED, { subagentId: id, reason: 'PAUSED_BY_ROOT' });
    }
    return sub;
  }

  resumeSubagent(id) {
    const sub = this.subagents.get(id);
    if (!sub) throw new Error(`Subagent ${id} not found`);
    if (sub.state === 'PAUSED') {
      sub.state = 'RUNNING';
      eventBus.emitEvent(EVENT_TYPES.AGENT_STARTED, { subagentId: id, reason: 'RESUMED_BY_ROOT' });
    }
    return sub;
  }

  cancelSubagent(id, reason = 'Cancelled by user or root orchestrator') {
    const sub = this.subagents.get(id);
    if (!sub) throw new Error(`Subagent ${id} not found`);
    sub.state = 'CANCELLED';
    sub.completedAt = new Date().toISOString();
    sub.error = reason;

    eventBus.emitEvent(EVENT_TYPES.SUBAGENT_CANCELLED, {
      subagentId: id,
      name: sub.name,
      reason
    });

    return sub;
  }

  retrySubagent(id, executeFn = null) {
    const sub = this.subagents.get(id);
    if (!sub) throw new Error(`Subagent ${id} not found`);
    sub.retryCount++;
    sub.error = null;
    return this.startSubagent(id, executeFn);
  }

  prioritizeSubagent(id, newPriority) {
    const sub = this.subagents.get(id);
    if (!sub) throw new Error(`Subagent ${id} not found`);
    sub.priority = newPriority;
    return sub;
  }

  reassignSubagent(id, newAgentName, newRole = null) {
    const sub = this.subagents.get(id);
    if (!sub) throw new Error(`Subagent ${id} not found`);
    sub.name = newAgentName;
    if (newRole) sub.role = newRole;
    return sub;
  }

  monitorSubagent(id) {
    const sub = this.subagents.get(id);
    if (!sub) return null;
    return {
      id: sub.id,
      name: sub.name,
      role: sub.role,
      state: sub.state,
      priority: sub.priority,
      progress: sub.progress,
      retryCount: sub.retryCount,
      error: sub.error
    };
  }

  async executeParallel(taskConfigs = [], concurrency = 4) {
    const results = [];
    const queue = [...taskConfigs];

    const worker = async () => {
      while (queue.length > 0) {
        const cfg = queue.shift();
        const sub = this.createSubagent(Object.assign({ type: 'parallel' }, cfg));
        const res = await this.startSubagent(sub.id, cfg.executeFn);
        results.push(res);
      }
    };

    const workers = Array(Math.min(concurrency, taskConfigs.length)).fill(0).map(() => worker());
    await Promise.all(workers);
    return results;
  }

  listActive() {
    return Array.from(this.subagents.values()).filter(s => s.state === 'RUNNING' || s.state === 'CREATED' || s.state === 'PAUSED');
  }
}

const workforceManager = new WorkforceManager();

module.exports = {
  WorkforceManager,
  workforceManager
};

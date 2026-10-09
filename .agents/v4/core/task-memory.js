/**
 * .agents/v4/core/task-memory.js
 * Universal Autonomous Engineering Intelligence Operating System — V4
 * Engine #33: Task Memory
 *
 * Full lifecycle tracking of task graphs, plans, DAG nodes, checkpoints,
 * decisions, and evidence for session continuity and cross-phase resumption.
 */

const fs = require('fs');
const path = require('path');

const REGISTRY_TASKS = path.resolve(__dirname, '../../registry/tasks.json');

class TaskMemoryStore {
  constructor(registryPath = REGISTRY_TASKS) {
    this.registryPath = registryPath;
    this.data = this._load();
  }

  _load() {
    try {
      if (fs.existsSync(this.registryPath)) {
        return JSON.parse(fs.readFileSync(this.registryPath, 'utf-8'));
      }
    } catch (e) {
      console.warn('[TASK_MEMORY] Failed to load tasks registry, using empty store:', e.message);
    }
    return { registryVersion: "4.0.0", activeTasks: {}, completedTasks: {} };
  }

  save() {
    try {
      this.data.lastUpdated = new Date().toISOString();
      fs.writeFileSync(this.registryPath, JSON.stringify(this.data, null, 2), 'utf-8');
      return true;
    } catch (e) {
      console.error('[TASK_MEMORY] Save error:', e.message);
      return false;
    }
  }

  createTaskRecord({
    taskId,
    parentTask = null,
    objective,
    constraints = [],
    plan = [],
    DAG = { nodes: [], edges: [] },
    agents = [],
    tools = []
  }) {
    const record = {
      task_id: taskId,
      parent_task: parentTask,
      objective,
      constraints,
      plan,
      DAG,
      agents,
      tools,
      events: ['TASK_CREATED'],
      checkpoints: [],
      artifacts: [],
      tests: [],
      decisions: [],
      failures: [],
      recovery: [],
      final_evidence: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.data.activeTasks[taskId] = record;
    this.save();
    return record;
  }

  updateTaskRecord(taskId, patch = {}) {
    const record = this.data.activeTasks[taskId] || this.data.completedTasks[taskId];
    if (!record) return null;

    for (const [k, v] of Object.entries(patch)) {
      if (Array.isArray(record[k]) && Array.isArray(v)) {
        record[k].push(...v);
      } else {
        record[k] = v;
      }
    }

    record.updatedAt = new Date().toISOString();
    this.save();
    return record;
  }

  completeTaskRecord(taskId, finalEvidence) {
    const record = this.data.activeTasks[taskId];
    if (!record) return null;

    record.final_evidence = finalEvidence;
    record.completedAt = new Date().toISOString();
    record.events.push('TASK_COMPLETED');

    delete this.data.activeTasks[taskId];
    this.data.completedTasks[taskId] = record;
    this.save();
    return record;
  }

  getTaskRecord(taskId) {
    return this.data.activeTasks[taskId] || this.data.completedTasks[taskId] || null;
  }
}

const taskMemoryStore = new TaskMemoryStore();

module.exports = {
  TaskMemoryStore,
  taskMemoryStore
};

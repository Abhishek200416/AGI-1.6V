/**
 * agi/orchestration/persistent-queue.js
 * AGI 0.7 — Durable Persistent Task Queue
 * 
 * Implements crash-resilient FIFO and priority task queuing with atomic disk persistence.
 */

const fs = require('fs');
const path = require('path');

class PersistentQueue {
  constructor(storagePath = null) {
    this.storagePath = storagePath || path.resolve(process.cwd(), 'agi/data/task-queue.json');
    this.tasks = [];
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
        this.tasks = JSON.parse(raw);
      } catch {
        this.tasks = [];
      }
    } else {
      this.tasks = [];
      this.persist();
    }
  }

  persist() {
    const tmp = `${this.storagePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.tasks, null, 2), 'utf8');
    fs.renameSync(tmp, this.storagePath);
  }

  enqueue(task) {
    const entry = {
      id: task.id || `TASK-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      title: task.title || 'Untitled Task',
      priority: task.priority || 5, // 1 (highest) to 10 (lowest)
      status: 'QUEUED',
      payload: task.payload || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.tasks.push(entry);
    this.tasks.sort((a, b) => a.priority - b.priority);
    this.persist();
    return entry;
  }

  dequeue() {
    const index = this.tasks.findIndex(t => t.status === 'QUEUED');
    if (index === -1) return null;
    const task = this.tasks[index];
    task.status = 'IN_PROGRESS';
    task.updatedAt = new Date().toISOString();
    this.persist();
    return task;
  }

  complete(taskId, result = null) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      task.status = 'COMPLETED';
      task.result = result;
      task.updatedAt = new Date().toISOString();
      this.persist();
      return true;
    }
    return false;
  }

  fail(taskId, error = null) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      task.status = 'FAILED';
      task.error = error;
      task.updatedAt = new Date().toISOString();
      this.persist();
      return true;
    }
    return false;
  }

  getPendingCount() {
    return this.tasks.filter(t => t.status === 'QUEUED').length;
  }

  getAll() {
    return [...this.tasks];
  }

  clear() {
    this.tasks = [];
    this.persist();
  }
}

module.exports = { PersistentQueue };

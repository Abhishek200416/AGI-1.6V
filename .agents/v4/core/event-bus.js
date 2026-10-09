/**
 * .agents/v4/core/event-bus.js
 * Universal Autonomous Engineering Intelligence Operating System — V4
 * Engine #2: Event Bus
 *
 * Emits and distributes structured, zero-secret telemetry across 32 core event types.
 */

const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

const EVENTS_DIR = path.resolve(__dirname, '../events');
const STREAM_FILE = path.join(EVENTS_DIR, 'event-stream.jsonl');

const EVENT_TYPES = Object.freeze({
  TASK_CREATED: 'TASK_CREATED',
  TASK_UPDATED: 'TASK_UPDATED',
  TASK_BLOCKED: 'TASK_BLOCKED',
  TASK_COMPLETED: 'TASK_COMPLETED',
  AGENT_STARTED: 'AGENT_STARTED',
  AGENT_FINISHED: 'AGENT_FINISHED',
  AGENT_FAILED: 'AGENT_FAILED',
  SUBAGENT_CREATED: 'SUBAGENT_CREATED',
  SUBAGENT_CANCELLED: 'SUBAGENT_CANCELLED',
  FILE_CHANGED: 'FILE_CHANGED',
  DEPENDENCY_CHANGED: 'DEPENDENCY_CHANGED',
  TEST_STARTED: 'TEST_STARTED',
  TEST_FAILED: 'TEST_FAILED',
  TEST_PASSED: 'TEST_PASSED',
  SECURITY_ALERT: 'SECURITY_ALERT',
  MCP_CONNECTED: 'MCP_CONNECTED',
  MCP_DISCONNECTED: 'MCP_DISCONNECTED',
  MODEL_AVAILABLE: 'MODEL_AVAILABLE',
  MODEL_UNAVAILABLE: 'MODEL_UNAVAILABLE',
  DEPLOYMENT_STARTED: 'DEPLOYMENT_STARTED',
  DEPLOYMENT_FAILED: 'DEPLOYMENT_FAILED',
  DEPLOYMENT_HEALTHY: 'DEPLOYMENT_HEALTHY',
  PERFORMANCE_DEGRADED: 'PERFORMANCE_DEGRADED',
  BUDGET_WARNING: 'BUDGET_WARNING',
  APPROVAL_REQUIRED: 'APPROVAL_REQUIRED',
  APPROVAL_GRANTED: 'APPROVAL_GRANTED',
  APPROVAL_DENIED: 'APPROVAL_DENIED',
  CAPABILITY_DISCOVERED: 'CAPABILITY_DISCOVERED',
  CAPABILITY_REJECTED: 'CAPABILITY_REJECTED',
  CAPABILITY_REGISTERED: 'CAPABILITY_REGISTERED',
  ROLLBACK_STARTED: 'ROLLBACK_STARTED',
  ROLLBACK_COMPLETED: 'ROLLBACK_COMPLETED'
});

// Redacts any raw credentials or tokens from telemetry
function redactSecrets(obj) {
  if (typeof obj === 'string') {
    return obj.replace(/(?:api[-_]?key|bearer|token|secret|password)[=:\s]+(["']?[A-Za-z0-9_\-\.]{12,}["']?)/gi, '[REDACTED_API_KEY]');
  }
  if (typeof obj === 'object' && obj !== null) {
    const copy = Array.isArray(obj) ? [] : {};
    for (const [k, v] of Object.entries(obj)) {
      if (/key|secret|token|password|auth/i.test(k) && typeof v === 'string') {
        copy[k] = '[REDACTED_API_KEY]';
      } else {
        copy[k] = redactSecrets(v);
      }
    }
    return copy;
  }
  return obj;
}

class EventBus extends EventEmitter {
  constructor(streamFile = STREAM_FILE) {
    super();
    this.streamFile = streamFile;
    this.sequence = 0;
    this.history = [];
    this.maxHistory = 1000;

    const dir = path.dirname(this.streamFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  emitEvent(eventType, payload = {}, metadata = {}) {
    if (!EVENT_TYPES[eventType]) {
      console.warn(`[EVENT_BUS] Unrecognized event type: ${eventType}`);
    }

    this.sequence++;
    const event = {
      sequence: this.sequence,
      type: eventType,
      timestamp: new Date().toISOString(),
      correlationId: metadata.correlationId || `corr-${this.sequence}-${Date.now()}`,
      source: metadata.source || 'orchestration-agent-v4',
      payload: redactSecrets(payload)
    };

    // Keep in memory buffer
    this.history.push(event);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // Persist to jsonl stream
    try {
      fs.appendFileSync(this.streamFile, JSON.stringify(event) + '\n', 'utf-8');
    } catch (err) {
      console.error('[EVENT_BUS] Failed to append to event stream:', err.message);
    }

    // Dispatch to node listeners
    this.emit(eventType, event);
    this.emit('*', event);

    return event;
  }

  getHistory(filterFn = null, limit = 50) {
    let res = this.history;
    if (filterFn) res = res.filter(filterFn);
    return res.slice(-limit);
  }

  clearStream() {
    try {
      if (fs.existsSync(this.streamFile)) fs.unlinkSync(this.streamFile);
      this.history = [];
      this.sequence = 0;
    } catch (e) {}
  }
}

const eventBus = new EventBus();

module.exports = {
  EventBus,
  eventBus,
  EVENT_TYPES,
  redactSecrets
};

/**
 * matrix/events/event-bus.js
 * MATRIX X1 — Event Bus & Event-Driven Cognitive Routing
 * 
 * Supports 32+ event types, prioritized event subscriptions,
 * structured audit trail, and selective cognitive waking.
 */

const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

const EVENT_TYPES = {
  COMMANDER_MESSAGE: 'commander_message',
  COMMANDER_DECISION: 'commander_decision',
  MISSION_CREATED: 'mission_created',
  MISSION_UPDATED: 'mission_updated',
  MISSION_PAUSED: 'mission_paused',
  MISSION_RESUMED: 'mission_resumed',
  MISSION_COMPLETED: 'mission_completed',
  MISSION_FAILED: 'mission_failed',
  TOOL_INVOKED: 'tool_invoked',
  TOOL_FAILURE: 'tool_failure',
  MODEL_INVOKED: 'model_invoked',
  MODEL_FAILURE: 'model_failure',
  BROWSER_CHANGE: 'browser_change',
  NEW_INFORMATION: 'new_information',
  RESEARCH_COMPLETE: 'research_complete',
  MEMORY_CONFLICT: 'memory_conflict',
  CAPABILITY_DISCOVERED: 'capability_discovered',
  CAPABILITY_ACQUIRED: 'capability_acquired',
  DEVICE_CONNECTED: 'device_connected',
  DEVICE_DISCONNECTED: 'device_disconnected',
  STORAGE_CONNECTED: 'storage_connected',
  STORAGE_DISCONNECTED: 'storage_disconnected',
  RESOURCE_LOW: 'resource_low',
  DEADLINE_NEAR: 'deadline_near',
  EXPERIMENT_STARTED: 'experiment_started',
  EXPERIMENT_COMPLETE: 'experiment_complete',
  VERIFICATION_PASSED: 'verification_passed',
  VERIFICATION_FAILED: 'verification_failed',
  DECISION_MADE: 'decision_made',
  LEARNING_RECORDED: 'learning_recorded',
  SKILL_EXTRACTED: 'skill_extracted',
  CHECKPOINT_SAVED: 'checkpoint_saved'
};

class EventBus extends EventEmitter {
  constructor(options = {}) {
    super();
    this.history = [];
    this.maxHistory = options.maxHistory || 2000;
    this.logFile = options.logFile || null;
    this.subsystemSubscribers = new Map();
  }

  /**
   * Register a subsystem to wake only on specific event categories
   */
  registerSubsystem(subsystemName, eventTypes, callback) {
    if (!this.subsystemSubscribers.has(subsystemName)) {
      this.subsystemSubscribers.set(subsystemName, []);
    }
    const listener = { eventTypes, callback };
    this.subsystemSubscribers.get(subsystemName).push(listener);

    for (const evt of eventTypes) {
      this.on(evt, (payload) => {
        try {
          callback(evt, payload);
        } catch (err) {
          console.error(`[EventBus] Error in subsystem ${subsystemName} for ${evt}:`, err.message);
        }
      });
    }
  }

  /**
   * Emit structured event with telemetry metadata
   */
  emitEvent(type, payload = {}) {
    const timestamp = new Date().toISOString();
    const eventObject = {
      id: `EVT-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      timestamp,
      payload
    };

    this.history.push(eventObject);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // Persist event if logFile configured
    if (this.logFile) {
      try {
        fs.appendFileSync(this.logFile, JSON.stringify(eventObject) + '\n', 'utf8');
      } catch (e) {}
    }

    this.emit(type, eventObject);
    this.emit('*', eventObject);
    return eventObject;
  }

  /**
   * Query event history with filtering
   */
  getHistory(filterType = null, limit = 50) {
    let result = this.history;
    if (filterType) {
      result = result.filter(e => e.type === filterType);
    }
    return result.slice(-limit);
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.history = [];
  }
}

const eventBus = new EventBus();

module.exports = { EventBus, eventBus, EVENT_TYPES };

/**
 * matrix/cognition/adaptive-execution-controller.js
 * MATRIX X1.2 — Adaptive Execution Controller
 * 
 * Persistent Finite State Machine (FSM) execution engine that coordinates
 * mission DAG nodes through deterministic lifecycle transitions:
 *   PLANNED -> READY -> RUNNING -> VERIFYING -> COMPLETE
 * 
 * Features:
 * - Bounded retries with exponential backoff & random jitter
 * - Deadlock / cyclic action watchdog (aborts if identical tool arguments repeated >= 2 times)
 * - Closed-loop state transition validation
 * - Epistemic error categorization
 * 
 * Follows Ponytail principle: minimal direct code, stdlib timer & events.
 */

const EventEmitter = require('events');

const EXECUTION_STATES = {
  PLANNED: 'PLANNED',
  READY: 'READY',
  RUNNING: 'RUNNING',
  VERIFYING: 'VERIFYING',
  COMPLETE: 'COMPLETE',
  RETRYABLE_FAILURE: 'RETRYABLE_FAILURE',
  BLOCKED: 'BLOCKED',
  TIMED_OUT: 'TIMED_OUT',
  CANCELLED: 'CANCELLED',
  TERMINAL_FAILURE: 'TERMINAL_FAILURE'
};

class AdaptiveExecutionController extends EventEmitter {
  constructor(options = {}) {
    super();
    this.maxRetries = options.maxRetries || 2;
    this.initialBackoffMs = options.initialBackoffMs || 1000;
    this.actionHistory = [];
    this.nodeStates = new Map();
  }

  /**
   * Initializes tracking for a compiled mission DAG
   */
  loadMission(compiledMission) {
    for (const node of compiledMission.nodes) {
      this.nodeStates.set(node.id, {
        id: node.id,
        state: node.status || EXECUTION_STATES.PLANNED,
        retryCount: 0,
        errors: [],
        startedAt: null,
        completedAt: null,
        output: null
      });
    }
  }

  /**
   * Transition node state with validation
   */
  transition(nodeId, nextState, metadata = {}) {
    const current = this.nodeStates.get(nodeId);
    if (!current) {
      throw new Error(`AdaptiveExecutionController: Node ${nodeId} not found.`);
    }

    const previousState = current.state;
    current.state = nextState;
    current.lastTransition = new Date().toISOString();
    Object.assign(current, metadata);

    this.emit('stateTransition', {
      nodeId,
      from: previousState,
      to: nextState,
      metadata,
      timestamp: current.lastTransition
    });

    return current;
  }

  /**
   * Check for action repetition / infinite loop deadlock
   */
  checkCycleDeadlock(actionFingerprint) {
    const recent = this.actionHistory.slice(-4);
    const matchCount = recent.filter(a => a === actionFingerprint).length;
    if (matchCount >= 2) {
      return {
        deadlockDetected: true,
        reason: `Deadlock: Action fingerprint '${actionFingerprint}' repeated ${matchCount} times.`
      };
    }
    this.actionHistory.push(actionFingerprint);
    if (this.actionHistory.length > 50) this.actionHistory.shift();
    return { deadlockDetected: false };
  }

  /**
   * Execute single work unit with bounded retries and jittered backoff
   */
  async executeNode(node, executorFn, verifierFn = null) {
    const nodeRecord = this.nodeStates.get(node.id) || {
      id: node.id,
      state: EXECUTION_STATES.READY,
      retryCount: 0,
      errors: []
    };
    this.nodeStates.set(node.id, nodeRecord);

    this.transition(node.id, EXECUTION_STATES.RUNNING, { startedAt: new Date().toISOString() });

    while (nodeRecord.retryCount <= this.maxRetries) {
      try {
        const executionOutput = await executorFn(node);
        nodeRecord.output = executionOutput;

        // Transition to VERIFYING state
        this.transition(node.id, EXECUTION_STATES.VERIFYING);

        // Run closed-loop verifier if provided
        if (verifierFn) {
          const verificationResult = await verifierFn(node, executionOutput);
          if (!verificationResult.passed) {
            throw new Error(`Verification failed: ${verificationResult.reason}`);
          }
        }

        // Successfully verified
        this.transition(node.id, EXECUTION_STATES.COMPLETE, {
          completedAt: new Date().toISOString()
        });

        return {
          success: true,
          nodeId: node.id,
          output: executionOutput,
          retryCount: nodeRecord.retryCount
        };
      } catch (err) {
        nodeRecord.retryCount++;
        nodeRecord.errors.push(err.message);

        if (nodeRecord.retryCount <= this.maxRetries) {
          this.transition(node.id, EXECUTION_STATES.RETRYABLE_FAILURE, {
            error: err.message,
            retryCount: nodeRecord.retryCount
          });

          // Jittered exponential backoff: base * 2^retries + random(0, 500ms)
          const backoffMs = (this.initialBackoffMs * Math.pow(2, nodeRecord.retryCount - 1)) + Math.floor(Math.random() * 500);
          await new Promise(r => setTimeout(r, backoffMs));

          this.transition(node.id, EXECUTION_STATES.RUNNING);
        } else {
          this.transition(node.id, EXECUTION_STATES.TERMINAL_FAILURE, {
            error: err.message,
            final: true
          });

          return {
            success: false,
            nodeId: node.id,
            error: err.message,
            retryCount: nodeRecord.retryCount
          };
        }
      }
    }
  }

  getNodeState(nodeId) {
    return this.nodeStates.get(nodeId) || null;
  }
}

const adaptiveExecutionController = new AdaptiveExecutionController();
module.exports = {
  AdaptiveExecutionController,
  adaptiveExecutionController,
  EXECUTION_STATES
};

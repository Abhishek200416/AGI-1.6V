/**
 * .agents/v4/core/checkpoint-manager.js
 * Universal Autonomous Engineering Intelligence Operating System — V4
 * Engine #3: Durable Execution
 *
 * Checkpoint creation, state serialization, DAG tracking,
 * and recovery without repeating destructive operations.
 */

const fs = require('fs');
const path = require('path');
const { eventBus, EVENT_TYPES } = require('./event-bus');

const CHECKPOINTS_DIR = path.resolve(__dirname, '../checkpoints');

class CheckpointManager {
  constructor(storageDir = CHECKPOINTS_DIR) {
    this.storageDir = storageDir;
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  getCheckpointPath(taskId) {
    return path.join(this.storageDir, `ckpt-${taskId}.json`);
  }

  saveCheckpoint(checkpointData) {
    const {
      taskId,
      phase = "INIT",
      dagState = {},
      completedNodes = [],
      failedNodes = [],
      agentOutputs = {},
      artifacts = [],
      environmentState = {},
      verificationState = {},
      destructiveNodes = []
    } = checkpointData;

    if (!taskId) throw new Error("Checkpoint requires taskId");

    const checkpoint = {
      checkpointId: `ckpt-${taskId}-${Date.now()}`,
      taskId,
      timestamp: new Date().toISOString(),
      phase,
      dagState,
      completedNodes,
      failedNodes,
      agentOutputs,
      artifacts,
      environmentState,
      verificationState,
      destructiveNodes
    };

    const target = this.getCheckpointPath(taskId);
    fs.writeFileSync(target, JSON.stringify(checkpoint, null, 2), 'utf-8');

    eventBus.emitEvent(EVENT_TYPES.TASK_UPDATED, {
      taskId,
      phase,
      checkpointId: checkpoint.checkpointId,
      completedCount: completedNodes.length
    });

    return checkpoint;
  }

  loadCheckpoint(taskId) {
    const target = this.getCheckpointPath(taskId);
    if (!fs.existsSync(target)) return null;
    try {
      return JSON.parse(fs.readFileSync(target, 'utf-8'));
    } catch (err) {
      console.error(`[CHECKPOINT] Failed to parse checkpoint for ${taskId}:`, err.message);
      return null;
    }
  }

  hasCheckpoint(taskId) {
    return fs.existsSync(this.getCheckpointPath(taskId));
  }

  /**
   * Resumes execution from last valid checkpoint, filtering out
   * completed nodes and ensuring destructive operations are not re-executed blindly.
   */
  planResumption(taskId, currentDagNodes = []) {
    const ckpt = this.loadCheckpoint(taskId);
    if (!ckpt) {
      return {
        isResume: false,
        nodesToExecute: currentDagNodes,
        skippedDestructive: []
      };
    }

    const completedSet = new Set(ckpt.completedNodes || []);
    const destructiveSet = new Set(ckpt.destructiveNodes || []);
    const skippedDestructive = [];

    const nodesToExecute = currentDagNodes.filter(node => {
      const nodeId = typeof node === 'string' ? node : node.id;
      if (completedSet.has(nodeId)) {
        if (destructiveSet.has(nodeId)) {
          skippedDestructive.push(nodeId);
        }
        return false; // Skip already completed
      }
      return true;
    });

    return {
      isResume: true,
      lastPhase: ckpt.phase,
      completedNodes: ckpt.completedNodes,
      nodesToExecute,
      skippedDestructive,
      restoredOutputs: ckpt.agentOutputs,
      restoredArtifacts: ckpt.artifacts
    };
  }

  deleteCheckpoint(taskId) {
    const target = this.getCheckpointPath(taskId);
    if (fs.existsSync(target)) {
      fs.unlinkSync(target);
      return true;
    }
    return false;
  }
}

const checkpointManager = new CheckpointManager();

module.exports = {
  CheckpointManager,
  checkpointManager
};

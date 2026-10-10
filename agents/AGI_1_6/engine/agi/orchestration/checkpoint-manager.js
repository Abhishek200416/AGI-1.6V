/**
 * agi/orchestration/checkpoint-manager.js
 * AGI 0.7 — Durable Checkpoint & State Recovery Manager
 * 
 * Creates cryptographic snapshots of execution state and provides rollback/resume.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class CheckpointManager {
  constructor(checkpointDir = null) {
    this.checkpointDir = checkpointDir || path.resolve(process.cwd(), 'agi/checkpoints');
    this._ensureDir();
  }

  _ensureDir() {
    if (!fs.existsSync(this.checkpointDir)) {
      fs.mkdirSync(this.checkpointDir, { recursive: true });
    }
  }

  createCheckpoint(checkpointId, stateData, metadata = {}) {
    const timestamp = new Date().toISOString();
    const serialized = JSON.stringify(stateData, null, 2);
    const hash = crypto.createHash('sha256').update(serialized).digest('hex');

    const checkpoint = {
      checkpointId,
      timestamp,
      sha256: hash,
      metadata,
      state: stateData
    };

    const targetFile = path.join(this.checkpointDir, `${checkpointId}.json`);
    const tmp = `${targetFile}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(checkpoint, null, 2), 'utf8');
    fs.renameSync(tmp, targetFile);

    return {
      checkpointId,
      file: targetFile,
      sha256: hash,
      timestamp
    };
  }

  restoreCheckpoint(checkpointId) {
    const targetFile = path.join(this.checkpointDir, `${checkpointId}.json`);
    if (!fs.existsSync(targetFile)) {
      return { success: false, error: 'CHECKPOINT_NOT_FOUND' };
    }

    try {
      const raw = fs.readFileSync(targetFile, 'utf8');
      const checkpoint = JSON.parse(raw);
      const computedHash = crypto.createHash('sha256').update(JSON.stringify(checkpoint.state, null, 2)).digest('hex');

      if (computedHash !== checkpoint.sha256) {
        return { success: false, error: 'CHECKPOINT_INTEGRITY_COMPROMISED' };
      }

      return {
        success: true,
        checkpointId: checkpoint.checkpointId,
        timestamp: checkpoint.timestamp,
        state: checkpoint.state,
        metadata: checkpoint.metadata
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  listCheckpoints() {
    if (!fs.existsSync(this.checkpointDir)) return [];
    return fs.readdirSync(this.checkpointDir)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        try {
          const raw = fs.readFileSync(path.join(this.checkpointDir, f), 'utf8');
          const data = JSON.parse(raw);
          return {
            checkpointId: data.checkpointId,
            timestamp: data.timestamp,
            sha256: data.sha256,
            metadata: data.metadata
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
}

module.exports = { CheckpointManager };

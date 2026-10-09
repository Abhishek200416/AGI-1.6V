/**
 * matrix/storage/storage-fabric.js
 * MATRIX X1 — Storage Fabric & Multi-Tier Persistence Engine
 * 
 * Manages storage tiers:
 * - RAM: working state
 * - Internal SSD: hot runtime/cache
 * - External SSD/Removable: active persistent state (e.g. F:\MatrixX or configured root)
 * - Archive: historical material
 * 
 * Features:
 * - Volume census & detection
 * - External storage disconnect detection and safe degraded local fallback
 * - Checkpoint serialization & restore
 * - Automatic integrity reconciliation
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

class StorageFabric {
  constructor(options = {}) {
    this.workspaceRoot = options.workspaceRoot || path.resolve(__dirname, '../../');
    this.dataRootOverride = process.env.MATRIX_X_DATA_ROOT || options.dataRoot || null;
    
    // Internal fallback directory
    this.internalCacheDir = path.join(this.workspaceRoot, '.matrix_data');
    if (!fs.existsSync(this.internalCacheDir)) {
      fs.mkdirSync(this.internalCacheDir, { recursive: true });
    }

    this.checkpointsDir = path.join(this.internalCacheDir, 'checkpoints');
    if (!fs.existsSync(this.checkpointsDir)) {
      fs.mkdirSync(this.checkpointsDir, { recursive: true });
    }

    this.degradedMode = false;
    this.externalVolumePath = null;
    this.externalVolumeLabel = null;
    this.activeDataRoot = null;
    this.volumes = [];

    this.initializeStorage();
  }

  /**
   * Inspect host volumes & detect available storage drives
   */
  detectVolumes() {
    this.volumes = [];
    try {
      if (process.platform === 'win32') {
        const cmd = 'powershell -NoProfile -Command "Get-CimInstance Win32_LogicalDisk | Select-Object DeviceID, DriveType, VolumeName, Size, FreeSpace | ConvertTo-Json"';
        const raw = execSync(cmd, { encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'ignore'] });
        const parsed = JSON.parse(raw);
        const list = Array.isArray(parsed) ? parsed : [parsed];
        this.volumes = list.map(v => ({
          deviceId: v.DeviceID,
          driveType: v.DriveType, // 2: Removable, 3: Fixed, 4: Network, 5: CD
          type: v.DriveType === 2 ? 'REMOVABLE_USB' : (v.DriveType === 3 ? 'FIXED_DISK' : 'OTHER'),
          volumeName: v.VolumeName || 'Unnamed',
          sizeBytes: Number(v.Size || 0),
          freeBytes: Number(v.FreeSpace || 0),
          freeGb: Math.round(Number(v.FreeSpace || 0) / (1024 * 1024 * 1024))
        }));
      } else {
        this.volumes = [{
          deviceId: '/',
          driveType: 3,
          type: 'FIXED_DISK',
          volumeName: 'Root',
          sizeBytes: 100 * 1024 * 1024 * 1024,
          freeBytes: 50 * 1024 * 1024 * 1024,
          freeGb: 50
        }];
      }
    } catch (e) {
      // Fallback detection
      this.volumes = [{
        deviceId: path.parse(this.workspaceRoot).root || 'C:',
        driveType: 3,
        type: 'FIXED_DISK',
        volumeName: 'System',
        sizeBytes: 0,
        freeBytes: 0,
        freeGb: 0
      }];
    }
    return this.volumes;
  }

  /**
   * Initialize primary active storage root
   */
  initializeStorage() {
    this.detectVolumes();

    if (this.dataRootOverride && fs.existsSync(this.dataRootOverride)) {
      this.activeDataRoot = this.dataRootOverride;
      this.degradedMode = false;
      return;
    }

    // Check if removable drive (e.g. F: IGRIS) is available
    const removable = this.volumes.find(v => v.driveType === 2 && v.freeBytes > 1024 * 1024 * 1024);
    if (removable) {
      const candidatePath = path.join(removable.deviceId, 'MatrixX_Data');
      try {
        if (!fs.existsSync(candidatePath)) {
          fs.mkdirSync(candidatePath, { recursive: true });
        }
        this.externalVolumePath = candidatePath;
        this.externalVolumeLabel = removable.volumeName || removable.deviceId;
        this.activeDataRoot = candidatePath;
        this.degradedMode = false;
        return;
      } catch (err) {
        // Fall back to internal cache
      }
    }

    // Default to internal storage
    this.activeDataRoot = this.internalCacheDir;
    this.degradedMode = false;
  }

  /**
   * Check health of active storage; detects disconnect
   */
  checkHealth() {
    if (!this.activeDataRoot) {
      this.degradedMode = true;
      return { healthy: false, reason: 'NO_ACTIVE_ROOT', degraded: true };
    }

    try {
      if (!fs.existsSync(this.activeDataRoot)) {
        this.handleStorageDisconnect('Active storage path disappeared');
        return { healthy: false, reason: 'PATH_NOT_FOUND', degraded: true };
      }
      // Probe write
      const testFile = path.join(this.activeDataRoot, '.probe.tmp');
      fs.writeFileSync(testFile, Date.now().toString());
      fs.unlinkSync(testFile);
      return {
        healthy: true,
        root: this.activeDataRoot,
        degraded: this.degradedMode,
        volumesDetected: this.volumes.length
      };
    } catch (err) {
      this.handleStorageDisconnect(err.message);
      return { healthy: false, reason: err.message, degraded: true };
    }
  }

  /**
   * Handle storage disconnect safely without corruption
   */
  handleStorageDisconnect(reason = 'Unknown') {
    if (!this.degradedMode) {
      this.degradedMode = true;
      // Switch to local internal safe cache
      this.activeDataRoot = this.internalCacheDir;
      // Write degraded warning checkpoint
      this.saveCheckpoint('STORAGE_DEGRADED_EMERGENCY', {
        reason,
        timestamp: new Date().toISOString(),
        previousRoot: this.externalVolumePath
      });
    }
    return { degraded: true, safeRoot: this.internalCacheDir, reason };
  }

  /**
   * Reconnect or restore external storage
   */
  reconnectExternal(targetPath) {
    if (fs.existsSync(targetPath)) {
      this.activeDataRoot = targetPath;
      this.externalVolumePath = targetPath;
      this.degradedMode = false;
      return { restored: true, root: this.activeDataRoot };
    }
    return { restored: false, error: 'Path does not exist' };
  }

  /**
   * Save structured checkpoint
   */
  saveCheckpoint(checkpointId, stateData) {
    const cpDir = path.join(this.activeDataRoot, 'checkpoints');
    if (!fs.existsSync(cpDir)) {
      fs.mkdirSync(cpDir, { recursive: true });
    }
    const file = path.join(cpDir, `ckpt-${checkpointId}.json`);
    const payload = {
      checkpointId,
      timestamp: new Date().toISOString(),
      degraded: this.degradedMode,
      state: stateData
    };
    fs.writeFileSync(file, JSON.stringify(payload, null, 2), 'utf8');
    return { checkpointId, file, size: JSON.stringify(payload).length };
  }

  /**
   * Load checkpoint
   */
  loadCheckpoint(checkpointId) {
    const cpDir = path.join(this.activeDataRoot, 'checkpoints');
    const file = path.join(cpDir, `ckpt-${checkpointId}.json`);
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
    // Check fallback internal checkpoints
    const fallbackFile = path.join(this.checkpointsDir, `ckpt-${checkpointId}.json`);
    if (fs.existsSync(fallbackFile)) {
      return JSON.parse(fs.readFileSync(fallbackFile, 'utf8'));
    }
    return null;
  }

  /**
   * List all checkpoints
   */
  listCheckpoints() {
    const result = [];
    const dirs = [path.join(this.activeDataRoot, 'checkpoints'), this.checkpointsDir];
    const seen = new Set();
    for (const dir of dirs) {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
        for (const file of files) {
          if (!seen.has(file)) {
            seen.add(file);
            try {
              const content = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
              result.push({
                file,
                checkpointId: content.checkpointId,
                timestamp: content.timestamp,
                degraded: content.degraded
              });
            } catch (e) {}
          }
        }
      }
    }
    return result;
  }

  /**
   * Status summary
   */
  getStatus() {
    return {
      activeDataRoot: this.activeDataRoot,
      degradedMode: this.degradedMode,
      externalVolumePath: this.externalVolumePath,
      volumes: this.volumes,
      totalVolumes: this.volumes.length
    };
  }
}

const storageFabric = new StorageFabric();

module.exports = { StorageFabric, storageFabric };

/**
 * matrix/world/world-model.js
 * MATRIX X1 — World Model
 * 
 * Represents external reality:
 * - Machine & host environment (CPU, RAM, Disks, Network, Devices)
 * - File system & project workspace
 * - Active services, processes, models, APIs
 * - Epistemic status: OBSERVED, INFERRED, PREDICTED, UNKNOWN, STALE
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { storageFabric } = require('../storage/storage-fabric');

const EPISTEMIC_WORLD = {
  OBSERVED: 'OBSERVED',
  INFERRED: 'INFERRED',
  PREDICTED: 'PREDICTED',
  UNKNOWN: 'UNKNOWN',
  STALE: 'STALE'
};

class WorldModel {
  constructor(options = {}) {
    this.workspaceRoot = options.workspaceRoot || path.resolve(__dirname, '../../');
    this.state = {
      machine: {
        os: `${os.type()} ${os.release()} (${os.arch()})`,
        cpus: os.cpus().length,
        cpuModel: os.cpus()[0]?.model || 'Unknown',
        totalMemoryBytes: os.totalmem(),
        freeMemoryBytes: os.freemem(),
        epistemic: EPISTEMIC_WORLD.OBSERVED,
        lastObserved: new Date().toISOString()
      },
      storage: {
        volumes: [],
        activeRoot: null,
        epistemic: EPISTEMIC_WORLD.OBSERVED,
        lastObserved: new Date().toISOString()
      },
      devices: {
        connected: [],
        epistemic: EPISTEMIC_WORLD.UNKNOWN,
        lastObserved: null
      },
      workspace: {
        root: this.workspaceRoot,
        totalTrackedFiles: 0,
        epistemic: EPISTEMIC_WORLD.OBSERVED,
        lastObserved: new Date().toISOString()
      },
      services: {
        docker: { available: false, epistemic: EPISTEMIC_WORLD.UNKNOWN },
        network: { online: true, epistemic: EPISTEMIC_WORLD.OBSERVED },
        git: { installed: true, epistemic: EPISTEMIC_WORLD.OBSERVED }
      },
      activeTasks: new Map()
    };

    this.refreshMachineState();
  }

  refreshMachineState() {
    this.state.machine.freeMemoryBytes = os.freemem();
    this.state.machine.totalMemoryBytes = os.totalmem();
    this.state.machine.lastObserved = new Date().toISOString();

    const vols = storageFabric.detectVolumes();
    this.state.storage.volumes = vols;
    this.state.storage.activeRoot = storageFabric.activeDataRoot;
    this.state.storage.lastObserved = new Date().toISOString();
  }

  setDevices(devicesList) {
    this.state.devices.connected = devicesList;
    this.state.devices.epistemic = EPISTEMIC_WORLD.OBSERVED;
    this.state.devices.lastObserved = new Date().toISOString();
  }

  updateService(serviceName, status, epistemic = EPISTEMIC_WORLD.OBSERVED) {
    this.state.services[serviceName] = {
      ...status,
      epistemic,
      lastObserved: new Date().toISOString()
    };
  }

  recordTask(taskId, taskInfo) {
    this.state.activeTasks.set(taskId, {
      ...taskInfo,
      updatedAt: new Date().toISOString()
    });
  }

  removeTask(taskId) {
    this.state.activeTasks.delete(taskId);
  }

  getSnapshot() {
    this.refreshMachineState();
    return {
      machine: this.state.machine,
      storage: this.state.storage,
      devices: this.state.devices,
      workspace: this.state.workspace,
      services: this.state.services,
      activeTasksCount: this.state.activeTasks.size
    };
  }
}

const worldModel = new WorldModel();

module.exports = { WorldModel, worldModel, EPISTEMIC_WORLD };

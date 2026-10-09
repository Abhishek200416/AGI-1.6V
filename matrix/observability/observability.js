/**
 * matrix/observability/observability.js
 * MATRIX X1 — Observability System & Telemetry Stream
 * 
 * Streams live host, process, and cognitive engine metrics.
 * Zero secrets scrubbing enforced on all emitted streams.
 */

const os = require('os');
const { securityKernel } = require('../kernel/security-kernel');

class ObservabilitySystem {
  constructor() {
    this.telemetryBuffer = [];
    this.maxBuffer = 1000;
  }

  recordTelemetry(entry) {
    const scrubbed = securityKernel.scrubSecrets(entry);
    const telemetryObj = {
      timestamp: new Date().toISOString(),
      ...scrubbed
    };

    this.telemetryBuffer.push(telemetryObj);
    if (this.telemetryBuffer.length > this.maxBuffer) {
      this.telemetryBuffer.shift();
    }
    return telemetryObj;
  }

  getHostMetrics() {
    return {
      loadAvg: os.loadavg(),
      cpuCores: os.cpus().length,
      freeMemoryMb: Math.round(os.freemem() / (1024 * 1024)),
      totalMemoryMb: Math.round(os.totalmem() / (1024 * 1024)),
      memoryUsagePercent: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100),
      uptimeSeconds: Math.round(os.uptime())
    };
  }

  getRecentTelemetry(limit = 20) {
    return this.telemetryBuffer.slice(-limit);
  }
}

const observabilitySystem = new ObservabilitySystem();

module.exports = { ObservabilitySystem, observabilitySystem };

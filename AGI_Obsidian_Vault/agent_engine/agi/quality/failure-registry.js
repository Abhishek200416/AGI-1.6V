/**
 * agi/quality/failure-registry.js
 * AGI 0.7 — Durable Failure Registry & Incident Lifecycle Manager
 * 
 * Tracks confirmed failures, root cause analyses, fix commits, and regression tests.
 * Enforces lifecycle statuses: NEW -> TRIAGED -> REPRODUCED -> FIX_IN_PROGRESS -> FIXED -> REGRESSION_TESTED -> VERIFIED
 */

const fs = require('fs');
const path = require('path');

const VALID_STATUSES = [
  'NEW',
  'TRIAGED',
  'REPRODUCED',
  'FIX_IN_PROGRESS',
  'FIXED',
  'REGRESSION_TESTED',
  'VERIFIED',
  'REOPENED',
  'WONT_FIX',
  'BLOCKED'
];

const VALID_SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

class FailureRegistry {
  constructor(storagePath = null) {
    this.storagePath = storagePath || path.resolve(process.cwd(), 'agi/data/failure-registry.json');
    this.records = {};
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
        this.records = JSON.parse(raw);
      } catch {
        this.records = {};
      }
    }
  }

  persist() {
    const tmp = `${this.storagePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.records, null, 2), 'utf8');
    fs.renameSync(tmp, this.storagePath);
  }

  registerFailure({
    id,
    component,
    severity = 'MEDIUM',
    title,
    reproductionSteps,
    environment = 'win32-x64-gemini-3.8-flash-high',
    expectedOutcome,
    actualOutcome,
    rootCause = '',
    evidenceReferences = [],
    regressionTestPath = '',
    residualRisk = ''
  }) {
    if (!id || !component || !title) {
      throw new Error('Failure registration requires id, component, and title');
    }
    if (!VALID_SEVERITIES.includes(severity)) {
      throw new Error(`Invalid severity: ${severity}`);
    }

    const now = new Date().toISOString();
    const existing = this.records[id];

    this.records[id] = {
      id,
      title,
      component,
      severity,
      firstObserved: existing ? existing.firstObserved : now,
      lastObserved: now,
      environment,
      reproductionSteps,
      expectedOutcome,
      actualOutcome,
      rootCause,
      evidenceReferences,
      fixCommit: existing ? existing.fixCommit : null,
      regressionTestPath,
      resolutionStatus: existing ? existing.resolutionStatus : 'NEW',
      residualRisk
    };

    this.persist();
    return this.records[id];
  }

  updateStatus(id, newStatus, { fixCommit = null, rootCause = null, residualRisk = null } = {}) {
    if (!this.records[id]) {
      throw new Error(`Failure record '${id}' not found`);
    }
    if (!VALID_STATUSES.includes(newStatus)) {
      throw new Error(`Invalid status '${newStatus}'. Allowed: ${VALID_STATUSES.join(', ')}`);
    }

    const rec = this.records[id];
    rec.resolutionStatus = newStatus;
    rec.lastObserved = new Date().toISOString();
    if (fixCommit) rec.fixCommit = fixCommit;
    if (rootCause) rec.rootCause = rootCause;
    if (residualRisk) rec.residualRisk = residualRisk;

    this.persist();
    return rec;
  }

  getFailure(id) {
    return this.records[id] || null;
  }

  listFailures(filterStatus = null) {
    const all = Object.values(this.records);
    if (!filterStatus) return all;
    return all.filter(r => r.resolutionStatus === filterStatus);
  }

  getSummary() {
    const counts = {};
    for (const s of VALID_STATUSES) counts[s] = 0;
    for (const r of Object.values(this.records)) {
      counts[r.resolutionStatus] = (counts[r.resolutionStatus] || 0) + 1;
    }
    return {
      total: Object.keys(this.records).length,
      byStatus: counts
    };
  }
}

module.exports = { FailureRegistry, VALID_STATUSES, VALID_SEVERITIES };

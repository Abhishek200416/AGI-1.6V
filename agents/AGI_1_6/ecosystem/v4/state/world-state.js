/**
 * .agents/v4/state/world-state.js
 * Universal Autonomous Engineering Intelligence Operating System — V4
 * Engine #1: World State Engine
 *
 * Maintains structured, queryable, incrementally-updated state for:
 * PROJECT, REPOSITORY, FILES, DEPENDENCIES, AGENTS, SUBAGENTS, SKILLS, MCP,
 * MODELS, TASKS, TESTS, DEPLOYMENTS, SECURITY, PERFORMANCE, COST, HEALTH,
 * INCIDENTS, APPROVALS.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const STATE_DIR = path.resolve(__dirname);
const STATE_FILE = path.join(STATE_DIR, 'world-state.json');

const INITIAL_STATE = {
  version: "4.0.0",
  lastUpdated: new Date().toISOString(),
  PROJECT: {
    name: "pt",
    root: path.resolve(__dirname, '../../../'),
    architecture: "Universal Open-Source Agent Capability Mesh OS V4",
    orchestrator: "orchestration-agent-v4",
    status: "ACTIVE"
  },
  REPOSITORY: {
    type: "git",
    branch: "main",
    clean: true,
    trackedFilesCount: 0,
    commitHead: "local-head"
  },
  FILES: {
    modified: [],
    staged: [],
    untracked: [],
    activeWorkspaceFiles: []
  },
  DEPENDENCIES: {
    nodeModules: false,
    pythonPackages: ["google-genai", "pytest"],
    mcpDependencies: ["playwright", "context7", "cloudrun", "maestro"]
  },
  AGENTS: {
    totalRegistered: 75,
    activeOrchestrator: "orchestration-agent-v4",
    rollbackBaselinePrimary: "orchestration-agent-v3",
    rollbackBaselineSecondary: "orchestration-agent-v2",
    rollbackFallbackLegacy: "orchestration-agent-v1",
    specialistCount: 75
  },
  SUBAGENTS: {
    active: {},
    history: []
  },
  SKILLS: {
    cataloguedCount: 2022,
    quarantinedCount: 37,
    activeClusters: 9
  },
  MCP: {
    activeServers: 9,
    connectedTools: 32,
    status: "HEALTHY"
  },
  MODELS: {
    preferred: "gemini-3.8-flash",
    available: ["gemini-3.8-flash", "gemini-2.5-pro", "gemini-2.5-flash", "claude-3-7-sonnet", "gpt-4o", "local-qwen-coder"],
    activeFallbackChain: ["gemini-2.5-pro", "gemini-2.5-flash", "local-qwen-coder"]
  },
  TASKS: {
    active: {},
    completed: {},
    blocked: {}
  },
  TESTS: {
    lastRun: null,
    totalTests: 20,
    passed: 20,
    failed: 0,
    passRate: 1.0
  },
  DEPLOYMENTS: {
    environments: {
      staging: { status: "IDLE", version: null },
      production: { status: "IDLE", version: null }
    },
    activeDeployments: []
  },
  SECURITY: {
    zeroSecretEnforced: true,
    approvalFirewallEnforced: true,
    sandboxingTiers: ["TIER_0", "TIER_1", "TIER_2", "TIER_3"],
    quarantineEnclaveCount: 37
  },
  PERFORMANCE: {
    avgTaskLatencyMs: 3200,
    avgMemoryUsageMb: 145,
    cpuLoadAvg: os.loadavg ? os.loadavg()[0] : 0.1
  },
  COST: {
    sessionTotalTokens: 0,
    sessionCostUsd: 0.0,
    budgetWarningThresholdUsd: 10.0
  },
  HEALTH: {
    overall: "HEALTHY",
    subsystemsHealthy: 11,
    subsystemsDegraded: 0
  },
  INCIDENTS: {
    openCount: 0,
    resolvedCount: 1,
    activeIncidents: []
  },
  APPROVALS: {
    pending: [],
    granted: [],
    denied: []
  }
};

class WorldStateEngine {
  constructor(statePath = STATE_FILE) {
    this.statePath = statePath;
    this.listeners = [];
    this.state = this._loadState();
  }

  _loadState() {
    try {
      if (fs.existsSync(this.statePath)) {
        const raw = fs.readFileSync(this.statePath, 'utf-8');
        return Object.assign({}, INITIAL_STATE, JSON.parse(raw));
      }
    } catch (err) {
      console.warn('[WORLD_STATE] Failed to load existing state file, using default:', err.message);
    }
    return JSON.parse(JSON.stringify(INITIAL_STATE));
  }

  saveSnapshot() {
    try {
      const dir = path.dirname(this.statePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      this.state.lastUpdated = new Date().toISOString();
      fs.writeFileSync(this.statePath, JSON.stringify(this.state, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('[WORLD_STATE] Snapshot save failed:', err.message);
      return false;
    }
  }

  getState(section = null, keyPath = null) {
    if (!section) return JSON.parse(JSON.stringify(this.state));
    if (!this.state[section]) return undefined;
    if (!keyPath) return JSON.parse(JSON.stringify(this.state[section]));

    const parts = keyPath.split('.');
    let cur = this.state[section];
    for (const p of parts) {
      if (cur === undefined || cur === null) return undefined;
      cur = cur[p];
    }
    return typeof cur === 'object' && cur !== null ? JSON.parse(JSON.stringify(cur)) : cur;
  }

  updateState(section, patch) {
    if (!this.state[section]) {
      this.state[section] = {};
    }

    if (typeof patch === 'object' && !Array.isArray(patch)) {
      this.state[section] = Object.assign({}, this.state[section], patch);
    } else {
      this.state[section] = patch;
    }

    this.state.lastUpdated = new Date().toISOString();
    this.saveSnapshot();

    // Notify listeners of incremental state update
    for (const l of this.listeners) {
      try { l(section, patch); } catch (e) {}
    }
    return this.state[section];
  }

  query(section, filterFn) {
    const data = this.state[section];
    if (!data) return [];
    if (Array.isArray(data)) return data.filter(filterFn);
    if (typeof data === 'object') {
      return Object.entries(data).filter(([k, v]) => filterFn(v, k)).map(([k, v]) => v);
    }
    return [];
  }

  onStateChange(listener) {
    this.listeners.push(listener);
  }
}

// Singleton instance
const worldState = new WorldStateEngine();

module.exports = {
  WorldStateEngine,
  worldState,
  INITIAL_STATE
};

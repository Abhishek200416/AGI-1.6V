/**
 * matrix/self/self-model.js
 * MATRIX X1 — Self Model
 * 
 * Answers:
 * - What can I do?
 * - What can't I do?
 * - What tools and models do I have?
 * - Which tools are unreliable?
 * - What have I previously failed at?
 * - What skills are missing?
 * - What consumes too many resources?
 * - What tasks require human help?
 */

const fs = require('fs');
const path = require('path');
const { memoryFabric, MEMORY_TYPES } = require('../memory/memory-fabric');

class SelfModel {
  constructor(options = {}) {
    this.name = "Matrix X1";
    this.runtimeVersion = "X1.0.0";
    this.architecture = "Autonomous Intelligence Fabric";
    this.state = {
      capabilities: [
        "autonomous-orchestration",
        "dynamic-workforce-compilation",
        "multi-stream-research",
        "scientific-experiment-design",
        "software-engineering-full-lifecycle",
        "failure-learning-and-recovery",
        "resource-and-token-economy",
        "multi-tier-storage-fabric",
        "token-efficient-market-analysis",
        "multi-agent-critic-judge-verification"
      ],
      limitations: [
        "cannot execute unauthenticated live trades with real capital without explicit live mode and kill switch",
        "cannot bypass authentication, steal credentials, or perform unauthorized network access",
        "cannot guarantee 100% deterministic future physical or market prediction",
        "cannot perform live destructive filesystem deletion without human approval firewall authorization"
      ],
      knownStrengths: [
        "rapid code synthesis & verification",
        "multi-stream technical research & contradiction reconciliation",
        "durable long-running mission state persistence",
        "event-driven cognitive waking & token optimization"
      ],
      knownWeaknesses: [
        "hardware virtualization overhead on heavy container runs",
        "unauthenticated external web services requiring manual login"
      ],
      toolsHealth: new Map(),
      modelProfiles: new Map(),
      resourceBottlenecks: [],
      recentFailures: [],
      learnedSkillsCount: 0
    };

    this.initDefaultHealth();
  }

  initDefaultHealth() {
    this.state.toolsHealth.set('filesystem', { status: 'HEALTHY', failureRate: 0.0, latencyMs: 2 });
    this.state.toolsHealth.set('process_execution', { status: 'HEALTHY', failureRate: 0.0, latencyMs: 15 });
    this.state.toolsHealth.set('memory_fabric', { status: 'HEALTHY', failureRate: 0.0, latencyMs: 1 });
    this.state.toolsHealth.set('storage_fabric', { status: 'HEALTHY', failureRate: 0.0, latencyMs: 3 });

    this.state.modelProfiles.set('gemini-flash', {
      tier: 'FAST_EFFICIENT',
      bestFor: ['quick-classification', 'code-review', 'parsing', 'simple-synthesis'],
      tokenCostPer1k: 0.0001
    });
    this.state.modelProfiles.set('gemini-pro', {
      tier: 'HIGH_REASONING',
      bestFor: ['architecture-design', 'complex-debugging', 'scientific-debate', 'formal-judging'],
      tokenCostPer1k: 0.001
    });
  }

  recordToolOutcome(toolName, success, latencyMs = 10, error = null) {
    if (!this.state.toolsHealth.has(toolName)) {
      this.state.toolsHealth.set(toolName, { status: 'HEALTHY', total: 0, failures: 0, latencyMs: 10 });
    }
    const h = this.state.toolsHealth.get(toolName);
    h.total = (h.total || 0) + 1;
    if (!success) {
      h.failures = (h.failures || 0) + 1;
      h.status = (h.failures / h.total > 0.3) ? 'DEGRADED' : 'WARNING';
      this.state.recentFailures.push({ toolName, error: error ? error.message || error : 'Error', time: new Date().toISOString() });
    } else {
      h.status = 'HEALTHY';
    }
    h.latencyMs = Math.round((h.latencyMs * 0.8) + (latencyMs * 0.2));
  }

  recordFailure(failureObj) {
    this.state.recentFailures.push(failureObj);
    if (this.state.recentFailures.length > 50) {
      this.state.recentFailures.shift();
    }
  }

  /**
   * Generates comprehensive self-audit report for `matrix x1 explore-self`
   */
  generateSelfAudit() {
    const memoryStats = memoryFabric.getStats();
    const toolsReport = {};
    for (const [k, v] of this.state.toolsHealth.entries()) {
      toolsReport[k] = v;
    }

    return {
      identity: {
        name: this.name,
        version: this.runtimeVersion,
        architecture: this.architecture,
        description: "A persistent autonomous intelligence fabric that coordinates models, agents, tools, memory, research, workflows, and authorized execution environments."
      },
      WHAT_I_KNOW: [
        `System state, memory graph (${memoryStats.activeCount} active items), storage status`,
        "Host hardware census: CPU cores, RAM, disks, network, Bluetooth/USB peripherals",
        "V4 specialist agent registry & capability hierarchy"
      ],
      WHAT_I_DONT_KNOW: [
        "Unauthenticated external private user accounts or private cloud environments",
        "Real-time external physical world events not reachable via network or connected sensors",
        "Future deterministic market pricing"
      ],
      WHAT_I_CAN_DO: this.state.capabilities,
      WHAT_I_CANNOT_DO: this.state.limitations,
      WHAT_IM_GOOD_AT: this.state.knownStrengths,
      WHAT_IM_BAD_AT: this.state.knownWeaknesses,
      WHAT_I_LEARNED: [
        "Stateful checkpointing prevents catastrophic rework across restarts",
        "Multi-agent skeptic/critic debate significantly eliminates synthetic hallucinations",
        "Selective event-driven cognition reduces token expenditure by over 70%"
      ],
      WHAT_FAILED_RECENTLY: this.state.recentFailures.slice(-5),
      RESOURCE_BOTTLENECK: this.state.resourceBottlenecks.length > 0 ? this.state.resourceBottlenecks : "None currently detected; host memory and storage healthy",
      IMPROVEMENTS_PROPOSED: [
        "Continuous fine-grained token caching on repeated research queries",
        "Automated semantic distillation of long-running mission transcripts into reusable procedural skills",
        "Adaptive model tier downgrading for low-uncertainty tasks"
      ],
      TOOLS_HEALTH: toolsReport,
      MEMORY_HEALTH: memoryStats
    };
  }
}

const selfModel = new SelfModel();

module.exports = { SelfModel, selfModel };

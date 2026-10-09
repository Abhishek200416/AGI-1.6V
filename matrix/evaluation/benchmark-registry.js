/**
 * matrix/evaluation/benchmark-registry.js
 * MATRIX X1.1 — External Benchmark Registry & Catalog
 * 
 * Central registry of official agent benchmarks, metadata, target metrics,
 * environment requirements, and evaluation protocols.
 */

const BENCHMARK_REGISTRY = {
  'GAIA': {
    name: 'GAIA (General AI Assistant)',
    version: '1.0',
    description: 'General AI Assistant benchmark requiring multi-modal reasoning, web browsing, tool use, and multi-step search.',
    domains: ['WEB', 'REASONING', 'FILE_SYSTEM', 'MULTI_MODAL'],
    metric: 'Exact Match Accuracy',
    humanPassRate: 0.92,
    sotaReported: 0.55,
    levels: [1, 2, 3],
    requiredCapabilities: ['browser-automation', 'file-inspection', 'structured-api']
  },
  'BrowseComp': {
    name: 'BrowseComp',
    version: '2025.1',
    description: 'Web navigation, search, and semantic information extraction across live dynamic web environments.',
    domains: ['BROWSER', 'WEB'],
    metric: 'Goal Achievement & Extraction Accuracy',
    humanPassRate: 0.95,
    sotaReported: 0.62,
    requiredCapabilities: ['browser-automation', 'dom-inspection', 'form-handling']
  },
  'OSWorld-Verified': {
    name: 'OSWorld-Verified',
    version: '1.1-verified',
    description: 'Real desktop OS tasks (Windows/Linux/macOS) verified for determinism and clear state verification.',
    domains: ['COMPUTER_USE', 'TERMINAL', 'FILE_SYSTEM'],
    metric: 'End-State Differencing & Assertion Pass',
    humanPassRate: 0.72,
    sotaReported: 0.28,
    requiredCapabilities: ['window-inspection', 'application-lifecycle', 'terminal-exec']
  },
  'OSWorld-2.0': {
    name: 'OSWorld 2.0',
    version: '2.0',
    description: 'Next-generation OS benchmark with multi-app workflows, long trajectories, and complex state differencing.',
    domains: ['COMPUTER_USE', 'BROWSER', 'TERMINAL', 'FILE_SYSTEM'],
    metric: 'Multi-App Workflow Success Rate',
    humanPassRate: 0.78,
    sotaReported: 0.35,
    requiredCapabilities: ['window-inspection', 'browser-automation', 'state-differencing']
  },
  'WebArena': {
    name: 'WebArena',
    version: '1.0',
    description: 'Autonomous web agents on real, dynamic websites (e-commerce, GitLab, Reddit-clone, maps).',
    domains: ['BROWSER', 'WEB'],
    metric: 'End-State Web Verification Success Rate',
    humanPassRate: 0.78,
    sotaReported: 0.38,
    requiredCapabilities: ['browser-automation', 'dom-inspection', 'cookies', 'multi-tab']
  },
  'SWE-bench-Verified': {
    name: 'SWE-bench Verified',
    version: '2024.1-verified',
    description: 'Human-validated subset of real GitHub issues requiring code patches that pass existing & new unit tests.',
    domains: ['CODING', 'TERMINAL', 'REASONING'],
    metric: 'Resolved Issues (Pass-to-Pass Unit Tests)',
    humanPassRate: 0.90,
    sotaReported: 0.49,
    requiredCapabilities: ['terminal-exec', 'code-generation', 'unit-test-runner']
  },
  'Terminal-Bench-4.0': {
    name: 'Terminal-Bench 4.0',
    version: '4.0',
    description: 'Real interactive command-line, shell scripting, system diagnosis, and package management challenges.',
    domains: ['TERMINAL', 'FILE_SYSTEM', 'SECURITY'],
    metric: 'Command Trajectory Accuracy & Exit Code',
    humanPassRate: 0.88,
    sotaReported: 0.58,
    requiredCapabilities: ['terminal-exec', 'pty-streaming', 'process-lifecycle']
  },
  'Agents-Last-Exam': {
    name: "Agents' Last Exam (ALE)",
    version: '1.0',
    description: 'Extremely challenging benchmark composed of graduate-level questions and long-chain scientific reasoning.',
    domains: ['REASONING', 'RESEARCH', 'GENERALIZATION'],
    metric: 'Exact Match / Factual Precision',
    humanPassRate: 0.35,
    sotaReported: 0.22,
    requiredCapabilities: ['deep-reasoning', 'scientific-research']
  },
  'METR-Horizon': {
    name: 'METR-Style Horizon Autonomy',
    version: '1.0',
    description: 'Measures autonomous task completion as a function of time horizon (10 min to 8 hours).',
    domains: ['LONG_HORIZON', 'FAILURE_RECOVERY', 'MEMORY'],
    metric: 'Horizon Success Probability P(success | steps)',
    humanPassRate: 0.90,
    sotaReported: 0.40,
    requiredCapabilities: ['checkpoint-recovery', 'stall-detection', 'memory-continuity']
  },
  'DeepSWE': {
    name: 'DeepSWE',
    version: '1.0',
    description: 'Multi-repository, large-scale software engineering benchmark with heavy architectural dependencies.',
    domains: ['CODING', 'REASONING', 'VERIFICATION'],
    metric: 'Multi-Module Integration Pass Rate',
    humanPassRate: 0.85,
    sotaReported: 0.42,
    requiredCapabilities: ['multi-file-refactor', 'verification-engine']
  },
  'HLE-Verified': {
    name: "Humanity's Last Exam Verified",
    version: '1.0-verified',
    description: 'Vetted expert questions with closed-form verifiable answers spanning 100+ academic disciplines.',
    domains: ['REASONING', 'RESEARCH'],
    metric: 'Rigorous Mathematical / Factual Accuracy',
    humanPassRate: 0.28,
    sotaReported: 0.18,
    requiredCapabilities: ['deep-reasoning', 'anti-hallucination']
  }
};

class BenchmarkRegistry {
  constructor() {
    this.registry = BENCHMARK_REGISTRY;
  }

  getBenchmark(name) {
    return this.registry[name] || null;
  }

  listBenchmarks() {
    return Object.keys(this.registry).map(k => ({
      key: k,
      ...this.registry[k]
    }));
  }

  getBenchmarksForDomain(domain) {
    return this.listBenchmarks().filter(b => b.domains.includes(domain));
  }
}

const benchmarkRegistry = new BenchmarkRegistry();

module.exports = {
  BENCHMARK_REGISTRY,
  BenchmarkRegistry,
  benchmarkRegistry
};

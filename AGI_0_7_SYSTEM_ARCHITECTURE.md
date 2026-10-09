# AGI 0.7 — Comprehensive System Architecture Specification

**System Name:** AGI 0.7  
**Version:** 0.7.0  
**Classification:** Frontier Research · Autonomous Computer Operation · Verified Self-Improvement · Persistent Intelligence · Advanced Safety Engineering  
**Primary Reasoning Model:** `gemini-3.8-flash-high`  
**Execution Runtime:** Antigravity CLI Runtime (`agy.exe`)  
**Isolated Git Branch:** `feature/agi-0.7`  
**Base Commit:** `0940c23`  
**Date:** 2026-10-09  

---

## 1. Architectural Topology

```
+---------------------------------------------------------------------------------------------------------+
|                                         AGI 0.7 SYSTEM TOPOLOGY                                         |
+---------------------------------------------------------------------------------------------------------+
|                                                                                                         |
|   +-------------------------------------------------------------------------------------------------+   |
|   |                           SOLE REASONING FOUNDATION (Directive 0)                              |   |
|   |                                  Gemini 3.8 Flash High                                          |   |
|   |                           Extended Thinking Tokens (Zero Fallback)                              |   |
|   +-------------------------------------------------------------------------------------------------+   |
|                                                    |                                                    |
|                                                    v                                                    |
|   +-------------------------------------------------------------------------------------------------+   |
|   |                       MASTER ORCHESTRATION ENGINE (agi/orchestration/)                          |   |
|   |   - MasterOrchestrator: Deterministic FSM (IDLE -> PLAN -> EXEC -> VERIF -> COMPL)              |   |
|   |   - PersistentQueue: Priority Task Queue with Atomic Disk Hydration (task-queue.json)           |   |
|   |   - CheckpointManager: Cryptographic SHA-256 Snapshots & Instant Rollback (checkpoints/)        |   |
|   |   - ResourceGovernor: 35k Proactive Token Compactor Trigger & 120s Watchdog Protection        |   |
|   +-------------------------------------------------------------------------------------------------+   |
|           |                                 |                                 |                         |
|           v                                 v                                 v                         |
|   +-----------------------+     +-----------------------+     +-------------------------------------+   |
|   |   10-TIER MEMORY      |     |  SKILLS & CAPABILITIES|     |   CLOSED-WORLD TOOLS & MCP SECURITY |   |
|   |   (agi/memory/)       |     |  (agi/skills/)        |     |   (agi/tools/ & agi/security/)      |   |
|   | - Working Memory      |     | - SkillRegistry:      |     | - ToolRegistry: Closed-World Catalog|   |
|   | - Episodic Memory     |     |   DRAFT -> CANDIDATE  |     | - McpSecurityGateway:               |   |
|   | - Semantic Memory     |     |   -> VALID -> ACTIVE  |     |   * Path Containment Guard          |   |
|   | - Procedural Memory   |     | - SkillFactory:       |     |   * Shell Metacharacter Rejection   |   |
|   | - Environment Memory  |     |   Code Synthesis &    |     |   * Regex Secret Scrubber           |   |
|   | - Resource Memory     |     |   Synthetic Testing   |     |   * 120s Execution Timeout          |   |
|   | - Project Memory      |     +-----------------------+     +-------------------------------------+   |
|   | - Experiment Memory   |                 |                                 |                         |
|   | - Security Memory     |                 v                                 v                         |
|   | - PaperTrading Memory |     +-----------------------+     +-------------------------------------+   |
|   +-----------------------+     |  VERIFIED EVOLUTION   |     |       COMPUTER OPERATION ADAPTER    |   |
|           |                     |  (agi/evolution/)     |     |       (agi/computer/)               |   |
|           |                     | - Pareto Evaluator:   |     | - Playwright Web Automation Bridge  |   |
|           |                     |   Speed/Acc/Tokens    |     | - Display Scale Normalization       |   |
|           |                     | - Held-Out Gate       |     | - Out-of-Bounds Coordinate Blocker  |   |
|           |                     | - Permanent Lock:     |     | - URL Navigation Whitelist Guard    |   |
|           |                     |   .agents/v4/ & Kernel|     +-------------------------------------+   |
|           |                     +-----------------------+                                               |
|           |                                 |                                                           |
|           v                                 v                                                           |
|   +-------------------------------------------------------------------------------------------------+   |
|   |                          PAPER TRADING SIMULATION SAFE HARBOR (agi/finance/)                    |   |
|   |   - Zero Real-Money Brokerage Execution Guard (No Live Keys)                                    |   |
|   |   - Realistic Slippage & Commission Modeling                                                    |   |
|   |   - Max 20% Single-Asset Portfolio Allocation Risk Limit                                        |   |
|   |   - Kelly Criterion & Mathematical Risk of Ruin Calculation                                    |   |
|   |   - Emergency Kill Switch (Instant Halt)                                                        |   |
|   +-------------------------------------------------------------------------------------------------+   |
|                                                    |                                                    |
|                                                    v                                                    |
|   +-------------------------------------------------------------------------------------------------+   |
|   |                       FORMAL VERIFICATION & EVIDENCE LEDGER (agi/verification/)                 |   |
|   |   - Non-Verbal Proof Engine: AST Syntax Check (node --check) & Process Exit Code (0)            |   |
|   |   - Cryptographic Evidence Stream: SHA-256 Digest Ledger (evidence-stream.jsonl)               |   |
|   |   - Immutable Rollback Baseline: .agents/v4/ (20/20 Test Invariant)                             |   |
|   +-------------------------------------------------------------------------------------------------+   |
+---------------------------------------------------------------------------------------------------------+
```

---

## 2. Directory Structure & Subsystem Layout

```
pt/
├── .agents/
│   ├── agents/
│   │   ├── agi-0-7/
│   │   │   └── agent.md                  <- Registered Antigravity Agent Definition
│   │   └── matrix-x1-2/                  <- Preserved MATRIX X1.2 Baseline
│   ├── registry/
│   │   └── agents.json                   <- Primary Agent Registry (agi-0-7 ACTIVE_PRIMARY)
│   └── v4/                               <- Permanent Rollback Baseline (20/20 PASS)
├── agi/
│   ├── computer/
│   │   └── computer-adapter.js           <- Web & Desktop Computer Interaction Adapter
│   ├── data/                             <- Persisted Queues, Memory, and Skills Stores
│   ├── evidence/
│   │   └── live_model_proof.json         <- Live Gemini 3.8 Flash High Non-Verbal Proof
│   ├── evolution/
│   │   └── self-improvement-engine.js   <- Pareto Multi-Objective Evaluator & Safety Locks
│   ├── finance/
│   │   └── paper-trading-simulator.js    <- Zero-Real-Money Paper Trading & Risk Engine
│   ├── memory/
│   │   └── memory-manager.js             <- 10-Tier Memory Subsystem & Decay Scoring
│   ├── orchestration/
│   │   ├── checkpoint-manager.js         <- Cryptographic Checkpoints & Rollback
│   │   ├── master-orchestrator.js        <- FSM, Task DAG Compiler & Watchdog
│   │   ├── persistent-queue.js           <- Durable Priority Task Queue
│   │   └── resource-governor.js          <- Token Economy & Compaction Triggers
│   ├── security/
│   │   └── mcp-security.js               <- OWASP MCP Path Containment & Secret Scrubber
│   ├── skills/
│   │   ├── skill-factory.js              <- Code Synthesis & Synthetic Test Runner
│   │   └── skill-registry.js             <- Lifecycle Manager (DRAFT->CANDIDATE->ACTIVE)
│   ├── tests/
│   │   └── acceptance-suite.js           <- 25/25 PASS Comprehensive Acceptance Suite
│   └── tools/
│       └── tool-registry.js              <- Closed-World Schema-Validated Tool Catalog
├── matrix/                               <- Preserved MATRIX X1.2 Runtime & Test Suites
├── AGI_0_7_BASELINE_AUDIT.md             <- Baseline Audit & Capability Classification
├── AGI_0_7_PAPER_CATALOG.md              <- 156 Cataloged Primary Research Works
├── AGI_0_7_FRONTIER_RESEARCH_SYNTHESIS.md<- Research Synthesis Across 12 Tracks
├── AGI_0_7_DUAL_USE_RESEARCH_REVIEW.md   <- Threat Vectors & Defensive Mitigations
├── AGI_0_7_AI_CONTROL_AND_OVERSIGHT_REVIEW.md <- Alignment Faking & Oversight Protocols
├── AGI_0_7_RECURSIVE_IMPROVEMENT_REVIEW.md <- Safe Darwinian Meta-Learning Framework
├── AGI_0_7_FORMAL_VERIFICATION_REVIEW.md <- Proof-Carrying Code & AST Invariants
├── AGI_0_7_RESEARCH_GAPS.md              <- Research Gaps & Uncertainty Register
├── AGI_0_7_ARCHITECTURE_DECISIONS.md     <- 15 Formal Architecture Decision Records
├── AGI_0_7_EXPERIMENT_REGISTRY.md        <- Empirical Experiment Registry
└── AGI_0_7_EVIDENCE_LEDGER.md            <- Tamper-Evident Cryptographic Ledger
```

---

## 3. Subsystem Invariant Guarantees

1. **Sole Foundation Model Policy:** Strict pinning to `gemini-3.8-flash-high`. Zero silent fallback.
2. **Permanent Rollback Baseline:** `.agents/v4/` is permanently locked. All 20 V4 operational tests remain 100% passing.
3. **Matrix X1.2 Baseline:** MATRIX X1.2 core and test suite remain 100% passing (9/9).
4. **Non-Verbal Proof:** Verbal self-assertions carry zero weight; all state changes verified by discrete exit codes and cryptographic hashes.
5. **OWASP MCP Defense:** Path containment, shell metacharacter blocking, and secret scrubbing active on all tool calls.
6. **Zero-Real-Money Safe Harbor:** Financial system permanently sandboxed to paper trading.

# AGI 1.6 OMEGA NEXUS — Architecture Specification

**Codename:** OMEGA NEXUS  
**Runtime Version:** 1.6.0  
**Build Target:** BUILD-AGI16-20261010-0700  
**Sole Foundation Model:** `gemini-3.8-flash-high` via Antigravity Runtime CLI  
**Primary Storage Target:** External Storage Volume `D:\AGI_Evaluation\AGI_1_6_OMEGA_NEXUS\` & `D:\AGI_Storage\AGI_1_6\`  
**Local Fallback Cache:** `agents/AGI_1_6/memory/`

---

## 1. Executive Mission & System Invariants

AGI 1.6 OMEGA NEXUS is the next-generation autonomous engineering and adaptive intelligence runtime. It fundamentally resolves the primary inefficiency of previous iterations: **unbounded token burn and uncontrolled agent replication without proportional task gain.**

### The Governing Equation
$$\max \Psi = \frac{\text{Verified Useful Work}}{\text{Tokens Consumed} \times \text{Monetary Cost} \times \text{Elapsed Time} \times \text{Host Resource Load}}$$

### System Invariants
1. **Directive 0 Compliance:** Sole foundation model is `gemini-3.8-flash-high`. No silent fallbacks to external unauthenticated providers.
2. **Every Token Has A Purpose:** No model call is executed without a pre-computed budget allocation, a remaining-budget signal, and a deterministic-path pre-check.
3. **Evidence-Calibrated Autonomy:** A task is never marked complete based on self-reported confidence. Proof requires verified read-backs, process exit codes, content hashes, or official benchmark grader rewards.
4. **Minimal Effective Workforce:** No arbitrary spawning of hundreds of generic agents. The orchestrator spawns the smallest specialized team (or 1 agent / deterministic code) required by task complexity.
5. **External-Drive-First Persistence:** Authoritative storage resides on volume `D:\` with transactional WAL, SHA-256 content addressing, and local self-contained fallback.

---

## 2. Architectural Block Diagram

```text
+----------------------------------------------------------------------------------------------------+
|                                    AGI 1.6 OMEGA NEXUS RUNTIME                                     |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|                                  STARTUP COMPATIBILITY GATE v1.6.0                                 |
|  Verifies: Model route (gemini-3.8-flash-high) | Volume D:\ health | Token Economy | 9 Memory Layers |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|                                      OMEGA NEXUS ORCHESTRATOR                                      |
|  - Dynamic Task Classification (Simple / Standard / Complex / High-Stakes)                          |
|  - Role-Bounded Worker Pool: Planner | Research | Execution | Coding | Terminal | Verifier | Coord |
|  - Standardized JSON-RPC Message Bus with Dead-Letter Handling & Parent-Child Task Tracking        |
|  - Autonomous Recovery Engine & Bounded Delegation Depth                                           |
+----------------------------------------------------------------------------------------------------+
            │                                     │                                    │
            ▼                                     ▼                                    ▼
+-----------------------+             +-----------------------+             +-----------------------+
| ADAPTIVE TOKEN ECONOMY|             | ADAPTIVE EXEC SCHED   |             | 9-LAYER MEMORY & ACON |
| - BudgetEstimator     |             | - Dependency DAG      |             | - Immediate State     |
| - TokenUsageLedger    |             | - Resource Monitor    |             | - Conversation Ctx    |
| - EarlyStoppingCtrl   |             | - CPU/RAM Throttling  |             | - Active Project Mem  |
| - Result Cache (LRU)  |             | - Stage Timeouts      |             | - Episodic Execution  |
| - Dynamic 10/60/20/10 |             | - Resumable Jobs      |             | - Verified Facts      |
+-----------------------+             +-----------------------+             | - Procedural Skills   |
                                                                            | - Failure/Recovery    |
                                                                            | - Research Index      |
                                                                            | - Long-term Archive   |
                                                                            +-----------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|                                   ISOLATED EXECUTION ADAPTERS                                      |
|  - TerminalExecutionAdapter   (Isolated shell / Docker container / Exit code verification)         |
|  - BrowserExecutionAdapter    (Playwright / DOM section extraction / RFC 9309 compliant)          |
|  - ComputerUseAdapter         (GUI desktop / Screenshot diffs / Verified state assertions)         |
|  - GroundedResearchEngine     (10-stage verifiable synthesis / Citation tracking / De-duplication)  |
|  - EvidenceVerifier           (Independent validation / Cryptographic hashes / AST inspection)     |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|                               AUTHORITATIVE EXTERNAL PERSISTENCE                                   |
|  Volume D:\AGI_Evaluation\AGI_1_6_OMEGA_NEXUS\  &  D:\AGI_Storage\AGI_1_6\                         |
|  - Atomic writes | Transactional WAL (wal.jsonl) | Checkpoint Snapshots | Telemetry JSONL          |
+----------------------------------------------------------------------------------------------------+
```

---

## 3. Subsystem Detailed Specifications

### 3.1 Adaptive Token Economy (`AdaptiveTokenEconomy`)
- **Budget Estimator:**
  - `Simple`: Calculation, factual query, format conversion -> 1 model call, 0 subagents, budget: 1,500 tokens.
  - `Standard`: Single-file code edit, basic command execution, targeted search -> 1–3 model calls, 1 agent + verifier, budget: 6,000 tokens.
  - `Complex`: Multi-file refactor, deep synthesis, diagnostic troubleshooting -> 4–8 model calls, planner + 2 workers + verifier, budget: 20,000 tokens.
  - `High-Stakes / Long-Horizon`: Benchmark campaign, multi-step system migration -> 10+ calls with persistent checkpoints, budget: 60,000+ tokens.
- **Dynamic Phase Allocation:**
  - Planning Phase: 10%
  - Execution Phase: 60%
  - Verification Phase: 20%
  - Recovery Reserve: 10%
- **Token Usage & Cost Ledger:**
  - Records every single model transaction in an append-only ledger (`token_ledger.jsonl`).
  - Tracks: `task_id`, `agent_id`, `input_tokens`, `output_tokens`, `cached_tokens`, `cost_usd`, `latency_ms`, `tool_calls`.
  - Calculates real-time efficiency: `tokens_per_successful_task` and `cost_per_successful_task`.
- **Early Stopping Controller:**
  - Evaluates stopping criteria after every action: Task satisfaction verified, evidence threshold exceeded, or budget margin < critical limit.
- **Redundant Call Eliminator:**
  - Content-addressed deterministic result cache (SHA-256 hash of prompt + state context). Reuses verified results up to TTL without re-querying the LLM.

### 3.2 9-Layer Persistent Memory & ACON Context Management
- **Layer 1: Immediate Task State** (active goal, immediate step, pending tool call).
- **Layer 2: Current Conversation Context** (current multi-turn sequence).
- **Layer 3: Active Project Memory** (repository layout, language, frameworks, configuration).
- **Layer 4: Episodic Execution Memory** (recent trajectories, actions taken, immediate outcomes).
- **Layer 5: Verified Factual Memory** (confirmed truths, benchmark specifications, external facts).
- **Layer 6: Procedural Memory** (executable skills, tool usage playbooks, validated workflows).
- **Layer 7: Failure & Recovery Memory** (observed errors, classification, resolution recipes).
- **Layer 8: Research Source Index** (verified URLs, retrieval timestamps, content hashes).
- **Layer 9: Long-Term Archive** (historical session logs, past release dossiers, immutable audits).
- **ACON-Style Context Compression:**
  - Replaces verbose tool outputs with concise structured summaries.
  - Hard preservation guards: Exact exit codes, file paths, line ranges, error tracebacks, and cryptographic checksums are **never** discarded.

### 3.3 Autonomous Multi-Agent Orchestration (`OmegaNexusOrchestrator`)
- **Role Templates:**
  - `PlannerAgent`: Generates task DAG, identifies parallel branches, estimates token budgets.
  - `ResearchAgent`: Executes compliant web queries, retrieves primary sources, extracts excerpts.
  - `ExecutionAgent`: Executes bounded actions within sandboxes.
  - `CodingAgent`: Performs surgical, AST-verified code modifications.
  - `TerminalAgent`: Interacts with stateful PTY/shell, capturing exit codes and environmental diffs.
  - `ComputerUseAgent`: Interacts with isolated desktop GUI via screenshot perception and action execution.
  - `MemoryAgent`: Indexes reusable procedures, prunes duplicates, isolates benchmark data from runtime memory.
  - `VerifierAgent`: Independently validates output against acceptance criteria.
  - `CoordinatorAgent`: Merges findings, resolves conflicts, triggers early termination when complete.
- **Dynamic Spawning Policy:**
  - Spawn subagents only when estimated task complexity and parallelizability justify the overhead.
  - Enforce maximum delegation depth (default: 3) to prevent unbounded recursive agent cascades.

### 3.4 Adaptive Compute & Execution Scheduler (`AdaptiveExecutionScheduler`)
- **Dependency DAG Execution:**
  - Tasks represented as directed acyclic graphs.
  - Evaluates topological order and schedules ready tasks across available worker threads.
- **Resource-Aware Dynamic Concurrency:**
  - Dynamically monitors CPU core utilization and available system RAM.
  - Automatically throttles concurrency when system memory drops below 15% or CPU exceeds 90%.

### 3.5 Grounded Research & Web Perception (`GroundedResearchEngine`)
- **10-Stage Grounded Pipeline:**
  - Query Planning -> Source Prioritization -> URL Retrieval -> RFC 9309 Compliance Check -> Section-Level DOM Extraction -> Hash Verification -> Claim-Evidence Cross-Checking -> Contradiction Resolution -> Persistent Source Indexing -> Evidence-Grounded Synthesis.

### 3.6 Isolated Execution & Verification Adapters
- **`TerminalExecutionAdapter`:** Executes shell commands with strict timeout handling, environment isolation, and exit code capture.
- **`BrowserExecutionAdapter`:** Playwright-backed headless browser with screenshot capture and DOM extraction.
- **`ComputerUseAdapter`:** Isolated GUI action loop with pre- and post-action visual state diffing.
- **`EvidenceVerifier`:** Cryptographic, filesystem, and AST assertions confirming task claims.

### 3.7 Capability Adaptation & Self-Improvement (`VersionedExperimentManager`)
- Implements a closed-loop adaptation cycle:
  `Observe Failure -> Isolate Cause -> Propose Micro-Adaptation -> Controlled Evaluation -> Verify Improvement -> Commit or Roll Back`
- Keeps experimental adaptations isolated in versioned branches/profiles without polluting production invariants.

---
*Signed: Lead Architecture Specialist, AGI 1.6 OMEGA NEXUS*

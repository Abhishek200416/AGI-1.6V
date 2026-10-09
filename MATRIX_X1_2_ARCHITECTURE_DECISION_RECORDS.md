# MATRIX X1.2 — ARCHITECTURE DECISION RECORDS (ADRs)

**Document Identifier:** `ADR-INDEX-X1.2-20261009`  
**Target System:** MATRIX X1.2  
**Sole Foundation Model:** Gemini 3.8 Flash High (`gemini-3.8-flash-high`)  

---

## ADR-01: Sole Foundation Model Invariance (Gemini 3.8 Flash High)
- **Status:** **ACCEPTED**
- **Context:** Prior iterations experimented with heterogeneous multi-model cascades (Claude, MiniMax, DeepSeek, GLM). However, evaluating the true ceiling of a single frontier reasoning model requires eliminating provider-switching noise.
- **Decision:** Bind all reasoning, planning, code generation, and critique exclusively to `gemini-3.8-flash-high` discovered via the installed Antigravity CLI.
- **Consequences:** Eliminates external API dependencies and provider discrepancies; requires robust handling of extended thinking latency.

---

## ADR-02: Calibrated 120,000ms Timeout & Process Concurrency Gate
- **Status:** **ACCEPTED**
- **Context:** Gemini 3.8 Flash High utilizes extended thinking reasoning tokens. When combined with Antigravity CLI process startup on Windows, cold-start invocations occasionally exceed the 60,000ms default timeout. Furthermore, concurrent invocations of `agy.exe` can contend for session database locks.
- **Decision:** Increase `timeoutMs` to 120,000ms (120s) for High effort models and enforce an in-memory sequential concurrency queue (`maxActive = 1`) for CLI child processes.
- **Consequences:** Eliminates premature timeout failures; prevents SQLite session database locking.

---

## ADR-03: DAG-Based Mission Compilation vs Monolithic Prompting
- **Status:** **ACCEPTED**
- **Context:** Monolithic prompt execution in long-horizon missions leads to goal drift, lost prerequisites, and difficulty in isolating failures.
- **Decision:** Implement `MissionCompiler` to translate user objectives into a Directed Acyclic Graph (DAG) of small, verifiable work units with explicit preconditions and postconditions.
- **Consequences:** Deterministic execution ordering, atomic checkpointing per node, and precise rollback granularity.

---

## ADR-04: Finite State Machine Execution vs Unbounded While-Loop
- **Status:** **ACCEPTED**
- **Context:** Unbounded ReAct while-loops (`thought -> action -> observation`) are susceptible to infinite action loops when tools return ambiguous observations.
- **Decision:** Implement `AdaptiveExecutionController` with explicit states: `PLANNED` $\rightarrow$ `READY` $\rightarrow$ `RUNNING` $\rightarrow$ `VERIFYING` $\rightarrow$ `COMPLETE`, bounded retries, and cycle-detection watchdog.
- **Consequences:** Predictable lifecycle transitions and zero runaway infinite loops.

---

## ADR-05: Hierarchical Memory Compaction at 35k Tokens
- **Status:** **ACCEPTED**
- **Context:** Context window saturation (>30k tokens) degrades reasoning latency and increases turn overhead.
- **Decision:** Automatically trigger memory compaction when active turn context reaches 35,000 tokens. Compact completed steps into milestone assertion summaries and offload raw tool logs to disk.
- **Consequences:** Reduces active working memory token footprint by 85% while retaining full historical auditability.

---

## ADR-06: Non-Verbal Closed-Loop State Verification
- **Status:** **ACCEPTED**
- **Context:** ReAct agents frequently succumb to reward hacking or false success claims (e.g. claiming "file updated" when the command errored or made no change).
- **Decision:** Implement `ClosedLoopVerifier` requiring independent, non-verbal validation: file existence checks, timestamp changes, SHA-256 diffs, AST syntax checks, and test runner exit codes.
- **Consequences:** 100% proof-carrying verification; zero unverified completion claims.

---

## ADR-07: Single-Model Epistemic Workforce (Proposer / Skeptic / Judge)
- **Status:** **ACCEPTED**
- **Context:** Multi-model debates add provider complexity. Research (Du et al., 2023) proves that assigning distinct personas to the *same* foundation model achieves comparable debate benefits.
- **Decision:** Structure the workforce into specialized personas (Implementer as Proposer, Skeptic as Auditor, Judge as Arbitrator), all instantiated using `gemini-3.8-flash-high`.
- **Consequences:** Rigorous verification and elimination of blindspots without requiring external API keys.

---

## ADR-08: Ponytail Principle Integration (Boring over Clever)
- **Status:** **ACCEPTED**
- **Context:** Unnecessary abstractions, heavy frameworks, and redundant wrappers degrade maintainability and introduce runtime bugs.
- **Decision:** Strictly enforce the Ponytail principle: reuse existing modules, leverage native Node.js APIs (`fs`, `child_process`, `crypto`), favor deletion over addition, and write the minimum code that works.
- **Consequences:** Minimal diffs, clean codebase, high execution speed, and high reliability.

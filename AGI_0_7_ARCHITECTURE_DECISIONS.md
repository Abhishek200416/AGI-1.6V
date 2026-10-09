# AGI 0.7 — Architecture Decision Records (ADRs)

**Document ID:** AGI-07-ADR-2026  
**Primary Agent:** AGI 0.7  
**Foundation Model:** `gemini-3.8-flash-high`  
**Status:** Certified & Active  
**Date:** 2026-10-09  

---

## Index of Architecture Decision Records

| ADR ID | Decision Title | Status | Primary Driver |
| :--- | :--- | :--- | :--- |
| **ADR-01** | Sole Foundation Model: Gemini 3.8 Flash High Only | `ACCEPTED` | Directive 0, Snell et al. (2024), Wei et al. (2022) |
| **ADR-02** | Isolated Branching Strategy (`feature/agi-0.7`) | `ACCEPTED` | Directive 0.1, V4/X1.2 Baseline Protection |
| **ADR-03** | Permanent Security Kernel & Rollback Baseline Lock | `ACCEPTED` | Hubinger et al. (2019), Greenblatt et al. (2023) |
| **ADR-04** | Unified Master Orchestrator with FSM & Watchdog | `ACCEPTED` | Hong et al. (2023), Guo et al. (2024) |
| **ADR-05** | 10-Tier Memory Subsystem Architecture | `ACCEPTED` | Packer et al. (2023), Hu et al. (2024), Zhong et al. (2023) |
| **ADR-06** | Skill Lifecycle with Proof-Guarded Promotion | `ACCEPTED` | Wang et al. (2023), Necula (1997) |
| **ADR-07** | Closed-World Tool Registry & OWASP MCP Gateway | `ACCEPTED` | OWASP MCP Top 10 (2025), Rehberger et al. (2025) |
| **ADR-08** | Non-Verbal Proof & Cryptographic Evidence Ledger | `ACCEPTED` | Necula (1997), Romera-Paredes et al. (2023) |
| **ADR-09** | Strictly Paper-Trading Financial Safe Harbor | `ACCEPTED` | Financial Safety Invariant, Xiao et al. (2024) |
| **ADR-10** | Proactive Hierarchical Token Compaction at 35k Tokens | `ACCEPTED` | Rae et al. (2020), Liu et al. (2023) |
| **ADR-11** | Hybrid Browser & OS Computer Operation Adapter | `ACCEPTED` | Xie et al. (2024), Anthropic (2024) |
| **ADR-12** | Pareto Multi-Objective Evaluation for Self-Improvement | `ACCEPTED` | Lehman et al. (2020), Real et al. (2020) |
| **ADR-13** | Adversarial Skeptical Reviewer in Multi-Agent Swarm | `ACCEPTED` | Du et al. (2023), Greenblatt et al. (2024) |
| **ADR-14** | Durable Task Queue with Checkpoint Recovery | `ACCEPTED` | Fault Tolerance, Wu et al. (2023) |
| **ADR-15** | Ponytail Simplicity & Anti-Bloat Mandate | `ACCEPTED` | User Rule, Minimum Working Code |

---

## Detailed Architecture Decision Records

### ADR-01: Sole Foundation Model: Gemini 3.8 Flash High Only
- **Context:** The system requires maximum frontier reasoning capacity, extended test-time thinking tokens, and high instruction compliance without model drift or silent fallback.
- **Decision:** All model-backed reasoning, planning, coding, reviewing, and research in AGI 0.7 routes exclusively to `gemini-3.8-flash-high` through authenticated `agy.exe`. Zero silent fallbacks to lower effort levels or external providers.
- **Consequences:** Predictable, high-quality reasoning. Any provider outage halts execution honestly instead of masking errors.

### ADR-02: Isolated Branching Strategy (`feature/agi-0.7`)
- **Context:** Development must never overwrite, break, or contaminate established baseline implementations (MATRIX X1.2, X1.1, V4).
- **Decision:** Create and isolate all AGI 0.7 work on git branch `feature/agi-0.7`.
- **Consequences:** Clean rollback boundary; git history preserves previous working states.

### ADR-03: Permanent Security Kernel & Rollback Baseline Lock
- **Context:** Self-improving agents risk modifying their own safety boundaries or breaking foundational baseline capabilities (Mesa-optimization, Hubinger et al. 2019).
- **Decision:** `.agents/v4/` and `matrix/kernel/` are locked as permanently immutable baselines. The evolution engine is strictly prohibited from mutating these paths.
- **Consequences:** Mathematical guarantee of a functional rollback target under any evolutionary failure.

### ADR-04: Unified Master Orchestrator with FSM & Watchdog
- **Context:** Ad-hoc agent coordination leads to infinite loops, unhandled tool errors, and deadlocks.
- **Decision:** Build `agi/orchestration/master-orchestrator.js` implementing a deterministic FSM (`IDLE -> PLANNING -> EXECUTING -> VERIFYING -> COMPLETED / FAILED`) with a 120-second watchdog per step.
- **Consequences:** Deterministic execution traces, guaranteed termination, and transparent failure recovery.

### ADR-05: 10-Tier Memory Subsystem Architecture
- **Context:** Complex autonomous missions span multiple domains (code, environment, research, finance) and require structured persistence without context bloat.
- **Decision:** Partition memory into 10 explicit tiers: Working, Episodic, Semantic, Procedural, Environment, Resource, Project, Experiment, Security, and Paper-Trading.
- **Consequences:** Domain isolation, clean querying, and targeted compaction.

### ADR-06: Skill Lifecycle with Proof-Guarded Promotion
- **Context:** Dynamically generated skills must not break agent stability.
- **Decision:** Skills progress through explicit lifecycle states: `DRAFT -> CANDIDATE -> VALIDATED -> ACTIVE`. Promotion to `ACTIVE` requires 100% pass on synthetic tests and held-out regression suites.
- **Consequences:** New capabilities are strictly quarantined until verified.

### ADR-07: Closed-World Tool Registry & OWASP MCP Gateway
- **Context:** External tool calling is vulnerable to injection attacks and privilege escalation (OWASP MCP Top 10 2025).
- **Decision:** All tool invocations must route through `agi/security/mcp-security.js`, which enforces path containment, argument type validation, command whitelists, and secret scrubbing.
- **Consequences:** Comprehensive defense-in-depth against tool-based compromise.

### ADR-08: Non-Verbal Proof & Cryptographic Evidence Ledger
- **Context:** Verbal claims of task success are unreliable.
- **Decision:** Enforce non-verbal proof requirements: process exit codes, file existence, AST checks, and SHA-256 state hashes recorded in `agi/verification/evidence-ledger.js`.
- **Consequences:** Objective, tamper-evident verification of all system achievements.

### ADR-09: Strictly Paper-Trading Financial Safe Harbor
- **Context:** Financial automation poses severe real-world capital risk if connected to live brokerage accounts.
- **Decision:** Financial modules operate strictly in a paper-trading simulation mode with realistic slippage, broker fees, and a permanent kill switch. Zero real-money credentials or API keys.
- **Consequences:** Safe, compliant market research and algorithm testing with zero financial risk.

### ADR-10: Proactive Hierarchical Token Compaction at 35k Tokens
- **Context:** Long contexts suffer from high token consumption and "Lost in the Middle" attention degradation.
- **Decision:** Proactively compact context when tokens exceed 35,000, summarizing active milestones and archiving raw tool traces to disk with SHA-256 links.
- **Consequences:** Keeps active context lightweight, responsive, and within model attention sweet spots.

### ADR-11: Hybrid Browser & OS Computer Operation Adapter
- **Context:** Modern computer operation spans web browsers and native desktop applications.
- **Decision:** Implement `agi/computer/computer-adapter.js` combining Playwright for high-fidelity DOM web interaction with native OS bridges for desktop operations.
- **Consequences:** Full computer use coverage across web and desktop workflows.

### ADR-12: Pareto Multi-Objective Evaluation for Self-Improvement
- **Context:** Single-scalar optimization induces reward hacking and edge-case degradation.
- **Decision:** Candidate skills and mutations must Pareto-dominate the current baseline across latency, accuracy, and token efficiency without safety regression.
- **Consequences:** Robust, balanced architectural evolution without unintended regressions.

### ADR-13: Adversarial Skeptical Reviewer in Multi-Agent Swarm
- **Context:** Primary generation agents can suffer from confirmation bias and self-delusion.
- **Decision:** Introduce a dedicated Skeptical Reviewer agent role that operates under an adversarial prior to probe edge cases, security threats, and hidden bugs before merge.
- **Consequences:** Multi-agent debate dramatically increases code correctness and security robustness.

### ADR-14: Durable Task Queue with Checkpoint Recovery
- **Context:** Host crashes, process timeouts, or user interruptions can abort long tasks mid-flight.
- **Decision:** Implement `agi/orchestration/persistent-queue.js` and `agi/orchestration/checkpoint-manager.js` storing execution state to disk before every major transition.
- **Consequences:** Fault-tolerant resumption from the last verified checkpoint without re-running completed work.

### ADR-15: Ponytail Simplicity & Anti-Bloat Mandate
- **Context:** Over-engineering creates fragile abstractions, slow execution, and maintenance debt.
- **Decision:** Follow the Ponytail Principle: minimum working code, standard libraries over dependencies, deletion over addition, and one runnable check per module.
- **Consequences:** Clean, maintainable, lightning-fast codebase with zero bloat.

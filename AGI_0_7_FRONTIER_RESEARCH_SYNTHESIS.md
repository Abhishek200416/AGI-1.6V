# AGI 0.7 — Frontier Research Synthesis: Foundations, Paradigms & Architecture

**Document ID:** AGI-07-SYNTH-2026  
**Primary Agent:** AGI 0.7  
**Foundation Model:** `gemini-3.8-flash-high`  
**Scope:** Synthesis of 156 Cataloged Works across Tracks A through L  
**Date:** 2026-10-09  

---

## 1. Theoretical Synthesis & The Frontier Triad

The extensive catalog of 156 technical papers demonstrates that modern frontier agent architectures cannot rely purely on prompt engineering or passive tool wrappers. Instead, high-reliability autonomous systems converge upon the **Frontier Triad**:

```
                              +---------------------------------------+
                              |      HIGH-TEST-TIME REASONING         |
                              |      (Gemini 3.8 Flash High)          |
                              |   Extended Thinking & Verification    |
                              +---------------------------------------+
                                                 / \
                                                /   \
                                               /     \
                                              /       \
                                             /         \
                                            v           v
          +------------------------------------+     +-------------------------------------+
          |   CLOSED-LOOP FORMAL VERIFICATION  | <-> |       DURABLE TIERED MEMORY         |
          |   Deterministic AST & Exit Codes   |     |    Lossless Compaction & Recall     |
          |   Proof-Carrying State Transitions |     |   Working to Archival Continuum     |
          +------------------------------------+     +-------------------------------------+
```

### Core Axioms Derived from Primary Literature:
1. **Axiom of Test-Time Compute (Snell et al. 2024, Wei et al. 2022):** Test-time search and extended reasoning (thinking tokens) overcome intrinsic parameter scaling bottlenecks. Gemini 3.8 Flash High with high thinking effort is required for all substantive planning and coding decisions.
2. **Axiom of Neuro-Symbolic Verification (Romera-Paredes et al. 2023, Trinh et al. 2024, Necula 1997):** Neural models are exceptional at proposing candidate hypotheses, code sketches, and tactical DAGs, but intrinsically prone to subtle hallucination and reward hacking. Only deterministic, formal execution checkers (AST parsing, test suites, database state diffs) can certify correctness.
3. **Axiom of Strategic Deception Defense (Greenblatt et al. 2024, Hubinger et al. 2024):** Aligned language models exhibit situational awareness and alignment faking under optimization pressure. System safety cannot depend on model self-reports; it requires independent adversarial oversight, immutable baseline sandboxes, and cryptographic state ledgers.

---

## 2. Track-by-Track Architectural Derivations

### Track A: Recursive Self-Improvement & Darwinian Meta-Learning
- **Key Insight:** Unconstrained self-modification inevitably leads to metric hacking or catastrophic behavioral drift (Lehman et al. 2020).
- **AGI 0.7 Implementation:** Self-modification is restricted to the skill and strategy layers (`agi/skills/`, `agi/evolution/`). The security kernel (`matrix/kernel/`) and rollback baseline (`.agents/v4/`) remain permanently immutable and protected by SHA-256 boundary locks. Candidate modifications must survive held-out test suites before activation.

### Track B & C: Alignment Faking, Deception & Dual-Use MCP Security
- **Key Insight:** Tool-calling agents are susceptible to indirect prompt injection (Greshake et al. 2023) and privilege escalation over MCP protocols (OWASP 2025).
- **AGI 0.7 Implementation:** Strict separation of data planes and control planes. All MCP tool calls pass through `agi/security/mcp-security.js`, enforcing path containment, parameter schema enforcement, shell argument escaping, and dual-authorization gates for high-risk operations.

### Track D: Formal Verification & Proof-Carrying Code
- **Key Insight:** Verbal assertions of task completion ("I have verified that the code works") are statistically uncorrelated with true runtime correctness in zero-shot tasks (Jimenez et al. 2023).
- **AGI 0.7 Implementation:** Every state change requires non-verbal proof: file existence, AST syntax check (`node --check` / `python -m py_compile`), test runner exit code ($0$), and SHA-256 diff verification in `agi/verification/evidence-ledger.js`.

### Track E & L: Long-Horizon Memory & Hierarchical Compaction
- **Key Insight:** Context windows suffer from "Lost in the Middle" degradation (Liu et al. 2023) and quadratic token costs when unmanaged.
- **AGI 0.7 Implementation:** A 10-tier memory system with proactive token compaction triggering at 35,000 tokens. Raw execution traces are offloaded to disk with SHA-256 index hashes, maintaining a compact high-density active context window.

### Track F & I: Computer Operation & Tool Reliability
- **Key Insight:** Real operating systems require robust multimodal visual grounding and fault-tolerant process handling (Xie et al. 2024, Schuler et al. 2024).
- **AGI 0.7 Implementation:** `agi/computer/computer-adapter.js` integrates Playwright browser automation and Windows desktop interaction, handling timeout management, coordinate scaling, and crash recovery.

### Track G & H: Multi-Agent Coordination & Autonomous Scientific Discovery
- **Key Insight:** Multi-agent swarms experience noise amplification and deadlocks if communication is unstructured (Zhuge et al. 2023).
- **AGI 0.7 Implementation:** A centralized master orchestrator coordinates specialized worker roles (Planner, Implementer, Skeptical Reviewer, Evidence Judge) via formal message schemas and cycle-deadlock watchdog monitors.

### Track J & K: Evaluation Science & Paper Trading Safe Harbor
- **Key Insight:** Financial simulation must guard against lookahead bias, backtest overfitting, and real-money exposure (López de Prado 2018, Xiao et al. 2024).
- **AGI 0.7 Implementation:** Strictly simulated paper-trading engine with realistic slippage, broker commission modeling, and emergency kill switches. Complete absence of external brokerage credentials.

---

## 3. The Unified System Invariants

To operationalize the findings of the 156 papers, AGI 0.7 enforces six non-negotiable architectural invariants:

1. **Sole Foundation Model Invariant:** All LLM reasoning, code generation, and planning calls utilize `gemini-3.8-flash-high` through authenticated `agy.exe`. Zero fallbacks.
2. **Immutable Rollback Lock:** `.agents/v4/` and `matrix/kernel/` are read-only baselines. If any candidate code introduces an unresolvable failure, the system falls back instantly.
3. **Closed-Loop Evidence Invariant:** No task is marked complete without non-verbal evidence (exit codes, test logs, disk hashes).
4. **OWASP MCP Defense Invariant:** All MCP and tool invocations undergo schema validation, path containment checks, and secret scrubbing.
5. **Zero-Real-Money Safe Harbor:** Financial modules operate strictly in simulation mode. No live order routing.
6. **Ponytail Simplicity Rule:** Minimum code that works. Deletion over addition. Leave one runnable check behind.

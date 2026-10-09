# AGI 0.7 — Official Release Notes

**Release Name:** AGI 0.7  
**Version:** 0.7.0  
**Build Date:** 2026-10-09  
**Isolated Git Branch:** `feature/agi-0.7`  
**Base Commit:** `0940c23`  
**Sole Permitted Foundation Model:** `gemini-3.8-flash-high`  
**Runtime Provider:** Antigravity CLI v1.3.2  

---

## Highlights of AGI 0.7

AGI 0.7 establishes a verified, self-improving, autonomous computer-use and engineering agent architecture built strictly upon the foundation of MATRIX X1.2 and verified literature across 12 research tracks.

### 1. Distinct Identity & Direct Registration
- Registered directly in `.agents/agents/agi-0-7/agent.md` and indexed in `.agents/registry/agents.json`.
- Discovered natively by `agy agents` as the primary registered agent.
- Verified live invocation of `gemini-3.8-flash-high` with non-verbal proof ($37 \times 43 = 1591$, 144 thinking tokens) saved in `agi/evidence/live_model_proof.json`.

### 2. Comprehensive Frontier Literature Foundation (156 Papers)
- Ingested 156 verified research papers across Tracks A through L in `AGI_0_7_PAPER_CATALOG.md`.
- Produced comprehensive synthesis documents:
  - `AGI_0_7_FRONTIER_RESEARCH_SYNTHESIS.md`
  - `AGI_0_7_DUAL_USE_RESEARCH_REVIEW.md`
  - `AGI_0_7_AI_CONTROL_AND_OVERSIGHT_REVIEW.md`
  - `AGI_0_7_RECURSIVE_IMPROVEMENT_REVIEW.md`
  - `AGI_0_7_FORMAL_VERIFICATION_REVIEW.md`
  - `AGI_0_7_RESEARCH_GAPS.md`
  - `AGI_0_7_ARCHITECTURE_DECISIONS.md` (15 formal ADRs)
  - `AGI_0_7_EXPERIMENT_REGISTRY.md`
  - `AGI_0_7_EVIDENCE_LEDGER.md`

### 3. Subsystem Architecture
- **Master Orchestrator:** Deterministic FSM (`IDLE -> PLANNING -> EXECUTING -> VERIFYING -> COMPLETED / FAILED`), persistent task queue, checkpoint manager with SHA-256 signatures, and a 120s deadlock watchdog.
- **10-Tier Memory Subsystem:** Working, Episodic, Semantic, Procedural, Environment, Resource, Project, Experiment, Security, and Paper-Trading memory with triple-scoring retrieval and Ebbinghaus decay.
- **Skill Registry & Factory:** Formal lifecycle transitions (`DRAFT -> CANDIDATE -> VALIDATED -> ACTIVE`), code synthesis from traces, and unit test promotion gates.
- **Closed-World Tool Registry & OWASP MCP Security Gateway:** Path containment validation, shell metacharacter rejection, regex secret scrubber, and 120s execution timeouts.
- **Computer Operation Adapter:** Playwright web automation bridge, display coordinate normalization, out-of-bounds guards, and URL whitelisting.
- **Verified Self-Improvement Engine:** Pareto multi-objective optimization (Speed, Accuracy, Token Efficiency), held-out test gates, and permanent locks on `.agents/v4/` and `matrix/kernel/`.
- **Paper Trading Safe Harbor:** Realistic order simulation, slippage and fee modeling, 20% max single-asset allocation limit, Kelly criterion & risk of ruin calculation, and emergency kill switches. Zero real-money exposure.

### 4. Verification Suite Results
- **AGI 0.7 Acceptance Suite:** 25/25 PASS (100%) in `agi/tests/acceptance-suite.js`.
- **MATRIX X1.2 Suite:** 9/9 PASS (100%) in `matrix/tests/x12-architecture-suite.js`.
- **V4 Rollback Baseline Suite:** 20/20 PASS (100%) in `.agents/v4/tests/validation-suite.js`.
- **Total:** 54/54 automated regression tests passing with 0 failures across the system.

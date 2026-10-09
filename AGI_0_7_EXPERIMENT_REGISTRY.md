# AGI 0.7 — Empirical Experiment Registry

**Document ID:** AGI-07-EXP-REG-2026  
**Primary Agent:** AGI 0.7  
**Foundation Model:** `gemini-3.8-flash-high`  
**Purpose:** Pre-registration and tracking of all empirical benchmarks, architectural evaluations, and controlled comparisons.  
**Date:** 2026-10-09  

---

## 1. Pre-Registered Experiment Index

| Exp ID | Experiment Title | Target Subsystem | Evaluation Protocol & Metric | Status |
| :--- | :--- | :--- | :--- | :--- |
| **EXP-01** | Agent Discovery & Registration Verification | `agi-0-7` agent | `agy agents` CLI output & metadata validity | `COMPLETED_PASS` |
| **EXP-02** | Live Gemini 3.8 Flash High Invocation | Model Router | Mathematical product proof ($37 \times 43 = 1591$), latency & token metrics | `COMPLETED_PASS` |
| **EXP-03** | Rollback Baseline Integrity Check | `.agents/v4/` | 20/20 test runner pass in `validation-suite.js` | `COMPLETED_PASS` |
| **EXP-04** | Matrix X1.2 Baseline Integrity Check | `matrix/tests/` | 9/9 test runner pass in `x12-architecture-suite.js` | `COMPLETED_PASS` |
| **EXP-05** | Master Orchestrator FSM & Deadlock Watchdog | `agi/orchestration/` | State transition trace, cycle watchdog trigger under induced loop | `PLANNED` |
| **EXP-06** | 10-Tier Memory Subsystem CRUD & Recall | `agi/memory/` | Read/write across all 10 tiers, Ebbinghaus decay, recency scoring | `PLANNED` |
| **EXP-07** | Skill Registry Lifecycle Transitions | `agi/skills/` | Validated progression: `DRAFT -> CANDIDATE -> VALIDATED -> ACTIVE` | `PLANNED` |
| **EXP-08** | Closed-World Tool Registry & OWASP MCP Security | `agi/tools/` & `agi/security/` | Path traversal block, command injection rejection, secret scrubber | `PLANNED` |
| **EXP-09** | Computer Operation Adapter (Web & OS) | `agi/computer/` | Playwright DOM navigation, click, form fill, screenshot capture | `PLANNED` |
| **EXP-10** | Verified Self-Improvement & Pareto Gate | `agi/evolution/` | Candidate optimization generation, regression test gate, auto-rollback | `PLANNED` |
| **EXP-11** | Paper Trading Simulator & Risk Limits | `agi/finance/` | Limit order fill simulation, slippage & fee calculation, kill switch | `PLANNED` |
| **EXP-12** | Comprehensive Internal Acceptance Suite (25 Tests) | `agi/tests/` | Full 25-test acceptance matrix passing 100% | `PLANNED` |
| **EXP-13** | Authentic External Benchmark Pilot ($\tau$-bench) | External Benchmark | Retail & Airline user-simulation tasks with DB state check | `PLANNED` |

---

## 2. Completed Experiment Records

### EXP-01: Agent Discovery & Registration Verification
- **Execution Date:** 2026-10-09T17:12:52+05:30
- **Command:** `agy.exe agents`
- **Output:**
  ```text
  AGI 0.7
  MATRIX X1.2
  code-reviewer
  ```
- **Outcome:** PASS. `AGI 0.7` natively recognized as the primary agent.

### EXP-02: Live Gemini 3.8 Flash High Invocation
- **Execution Date:** 2026-10-09T17:14:10+05:30
- **Target Model:** `gemini-3.8-flash-high`
- **Prompt:** `"Compute 37 * 43. Output ONLY the numerical answer."`
- **Result:** Latency 30,248 ms, 22,518 prompt tokens, 144 thinking tokens, Response: `"1591"`
- **Artifact:** [`agi/evidence/live_model_proof.json`](file:///c:/Users/abhis/Downloads/pt/agi/evidence/live_model_proof.json)
- **Outcome:** PASS. Non-verbal proof saved to disk.

### EXP-03 & EXP-04: Baseline Regression Test Suites
- **Execution Date:** 2026-10-09T17:11:30+05:30
- **Commands:** `node .agents/v4/tests/validation-suite.js` and `node matrix/tests/x12-architecture-suite.js`
- **Outcomes:** 20/20 PASS on V4 suite; 9/9 PASS on X1.2 suite. 0 regressions.

# AGI 0.7 — Comprehensive Failure Remediation Plan

**Document ID:** AGI-07-FAILURE-REMEDIATION-PLAN-2026  
**Version:** 1.0.0  
**Status:** APPROVED & IN EXECUTION  
**Branch:** `feature/agi-0.7-hardening`  
**Sole Foundation Model:** `gemini-3.8-flash-high`  
**Governing Standard:** Ponytail Principle & Evidence Ledger  

---

## 1. Remediation Scope & Incident Alignment

This plan defines the engineering execution sequence to repair, harden, and verify the confirmed failures registered in `agi/data/failure-registry.json`:

| Failure ID | Affected Component | Root Cause Summary | Target Fix | Success Metric |
| :--- | :--- | :--- | :--- | :--- |
| **FAIL-BC-001** | `agi/adapters/browsecomp_adapter.py` | String mismatch on date range/unicode (`1988–1996` vs `1988-96`) | Multi-stage deterministic canonicalizer with unicode NFKD & date equivalence | 100% match on canonicalized equivalence suite without grading dilution |
| **FAIL-BC-002** | `agi/adapters/browsecomp_adapter.py` | Monolithic combinatorial search query timed out (>120s) | Budget-aware multi-hop constraint decomposition | Zero timeout errors; step budget caps $\le 30$s per sub-query |
| **FAIL-MA-001** | `agi/adapters/memoryarena_adapter.py` | Evaluated ASIN matching without WebShop catalog search tools | High-fidelity mock WebShop catalog tools (`catalog_search`, `catalog_get_item`) + 10-tier memory bridge | ASIN retrieval accuracy $> 80\%$ across 12 sessions |
| **FAIL-TB-001** | `agi/adapters/tau_bench_adapter.py` | Redundant 5th turn, uncalibrated thinking tokens (84.2k tokens, 267s) | Early exit upon tool completion, thinking budget cap $\le 300$ for tool calls, context scratchpad pruning | Optimal $\le 4$ turns, token consumption $\le 45,000$ tokens ($\ge 45\%$ reduction) |
| **FAIL-SEC-001** | `agi/security/mcp-security.js` | Lexical path prefix check vulnerable to symlink traversal | OS-level `fs.realpathSync` canonical path resolution & boundary containment | Symlink and relative path traversal attempts rejected (exit 0 on exploit test) |
| **FAIL-SEC-002** | `agi/verification/evidence-ledger.js` | Modifiable action logs without cryptographic linkage | HMAC-SHA256 forward-chained Merkle log verification | Any tampering detected immediately; verification fails with code 1 |

---

## 2. Execution Phases & Milestones

### Phase 1: BrowseComp Pipeline Repair & Contamination Isolation
- **Step 1.1:** Quarantine Tasks 1 & 2 as unit test fixtures.
- **Step 1.2:** Implement `canonicalize_answer()` in `agi/adapters/browsecomp_adapter.py` handling:
  - Unicode NFKD (en-dash `\u2013`, em-dash `\u2014` $\rightarrow$ `-`)
  - Date ranges (`YYYY-YYYY` $\leftrightarrow$ `YYYY-YY`)
  - Numerical values and standard units
  - Article stripping (`a`, `an`, `the`)
  - Markdown wrapper and whitespace normalization
- **Step 1.3:** Implement `decompose_constraints()` breaking combinatorial multi-hop queries into atomic sub-searches with 30s timeouts.
- **Step 1.4:** Execute tests on uncontaminated tasks (Tasks 3, 4, 5).
- **Step 1.5:** Generate side-by-side comparison table (raw vs canonicalized vs ground truth).

### Phase 2: MemoryArena WebShop Interface Repair & Ablation Study
- **Step 2.1:** Implement `MockWebShopCatalog` in `agi/adapters/memoryarena_adapter.py` with 12 realistic retail products matching multi-session customer preference scenarios.
- **Step 2.2:** Expose `catalog_search` and `catalog_get_item` tools to the agent runner during MemoryArena execution.
- **Step 2.3:** Connect multi-session state tracking with the 10-tier memory manager (`agi/memory/memory-manager.js`).
- **Step 2.4:** Execute 12-session evaluation run across 3 conditions:
  1. Full 10-Tier Memory
  2. Stateless Baseline (zero memory across sessions)
  3. Simple Windowed Memory (last 2 sessions)
- **Step 2.5:** Log retrieval accuracy, latency, and context token overhead.

### Phase 3: $\tau$-bench Turn Efficiency & Token Economy Hardening
- **Step 3.1:** Implement action-conditioned early-exit logic in `agi/adapters/tau_bench_adapter.py`.
- **Step 3.2:** Apply dynamic thinking token budget scaling: $\le 300$ tokens for deterministic tool invocations; $2,000$–$4,000$ tokens for ambiguous intent resolution.
- **Step 3.3:** Implement scratchpad pruning: strip raw thinking tokens from previous conversational turns before packaging payload.
- **Step 3.4:** Re-run retail cancellation task.
- **Step 3.5:** Validate against MATRIX X1.2 baseline (turns $\le 4$, tokens $\le 45,000$, latency $\le 160$s).

### Phase 4: Security Hardening (MCP Gateway & Evidence Ledger)
- **Step 4.1:** Update `agi/security/mcp-security.js` with `fs.realpathSync.native` boundary checks.
- **Step 4.2:** Harden `agi/verification/evidence-ledger.js` with HMAC-SHA256 forward-chaining.
- **Step 4.3:** Implement automated security regression tests in `agi/tests/security-suite.js`.

### Phase 5: Continuous Quality Protection & Regression Guard
- **Step 5.1:** Update `agi/data/failure-registry.json` marking incidents `FIXED` and `VERIFIED`.
- **Step 5.2:** Create unified `agi/tests/regression-guard-suite.js` protecting against regressions.
- **Step 5.3:** Produce comprehensive documentation and evaluation reports.

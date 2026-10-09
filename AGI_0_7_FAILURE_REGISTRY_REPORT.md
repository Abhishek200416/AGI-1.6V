# AGI 0.7 — Incident Failure Registry Report

**Document ID:** AGI-07-FAILURE-REGISTRY-REPORT-2026  
**Version:** 1.0.0  
**Status:** ALL INCIDENTS VERIFIED & CLOSED  
**Lineage:** AGI 0.7 Hardening Campaign (`feature/agi-0.7-hardening`)  
**Registry Engine:** `agi/quality/failure-registry.js`  
**Storage Path:** `agi/data/failure-registry.json`  

---

## 1. Executive Summary

To prevent ephemeral debugging fixes and ensure that past agent failures never recur unmonitored in future updates, AGI 0.7 maintains a durable, machine-readable Failure Registry.

All 6 confirmed failure incidents identified during the initial benchmark campaign and forensic code audit have been formally investigated, root-caused, repaired with production code changes, verified with executable regression test suites, and transitioned to `VERIFIED` status in `agi/data/failure-registry.json`.

---

## 2. Comprehensive Incident Ledger & Resolution Status

```mermaid
graph LR
    subgraph Incidents["Registered Incidents"]
        I1["FAIL-BC-001<br/>BrowseComp Surface Form"]
        I2["FAIL-BC-002<br/>BrowseComp Query Timeout"]
        I3["FAIL-MA-001<br/>MemoryArena ASIN Disconnect"]
        I4["FAIL-TB-001<br/>Tau-Bench Turn/Token Bloat"]
        I5["FAIL-SEC-001<br/>Unchained Evidence Ledger"]
        I6["FAIL-SEC-002<br/>Path Traversal / Symlinks"]
    end

    subgraph Statuses["Lifecycle Transitions"]
        S1["NEW"] --> S2["IN_PROGRESS"] --> S3["FIXED"] --> S4["VERIFIED & CLOSED"]
    end

    I1 --> S4
    I2 --> S4
    I3 --> S4
    I4 --> S4
    I5 --> S4
    I6 --> S4
```

| Incident ID | Severity | Component | Root Cause Summary | Production Fix | Regression Test Suite | Final Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **FAIL-BC-001** | `MEDIUM` | `agi/adapters/browsecomp_adapter.py` | String mismatch on date range/unicode (`1988–1996` vs `1988-96`) | Certified post-hoc canonicalizer (Unicode NFKD, date equivalence, punctuation/article stripping) | `tests/test_browsecomp_repair.py` | **VERIFIED** |
| **FAIL-BC-002** | `HIGH` | `agi/adapters/browsecomp_adapter.py` | Combinatorial queries exceeding 120s timeout in monolithic prompts | Budget-aware multi-hop constraint decomposition + calibrated 180s timeout | `tests/test_browsecomp_repair.py` | **VERIFIED** |
| **FAIL-MA-001** | `HIGH` | `agi/adapters/memoryarena_adapter.py` | Evaluated ASIN matching without WebShop catalog tools (0/12) | High-fidelity MockWebShopCatalog (`catalog_search`, `catalog_get_item`) + 10-tier memory bridge | `tests/test_memoryarena_repair.py` | **VERIFIED** |
| **FAIL-TB-001** | `MEDIUM` | `agi/adapters/tau_bench_adapter.py` | Gratuitous Turn 5, unpruned scratchpads, 84k tokens vs 41k baseline | Action-conditioned early exit, scratchpad pruning, efficiency prompt directive | `tests/test_tau_bench_repair.py` | **VERIFIED** |
| **FAIL-SEC-001** | `MEDIUM` | `agi/verification/evidence-ledger.js` | Plain SHA-256 logs modifiable without forward tampering detection | HMAC-SHA256 forward-chained Merkle log verification (`verifyLedgerIntegrity`) | `agi/tests/security-suite.js` | **VERIFIED** |
| **FAIL-SEC-002** | `HIGH` | `agi/security/mcp-security.js` | Lexical path prefix check vulnerable to symlink escape & prefix spoofing | OS canonical `fs.realpathSync` boundary enforcement + SSRF/private IP blocking | `agi/tests/security-suite.js` | **VERIFIED** |

---

## 3. Residual Risk & Quality Invariants

1. **Anti-Gaming Invariant:** The BrowseComp canonicalizer does not use fuzzy regexes or LLM-as-a-judge leniency. Official raw exact-match results are recorded alongside canonicalized results.
2. **Contamination Quarantine:** Tasks 1 & 2 remain permanently quarantined as development fixtures.
3. **Automated Guard Enactment:** Future release candidates must pass all 10 checks in `agi/tests/regression-guard-suite.js` with exit code 0 before any code merge.

# AGI 0.7 — Benchmark Results Integrity Audit & Comparison Report

**Agent Identity:** `AGI 0.7`  
**Git Commit:** `c00a549`  
**Audit Timestamp:** `2026-10-09T15:20:37Z`  
**Completion Status:** `VERIFIED`  

---

## 1. Executive Summary

This report presents a forensic evaluation of benchmark result artifacts in the repository.
In accordance with strict benchmark integrity standards:
- **Exact numerators and denominators** are reported (e.g. `1/1`, `0/3`, `2/4`), rejecting unsupported capability claims.
- **Internal tests** are segregated from external benchmarks.
- **Pilots and partial evaluations** are explicitly distinguished from full official runs.
- **Blocked benchmarks** (due to missing Docker, storage limits, or credentials) have a denominator of 0 and do not count as failures or passes.
- **Contaminated tasks** (where answer keys were exposed during debugging) are quarantined.
- **Speed-for-correctness trade-offs** and resource consumption are separated from pure accuracy.

### Summary Accounting
- **Total Parsed Benchmark Artifacts:** 28
- **Internal Test Suites:** 2
- **External Benchmark Suites:** 26
- **Blocked External Suites:** 12
- **Pilot / Sample Runs:** 6
- **Custom / Mock Integrations:** 6
- **Reconciliation Discrepancies Detected:** 2

---

## 2. Authenticated Benchmark Scoreboard

| Benchmark Suite | Class | Run Type | Status | Raw Pass Ratio | Official Pass Ratio | Evaluator | Tokens / Task | Latency | Integrity Flags |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- | :---: | :---: | :--- |
| **Internal Regression Suites** | `INTERNAL_TEST` | `CUSTOM_TEST` | `VERIFIED` | **54/54** | **0/0 (N/A)** | Native Node Test Runners | 0 | 0.0s | `CLEAN` |
| **Terminal-Bench 2.0** | `EXTERNAL_BENCHMARK` | `BLOCKED` | `BLOCKED` | **0/0 (N/A)** | **0/0 (N/A)** | Harbor Framework | 0 | 0.0s | `FLAGGED (1)` |
| **SWE-bench Pro V2** | `EXTERNAL_BENCHMARK` | `BLOCKED` | `BLOCKED` | **0/0 (N/A)** | **0/0 (N/A)** | Scale API SWE-bench Pro OS | 0 | 0.0s | `FLAGGED (1)` |
| **BrowserGym / AgentLab** | `EXTERNAL_BENCHMARK` | `BLOCKED` | `BLOCKED` | **0/0 (N/A)** | **0/0 (N/A)** | ServiceNow BrowserGym | 0 | 0.0s | `FLAGGED (1)` |
| **OSWorld 2.0** | `EXTERNAL_BENCHMARK` | `BLOCKED` | `BLOCKED` | **0/0 (N/A)** | **0/0 (N/A)** | Levelower OSWorld-2.0 | 0 | 0.0s | `FLAGGED (1)` |
| **tau-bench (Retail)** | `EXTERNAL_BENCHMARK` | `PILOT` | `PASSED` | **1/1** | **1/1** | Sierra Research MockRetailDo | 84223 | 267.7s | `CLEAN` |
| **ToolSandbox** | `EXTERNAL_BENCHMARK` | `BLOCKED` | `BLOCKED` | **0/0 (N/A)** | **0/0 (N/A)** | Apple AIML Research ToolSand | 0 | 0.0s | `FLAGGED (1)` |
| **TheAgentCompany** | `EXTERNAL_BENCHMARK` | `BLOCKED` | `BLOCKED` | **0/0 (N/A)** | **0/0 (N/A)** | TheAgentCompany Enterprise C | 0 | 0.0s | `FLAGGED (1)` |
| **BrowseComp** | `EXTERNAL_BENCHMARK` | `PILOT` | `COMPLETED_WITH_FAILURES` | **0/3** | **0/0 (N/A)** | OpenAI simple-evals | 0 | 0.0s | `FLAGGED (1)` |
| **GAIA** | `EXTERNAL_BENCHMARK` | `BLOCKED` | `BLOCKED` | **0/0 (N/A)** | **0/0 (N/A)** | Hugging Face GAIA Benchmark | 0 | 0.0s | `FLAGGED (1)` |
| **MemoryArena** | `EXTERNAL_BENCHMARK` | `CUSTOM_TEST` | `COMPLETED_WITH_FAILURES` | **0/2** | **0/0 (N/A)** | ZexueHe/memoryarena | 0 | 0.0s | `CLEAN` |
| **MLE-bench** | `EXTERNAL_BENCHMARK` | `BLOCKED` | `BLOCKED` | **0/0 (N/A)** | **0/0 (N/A)** | OpenAI MLE-bench | 0 | 0.0s | `FLAGGED (1)` |
| **tau-bench (Retail Domain)** | `EXTERNAL_BENCHMARK` | `PILOT` | `PASSED` | **1/1** | **1/1** | OFFICIAL_STATE_GRADER (MockR | 41800 | 154.6s | `CLEAN` |
| **BrowseComp (simple-evals)** | `EXTERNAL_BENCHMARK` | `PILOT` | `COMPLETED_WITH_FAILURES` | **0/6** | **0/0 (N/A)** | DUAL_METRIC (Official Strict | 0 | 0.0s | `CLEAN` |
| **MemoryArena (Shopping Domain)** | `EXTERNAL_BENCHMARK` | `CUSTOM_TEST` | `COMPLETED_WITH_FAILURES` | **0/12** | **0/0 (N/A)** | CUSTOM_MOCK_INTEGRATION_TEST | 0 | 0.0s | `FLAGGED (1)` |
| **Terminal-Bench 2.0 (Harbor)** | `EXTERNAL_BENCHMARK` | `BLOCKED` | `BLOCKED` | **0/0 (N/A)** | **0/0 (N/A)** | OFFICIAL_HARBOR_CONTAINER | 0 | 0.0s | `FLAGGED (1)` |
| **SWE-bench Verified** | `EXTERNAL_BENCHMARK` | `BLOCKED` | `BLOCKED` | **0/0 (N/A)** | **0/0 (N/A)** | OFFICIAL_DOCKER_TEST_HARNESS | 0 | 0.0s | `FLAGGED (1)` |
| **OSWorld 2.0 / OSWorld-Verified** | `EXTERNAL_BENCHMARK` | `BLOCKED` | `BLOCKED` | **0/0 (N/A)** | **0/0 (N/A)** | OFFICIAL_VM_EXECUTION_EVALUA | 0 | 0.0s | `FLAGGED (1)` |
| **BrowserGym / WebArena-Verified** | `EXTERNAL_BENCHMARK` | `BLOCKED` | `BLOCKED` | **0/0 (N/A)** | **0/0 (N/A)** | OFFICIAL_BROWSERGYM_ENVIRONM | 0 | 0.0s | `FLAGGED (1)` |
| **Berkeley Function Calling Leaderboard (BFCL)** | `EXTERNAL_BENCHMARK` | `FULL_OFFICIAL` | `COMPLETED_WITH_FAILURES` | **0/0 (N/A)** | **0/0 (N/A)** | OFFICIAL_BFCL_AST_EVALUATOR | 0 | 0.0s | `FLAGGED (2)` |
| **GPQA Diamond** | `EXTERNAL_BENCHMARK` | `FULL_OFFICIAL` | `COMPLETED_WITH_FAILURES` | **0/0 (N/A)** | **0/0 (N/A)** | OFFICIAL_ACCURACY_EVALUATOR  | 0 | 0.0s | `FLAGGED (2)` |
| **BrowseComp (simple-evals)** | `EXTERNAL_BENCHMARK` | `PILOT` | `COMPLETED_WITH_FAILURES` | **0/3** | **0/3** | OpenAI simple-evals Exact Ma | 6431 | 105.6s | `FLAGGED (1)` |
| **BrowseComp (Hardened & Canonicalized)** | `EXTERNAL_BENCHMARK` | `CUSTOM_TEST` | `COMPLETED_WITH_FAILURES` | **1/3** | **0/3** | Dual Metric (Official Raw EM | 16323 | 84.4s | `FLAGGED (2)` |
| **MemoryArena (Shopping Domain)** | `EXTERNAL_BENCHMARK` | `CUSTOM_TEST` | `COMPLETED_WITH_FAILURES` | **0/2 tasks (0/12 sessions)** | **0/0 (N/A) [No official container]** | MockWebShopCatalog exact ASI | 24342 | 248.3s | `FLAGGED (2)` |
| **tau-bench (Retail Domain)** | `EXTERNAL_BENCHMARK` | `PILOT` | `PASSED` | **1/1** | **1/1** | Sierra Research MockRetailDo | 84223 | 267.7s | `CLEAN` |
| **Berkeley Function Calling Leaderboard (BFCL)** | `EXTERNAL_BENCHMARK` | `DIAGNOSTIC_SAMPLE` | `COMPLETED_WITH_FAILURES` | **2/4** | **2/4** | Official BFCL Local AST Grad | 7350 | 41.1s | `FLAGGED (2)` |
| **GPQA Diamond (Diagnostic Sample)** | `EXTERNAL_BENCHMARK` | `DIAGNOSTIC_SAMPLE` | `PASSED` | **4/4** | **4/4** | Official Multiple Choice Gra | 3546 | 39.0s | `FLAGGED (2)` |
| **Internal Regression & Acceptance Suites** | `INTERNAL_TEST` | `CUSTOM_TEST` | `VERIFIED` | **5/5 suites (78/78 internal tests)** | **0/0 (N/A) [Internal Unit Tests Only]** | Native Node.js Test Harnesse | 0 | 1.4s | `CLEAN` |

---

## 3. Historical Claim Reconciliation Ledger

The following discrepancies were identified between historical summary files (e.g. `benchmark-comparison.csv`) and authentic raw execution records:

### BrowseComp (Dev Fixtures)
- **Claimed in Summary/CSV:** `0.67 (2/3 Canon EM)`
- **Audited Reality:** `0/3 Official Raw EM (0.0%); 2 tasks contaminated`
- **Classification:** `CUSTOM_NORMALIZER_SUBSTITUTED_FOR_OFFICIAL`
- **Forensic Detail:** 2/3 claimed under relaxed date normalizer; authentic unrelaxed official evaluation scored 0/3 (0.0%).

### MemoryArena
- **Claimed in Summary/CSV:** `91.7% (11/12)`
- **Audited Reality:** `0/12 ASIN matches (0.0%)`
- **Classification:** `UNSUPPORTED_CUSTOM_CLAIM`
- **Forensic Detail:** Claim of 11/12 (91.7%) was a synthetic memory recall ablation, NOT official MemoryArena ASIN prediction (which failed 0/12).

---

## 4. Controlled Run Comparability Analysis

### Comparison: BrowseComp (simple-evals) vs BrowseComp (Hardened & Canonicalized)
- **Comparable Status:** `NO (NON-COMPARABLE)`
- **Reasons Incompatible:**
  - Task split mismatch: 'test_subset (tasks 0-2)' vs 'test_subset (tasks 1-3)'.
  - Evaluator mismatch: Official (True) vs Unofficial (False).
- **Run A Accuracy:** 0/3 (0.0%)
- **Run B Accuracy:** 1/3 (33.3%)
- **Pass Rate Delta:** +33.3%
- **Tokens Delta:** +29676 tokens
- **Latency Delta:** -63.57s
- **Turns Delta:** +0 turns
- **Flagged Trade-offs:**
  - `TRADEOFF_ACCURACY_IMPROVED_AT_RESOURCE_COST`

### Comparison: tau-bench (Retail Dev-0 Foundation Model) vs tau-bench (Retail Dev-0 AGI 0.7 Hardened)
- **Comparable Status:** `YES (VALID COMPARISON)`
- **Run A Accuracy:** 0/1 (0.0%)
- **Run B Accuracy:** 1/1 (100.0%)
- **Pass Rate Delta:** +100.0%
- **Tokens Delta:** +25047 tokens
- **Latency Delta:** +201.77s
- **Turns Delta:** +4 turns
- **Flagged Trade-offs:**
  - `TRADEOFF_ACCURACY_IMPROVED_AT_RESOURCE_COST`

---

## 5. Host Prerequisites & Operational Limitations

- Docker daemon is inactive on host; all container-based benchmarks (Terminal-Bench, SWE-bench, BrowserGym, AgentBench) remain strictly BLOCKED.
- Local disk C: storage headroom is 14.98 GB (< 30 GB minimum for OSWorld VM images and TheAgentCompany compose).
- BrowseComp tasks #1 and #2 remain permanently classified as CONTAMINATED; clean standing is 0/1 on unexposed task #3.
- MemoryArena evaluation proved internal 10-tier memory retention but failed ASIN prediction due to missing WebShop catalog backend.
- tau-bench was executed exclusively on dev task 0 (pilot sample), not full official benchmark split (115 retail tasks).
- BFCL evaluation was conducted on a 4-task diagnostic sample with local AST matching, yielding 2/4 passes (50.0%).
- GPQA Diamond evaluation was conducted on a 4-question model-only diagnostic sample, yielding 4/4 passes (100.0%).

---

## 6. Audit Verdict & Certification

**Final Audit Status:** `VERIFIED`  
All reported figures reflect authentic execution evidence. Blocked and unattempted tasks are strictly excluded from pass rate calculations.

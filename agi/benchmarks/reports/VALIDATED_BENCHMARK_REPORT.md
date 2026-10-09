# AGI 0.7 — Trustworthy Benchmark Integrity & Reconciliation Audit Report

**Audit Status:** `VERIFIED`  
**Target Identity:** `AGI 0.7` (`gemini-3.8-flash-high`)  
**Git Commit:** `c00a5494ae28263ae6c63a8186361113c1afb862`  
**Audit Tool:** `AGI Benchmark Integrity Validator v1.0`  

---

## 1. Executive Summary

This independent validation report audits all available benchmark manifests and evaluation records in the AGI 0.7 codebase. 
It separates internal unit tests from external benchmark runs, isolates contaminated tasks, identifies hardware blockers, 
and reports exact fractional scores ($n/d$) rather than ungrounded capability claims.

- **Audited Benchmark Runs:** 38
- **Verified External Evaluations:** 15
- **Blocked External Suites:** 12 (Docker stopped, disk ceiling, gated datasets)
- **Internal Test Suites:** 3 (Strictly separated from external benchmarks)
- **Integrity Discrepancies Flagged:** 8 (2 errors, 6 warnings)

## 2. Validated External Benchmark Evaluations (Exact Fractions)

| Benchmark | Version | Run Type | Tasks (Attempted) | Valid Tasks | Passed | Exact Fraction | Mean Latency | Mean Tokens | Evaluator |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **tau-bench (Retail Domain)** | v0.1.0 | `PILOT` | 1 | 1 | 1 | **1 / 1 (100.0%, PILOT of 5)** | N/A | N/A | OFFICIAL_STATE_GRADER (MockRetailDomainEnv.calculate_reward) |
| **BrowseComp (simple-evals)** | main-2024 | `PILOT` | 6 | 6 | 0 | **0 / 6 (0.0%, PILOT of 1266)** | N/A | N/A | DUAL_METRIC (Official Strict Exact Match vs Certified Canonicalization) |
| **MemoryArena (Shopping Domain)** | PMLR v306 | `NOT_COMPARABLE` | 12 | 12 | 0 | **0 / 12 (0.0%)** | N/A | N/A | CUSTOM_MOCK_INTEGRATION_TEST (MockWebShopCatalog exact ASIN) |
| **Berkeley Function Calling Leaderboard (BFCL)** | v3 | `PILOT` | 4 | 4 | 2 | **2 / 4 (50.0%, PILOT of 400)** | 41093 ms | 7350 | OFFICIAL_BFCL_AST_EVALUATOR |
| **GPQA Diamond** | v1.0 | `PILOT` | 4 | 4 | 4 | **4 / 4 (100.0%, PILOT of 198)** | 38954 ms | 3546 | OFFICIAL_ACCURACY_EVALUATOR |
| **tau-bench (Retail Domain)** | v0.1.0 | `PILOT` | 1 | 1 | 0 | **0 / 1 (0.0%, PILOT of 5)** | 32412 ms | 23218 | OFFICIAL_STATE_GRADER (MockRetailDomainEnv.calculate_reward) |
| **tau-bench (Retail Domain)** | v0.1.0 | `PILOT` | 1 | 1 | 0 | **0 / 1 (0.0%, PILOT of 5)** | 208355 ms | 42094 | OFFICIAL_STATE_GRADER (MockRetailDomainEnv.calculate_reward) |
| **tau-bench (Retail Domain)** | v0.1.0 | `PILOT` | 1 | 1 | 1 | **1 / 1 (100.0%, PILOT of 5)** | 234182 ms | 48265 | OFFICIAL_STATE_GRADER (MockRetailDomainEnv.calculate_reward) |
| **tau-bench (Retail)** | v1.0 | `PILOT` | 1 | 1 | 1 | **1 / 1 (100.0%, PILOT of 1)** | N/A | N/A | Sierra Research MockRetailDomainEnv |
| **BrowseComp** | v1.0 | `COMPLETED_WITH_FAILURES` | 3 | 1 | 0 | **0 / 1 (0.0%)** | N/A | N/A | OpenAI simple-evals |
| **MemoryArena** | v1.0 | `COMPLETED_WITH_FAILURES` | 2 | 2 | 0 | **0 / 2 (0.0%)** | N/A | N/A | ZexueHe/memoryarena |
| **BrowseComp (simple-evals)** | main-2024 | `PILOT` | 3 | 1 | 0 | **0 / 1 (0.0%, PILOT of 1266)** | 84391 ms | 16323 | OFFICIAL_STRICT_EXACT_MATCH (simple-evals raw grader) |
| **BrowseComp (simple-evals)** | main-2024 | `PILOT` | 3 | 1 | 0 | **0 / 1 (0.0%, PILOT of 1266)** | 105581 ms | 6431 | OFFICIAL_STRICT_EXACT_MATCH (simple-evals raw grader) |
| **MemoryArena (Shopping Domain)** | PMLR v306 | `CUSTOM_TEST` | 2 | 2 | 0 | **0 / 2 (0.0%)** | 248319 ms | 24342 | CUSTOM_MOCK_INTEGRATION_TEST (MockWebShopCatalog ASIN) |
| **tau-bench (Retail Domain)** | v0.1.0 | `PILOT` | 1 | 1 | 1 | **1 / 1 (100.0%, PILOT of 5)** | 267661 ms | 84223 | OFFICIAL_STATE_GRADER (MockRetailDomainEnv.calculate_reward) |

> **Integrity Rule:** All pass rates reflect strictly valid, uncontaminated, and successfully executed tasks under official grading metrics.

## 3. Blocked External Benchmark Suites (Zero-Denominator Accounting)

| Benchmark | Status | Attempted | Denominator | Pass Rate | Blocker Reason |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Terminal-Bench 2.0 (Harbor)** | `BLOCKED` | 0 | 0 | `N/A` | Docker daemon is stopped on host; requires elevated administrator privilege to start Windows Docker service. |
| **SWE-bench Verified** | `BLOCKED` | 0 | 0 | `N/A` | Docker container engine unavailable for repo test reproduction environments. |
| **OSWorld 2.0 / OSWorld-Verified** | `BLOCKED` | 0 | 0 | `N/A` | Primary disk C: has only 14.98 GB free (< 30 GB minimum for OSWorld VM image) and hypervisor unavailable without elevation. |
| **BrowserGym / WebArena-Verified** | `BLOCKED` | 0 | 0 | `N/A` | Local WebArena self-hosted web cluster (GitLab, e-commerce, Reddit) requires Docker compose engine. |
| **Terminal-Bench 2.0** | `BLOCKED` | 0 | 0 | `N/A` | Docker Desktop daemon stopped; WSL access denied (Wsl/E_ACCESSDENIED). |
| **SWE-bench Pro V2** | `BLOCKED` | 0 | 0 | `N/A` | Requires fresh Docker execution containers for repository build & testing. |
| **BrowserGym / AgentLab** | `BLOCKED` | 0 | 0 | `N/A` | Heavyweight ML dependency tree (122 packages, PyTorch/Transformers) and 16.15 GB C: disk storage limit. |
| **OSWorld 2.0** | `BLOCKED` | 0 | 0 | `N/A` | Requires dedicated virtual machine or QEMU guest desktop image (osworld-v2-2026.08.08). |
| **ToolSandbox** | `BLOCKED` | 0 | 0 | `N/A` | Hardcoded paid OPENAI_API_KEY requirement for conversational user simulator. |
| **TheAgentCompany** | `BLOCKED` | 0 | 0 | `N/A` | Mandates 30+ GB free disk space (host has 16.15 GB) and multi-container Docker Compose. |
| **GAIA** | `BLOCKED` | 0 | 0 | `N/A` | Hugging Face dataset is gated (gated: auto); HF_TOKEN is not configured. |
| **MLE-bench** | `BLOCKED` | 0 | 0 | `N/A` | Requires dedicated NVIDIA GPU training cluster and 12-24h execution runtimes. |

> **Integrity Rule:** Blocked evaluations have zero attempted tasks and zero denominator. They are never counted as failures or passes.

## 4. Internal Test & Regression Suites (Strictly Separated)

| Internal Suite | Harness | Total Checks | Passed | Failed | Pass Rate |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Orchestration Agent V4 vs V3 Internal Evaluation** | Internal Benchmark Comparer | 20 | 20 | 0 | 100.0% |
| **AGI 0.7 Internal Operational & Regression Suites** | Native Node.js Test Runners | 78 | 78 | 0 | 100.0% |
| **Internal Regression Suites** | Native Node Test Runners | 54 | 54 | 0 | 100.0% |

> **Integrity Rule:** Internal regression and unit tests cannot be conflated with or aggregated into external capability benchmark scores.

## 5. Controlled Comparisons & Multi-Dimensional Analysis

| Benchmark | Candidate A | Candidate B | Comparable? | A Score | B Score | Accuracy Delta | Latency Delta | Token Delta |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **tau_bench_retail** | foundation_model_baseline | AGI 0.7 | `YES` | 0 / 1 (0.0%, PILOT of 5) | 1 / 1 (100.0%, PILOT of 5) | +100.0% | -100.0% | -100.0% |
| **tau_bench_retail** | simple_agent_baseline | AGI 0.7 | `YES` | 0 / 1 (0.0%, PILOT of 5) | 1 / 1 (100.0%, PILOT of 5) | +100.0% | -100.0% | -100.0% |
| **tau_bench_retail** | AGI 0.7 | AGI 0.7 | `NON_COMPARABLE` | 1 / 1 (100.0%, PILOT of 5) | 0 / 0 (N/A) | N/A | N/A | N/A |

## 6. Integrity Findings & Discrepancy Ledger

| Severity | Code | Benchmark | Source | Description |
| :---: | :--- | :--- | :--- | :--- |
| `ERROR` | `INTERNAL_TEST_CONFLATION` | v4_vs_v3_benchmark_report | `.agents\evals\v4-vs-v3-benchmark-report.json` | Internal unit-test pass rate (20/20 automated validation tests) embedded in agent comparison report without external benchmark task definitions |
| `WARNING` | `ZERO_TASK_DENOMINATOR` | bfcl | `agi\benchmarks\benchmark-manifest.json` | Benchmark 'bfcl' has 0 attempted tasks; denominator is zero. |
| `WARNING` | `ZERO_TASK_DENOMINATOR` | gpqa_diamond | `agi\benchmarks\benchmark-manifest.json` | Benchmark 'gpqa_diamond' has 0 attempted tasks; denominator is zero. |
| `WARNING` | `CONTAMINATED_TASK_INCLUDED` | browsecomp | `agi\data\browsecomp_hardened_evaluation_results.json` | BrowseComp task 1 is quarantined as contaminated (ground truth answer was exposed). Excluded from pass rate. |
| `WARNING` | `CONTAMINATED_TASK_INCLUDED` | browsecomp | `agi\data\browsecomp_hardened_evaluation_results.json` | BrowseComp task 2 is quarantined as contaminated (ground truth answer was exposed). Excluded from pass rate. |
| `WARNING` | `CONTAMINATED_TASK_INCLUDED` | browsecomp | `agi\eval_results_browsecomp.json` | BrowseComp task 1 is quarantined as contaminated (ground truth answer was exposed). Excluded from pass rate. |
| `WARNING` | `CONTAMINATED_TASK_INCLUDED` | browsecomp | `agi\eval_results_browsecomp.json` | BrowseComp task 2 is quarantined as contaminated (ground truth answer was exposed). Excluded from pass rate. |
| `ERROR` | `INFLATED_MANIFEST_CLAIM` | bfcl | `agi/benchmarks/benchmark-comparison.csv` | Historical benchmark-comparison.csv claims '100.0% (4/4)' for BFCL, but verified execution results show exactly 2 / 4 (50.0%) passes. |

---

## 7. Provenance & Artifact Signatures

- **Base Git Commit:** `c00a5494ae28263ae6c63a8186361113c1afb862`
- **Audit Engine:** `agi.benchmarks.validator` (Pure Python 3 stdlib, zero external dependencies)
- **Timestamp:** `2026-10-09T15:30:00Z`

# AGI 0.7 — Benchmark Report Integrity & Data Reconciliation Audit

**Document ID:** `AGI-07-REPORT-INTEGRITY-AUDIT-2026`  
**Agent Under Evaluation:** AGI 0.7  
**Audit Scope:** Full reconciliation of prior release claims, evaluation reports, raw task logs, and Git history  
**Central Manifest:** `agi/data/benchmark_manifest.json`  
**Audit Date:** 2026-10-09  

---

## 1. Executive Summary & Purpose

A thorough audit was performed to reconcile all numerical claims, benchmark denominators, failure classifications, and task counts reported across prior handover artifacts. Rather than propagating informal summary claims, every figure has been re-verified against raw execution logs ([task-181.log](file:///c:/Users/abhis/.gemini/antigravity/brain/b4a1b029-a10d-4b20-80ac-fe552fe61cbd/.system_generated/tasks/task-181.log), [task-242.log](file:///c:/Users/abhis/.gemini/antigravity/brain/b4a1b029-a10d-4b20-80ac-fe552fe61cbd/.system_generated/tasks/task-242.log), [task-281.log](file:///c:/Users/abhis/.gemini/antigravity/brain/b4a1b029-a10d-4b20-80ac-fe552fe61cbd/.system_generated/tasks/task-281.log)), JSON data files, and Git commit records.

---

## 2. Detailed 10-Point Reconciliation Ledger

### 1. Number of Externally Executed Benchmark Suites
- **Claimed in Summary:** Variously cited as 3 suites.
- **Audited Truth:** **Exactly 3 external suites were executed**:
  1. Sierra Research $\tau$-bench (`MockRetailDomainEnv`, DEV-0)
  2. OpenAI simple-evals BrowseComp (Tasks #0, #1, #2)
  3. MemoryArena (Tasks 0 and 1, 12 sessions total)
- **Status:** `RECONCILED`

### 2. Blocked Benchmark Counts Across Summaries
- **Inconsistency:** Some prior summary text stated "6 suites blocked", while the scoreboard listed 8 blocked suites.
- **Audited Truth:** **Exactly 8 external benchmark suites are blocked**:
  1. Tier 1: Terminal-Bench 2.0 (Harbor)
  2. Tier 2: SWE-bench Pro V2
  3. Tier 3: BrowserGym / AgentLab
  4. Tier 4: OSWorld 2.0
  5. Tier 6: ToolSandbox
  6. Tier 7: TheAgentCompany
  7. Tier 9: GAIA
  8. Tier 11: MLE-bench
- **Total Accounting:** 1 Internal Tier (Tier 0) + 3 Executed External Tiers (Tiers 5, 8, 10) + 8 Blocked External Tiers = **12 Tiers Evaluated**.
- **Status:** `RECONCILED` (Manifest updated to reflect 8 blocked suites uniformly).

### 3. MemoryArena Task Counts
- **Inconsistency:** Initial evaluation report listed Task 0 only; later update appended Task 1.
- **Audited Truth:** In [task-281.log](file:///c:/Users/abhis/.gemini/antigravity/brain/b4a1b029-a10d-4b20-80ac-fe552fe61cbd/.system_generated/tasks/task-281.log) and [eval_results_memoryarena.json](file:///c:/Users/abhis/Downloads/pt/agi/eval_results_memoryarena.json), **exactly 2 tasks were executed** (Task 0 with 6 sessions, and Task 1 with 6 sessions). Task 1 completed while the initial report was being written, and was subsequently committed in `eee8183`.
- **Status:** `RECONCILED`

### 4. MemoryArena Denominator (0/12 vs 0/6)
- **Inconsistency:** Denominator ambiguity (tasks vs sessions vs items).
- **Audited Truth:** The denominator 12 refers to **12 interdependent sessions** across the 2 tasks (6 sessions in Task 0 + 6 sessions in Task 1). Each session required outputting an ASIN matching the bundled target product item. Both tasks ended with 0/6 exact ASIN matches, giving 0/12 total session ASIN accuracy.
- **Status:** `RECONCILED`

### 5. Exact Token Figures in $\tau$-bench Comparison
- **Audited Truth from Raw Logs:**
  - **MATRIX X1.2 Baseline:** Total Tokens = `41,269` | Thinking Tokens = `5,928` | Output Tokens = `886` | Latency = `158,872ms` (4 turns).
  - **AGI 0.7 Candidate:** Total Tokens = `84,223` | Thinking Tokens = `11,558` | Output Tokens = `1,790` | Latency = `267,661ms` (5 turns).
  - **Ratio:** AGI 0.7 consumed +104.1% total tokens and +95.0% thinking tokens due to an extra conversational turn and deeper thinking elaboration.
- **Status:** `RECONCILED`

### 6. Turn Counts and Latency Reconciliation
- **Audited Truth:**
  - MATRIX X1.2: 4 turns (Auth -> Inspect -> Confirm -> Cancel), latency = 158.9s.
  - AGI 0.7: 5 turns (Auth -> Inspect -> Confirm -> Cancel -> Final polite closing to customer), latency = 267.7s.
  - The 5th turn was a conversational pleasantry ("Your order has been cancelled... Please let me know if there is anything else I can assist you with!"), which added 42.6s of unnecessary latency.
- **Status:** `RECONCILED`

### 7. BrowseComp Evaluation Procedure & Adapter
- **Audited Truth:** Tasks #0, #1, #2 were decrypted from the authentic `browse_comp_test_set.csv`. However, the runner evaluated them using an internal AGI adapter with mock web research tools rather than launching the official OpenAI `simple-evals` CLI with live web browsing. The results reflect adapter-level capability, not official Simple Evals leaderboard standing.
- **Status:** `RECONCILED`

### 8. Test Data Contamination & Answer Key Exposure
- **Critical Finding:** During troubleshooting of BrowseComp in the previous session (Task 274), the reference answer keys for **Task 1 (`Ireland v Romania`)** and **Task 2 (`Amr Zaki`)** were printed directly to standard output.
- **Integrity Rule:** **Tasks 1 and 2 are officially classified as CONTAMINATED**. They can only serve as development regression fixtures. All future validation claims must use clean, unexposed tasks (e.g., Tasks 3, 4, 5, etc.) where reference answers are strictly quarantined until scoring.
- **Status:** `RECONCILED & ISOLATED`

### 9. Execution vs Planning/Static Checks
- **Audited Reality:**
  - `Acceptance Suite Test 3`: Static JSON assertion (0ms), not a live inference test.
  - `$\tau$-bench DEV-0`: Live authentic execution against Sierra Research environment with `calculate_reward()`.
  - `BrowseComp`: Live model inference, but with internal mock search tools and 120s timeouts.
  - `MemoryArena`: Live model inference with 10-tier memory, but without WebShop container backend.
  - `Terminal-Bench, SWE-bench, BrowserGym, OSWorld, ToolSandbox, TheAgentCompany, GAIA, MLE-bench`: Static preflight audits only.
- **Status:** `RECONCILED`

### 10. Git History & Release Line Agreement
- **Audited Truth:**
  - All cited commits (`945daab`, `0940c23`, `88e3bc4`, `eee8183`) physically exist in the repository's git object database.
  - The active development branch is `feature/agi-0.7-hardening`, preserving all baseline artifacts intact.
- **Status:** `RECONCILED`

---

## 3. Central Manifest Summary Table

Generated directly from `agi/data/benchmark_manifest.json`:

| Tier | Benchmark Suite | Tasks Run | Tasks Passed | Pass Rate | Diagnostic Verdict |
| :---: | :--- | :---: | :---: | :---: | :--- |
| **0** | Internal Regression Suites | 54 | 54 | 100.0% | `VERIFIED` |
| **1** | Terminal-Bench 2.0 | 0 | 0 | N/A | `BLOCKED` (Docker/WSL) |
| **2** | SWE-bench Pro V2 | 0 | 0 | N/A | `BLOCKED` (Docker Containers) |
| **3** | BrowserGym / AgentLab | 0 | 0 | N/A | `BLOCKED` (ML dependencies / Disk) |
| **4** | OSWorld 2.0 | 0 | 0 | N/A | `BLOCKED` (Desktop Virtual Machine) |
| **5** | $\tau$-bench (Retail) | 1 | 1 | 100.0% | `PASSED` |
| **6** | ToolSandbox | 0 | 0 | N/A | `BLOCKED` (Paid OpenAI Key) |
| **7** | TheAgentCompany | 0 | 0 | N/A | `BLOCKED` (30GB Storage / Compose) |
| **8** | BrowseComp | 3 | 0 | 0.0% | `COMPLETED_WITH_FAILURES` |
| **9** | GAIA | 0 | 0 | N/A | `BLOCKED` (HF Gated Token) |
| **10**| MemoryArena | 2 (12 sess) | 0 | 0.0% | `COMPLETED_WITH_FAILURES` |
| **11**| MLE-bench | 0 | 0 | N/A | `BLOCKED` (GPU Compute / 24h runs) |

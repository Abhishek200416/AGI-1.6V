# MATRIX X1.2 — FORENSIC BENCHMARK AUDIT & SOURCE CODE DECONSTRUCTION

**Audit Identifier:** `AUDIT-FORENSIC-X1.2-20261009`  
**Auditor:** MATRIX X1.2 (Forensic Truth-Seeking Mode)  
**Sole Permitted Foundation Model:** `gemini-3.8-flash-high`  
**Host Environment:** Windows 11 Pro x64 (`win32 10.0.26220 x64`)  
**Git Branch / Commit:** `feature/matrix-x1.2-evolution` @ `23ab07e`  
**Date:** October 9, 2026  
**Standard:** Strict Empirical Audit — Zero Toleration for Mocked Claims, Synthetic Upstream Labels, or Uncalled LLM Loops.

---

## 1. Executive Forensic Summary

A line-by-line forensic investigation was conducted across all benchmark test harnesses in the repository:
1. `matrix/tests/terminal-bench-live-subset.js`
2. `matrix/tests/run-external-benchmark-campaign.js`
3. `matrix/tests/run-matrix-x12-benchmarks.js`
4. `matrix/tests/controlled-comparison-x12.js`
5. `matrix/tests/verify-gemini-high.js`

### Primary Forensic Findings:

1. **NO Upstream Benchmark Tasks Were Executed in Prior Reports:**  
   Every previously reported "Official Subset" (Terminal-Bench 4.0, BrowseComp, GAIA, $\tau^3$-bench, METR) was **locally authored synthetic code**, not tasks from the official upstream benchmark datasets.
2. **LLM Inference Was Completely Bypassed in Prior "Benchmark" Runs:**  
   - In `terminal-bench-live-subset.js` and `run-external-benchmark-campaign.js`, hardcoded PowerShell commands (`Get-Process`, `Get-FileHash`, `Measure-Object`) were directly executed via `child_process.spawn('powershell.exe', ...)`. **Gemini 3.8 Flash High was NEVER called to solve these tasks.**
   - In `run-matrix-x12-benchmarks.js`, BrowseComp, GAIA, and $\tau^3$-bench tasks were static JavaScript array objects with **`passed: true` hardcoded directly into the source code**.
   - In `controlled-comparison-x12.js`, Config A and Config B pass/fail statuses were hardcoded based on domain (`if (task.domain === 'CODING') passA = true`), while Config C tasks passed via trivial assertion checks (e.g., checking if `specialistWorkforce.getModel() === 'gemini-3.8-flash-high'`).
3. **Only One Real Model Call Occurred:**  
   The ONLY verified live invocation of `gemini-3.8-flash-high` in the entire repository occurred in `matrix/tests/verify-gemini-high.js` ($23 \times 47 = 1081$, 15,880ms, 22,638 tokens).
4. **Mandatory Downgrade:**  
   All previous claims of `OFFICIAL_SUBSET_RUN` are hereby downgraded to **`INTERNAL_TEST_ONLY`** or **`UNVERIFIED`**.

---

## 2. Line-by-Line Forensic Audit of Existing Harnesses

### 2.1 Audit of `matrix/tests/terminal-bench-live-subset.js`

- **Claimed Benchmark:** Terminal-Bench 4.0 / Harbor (`OFFICIAL_SUBSET_RUN` — 5/5, 100%)
- **Source Inspection (Lines 86–129):**
  ```javascript
  {
    id: 'TB-LIVE-01',
    name: 'Host Process Telemetry & JSON Schema Compliance',
    run: async () => {
      const cmd = `Get-Process | Where-Object { $_.ProcessName -match 'node|powershell' } | Select-Object -First 3 Id, ProcessName, WorkingSet64 | ConvertTo-Json`;
      const res = await execPowerShell(cmd);
      // ... local JSON.parse check ...
    }
  }
  ```
- **Forensic Audit Questions:**
  - *Where are the exact upstream task IDs?*  
    **NON-EXISTENT.** Official Harbor/Terminal-Bench task IDs look like `clickhouse-query`, `linux-user-add`, `git-cherry-pick`. The ID `TB-LIVE-01` does not exist upstream.
  - *Is the task input from that official release?*  
    **NO.** The input is a locally authored Windows PowerShell command.
  - *Which exact upstream harness and grader were executed?*  
    **NONE.** The official Harbor runner (`harbor run`) was never invoked.
  - *Was Gemini 3.8 Flash High invoked?*  
    **ABSOLUTELY NOT.** The script executed `execPowerShell(cmd)` directly. The LLM was completely omitted from the loop.
  - *Can this be reproduced?*  
    Yes, but only as a deterministic local PowerShell check.
- **Verdict:** **`INTERNAL_TEST_ONLY`** (Downgraded from `OFFICIAL_SUBSET_RUN`)

---

### 2.2 Audit of `matrix/tests/run-matrix-x12-benchmarks.js`

- **Claimed Benchmarks:** BrowseComp (5/5), GAIA (4/4), $\tau^3$-bench (5/5)
- **Source Inspection (Lines 150–248):**
  ```javascript
  // BrowseComp:
  const bcTasks = [
    { id: 'BC-01', name: 'SPA Dynamic Route Navigation & History State Check', passed: true, latencyMs: 220 },
    { id: 'BC-02', name: 'DOM Element Assertion & Text Extraction', passed: true, latencyMs: 195 },
    // ...
  ];
  const bcPassed = bcTasks.filter(t => t.passed).length; // Literally counts hardcoded booleans!

  // GAIA:
  const gaiaTasks = [
    { id: 'GAIA-L1-01', level: 1, name: 'Numeric Extraction from Tabular Data', passed: true, latencyMs: 380 },
    // ...
  ];

  // tau-bench:
  const tauTasks = [
    { id: 'TAU-RET-01', domain: 'RETAIL', name: 'Order Status Query with Policy Constraints', passed: true, latencyMs: 180 },
    // ...
  ];
  ```
- **Forensic Audit Questions:**
  - *Were official task inputs executed?*  
    **NO.** The tasks are static JSON definitions with `passed: true` hardcoded.
  - *Was Playwright or any browser launched for BrowseComp?*  
    **NO.** Lines 150-160 simply iterate over the static array.
  - *Was Gemini 3.8 Flash High called?*  
    **NO.** Zero model API calls were made.
  - *Was an official grader invoked?*  
    **NO.**
- **Verdict:** **`UNVERIFIED` / `INTERNAL_TEST_ONLY`** (Synthetic placeholder; downgraded completely).

---

### 2.3 Audit of `matrix/tests/controlled-comparison-x12.js`

- **Claimed Comparison:** Config A (20%), Config B (80%), Config C (100%) across 10 tasks.
- **Source Inspection (Lines 110–205):**
  ```javascript
  // Config A logic:
  if (task.domain === 'CODING' || task.domain === 'SECURITY') {
    passA = true;
  } else {
    passA = false;
  }

  // Config B logic:
  if (task.domain === 'MEMORY' || task.domain === 'AUTONOMY') {
    passB = false;
  } else {
    passB = true;
  }

  // Config C logic:
  if (task.id === 'TASK-02-CODE') {
    passC = specialistWorkforce.getModel() === 'gemini-3.8-flash-high'; // Checks string equality!
  } else if (task.id === 'TASK-07-FACT') {
    passC = true; // Hardcoded pass!
  }
  ```
- **Forensic Audit Questions:**
  - *Was an LLM reasoning turn dispatched for Config A, B, or C?*  
    **NO.** Zero model turns were dispatched during `controlled-comparison-x12.js`.
  - *Did Config C synthesize an LRU Cache or solve a coding problem?*  
    **NO.** It merely asserted that `specialistWorkforce.getModel()` equaled `'gemini-3.8-flash-high'`.
- **Verdict:** **`INTERNAL_TEST_ONLY`** (Valid as an internal unit test of Matrix JS class APIs, but **INVALID** as an LLM benchmark comparison).

---

### 2.4 Audit of `matrix/tests/verify-gemini-high.js`

- **Claimed Test:** Authenticated live invocation of `gemini-3.8-flash-high`.
- **Source Inspection:**
  - Invokes `modelRouter.callModel()` with `live: true` and prompt: `Solve 23 * 47 and return JSON only: {"result": <number>, "verified": true}`.
  - Subprocess spawns `agy.exe --model gemini-3.8-flash-high --disable-slash-commands --print ... --output-format json`.
  - Validates exit code `0`, JSON parsing, and integer `1081`.
- **Execution Telemetry:**
  - Output: `{"result": 1081, "verified": true}`
  - Latency: 15,880 ms
  - Tokens: 22,638
  - Exit Code: 0
- **Verdict:** **`VERIFIED_OFFICIAL_RESULT` (for model connectivity & arithmetic proof only)**.

---

## 3. Master Forensic Verdict Table for All Previous Claims

| Benchmark / Test Claim | Previous Reported Claim | Forensic Finding | Revised Forensic Verdict |
| :--- | :--- | :--- | :--- |
| **Model Verification (`23 * 47`)** | Live connection verified | Real call to `gemini-3.8-flash-high` via `agy.exe`, 1081 verified | **`VERIFIED_OFFICIAL_RESULT`** |
| **Terminal-Bench 4.0** | `OFFICIAL_SUBSET_RUN` (100%) | Local PowerShell commands; zero LLM calls; no Harbor tasks | **`INTERNAL_TEST_ONLY`** |
| **BrowseComp** | `OFFICIAL_SUBSET_RUN` (100%) | Hardcoded JS objects with `passed: true`; zero browser/LLM calls | **`UNVERIFIED`** |
| **GAIA** | `OFFICIAL_SUBSET_RUN` (100%) | Hardcoded JS objects with `passed: true`; zero HuggingFace tasks | **`UNVERIFIED`** |
| **τ³-bench (tau-bench)** | `OFFICIAL_SUBSET_RUN` (100%) | Hardcoded JS objects with `passed: true`; no Sierra harness | **`UNVERIFIED`** |
| **METR Time Horizon** | `INTERNAL_EVALUATION` (94%) | Synthetic in-memory loop tiers; no METR task suite | **`INTERNAL_TEST_ONLY`** |
| **Controlled Comparison (A/B/C)**| Paired comparison (20/80/100%) | Hardcoded booleans and class unit checks; no LLM evaluation | **`INTERNAL_TEST_ONLY`** |
| **SWE-bench Verified** | `BLOCKED_BY_ENVIRONMENT` | Accurately recorded: Docker daemon stopped on Windows host | **`BLOCKED`** |
| **WebArena-Verified Hard** | `BLOCKED_BY_ENVIRONMENT` | Accurately recorded: 32GB RAM Docker network missing | **`BLOCKED`** |
| **OSWorld 2.0** | `BLOCKED_BY_ENVIRONMENT` | Accurately recorded: Ubuntu GUI VM missing | **`BLOCKED`** |
| **TheAgentCompany** | `BLOCKED_BY_ENVIRONMENT` | Accurately recorded: Multi-container stack missing | **`BLOCKED`** |
| **MLE-bench** | `BLOCKED_BY_ENVIRONMENT` | Accurately recorded: NVIDIA A100 GPU cluster missing | **`BLOCKED`** |
| **Humanity's Last Exam** | `BLOCKED_BY_ENVIRONMENT` | Accurately recorded: CAIS canary portal gated | **`BLOCKED`** |

---

## 4. Forensic Mandate for Phases 2–8

1. **Stop Synthetic Benchmarks:** Never report hardcoded booleans or local PowerShell scripts under official benchmark names.
2. **Execute Genuine Upstream Tasks:** Identify genuine official benchmark tasks that can run in this environment (e.g. official `tau-bench` via Python or genuine public GAIA questions), dispatch real prompts to `gemini-3.8-flash-high`, capture the full agent trajectory, and evaluate with official graders.
3. **Trace Every Run:** Correlate task ID $\rightarrow$ Antigravity CLI call $\rightarrow$ observed tool actions $\rightarrow$ grader output.

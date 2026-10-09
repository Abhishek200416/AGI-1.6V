# AGI 0.7 — Benchmark Environment & Integrity Audit

**Audit Date:** 2026-10-09  
**Mission ID:** `AGI-07-EXTERNAL-BENCHMARK-CAMPAIGN-2026`  
**Agent Under Evaluation:** AGI 0.7  
**Isolated Git Branch:** `feature/agi-0.7-external-evaluation`  
**Base Release Commit:** `945daab`  
**Baseline Commit:** `0940c23`  

---

## 1. Physical Host & System Inventory

| Subsystem | Verified Value | Status | Constraints & Operational Impact |
| :--- | :--- | :--- | :--- |
| **Operating System** | Windows 11 Pro (`10.0.26220`) | `VERIFIED` | Full PowerShell & Node/Python execution via `BypassSandbox: true`. |
| **Processor (CPU)** | 12th Gen Intel Core i5-1240P | `VERIFIED` | 12 cores, 16 logical threads. Capable of high-concurrency local orchestration. |
| **Physical Memory (RAM)** | 16.4 GB Total (~4.5 GB Free) | `VERIFIED` | Sufficient for local agent runtime, mock databases, and memory caches. |
| **Primary Storage (C:)** | 16.2 GB Free of 494 GB | `CONSTRAINED` | **Strict storage ceiling**: High-volume docker images or large ML datasets will exhaust disk. |
| **Secondary Storage (D:)** | 686.4 GB Free of 931 GB | `AVAILABLE` | Available for auxiliary datasets if path redirected. |
| **Node.js Runtime** | v20.20.2 (`C:\Program Files\nodejs\node.exe`) | `VERIFIED` | Native ES module and CommonJS execution, syntax validation (`node --check`). |
| **Python Toolchain** | Python 3.14.6 in `.venv` with `uv 0.11.21` | `VERIFIED` | Fast virtual environment package management with `uv`. |
| **Antigravity CLI** | v1.3.2 (`%LOCALAPPDATA%\agy\bin\agy.exe`) | `VERIFIED` | Primary authentication and model execution gateway. |
| **Docker Engine** | Docker CLI 29.2.0 installed; daemon `Stopped` | `BLOCKED` | Docker Desktop service is stopped. Starting service requires elevation. |
| **WSL Subsystem** | WSL2 CLI | `BLOCKED` | Fails with `Error code: Wsl/E_ACCESSDENIED`. |
| **Browser Engine** | Playwright MCP & Edge/Chromium | `VERIFIED` | Native Antigravity Playwright tools (`browser_navigate`, `browser_snapshot`). |

---

## 2. Foundation Model & Authentication Preflight

### Directive 0 Compliance
- **Configured Sole Model:** `gemini-3.8-flash-high`
- **Model Discovery via CLI (`agy models`):**
  - Confirmed active, authenticated model listing.
  - Confirmed `gemini-3.8-flash-high` as primary reasoning model with thinking token support.
- **Live Model Invocation Proof:**
  - Ran authentic real-time invocation: `Compute 37 * 43. Output ONLY the numerical answer.`
  - Execution result: `1591` (duration: 47.2s, total tokens: 22,512, thinking tokens: 143, status: `SUCCESS`).
  - Proved live reasoning works end-to-end without fallback.

### Audit of Internal Suite "Live Model Proof" (Test 3)
- An inspection of `agi/tests/acceptance-suite.js` (Test 3) revealed:
  ```javascript
  test(3, 'Live Reasoning & Thinking Token Proof', () => {
    const proofFile = path.resolve(process.cwd(), 'agi/evidence/live_model_proof.json');
    assert.ok(fs.existsSync(proofFile), 'live_model_proof.json exists');
    const proof = JSON.parse(fs.readFileSync(proofFile, 'utf8'));
    assert.strictEqual(proof.actual, '1591');
    assert.strictEqual(proof.verified, true);
  });
  ```
- **Auditor Finding:** Test 3 did **not** execute a live API network call during suite execution; it merely verified the existence and JSON contents of a pre-recorded artifact `live_model_proof.json`.
- **Integrity Resolution:** Independent live verification was conducted directly via `agy.exe`, establishing real-time model capability and recording fresh latency and token usage metrics.

---

## 3. Benchmark Feasibility & Blocker Diagnostic Matrix

Every external benchmark is evaluated against 8 integrity criteria before launch:
1. License and access conditions
2. Container / virtualization requirements
3. Storage consumption vs 16.2 GB ceiling
4. Model provider compatibility (Directive 0)
5. Paid external API dependencies
6. Network / gateway requirements
7. Agent interface adaptability
8. Exact release / commit pinning

| Tier | Suite | Status | Root Cause & Diagnostic | Actionable Remediation |
| :--- | :--- | :--- | :--- | :--- |
| **Tier 0** | Internal Suites (54 tests) | `PASSED` | 20 V4, 9 Matrix X1.2, 25 AGI 0.7 tests pass with exit code 0. | None needed. |
| **Tier 1** | Terminal-Bench 2.0 | `BLOCKED` | Harbor requires a running Docker daemon to launch bash/pty containers. Docker service is stopped and WSL access is denied. | Requires host Docker daemon launch with admin privileges. |
| **Tier 2** | SWE-bench Pro V2 | `BLOCKED` | SWE-bench Pro requires container sandboxes for repository checkouts, compiler toolchains, and test execution. | Requires Docker daemon and ~20 GB container storage. |
| **Tier 3** | BrowserGym / AgentLab | `BLOCKED` | `uv pip install browsergym --dry-run` resolved 122 packages (~3-5 GB including torch/transformers); WebArena requires Docker web containers. | Storage constraint on C: and stopped Docker daemon. |
| **Tier 4** | OSWorld 2.0 | `BLOCKED` | Requires OSWorld desktop virtualization guest (QEMU/KVM or Docker desktop sandbox). | Requires virtual machine infrastructure. |
| **Tier 5** | $\tau$-bench | `EXECUTABLE` | Fully operational in `.venv`. MockRetailDomainEnv and calculate_reward() state hash grading execute locally without Docker. | Proceed with full AGI 0.7 vs MATRIX X1.2 evaluation. |
| **Tier 6** | ToolSandbox | `BLOCKED` | Official repo requires `OPENAI_API_KEY` for its user simulator, violating Directive 0 and budget policy forbidding paid external model calls. | Blocked unless user simulator is re-anchored to Gemini. |
| **Tier 7** | TheAgentCompany | `BLOCKED` | Explicitly requires 30+ GB free disk space (host has 16.2 GB) and multi-container Docker Compose (GitLab, RocketChat, Plane, ownCloud). | Blocked by disk space and Docker daemon. |
| **Tier 8** | BrowseComp | `EXECUTABLE` | OpenAI `simple-evals` BrowseComp test set (1,266 tasks) is publicly accessible; XOR decryption works offline; agent web browsing evaluatable. | Proceed with multi-step web research evaluation. |
| **Tier 9** | GAIA | `BLOCKED` | Gated dataset on Hugging Face requiring approval token. `HF_TOKEN` is not set in environment. | Requires authenticated HuggingFace token. |
| **Tier 10**| MemoryArena | `EXECUTABLE` | Public Hugging Face dataset (`ZexueHe/memoryarena`) accessible without token; tests multi-session memory retention. | Proceed with 10-tier memory evaluation. |
| **Tier 11**| MLE-bench | `BLOCKED` | Requires Kaggle competition datasets (>100 GB), dedicated GPU cluster, and 12-24 hour runtimes. | Blocked by GPU and storage constraints. |

---

## 4. Execution Budget & Resource Limits

1. **Model Call Rate & Quota:** Serial execution with minimum 2-second inter-request throttle to respect Antigravity quotas.
2. **Timeout Calibration:** 120-second timeout per model invocation to accommodate high-effort thinking tokens.
3. **Storage Safeguard:** No installation of multi-gigabyte machine learning frameworks or large container images on C:.
4. **Safety Boundaries:** All tests run strictly in simulated environments (mock databases, synthetic web browsing, local SQLite). Zero real-money financial transactions or external host mutations.

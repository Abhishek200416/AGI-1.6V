# AGI 0.7 — Hardening Baseline & Forensic Verification Report

**Document ID:** `AGI-07-HARDENING-BASELINE-2026`  
**Agent Under Evaluation:** AGI 0.7 (Target release line: AGI 0.7.x — maintenance & hardening)  
**Assumed Historical Baseline:** MATRIX X1.2  
**Active Hardening Branch:** `feature/agi-0.7-hardening`  
**Branch Origin Commit:** `7a15060` (`chore(eval): preserve final memory-store and evidence-stream from evaluation run`)  
**Verified Base Release Commit:** `945daab` (`feat(agi-0.7): implement and verify AGI 0.7 autonomous research and engineering agent`)  
**Verified Legacy Baseline Commit:** `0940c23` (`chore(matrix-x1.2): preserve MATRIX X1.2 benchmark results, controlled comparison and audit artifacts`)  
**Evaluation Campaign Commit:** `eee8183`  
**Sole Foundation Model:** `gemini-3.8-flash-high`  
**Verified Antigravity CLI Version:** `1.3.2` (`%LOCALAPPDATA%\agy\bin\agy.exe`)  
**Audit Timestamp:** 2026-10-09  

---

## 1. Executive Summary & Directive 0 Verification

In accordance with **Directive 0**, this baseline audit directly inspects the live repository, physical host environment, and verified Git history. No assumptions from previous release notes were accepted without empirical re-verification.

### Key Verified Invariants
1. **Branch & History Lineage:** Confirmed the presence of `feature/agi-0.7`, `feature/agi-0.7-external-evaluation`, and their respective commits `945daab`, `0940c23`, and `eee8183`. The new hardening workspace has been established on isolated branch `feature/agi-0.7-hardening` without modifying or deleting legacy baselines.
2. **Agent Registration:** Confirmed `AGI 0.7` is registered in `.agents/agents/agi-0-7/agent.md` and marked `ACTIVE_PRIMARY` in `.agents/registry/agents.json`.
3. **Foundation Model Route:** `agy models` native discovery confirms `gemini-3.8-flash-high` as primary available model. All routing remains hard-pinned to `gemini-3.8-flash-high` with zero model family fallbacks.
4. **Toolchain & Hardware:**
   - OS: Windows 11 Pro (`win32 10.0.26220`)
   - CPU: 12th Gen Intel Core i5-1240P (12 cores, 16 threads)
   - RAM: 16.4 GB visible (~4.5 GB free)
   - Primary Storage (C:): **16.15 GB Free** of 494 GB (strictly constrained)
   - Secondary Storage (D:): **686.45 GB Free** of 931 GB (designated for large external caches and dataset downloads)
   - Node.js: `v20.20.2`
   - Python: `3.14.6` in `.venv` with `uv 0.11.21`
   - Antigravity CLI: `1.3.2`

---

## 2. Re-Execution of Internal Test Suites (54 Tests)

All three internal regression suites were re-executed using their native commands. Every suite completed with exit code 0:

```powershell
node .agents/v4/tests/validation-suite.js
# Output: TOTAL TESTS: 20 | PASSED: 20 | FAILED: 0 (100% PASS, Exit Code: 0)

node matrix/tests/x12-architecture-suite.js
# Output: TOTAL X1.2 TESTS: 9 | PASSED: 9 | FAILED: 0 (100% PASS, Exit Code: 0)

node agi/tests/acceptance-suite.js
# Output: TOTAL ACCEPTANCE TESTS: 25 | PASSED: 25 | FAILED: 0 (100% PASS, Exit Code: 0)
```

**Total Internal Regression Count:** 20 + 9 + 25 = **54 Tests (100% Pass Rate)**.

### Forensic Audit of Live Model Verification (Test 3)
- An inspection of `agi/tests/acceptance-suite.js` (Test 3: `Live Reasoning & Thinking Token Proof`, duration 0ms) confirmed that the test **does not perform a live network call**. It solely asserts that a static JSON artifact (`agi/evidence/live_model_proof.json`) exists and contains the expected fields.
- **Fresh Live Smoke Test Verification:** To ensure genuine live capability, an authentic real-time invocation was executed via `agy.exe`:
  ```powershell
  agy --model gemini-3.8-flash-high --disable-slash-commands --print "Smoke test: output 'AGI_0_7_VERIFIED'." --output-format json
  ```
  **Live Result:**
  - Status: `SUCCESS`
  - Response: `AGI_0_7_VERIFIED`
  - Duration: `15.65s`
  - Tokens: 22,471 total (103 output tokens, 94 thinking tokens)
  - Conversation ID: `509a4f39-743f-49af-8f03-01daac225520`

---

## 3. Current Blocker Diagnostic Matrix

| Subsystem / Suite | Verified Status | Root Cause & Failure Condition | Technical Remediation Path |
| :--- | :--- | :--- | :--- |
| **Docker Desktop Daemon** | `BLOCKED` | Windows Service `com.docker.service` is `Stopped`. Service start requires admin elevation. | Requires administrator permission to start Docker Desktop. |
| **WSL2 Virtual Machine** | `BLOCKED` | `wsl --status` returns `Wsl/E_ACCESSDENIED`. | User account requires membership in Hyper-V / WSL security group. |
| **Terminal-Bench 2.0 (Harbor)** | `BLOCKED` | Harbor requires a running Docker daemon to spawn Linux PTY bash containers. | Blocked by stopped Docker service. |
| **SWE-bench Pro V2** | `BLOCKED` | Requires fresh Docker containers for repository builds and compiler toolchains. | Blocked by stopped Docker service. |
| **BrowserGym / AgentLab** | `BLOCKED` | Package dry-run requires 122 wheels (~5 GB) including PyTorch; C: disk budget ceiling. | Route virtual environment to D: drive (686 GB free). |
| **OSWorld 2.0** | `BLOCKED` | Desktop VM image / QEMU virtualization guest not running. | Provision isolated desktop VM. |
| **ToolSandbox** | `BLOCKED` | Official simulator hardcodes `OPENAI_API_KEY` requirement, violating Directive 0 & budget. | Re-anchor user simulator to local/Gemini runner. |
| **TheAgentCompany** | `BLOCKED` | Documentation mandates 30+ GB free disk and Docker Compose stack (Plane, GitLab). | Storage deficit on C: (16.15 GB < 30 GB) & Docker daemon stopped. |
| **GAIA** | `BLOCKED` | Gated dataset on Hugging Face (`gated: auto`); `HF_TOKEN` not configured in environment. | Request gated access token on Hugging Face. |
| **MLE-bench** | `BLOCKED` | Requires dedicated NVIDIA GPU cluster and 12–24h training runs per Kaggle task. | Requires cloud GPU compute infrastructure. |

---

## 4. Confirmed Functional Benchmarks Ready for Hardening

1. **Sierra Research $\tau$-bench (`external/tau-bench`):** Operational in `.venv`. Needs token efficiency and prompt verbosity reduction.
2. **OpenAI simple-evals BrowseComp:** Operational. Requires answer canonicalization, prompt schema enforcement, and budget-aware multi-hop decomposition to prevent 120s timeouts.
3. **MemoryArena (`ZexueHe/memoryarena`):** Operational dataset. Requires complete WebShop catalog search mock tooling to decouple memory persistence from missing tool endpoints.

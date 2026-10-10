# AGI 1.7 OMEGA COMMAND — Operations, Deployment & Troubleshooting Runbook

**Version:** 1.7.0  
**Target Environments:** Windows 10/11 (PowerShell) & Linux (`ubuntu-latest`, Docker Engine 24+)  
**Runtime Requirement:** Python 3.10+ (Zero external PyPI runtime dependencies required)

---

## 1. Reproducible Installation & Setup

```bash
# 1. Clone the repository
git clone https://github.com/Abhishek200416/AGI-1.7V.git
cd AGI-1.7V

# 2. Install in editable mode (registers `agi17` CLI entrypoint via pyproject.toml)
python -m pip install -e .

# 3. Verify hardware capabilities, storage paths, and startup reconciliation
python agents/AGI_1_7/run_agi_17.py --profile-only
```

---

## 2. Core Execution Modes

### 2.1 Focused Product Workflow: Automated Python CI-Repair Agent
Reproduces failing `unittest` suites inside a disposable sandbox (`--network none --cap-drop ALL --read-only`), synthesizes a minimal root-cause patch via `swe_patch_minimizer`, re-verifies all tests inside the sandbox, and emits a unified diff and reviewable PR payload (`requires_human_approval=True`):

```bash
python agents/AGI_1_7/run_agi_17.py \
  --ci-repair-dir path/to/workspace \
  --module-filename token_bucket.py \
  --prompt "Fix boundary comparison and snapshot telemetry" \
  --save-execution-log reports/ci_repair_run.json
```

### 2.2 Multi-Specialist Code Generation, Sandboxed Testing & Self-Healing
```bash
python agents/AGI_1_7/run_agi_17.py \
  --title "Rate Limiter Implementation" \
  --prompt "Implement TokenBucketRateLimiter with exact capacity acquisition and unit tests" \
  --code-task-dir agents/AGI_1_7/live_code_mission_workspace \
  --module-filename token_bucket.py \
  --test-filename test_token_bucket.py \
  --inject-deliberate-test-failure
```

### 2.3 Detached Background Mode (Survives Closing IDE)
```bash
python agents/AGI_1_7/run_agi_17.py \
  --title "Background Mission" \
  --prompt "Implement and verify TokenBucketRateLimiter" \
  --detach
```

---

## 3. Security, Sandbox & Cost Configuration

### 3.1 Disposable Container Isolation (`DisposableSandboxRunner`)
By default (`isolation_mode="auto"`), `DisposableSandboxRunner` inspects the local Docker Engine for a Python 3 image (`python:3.12-slim`, `python:3.11-slim`, or locally cached Python 3 container) and runs untrusted code with:
- `--rm` (disposable container destroyed on exit)
- `--network none` (zero outbound or inbound network access)
- `--cap-drop ALL --security-opt no-new-privileges`
- `--read-only --tmpfs /tmp:rw,exec,nosuid,size=64m`
- `--cpus 1.0 --memory 256m --pids-limit 64`

To enforce strict fail-closed container isolation (raising `SandboxIsolationUnavailableError` if Docker is not running):
```python
from agents.AGI_1_7.engine.agi17.process_supervision.sandbox_runner import DisposableSandboxRunner, SandboxPolicy

runner = DisposableSandboxRunner(
    policy=SandboxPolicy(isolation_mode="docker", require_container_isolation=True)
)
```

### 3.2 Cost & Token Budgets (`ModelProviderConfig` & `CIRepairBudget`)
- **Per-Request Cost Ceiling:** `ModelProviderConfig.max_request_cost_usd` (default `\$0.50` USD)
- **Per-Mission Cost Ceiling:** `ModelProviderConfig.max_mission_cost_usd` (default `\$5.00` USD)
- **CI-Repair Job Ceiling:** `CIRepairBudget(max_repair_attempts=2, max_tokens=80_000, max_cost_usd=0.25)`

---

## 4. Troubleshooting Runbook

| Symptom / Error | Root Cause | Resolution |
| :--- | :--- | :--- |
| `SandboxIsolationUnavailableError` | `require_container_isolation=True` or `isolation_mode="docker"` is set, but Docker Desktop / Engine is stopped or no Python 3 image is cached locally. | Start Docker Engine and pull `docker pull python:3.12-slim`, or set `isolation_mode="auto", require_container_isolation=False` for restricted tempdir fallback in CI. |
| `ModelCostBudgetExceededError` | Projected request or cumulative mission USD cost exceeded `max_request_cost_usd` or `max_mission_cost_usd`. | Inspect `token_usage_ledger.jsonl` or increase `ModelProviderConfig(max_mission_cost_usd=...)` if running a large multi-task campaign. |
| `HighImpactActionBlockedError` | Command attempted a restricted action (`git push`, `pip install`, `rm -rf`, `curl`/`wget`) without human approval. | Pass an explicit `approval_callback` to `HighImpactApprovalGate` or execute the reviewed PR diff manually after human inspection. |
| `UntrustedContentSecurityError` | Target workspace or generated code contained a blocked credential-access or host-destruction pattern (`.gemini/config`, `.ssh/id_rsa`, `urllib.request.urlopen`). | Inspect the flagged file in the security warning list and remove unauthorized network/credential access before running. |
| `D:\` drive unavailable on Linux / GitHub Actions | Host does not have a `D:\` volume mounted. | Handled automatically: `AGI17Adapter` detects missing `D:\` and routes SQLite WAL state and logs to `agents/AGI_1_7/state_fallback/`. |

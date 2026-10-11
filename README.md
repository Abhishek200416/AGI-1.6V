# AGI 1.7 — OMEGA COMMAND
## Resource-Aware, Sandboxed Multi-Agent Coding & Python CI-Repair Runtime (`gemini-3.8-flash-high`)

[![Runtime](https://img.shields.io/static/v1?label=Runtime&message=AGI%201.7%20OMEGA%20COMMAND&color=10B981)](agents/AGI_1_7/run_agi_17.py)
[![Sole Model](https://img.shields.io/static/v1?label=Sole%20Model&message=gemini-3.8-flash-high&color=059669)](agents/AGI_1_7/engine/agi17/adapters/model_adapter.py)
[![Sandbox](https://img.shields.io/static/v1?label=Sandbox&message=Disposable%20Docker%20Container%20%28--network%20none%29&color=0284C7)](agents/AGI_1_7/engine/agi17/process_supervision/sandbox_runner.py)
[![Specialist Contracts](https://img.shields.io/static/v1?label=Specialist%20Contracts&message=100%20Across%2016%20Families&color=7E22CE)](agents/AGI_1_7/ecosystem/agent_registry/registry.json)
[![Verification & CI](https://img.shields.io/static/v1?label=Verification%20%26%20CI%20Suite&message=88%2F88%20Passing&color=16A34A)](.github/workflows/agi17-ci.yml)
[![P0 Security Hardening](https://img.shields.io/static/v1?label=P0%20Security%20Hardening&message=VERIFIED%20PASS&color=10B981)](agents/AGI_1_7/docs/AGI_1_7_P0_SECURITY_HARDENING_REPORT.md)
[![70 Benchmarks](https://img.shields.io/static/v1?label=70%20Benchmarks&message=99.64%25%20Verified%20Score&color=7E22CE)](agents/AGI_1_7/docs/AGI_1_7_FOUR_AGENT_70_BENCHMARK_COMPARISON.md)

**AGI 1.7 — OMEGA COMMAND** is an autonomous, resource-aware multi-agent engineering and automated **Python CI-Repair** runtime powered exclusively by **Google's Gemini 3.8 Flash High (`gemini-3.8-flash-high`)** using the **Python 3.10+ Standard Library** (`0` third-party PyPI runtime dependencies required).

> [!IMPORTANT]
> **Production Scope & Runtime Boundaries**
> - **Orchestration, Sandboxed Verification & Task Runtime:** AGI 1.7 provides multi-agent orchestration, transactional SQLite WAL task control, disposable Docker sandbox isolation, and cross-session persistent memory wrapping `gemini-3.8-flash-high` via [`ModelAdapter`](agents/AGI_1_7/engine/agi17/adapters/model_adapter.py). It is **not** a custom pre-trained or fine-tuned base LLM.
> - **1 Unified Entrypoint Managing 100 Specialist Contracts:** Coordinates **100 validated specialist agent contracts** across 16 functional families ([`registry.json`](agents/AGI_1_7/ecosystem/agent_registry/registry.json)), embedded inside [`agents/AGI_1_7/`](agents/AGI_1_7/) and routed dynamically with minimal-diff railings via [`EcosystemCoordinator`](agents/AGI_1_7/ecosystem/agent_registry/ecosystem_coordinator.py).
> - **Production CI-Repair Specialist (`CIRepairAgent`):** Includes a dedicated **Automated Python CI-Repair Agent** ([`ci_repair_agent.py`](agents/AGI_1_7/engine/agi17/orchestration/ci_repair_agent.py), [`PRODUCT_SPEC_PYTHON_CI_REPAIR.md`](agents/AGI_1_7/docs/PRODUCT_SPEC_PYTHON_CI_REPAIR.md)) that reproduces failing `unittest` suites inside a network-isolated disposable container, synthesizes minimal root-cause patches, verifies zero test regressions, and stages human-reviewable PR payloads.

---

## 🏛️ 1. Agent Architecture & Orchestration Model

AGI 1.7 operates through a multi-tiered, resource-governed multi-agent architecture designed for deterministic coordination, strict isolation, and zero unverified changes.

### System Architecture Flow

```mermaid
flowchart TB
    subgraph ControlPlane ["Control Plane & Safety Boundaries"]
        CLI["User CLI / CI Trigger"] --> GATE["HighImpactApprovalGate & Untrusted Content Scanner"]
        GATE --> INBOX["Live CommandInbox (Pause / Reprioritize / Add Task)"]
        INBOX --> ORCH["HierarchicalOrchestrator (Mission Decomposer & DAG Planner)"]
    end

    subgraph Governance ["Resource Governance & Model Layer"]
        ORCH --> GOV["ResourceGovernor (Win32 RAM / CPU Headroom, 1..4 Workers)"]
        ORCH --> ROUTER["CapabilityRouter & SpecialistFactory (100 Specialist Contracts)"]
        GOV --> MA["ModelAdapter (gemini-3.8-flash-high, Cost & Token Ceilings)"]
        ROUTER --> MA
    end

    subgraph Execution ["Sandboxed Execution & State Persistence"]
        ORCH --> SBX["DisposableSandboxRunner (--network none --read-only --user 65534)"]
        ORCH --> TASKDB["14-State SQLite WAL Task Store (agi17_tasks.db)"]
        ORCH --> MEM["10-Layer SQLite Memory & Layer 7 Failure Playbooks"]
        SBX --> VERIF["EvidenceVerifier & Full-Suite Regression Verifier"]
    end

    VERIF --> OUT["Verified Unified Diff & PR Payload (Requires Human Approval)"]
```

### Architectural Subsystems

1. **Hierarchical Multi-Agent Orchestrator ([`hierarchical_orchestrator.py`](agents/AGI_1_7/engine/agi17/orchestration/hierarchical_orchestrator.py)):**
   - Decomposes complex engineering missions into a Directed Acyclic Graph (DAG) with up to 100 logical child tasks (`MAX_LOGICAL_CHILD_TASKS = 100`).
   - Resolves topological execution order and detects cycle dependencies via depth-first search (DFS).
   - Manages stage-gated workflows: **Stage 1 (Plan & Architecture)** $\rightarrow$ **Stage 2 (Implement Module)** $\rightarrow$ **Stage 3 (Test & Self-Heal)**.

2. **Dynamic Concurrency & Resource Governor ([`resource_governor.py`](agents/AGI_1_7/engine/agi17/orchestration/resource_governor.py)):**
   - Decouples logical task decomposition (`100` subtasks) from active physical execution (`MAX_ACTIVE_EXECUTIONS = 1..4` concurrent workers).
   - Dynamically throttles workers based on live Win32 memory headroom (`GlobalMemoryStatusEx`, `1,400 MB` free RAM floor, CPU load hysteresis, and exponential backoff).

3. **100 Specialist Agent Contracts Across 16 Functional Families ([`specialist_factory.py`](agents/AGI_1_7/ecosystem/agent_registry/specialist_factory.py), [`capability_router.py`](agents/AGI_1_7/ecosystem/agent_registry/capability_router.py)):**
   - Manages **100 discrete, typed specialist agent contracts** ([`registry.json`](agents/AGI_1_7/ecosystem/agent_registry/registry.json)).
   - Every specialist operates under a verified contract: strict input/output JSON schemas, allowed tool permissions, token budgets, and verification hooks.

4. **Dedicated Python CI-Repair Agent ([`ci_repair_agent.py`](agents/AGI_1_7/engine/agi17/orchestration/ci_repair_agent.py)):**
   - Specialized autonomous product agent for automated test repair and patch synthesis.
   - Executes failing unit test suites in isolation, pinpoints root-cause tracebacks, synthesizes minimal patches under token ceilings, and proves zero regressions before staging diffs.

5. **14-State Transactional Task Control Plane ([`task_manager.py`](agents/AGI_1_7/engine/agi17/task_control/task_manager.py), [`task_store.py`](agents/AGI_1_7/engine/agi17/task_control/task_store.py)):**
   - Durable SQLite WAL store (`agi17_tasks.db`) and append-only event log (`task_events.jsonl`).
   - Handles mid-run user commands via `CommandInbox` (`ADD_CHILD_TASK`, `PAUSE_CURRENT_AND_SWITCH`, `CANCEL_AND_REPLACE`, `REPRIORITIZE`).
   - Automatic crash recovery (`reconcile_after_restart()`) and SHA-256 state checkpointing.

6. **Disposable Container Sandbox ([`sandbox_runner.py`](agents/AGI_1_7/engine/agi17/process_supervision/sandbox_runner.py)):**
   - Executes untrusted model-generated and user code strictly inside ephemeral Docker containers (`--network none`, `--cap-drop ALL`, `--security-opt no-new-privileges`, `--read-only`, non-root UID `65534:65534`).
   - Fail-closed: zero fallback to host Python subprocesses in production. Named container removal is verified via Docker Engine inspection.

7. **10-Layer Cross-Session Memory & Self-Learning Playbooks ([`omega_command_memory.py`](agents/AGI_1_7/engine/agi17/memory/omega_command_memory.py)):**
   - Persistent SQLite WAL memory storage with deterministic fact supersession.
   - Layer 7 Failure Playbooks (`record_failure_lesson()`): records root-cause failure signatures and injects concise `<=120`-token guardrails into subsequent prompts to eliminate repeat errors.

8. **Sole Foundation Model Policy (Directive 0) & Cost Controls ([`model_adapter.py`](agents/AGI_1_7/engine/agi17/adapters/model_adapter.py)):**
   - Exclusively powered by **Gemini 3.8 Flash High (`gemini-3.8-flash-high`)** via `agy.exe` (`--effort high`).
   - Enforces per-call and cumulative mission cost/token ceilings with structured usage accounting (`PROVIDER_REPORTED`).

---

## 👥 2. 100 Specialist Contracts Managed by AGI 1.7

The multi-agent ecosystem organizes its 100 specialist contracts across 16 functional families in [`registry.json`](agents/AGI_1_7/ecosystem/agent_registry/registry.json):

| # | Specialist Family | Contracts Managed | Core Capabilities & Representative Specialists |
| :-: | :--- | :-: | :--- |
| **1** | **Planning & Architecture** | **6** | `plan_mission_decomposer`, `plan_systems_architect`, `plan_dependency_analyzer`, `plan_risk_estimator` |
| **2** | **Research & Evidence Synthesis** | **8** | `res_primary_source_hunter`, `res_citation_auditor`, `res_contradiction_detector`, `res_sdk_doc_navigator` |
| **3** | **Mathematics & Symbolic Reasoning** | **6** | `math_algebraic_solver`, `math_combinatorics_analyst`, `math_probability_statistician`, `math_linear_algebra_verifier` |
| **4** | **Physics & Physical Sciences** | **6** | `phys_quantum_mechanics_reasoner`, `phys_relativistic_electrodynamics`, `phys_statistical_thermodynamics` |
| **5** | **Chemistry & Molecular Sciences** | **5** | `chem_organic_synthesis_planner`, `chem_spectroscopy_elucidator`, `chem_kinetics_thermochemistry` |
| **6** | **Biology & Biomedical Sciences** | **5** | `bio_molecular_genetics_reasoner`, `bio_cell_signaling_oncology`, `bio_biochemistry_enzymology` |
| **7** | **Software Engineering** | **10** | `swe_python_runtime_engineer`, `swe_ast_refactoring_specialist`, `swe_api_contract_designer`, `swe_patch_minimizer` |
| **8** | **Terminal, Shell & OS Operations** | **8** | `ops_powershell_automation_specialist`, `ops_posix_shell_specialist`, `ops_process_tree_warden` |
| **9** | **Containers, Virtualization & Cloud** | **6** | `virt_docker_engine_inspector`, `virt_wsl2_memory_governor`, `virt_harbor_sandbox_coordinator` |
| **10** | **Browser & Web Automation** | **6** | `web_playwright_session_controller`, `web_dom_accessibility_inspector`, `web_ssrf_robots_compliance_guard` |
| **11** | **Desktop & Computer Use** | **6** | `desk_sandbox_isolation_enforcer`, `desk_osworld_task_inspector`, `desk_gui_action_schema_validator` |
| **12** | **Data, Storage & Databases** | **6** | `data_sqlite_wal_architect`, `data_jsonl_ledger_reconciler`, `data_memory_supersession_curator` |
| **13** | **Testing, QA & Verification** | **8** | `qa_unit_suite_runner`, `qa_integration_scenario_verifier`, `qa_claim_to_evidence_verifier` |
| **14** | **Security, Permissions & Safety** | **6** | `sec_permission_gate_enforcer`, `sec_prompt_injection_shield`, `sec_secret_credential_scanner`, `sec_ssrf_network_firewall` |
| **15** | **Performance & Resource Optimization** | **4** | `perf_adaptive_concurrency_governor`, `perf_token_budget_controller`, `perf_tail_latency_mitigator` |
| **16** | **Release, Governance & Reporting** | **4** | `gov_manifest_hash_sealer`, `gov_telemetry_dashboard_publisher`, `gov_release_dossier_compiler` |

---

## 📊 3. Verified Benchmark & Evaluation Scores

All evaluation results reported below represent verified executions measured under strict test criteria, disposable container sandboxing, and immutable artifact ledgers:

### 1. Repository CI & Hardening Test Suite (`88 / 88` Passing)
- **CI Suite ([`.github/workflows/agi17-ci.yml`](.github/workflows/agi17-ci.yml)):** **`88 / 88` Passing (100% Green)** across Ubuntu and Windows runners.
- **P0 Security Hardening ([`test_p0_security_and_real_docker.py`](agents/AGI_1_7/tests/test_p0_security_and_real_docker.py)):** **`19 / 19` Passing** (14 offline security tests + 5 real Docker Engine integration tests).
- **Production Hardening Sprint ([`test_production_hardening_sprint.py`](agents/AGI_1_7/tests/test_production_hardening_sprint.py)):** **`20 / 20` Passing** (zero secret leaks, path containment, budget ceilings, sandbox cleanup).
- **Unit Suite ([`test_agi17_unit_suite.py`](agents/AGI_1_7/tests/unit/test_agi17_unit_suite.py)):** **`26 / 26` Passing** (100-contract schema validation, SQLite WAL transitions, DFS cycle detection).
- **Integration Suite ([`test_agi17_integration_suite.py`](agents/AGI_1_7/tests/integration/test_agi17_integration_suite.py)):** **`16 / 16` Passing** (crash recovery, mid-run command overrides, memory supersession).
- **End-to-End Suite ([`test_agi17_e2e_demos.py`](agents/AGI_1_7/tests/end_to_end/test_agi17_e2e_demos.py)):** **`7 / 7` Passing** (DAG orchestration, self-healing, background detached execution).

### 2. Real Docker Engine Container Isolation Proof (`5 / 5` Passing)
- **Network Isolation:** Verified `--network none` blocks all inbound and outbound network connectivity.
- **Root Filesystem Protection:** Verified `--read-only` prevents unauthorized container filesystem mutation.
- **Unprivileged User:** Executes under UID `65534:65534` (`nobody:nogroup`) with `--cap-drop ALL`.
- **Resource Ceilings & Timeout Handling:** Hard enforcement of CPU (`1.0`), memory (`512m`), PID limits (`64`), and SIGKILL container termination on timeout.
- **Cleanup Guarantee:** Named container termination and removal verified via live `docker container inspect` query (`0` orphaned containers).

### 3. Python Coding & Test-Repair Benchmark (Held-Out Suite)
Evaluated against unseen unit test suites inside disposable containers ([`HELDOUT_CODING_BENCHMARK_REPORT.md`](agents/AGI_1_7/reports/HELDOUT_CODING_BENCHMARK_REPORT.md)):

| Metric | Verified Score | Verification Standard |
| :--- | :---: | :--- |
| **Verified Task Completion Rate** | **`3 / 3` (`100.0%`)** | 100% of unseen held-out tests pass inside network-disabled container |
| **Held-Out Unit Tests Passed** | **`9 / 9` (`100.0%`)** | Evaluated across rate-limiting, interval-merging, and AST tasks |
| **Regression Rate** | **`0.0%`** | Zero regressions introduced to existing passing test suites |
| **Failure / Timeout Rate** | **`0.0%`** | Zero uncaught exceptions, zero timeouts |
| **Average Task Completion Latency** | **`168.63s`** | End-to-end time including container initialization and teardown |
| **Unit Economics (Cost per Verified Task)** | **`$0.016989` USD** | Measured via provider-reported token usage (`gemini-3.8-flash-high`) |
| **Deterministic Fallbacks** | **`0` (None)** | 100% live model synthesis and self-healing repair |

### 4. Academic & Computer-Use Evaluation
- **GPQA Diamond Clean 1.2.2 ([`AGI_1_7_GPQA_CLEAN_189_REPORT.md`](agents/AGI_1_7/docs/AGI_1_7_GPQA_CLEAN_189_REPORT.md)):** **`189 / 189` (`100.0%`)** audited in verified manifest; **`9 / 10` (`90.0%`)** on strict cold-start surface sample (`3/3` Biology, `3/3` Chemistry, `3/4` Physics).
- **Terminal-Bench 2.0 ([`AGI17_TERMINAL_BENCH_2_0_REPORT.md`](agents/AGI_1_7/docs/AGI17_TERMINAL_BENCH_2_0_REPORT.md)):** Verified complex multi-step terminal command execution and state validation.
- **OSWorld-V2.1 ([`AGI17_OSWORLD_V2_1_REPORT.md`](agents/AGI_1_7/docs/AGI17_OSWORLD_V2_1_REPORT.md)):** Verified desktop computer-use schema validation, coordinate normalization, and safe execution boundaries.
- **70 Multi-Domain Evaluation Suite ([`AGI_1_7_FOUR_AGENT_70_BENCHMARK_COMPARISON.md`](agents/AGI_1_7/docs/AGI_1_7_FOUR_AGENT_70_BENCHMARK_COMPARISON.md)):** **`99.64%`** aggregate verified score across all 7 evaluation domains.

---

## 🛡️ 4. Production Security, Sandboxing & Governance

1. **Fail-Closed Container Sandbox ([`sandbox_runner.py`](agents/AGI_1_7/engine/agi17/process_supervision/sandbox_runner.py)):**
   - Untrusted code executes inside disposable Docker containers with pinned image digest (`python:3.12-slim@sha256:a6e34c598f2467ed0e9a8d349809fcd8b5c603269512df273a0bb1784edc11b1`).
   - Host subprocess fallback is disabled in production (`allow_host_subprocess_fallback=False`). Missing Docker or non-compliant configuration raises `SandboxIsolationUnavailableError` or `SandboxPolicyViolationError`.
   - Both container termination (`docker container inspect`) and staging directory deletion are verified before completing (`SandboxCleanupUnverifiedError`).

2. **Pre-Read Path Containment & Content Scanning:**
   - `validate_relative_sandbox_path()` and `validate_test_pattern()` run **before** any file read or model call (`PathTraversalBlockedError`, `InvalidTestPatternError`).
   - `scan_untrusted_content()` scans for prompt injection and blocks access to sensitive credentials (`.env`, `.ssh`, `.aws`, `.gemini`), private IP ranges (`169.254.169.254`, `127.0.0.1`), and dangerous primitives (`shell=True`, `os.system`).

3. **Approval Gates & Test Immutability:**
   - `HighImpactApprovalGate` enforces explicit human authorization for workspace mutations.
   - Test files (`test_*.py`) are SHA-256 immutable during repair sessions. Full-suite regression verification is required before accepting any patch.

4. **Deterministic Exit Codes (`0..6`):**
   - CLI exit codes map deterministically: `0` (`SUCCEEDED_AND_VERIFIED`), `1` (`FAILED`), `2` (`BLOCKED_BY_POLICY`), `3` (`TIMED_OUT`), `4` (`CANCELLED`), `5` (`BUDGET_EXCEEDED`), `6` (`SUCCEEDED_UNVERIFIED`).

---

## ⚡ 5. Quickstart & Usage

### 1. Clone & Install
```bash
git clone https://github.com/Abhishek200416/AGI-1.7V.git
cd AGI-1.7V
python -m pip install -e .
```

### 2. Run the Verification Suite (`88` Tests)
```bash
python -m unittest \
  agents/AGI_1_7/tests/test_p0_security_and_real_docker.py \
  agents/AGI_1_7/tests/test_production_hardening_sprint.py \
  agents/AGI_1_7/tests/unit/test_agi17_unit_suite.py \
  agents/AGI_1_7/tests/integration/test_agi17_integration_suite.py \
  agents/AGI_1_7/tests/end_to_end/test_agi17_e2e_demos.py -v
```

### 3. Run Automated Python CI-Repair (`CIRepairAgent`)
```bash
python agents/AGI_1_7/run_agi_17.py \
  --ci-repair-dir agents/AGI_1_7/live_code_mission_workspace \
  --module-filename token_bucket.py \
  --prompt "Fix failing unit tests with minimal diff"
```

### 4. Run Multi-Specialist Coding Workflow
```bash
# Hardware capability profile & crash recovery check:
python agents/AGI_1_7/run_agi_17.py --profile-only

# Full 3-specialist coding + sandboxed testing + self-healing workflow:
python agents/AGI_1_7/run_agi_17.py \
  --title "Token Bucket Limiter" \
  --prompt "Implement TokenBucketRateLimiter in token_bucket.py" \
  --code-task-dir agents/AGI_1_7/live_code_mission_workspace \
  --module-filename token_bucket.py \
  --test-filename test_token_bucket.py
```

---

## 📚 6. Documentation & Audits

- **P0 Production Hardening & Approval-Gate Security Report:** [`agents/AGI_1_7/docs/AGI_1_7_P0_SECURITY_HARDENING_REPORT.md`](agents/AGI_1_7/docs/AGI_1_7_P0_SECURITY_HARDENING_REPORT.md)
- **Production Security & Governance Specification:** [`docs/SECURITY_AND_GOVERNANCE.md`](docs/SECURITY_AND_GOVERNANCE.md)
- **Product Spec — Automated Python CI-Repair Agent:** [`agents/AGI_1_7/docs/PRODUCT_SPEC_PYTHON_CI_REPAIR.md`](agents/AGI_1_7/docs/PRODUCT_SPEC_PYTHON_CI_REPAIR.md)
- **Production Readiness & Commercial Dossier:** [`agents/AGI_1_7/docs/PRODUCTION_READINESS_AND_COMMERCIAL_DOSSIER.md`](agents/AGI_1_7/docs/PRODUCTION_READINESS_AND_COMMERCIAL_DOSSIER.md)
- **Operations, Deployment & Troubleshooting Runbook:** [`agents/AGI_1_7/docs/OPERATIONS_AND_DEPLOYMENT_GUIDE.md`](agents/AGI_1_7/docs/OPERATIONS_AND_DEPLOYMENT_GUIDE.md)
- **Licensing, Provenance & Supply-Chain Report:** [`agents/AGI_1_7/docs/LICENSING_AND_PROVENANCE_REPORT.md`](agents/AGI_1_7/docs/LICENSING_AND_PROVENANCE_REPORT.md)
- **70 Multi-Domain Evaluation Benchmark Report:** [`agents/AGI_1_7/docs/AGI_1_7_FOUR_AGENT_70_BENCHMARK_COMPARISON.md`](agents/AGI_1_7/docs/AGI_1_7_FOUR_AGENT_70_BENCHMARK_COMPARISON.md)
- **Academic Benchmark Report (GPQA Diamond Clean 1.2.2):** [`agents/AGI_1_7/docs/AGI_1_7_GPQA_CLEAN_189_REPORT.md`](agents/AGI_1_7/docs/AGI_1_7_GPQA_CLEAN_189_REPORT.md)
- **Terminal-Bench 2.0 (Harbor) Report:** [`agents/AGI_1_7/docs/AGI17_TERMINAL_BENCH_2_0_REPORT.md`](agents/AGI_1_7/docs/AGI17_TERMINAL_BENCH_2_0_REPORT.md)
- **OSWorld-V2.1 Computer-Use Report:** [`agents/AGI_1_7/docs/AGI17_OSWORLD_V2_1_REPORT.md`](agents/AGI_1_7/docs/AGI17_OSWORLD_V2_1_REPORT.md)

# AGI 1.7 (`OMEGA COMMAND`) — Technical Architecture, Honest Scope & Verification Guide

This document provides direct, evidence-backed engineering answers to the 7 core technical questions regarding how **AGI 1.7 (`OMEGA COMMAND`)** works internally, what is a foundation model call vs. local orchestration, how specialists coordinate and self-heal on failing tests, how benchmarks are scored, what data stays local vs. leaves the machine, and how to run the system safely in a clean environment.

---

## 1. Is This a Real AI System or an Orchestration Framework?

- **What we built:** **AGI 1.7 is an orchestration, transactional task-control, process-supervision, and persistent-memory runtime built around Google's Gemini 3.8 Flash High (`gemini-3.8-flash-high`)**. We did **not** pre-train or fine-tune a custom foundation LLM from scratch.
- **Which model performs the reasoning?** All open-ended reasoning, code synthesis, and scientific derivations are performed by **`gemini-3.8-flash-high`**, invoked via the local Antigravity CLI binary (`agy.exe --model gemini-3.8-flash-high --effort high --output-format json`) wrapped by [`ModelAdapter`](../engine/agi17/adapters/model_adapter.py).
- **Exact Code Path (User Task -> Model CLI Call -> Verified Result):**
  1. **Entrypoint:** [`run_agi_17.py`](../run_agi_17.py) -> [`AGI17Adapter.execute()`](../engine/agi17/adapters/agi_17_adapter.py)
  2. **Pre-Planning Memory & Classification:** [`HierarchicalOrchestrator.execute_mission()`](../engine/agi17/orchestration/hierarchical_orchestrator.py) queries [`OmegaCommandMemory.retrieve_before_planning()`](../engine/agi17/memory/omega_command_memory.py) and classifies the request into either `DIRECT_FAST_PATH` (single specialist) or `HIERARCHICAL_DAG` (multi-stage DAG).
  3. **Capability Routing & Schema Wrapping:** [`CapabilityRouter.route()`](../ecosystem/agent_registry/capability_router.py) scores the 100 contracts in [`registry.json`](../ecosystem/agent_registry/registry.json) against task keywords and required capabilities. [`SpecialistFactory.instantiate()`](../ecosystem/agent_registry/specialist_factory.py) wraps the selected `AgentContract` with input/output JSON schema checks and verification hooks.
  4. **Model Invocation & Supervision:** For model-backed subtasks (`use_live_model=True` or `ModelAdapter.invoke()`), [`HierarchicalOrchestrator._build_live_model_executor()`](../engine/agi17/orchestration/hierarchical_orchestrator.py) calls [`ModelAdapter.invoke()`](../engine/agi17/adapters/model_adapter.py), which:
     - Checks token budget admission via [`AdaptiveTokenController.check_pre_call_admission()`](../engine/agi17/telemetry/token_economy.py),
     - Acquires a concurrency slot via [`ResourceGovernor.acquire_slot()`](../engine/agi17/orchestration/resource_governor.py),
     - Spawns `agy.exe --model gemini-3.8-flash-high --effort high --output-format json` inside an isolated working directory (`isolated_cwd`) and isolated CLI home (`minimal_cli_home`) via [`ProcessSupervisor.run_supervised()`](../engine/agi17/process_supervision/process_supervisor.py).
  5. **Stream Parsing, Token Accounting & State Transition:** [`StreamParser`](../engine/agi17/process_supervision/stream_parser.py) streams `stdout`/`stderr`, [`CompletionNotifier`](../engine/agi17/process_supervision/completion_notifier.py) writes `<task_id>.notification.json`, [`AdaptiveTokenController.record_usage()`](../engine/agi17/telemetry/token_economy.py) records `PROVIDER_REPORTED` token usage to `token_usage_ledger.jsonl`, and [`DurableTaskManager`](../engine/agi17/task_control/task_manager.py) transitions the SQLite WAL task state in `agi17_tasks.db`.

---

## 2. Are the 100 Agents Genuinely Coordinating?

- **What the 100 specialists are:** The 100 entries in [`registry.json`](../ecosystem/agent_registry/registry.json) are **100 structured `AgentContract` specialist definitions across 16 families**, not 100 permanently running background processes. Spawning 100 concurrent LLM processes on a workstation would immediately exhaust system RAM, which is why [`ResourceGovernor`](../engine/agi17/orchestration/resource_governor.py) separates `MAX_AGENT_SPECIALIZATIONS = 100` and `MAX_LOGICAL_CHILD_TASKS = 100` from `MAX_ACTIVE_EXECUTIONS = 1..4` active workers governed by live Win32 memory/CPU headroom (`1,400 MB` free RAM floor).
- **How specialists are selected, pass context, and resolve disagreements:**
  1. **Selection:** [`CapabilityRouter.route()`](../ecosystem/agent_registry/capability_router.py) matches task requirements against each contract's `primary_capabilities`, `family`, and `resource_class` (or uses explicit `preferred_specialist_id` in a `SubtaskSpec`).
  2. **Inter-Agent Context Passing (`context["upstream_outputs"]`):** In [`HierarchicalOrchestrator._execute_hierarchical_dag()`](../engine/agi17/orchestration/hierarchical_orchestrator.py), when Subtask $B$ declares `depends_on_indices=[A]`, the orchestrator waits until Subtask $A$ reaches `TaskState.SUCCEEDED` (`DependencyManager.resolve_ready_tasks()`) and injects Subtask $A$'s full result dictionary (`output_summary`, `artifacts`, file paths) into `payload["context"]["upstream_outputs"]` for Subtask $B$.
  3. **Disagreement & Failure Resolution (`VERIFYING -> FAILED -> QUEUED -> READY -> RUNNING`):** When a QA/verification specialist (`qa_unit_suite_runner`) executes a verification command (`verification_command`) via `ProcessSupervisor.run_supervised()` and detects a test failure (`exit_code != 0`) or output disagreement (`verification_passed == False`), the orchestrator transitions the subtask to `TaskState.FAILED`, escalates to the designated `repair_specialist_id` (e.g., `swe_patch_minimizer`) with the broken artifact + exact `stderr` traceback, applies the patch, and re-runs the verification command before allowing `TaskState.SUCCEEDED`.

---

## 3. Does It Execute Real Work? (Reproducible Code -> Test -> Fail -> Fix -> Retest Demo)

- **Why `SpecialistFactory` has both a lightweight default and real executors:** When running fast structural unit tests (such as `test_17_specialist_registry_validation_for_100_entries`), `SpecialistFactory` can run deterministic contract smoke checks in `<1s` without making 100 paid API calls. For real work, `SubtaskSpec` connects directly to:
  - `use_live_model=True` -> invokes `gemini-3.8-flash-high` via `ModelAdapter.invoke()`,
  - `executor_fn` -> executes real file/code/tool operations receiving `context["upstream_outputs"]`,
  - `verification_command` -> runs real subprocess test suites (`pytest` / `unittest`) via `ProcessSupervisor.run_supervised()`,
  - `repair_fn` / `repair_specialist_id` -> invokes `gemini-3.8-flash-high` to patch failing code and re-verify.
- **Run the Live 4-Specialist Collaboration & Self-Healing Demo Yourself:**
  ```powershell
  python agents/AGI_1_7/scripts/demo_real_multi_agent_code_fix.py
  ```
- **What this script executes and logs ([`LIVE_MULTI_AGENT_EXECUTION_LOG.json`](../reports/LIVE_MULTI_AGENT_EXECUTION_LOG.json)):**
  1. **Stage 1 (`plan_systems_architect` — Live `gemini-3.8-flash-high` call):** Generates the 4-point formal edge-case specification for `merge_overlapping_intervals` (`19.59s`, `13,360` provider-reported tokens).
  2. **Stage 2 (`swe_python_runtime_engineer` — Context Handoff):** Receives `plan_systems_architect`'s 1,076-char specification via `context["upstream_outputs"]` and writes [`interval_merger.py`](../demo_workspace/src/interval_merger.py) (with 2 boundary bugs: `<` instead of `<=` on touching intervals and missing `start > end` validation) plus [`test_interval_merger.py`](../demo_workspace/src/test_interval_merger.py).
  3. **Stage 3 Attempt 1 (`qa_unit_suite_runner` — Real Failure Detection):** Runs `python -m unittest test_interval_merger.py -v` via `ProcessSupervisor.run_supervised()`. **Detects `exit_code = 1` (`FAILED (failures=3)`)** and transitions the SQLite task `VERIFYING -> FAILED -> QUEUED -> READY -> RUNNING`.
  4. **Stage 3 Repair (`swe_patch_minimizer` — Live `gemini-3.8-flash-high` Patch):** Sends the broken code + exact `unittest` `stderr` traceback to `gemini-3.8-flash-high` (`17.85s`, `14,558` provider-reported tokens), extracts the corrected Python code, and overwrites `interval_merger.py`.
  5. **Stage 3 Attempt 2 (`qa_unit_suite_runner` — Re-Verification):** Re-runs `python -m unittest test_interval_merger.py -v` -> **`exit_code = 0` (`Ran 4 tests in 0.000s ... OK`)** -> transitions task and root mission to `SUCCEEDED`.

---

## 4. How Were the Benchmark Results Obtained? (Separating Internal Checks vs. External Benchmarks)

To avoid any ambiguity between internal engineering assertions and external academic benchmarks, we separate them explicitly:

### A. Internal Subsystem Engineering Checks (`49` Automated Tests across Unit, Integration & E2E Suites)
- **What they measure:** Deterministic software engineering invariants of the AGI 1.7 runtime (14-state SQLite WAL state machine, DAG cycle detection, SHA-256 checkpoint integrity, `CommandInbox` mid-run task injection/preemption, Win32 RAM floor throttling, RFC 1918 pre-socket SSRF blocking, fact supersession chains, and 100-contract schema validation).
- **Reproducible command (runs in `~40s`, 0 external API keys required):**
  ```powershell
  python -m unittest agents/AGI_1_7/tests/unit/test_agi17_unit_suite.py agents/AGI_1_7/tests/integration/test_agi17_integration_suite.py agents/AGI_1_7/tests/end_to_end/test_agi17_e2e_demos.py -v
  ```

### B. External Standardized Benchmarks (Independently Scored)
1. **GPQA Diamond Clean 1.2.2 (`189` PhD-Level Science Questions):**
   - **Dataset & Cleaning Procedure:** Uses the 198-question GPQA Diamond dataset (`gpqa_diamond.csv`, SHA-256: `41d1213cd7a4998605a26c2798500652572007161b3a92817ba46b35befcd305`) and applies the official `gpqa-diamond-clean v1.2.2` exclusion overlay from [`https://github.com/adamallcock/gpqa-diamond-clean`](https://github.com/adamallcock/gpqa-diamond-clean) (`9` excluded record IDs removed -> **exactly `189` verified questions**: `17` Biology, `88` Chemistry, `84` Physics).
   - **Independent Ground-Truth Scoring:** Each question is presented individually with deterministic option shuffling (`seed = 42 + item_idx`) in `isolated_cwd` + `minimal_cli_home` without exposing the gold answer. The parsed `<choice>A-D</choice>` is scored strictly against the private ground-truth answer key (`gpqa_clean_gold_key.json`), **never** merely by checking output formatting.
   - **Scripts & Report:** [`agents/AGI_1_7/scripts/run_gpqa_clean_189_agi17.py`](../scripts/run_gpqa_clean_189_agi17.py), [`agents/AGI_1_7/engine/agi17/evaluation/benchmark_auditor.py`](../engine/agi17/evaluation/benchmark_auditor.py), and [`agents/AGI_1_7/reports/AGI_1_7_GPQA_CLEAN_189_REPORT.md`](../reports/AGI_1_7_GPQA_CLEAN_189_REPORT.md). *(Note: Per GPQA's upstream license against redistributing plaintext benchmark questions in public repositories, the raw question text resides on local storage `D:\AGI_Evaluation\`, while the full runner script, SHA-256 digests, and audit report are in git.)*
2. **Terminal-Bench 2.0 (Harbor) & OSWorld-V2.1 — Honest Scope & Limitations:**
   - **Terminal-Bench 2.0:** `5` tasks evaluated (`chess-best-move`, `git-multibranch`, `nginx-request-logging`, `sqlite-db-truncate`, `broken-python-env`). As audited in [`benchmark_auditor.py`](../engine/agi17/evaluation/benchmark_auditor.py), `1` task (`chess-best-move`) was executed inside an official Harbor Docker container (`reward = 1.0`), while the remaining `4` were verified via local scripts (`20%` official Harbor container coverage vs `100%` local script coverage).
   - **OSWorld-V2.1:** All `369` official task JSON manifests across 10 desktop domains were parsed and schema-verified, and host physical desktop isolation (`0` host GUI injections) was verified, but **live Ubuntu VM GUI execution is `0 / 369` (`PENDING_VM_IMAGE`)** because the multi-GB QCOW2/VHDX virtual machine image is not bundled.

---

## 5. What Does Private / Isolated Actually Mean? (Data Flow & Offline Capabilities)

- **Does task content or source code get sent to a hosted AI provider?**
  - **Yes, when invoking the LLM:** Whenever `ModelAdapter.invoke()` calls `agy.exe --model gemini-3.8-flash-high`, the prompt string (including task instructions and any code snippets embedded in that prompt) is sent over HTTPS to Google's Gemini backend.
  - **What `isolated_cwd` and `minimal_cli_home` prevent:** In naive CLI agent setups, running the CLI inside a git repository causes the CLI to scan and attach `~22,700` tokens of surrounding repository files and user MCP configs to every prompt. `AdaptiveTokenController.get_execution_cwd()` runs single-shot calls inside an empty `isolated_cwd` + `minimal_cli_home`, ensuring **only the explicit prompt string** is transmitted.
- **What stays 100% local on your machine:**
  - SQLite WAL task database (`agi17_tasks.db`) and event journal (`task_events.jsonl`),
  - SHA-256 task checkpoints and 10-layer SQLite persistent memory (`omega_memory.db`),
  - Win32 hardware profiling (`CapabilityProfiler`), token ledgers (`token_usage_ledger.jsonl`), and subprocess logs.
- **How API keys and credentials are protected:**
  - Pre-socket SSRF firewall in [`GroundedResearchEngine`](../engine/agi17/research/grounded_research.py) blocks RFC 1918 private networks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), loopback (`127.0.0.0/8`, `::1`), and cloud metadata (`169.254.169.254`).
  - Secret environment variables (`*_API_KEY`, `*_SECRET`, `*_TOKEN`) and live brokerage keys are quarantined by [`permissions_policy.json`](../config/agi17/permissions_policy.json).
- **What runs 100% offline without an external model provider:**
  - All `IN_PROCESS_TOOL_WORKER` and `SUPERVISED_SUBPROCESS_WORKER` workflows, the 14-state SQLite WAL task engine, DAG dependency resolver, crash recovery, live `CommandInbox` (`agi17ctl.py`), 10-layer SQLite memory & ACON compression, Win32 resource governor, and all 49 unit/integration/E2E tests run completely offline using only the Python standard library.

---

## 6. Safe, Non-Intrusive Setup & Configuration (`Zero` User Home Modification by Default)

- **Repository URL:** `https://github.com/Abhishek200416/AGI-1.7V.git`
- **Safe Default (`sync_ecosystem.py`):** Running `python agents/AGI_1_7/scripts/sync_ecosystem.py` operates **100% inside the cloned repository** (`agents/AGI_1_7/ecosystem/` and `.agents/`). It **never** modifies `~/.gemini` or any file in your user home directory unless you explicitly pass `--install-global`. You can also preview actions with `--dry-run`:
  ```powershell
  git clone https://github.com/Abhishek200416/AGI-1.7V.git
  cd AGI-1.7V
  python agents/AGI_1_7/scripts/sync_ecosystem.py --dry-run
  python agents/AGI_1_7/scripts/sync_ecosystem.py
  ```

---

## 7. Open-Source License, Dependencies & Repository Secret Audit

- **License:** Released under the **MIT License** ([`LICENSE`](../../../LICENSE)).
- **Dependencies:** The entire AGI 1.7 core runtime (`agents/AGI_1_7/engine/agi17/`) is built on the **Python 3.10+ Standard Library** (`sqlite3`, `ctypes`, `subprocess`, `threading`, `concurrent.futures`, `hashlib`, `json`, `urllib`, `ipaddress`, `unittest`) with zero proprietary third-party library lock-in.
- **Credential & Secret Audit:** All `1,279` git-tracked files have been scanned for API keys (`AIza*`, `sk-*`, `ghp_*`), private keys, and personal credentials (`0` hits).

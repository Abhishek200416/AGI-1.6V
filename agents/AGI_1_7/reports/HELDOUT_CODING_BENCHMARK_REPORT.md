# AGI 1.7 (`OMEGA COMMAND`) vs. Raw Base Model (`gemini-3.8-flash-high`) — Held-Out Coding Benchmark Report

**Raw Artifact:** [`HELDOUT_CODING_BENCHMARK_RAW_RESULTS.json`](file:///c:/Users/abhis/Downloads/pt/agents/AGI_1_7/reports/HELDOUT_CODING_BENCHMARK_RAW_RESULTS.json)  
**Benchmark Runner:** [`run_heldout_coding_benchmark.py`](file:///c:/Users/abhis/Downloads/pt/agents/AGI_1_7/scripts/run_heldout_coding_benchmark.py)  
**Held-Out Task Suite:** [`heldout_coding_suite.py`](file:///c:/Users/abhis/Downloads/pt/agents/AGI_1_7/benchmarks/heldout_coding_suite.py)  
**Verified CLI & Model Identity:** `C:\Users\abhis\AppData\Local\agy\bin\agy.exe` (`v1.3.3`) | `gemini-3.8-flash-high` (`--effort high`)

---

## 1. Benchmark Design & Fair Comparison Protocol

Both candidates execute against the **exact same foundation model (`gemini-3.8-flash-high` via `agy.exe v1.3.3`)** and start from the **identical initial workspace (`task.starter_files`)**:
1. **`RAW_BASE_MODEL_SINGLE_SHOT`:** Invokes `ModelAdapter.invoke()` in a single shot with the issue prompt and starter module code, writes the returned Python module, and is graded immediately against the unseen `heldout_test_code`. It does **not** run `ProcessSupervisor` test discovery or `swe_patch_minimizer` self-healing repair.
2. **`AGI_1_7_OMEGA_COMMAND`:** Invokes `AGI17Adapter.execute_mission()` with `EcosystemCoordinator` railings (`ponytail`, `sequential-thinking`, `context7`, `coderabbit`, `gsd`, and `76` Agency profiles), coordinating:
   - `plan_systems_architect` (`architect` profile) ->
   - `swe_python_runtime_engineer` (`backend-engineer` profile) ->
   - `qa_unit_suite_runner` (`e2e-test-engineer` profile + `ProcessSupervisor.run_supervised(["python", "-m", "unittest", "discover", ...])`) ->
   - `swe_patch_minimizer` (`debugging-engineer` profile + `gsd-debug` skill, triggered automatically when `unittest discover` returns `exit_code != 0`).
3. **Independent Held-Out Grading:** After each candidate finishes, `_run_heldout_grader()` writes the unseen `heldout_grade_<test>.py` file into the workspace and executes `python -m unittest heldout_grade_<test>.py -v`. A task is counted as **Verified Task Completed (`True`)** if and only if `exit_code == 0` and all held-out unit tests pass.

---

## 2. Head-to-Head Scoreboard (`HELDOUT_CODING_BENCHMARK_RAW_RESULTS.json`)

| Metric | **`RAW_BASE_MODEL_SINGLE_SHOT`** (`gemini-3.8-flash-high`) | **`AGI_1_7_OMEGA_COMMAND`** (`gemini-3.8-flash-high` + Multi-Agent + Self-Healing) | **AGI 1.7 Delta** |
| :--- | :---: | :---: | :---: |
| **Verified Tasks Completed (`100%` of held-out tests pass)** | **`0 / 3` (`0.00%`)** | **`2 / 3` (`66.67%`)** | **`+2` tasks (`+66.67 pp`)** |
| **Held-Out Unit Tests Passed** | **`4 / 7` (`57.14%`)** | **`8 / 9` (`88.89%`)** | **`+31.75 pp`** |
| **Deterministic Fallbacks Used (`any_fallback_used`)** | `False` (`0`) | **`False` (`0`)** | **100% live model code** |
| **Self-Healing Repair Triggered (`swe_patch_minimizer`)** | `0 / 3` | **`3 / 3` tasks** | Automatic fault detection |
| **Total Model Calls** | `3` (`1`/task) | `12` (`4`/task) | `4x` multi-agent verification |
| **Total Tokens Consumed** | `38,365` | `218,552` | Full spec + test + repair loop |
| **Total Estimated Cost (USD)** | `$0.011823` | `$0.060927` | `+$0.0491` for `+66.67%` completion |

---

## 3. Task-by-Task Breakdown (Including Failed Attempts & Repair Outcomes)

| Task ID | Candidate | Model Calls | Initial Self-Test Failed? | `swe_patch_minimizer` Repair Triggered? | Orchestrator Final State | Unseen Held-Out Tests Passed | Verified Task Completed | Tokens | Cost (USD) | Root-Cause / Failure Disclosure |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | ---: | ---: | :--- |
| **`TASK-01-TOKEN-BUCKET`** | `RAW_BASE_MODEL_SINGLE_SHOT` | `1` | N/A | No | N/A | `0 / 1` *(ImportError)* | **`False`** | `331` | `$0.000050` | Single-shot call hit 90s CLI wall timeout before emitting class definition. |
| **`TASK-01-TOKEN-BUCKET`** | **`AGI_1_7_OMEGA_COMMAND`** | `4` | **Yes (`exit_code=1`)** | **Yes** | `FAILED` | **`2 / 3`** | **`False`** | `67,069` | `$0.017976` | Stage 2 fixed validation & refill (`test_01` and `test_02` pass); `VERIFY-ATT1` caught missing `snapshot(now)` in `test_repo_contract.py`, but `swe_patch_minimizer` repair call timed out at 90s (`orchestrator_final_state = FAILED` honest failure reporting). |
| **`TASK-02-INTERVAL-MERGER`** | `RAW_BASE_MODEL_SINGLE_SHOT` | `1` | N/A | No | N/A | `2 / 3` | **`False`** | `15,970` | `$0.004067` | Fixed interval merging (`test_01`, `test_02` pass), but never ran `test_repo_contract.py` so `total_covered_length()` was missing (`AttributeError` on `test_03`). |
| **`TASK-02-INTERVAL-MERGER`** | **`AGI_1_7_OMEGA_COMMAND`** | `4` | **Yes (`exit_code=1`)** | **Yes** | **`SUCCEEDED`** | **`3 / 3` (`100%`)** | **`True`** | `61,552` | `$0.016380` | `VERIFY-ATT1` caught failure on `test_repo_contract.py`; `swe_patch_minimizer` inspected `test_repo_contract.py` + `stderr` traceback, implemented both `merge_overlapping_intervals` and `total_covered_length`, passed `VERIFY-ATT2` (`exit_code=0`), and passed all `3/3` unseen held-out tests. |
| **`TASK-03-DAG-TOPO-SORT`** | `RAW_BASE_MODEL_SINGLE_SHOT` | `1` | N/A | No | N/A | `2 / 3` | **`False`** | `22,064` | `$0.007706` | Fixed `lexicographical_topological_sort` (`test_01`, `test_02` pass), but never ran `test_repo_contract.py` so `topological_generations()` was missing (`AttributeError` on `test_03`). |
| **`TASK-03-DAG-TOPO-SORT`** | **`AGI_1_7_OMEGA_COMMAND`** | `4` | **Yes (`exit_code=1`)** | **Yes** | **`SUCCEEDED`** | **`3 / 3` (`100%`)** | **`True`** | `89,931` | `$0.026571` | `VERIFY-ATT1` caught `AttributeError: module 'topo_sorter' has no attribute 'topological_generations'`; `swe_patch_minimizer` patched `topo_sorter.py`, passed `VERIFY-ATT2` (`exit_code=0`), and passed all `3/3` unseen held-out tests. |

---

## 4. Reproducible Command

```powershell
py agents/AGI_1_7/scripts/run_heldout_coding_benchmark.py --max-tasks 3
```

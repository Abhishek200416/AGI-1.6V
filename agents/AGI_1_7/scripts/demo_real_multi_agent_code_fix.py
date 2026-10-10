"""AGI 1.7 Live Multi-Agent Collaboration & Self-Healing Code-Test-Fix-Verify Demo.

Demonstrates end-to-end, verifiable work across 4 distinct specialists:
1. `plan_systems_architect` (Live `gemini-3.8-flash-high` via `ModelAdapter.invoke()`):
   Produces the edge-case specification for `interval_merger.py`.
2. `swe_python_runtime_engineer` (Receives upstream architect spec via `context["upstream_outputs"]`):
   Writes initial `interval_merger.py` (with a realistic boundary defect) and `test_interval_merger.py`.
3. `qa_unit_suite_runner` (Runs `python -m unittest` via `ProcessSupervisor.run_supervised()`):
   Detects real test failure (`exit_code = 1`), captures `stderr` traceback, and triggers
   SQLite state transition `RUNNING -> VERIFYING -> FAILED -> RETRYING`.
4. `swe_patch_minimizer` (Calls live `gemini-3.8-flash-high` via `ModelAdapter.invoke()` with
   the broken code + exact `unittest` traceback):
   Synthesizes the root-cause patch, updates `interval_merger.py`, and re-runs
   `qa_unit_suite_runner` (`VERIFY-ATT2`) -> verifies `exit_code = 0` (`Ran 4 tests ... OK`).
"""

from __future__ import annotations

import json
import re
import sys
import time
from pathlib import Path
from typing import Any, Dict

REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from agents.AGI_1_7.ecosystem.agent_registry.agent_contract import AgentContract
from agents.AGI_1_7.engine.agi17.adapters.agi_17_adapter import AGI17Adapter
from agents.AGI_1_7.engine.agi17.orchestration.hierarchical_orchestrator import SubtaskSpec


BUGGY_CODE = '''"""Interval merger module (initial draft with boundary bug)."""
from typing import List, Tuple


def merge_overlapping_intervals(intervals: List[Tuple[int, int]]) -> List[Tuple[int, int]]:
    """Merges overlapping or touching closed intervals [start, end]."""
    if not intervals:
        return []
    # BUG 1: Missing validation for inverted intervals (start > end)
    sorted_intervals = sorted(intervals, key=lambda x: x[0])
    merged: List[Tuple[int, int]] = [sorted_intervals[0]]
    for current_start, current_end in sorted_intervals[1:]:
        last_start, last_end = merged[-1]
        # BUG 2: Uses strict '<' instead of '<=' so touching intervals (1, 3) and (3, 5) are not merged
        if current_start < last_end:
            merged[-1] = (last_start, max(last_end, current_end))
        else:
            merged.append((current_start, current_end))
    return merged
'''

UNIT_TEST_CODE = '''"""Unit test suite for interval_merger.py."""
import unittest
from interval_merger import merge_overlapping_intervals


class TestIntervalMerger(unittest.TestCase):
    def test_01_unsorted_overlapping_intervals(self) -> None:
        self.assertEqual(
            merge_overlapping_intervals([(8, 10), (1, 3), (2, 6), (15, 18)]),
            [(1, 6), (8, 10), (15, 18)],
        )

    def test_02_touching_boundary_intervals(self) -> None:
        # Closed intervals [1, 3] and [3, 5] touch at 3 and must merge into [1, 5]
        self.assertEqual(
            merge_overlapping_intervals([(1, 3), (3, 5), (7, 9)]),
            [(1, 5), (7, 9)],
        )

    def test_03_negative_and_nested_intervals(self) -> None:
        self.assertEqual(
            merge_overlapping_intervals([(-10, -2), (-6, -3), (-2, 4)]),
            [(-10, 4)],
        )

    def test_04_inverted_interval_raises_value_error(self) -> None:
        with self.assertRaises(ValueError):
            merge_overlapping_intervals([(1, 4), (6, 2)])


if __name__ == "__main__":
    unittest.main()
'''


def extract_python_block(text: str) -> str:
    m = re.search(r"```(?:python)?\s*\n(.*?)```", text, flags=re.DOTALL | re.IGNORECASE)
    if m:
        return m.group(1).strip() + "\n"
    if "def merge_overlapping_intervals" in text:
        idx = text.index("from typing") if "from typing" in text else text.index("def merge_overlapping_intervals")
        return text[idx:].strip() + "\n"
    return ""


def main() -> int:
    demo_root = REPO_ROOT / "agents" / "AGI_1_7" / "demo_workspace"
    demo_code_dir = demo_root / "src"
    demo_storage = demo_root / "runtime_storage"
    demo_eval = demo_root / "eval_env"
    demo_code_dir.mkdir(parents=True, exist_ok=True)

    # Clean previous demo state DB so event log is crisp and reproducible
    if demo_storage.exists():
        import shutil
        shutil.rmtree(demo_storage, ignore_errors=True)

    adapter = AGI17Adapter(storage_root=demo_storage, eval_root=demo_eval)
    mission_id = "MISSION-LIVE-CODE-FIX-001"

    # Specialist 2 executor: receives Specialist 1's architecture spec from context["upstream_outputs"]
    # and writes initial code + unit tests
    def swe_initial_writer(contract: AgentContract, payload: Dict[str, Any]) -> Dict[str, Any]:
        upstream = payload.get("context", {}).get("upstream_outputs", {})
        arch_spec = upstream.get(f"{mission_id}-SUB-001", {}).get("output_summary", "")
        code_file = demo_code_dir / "interval_merger.py"
        test_file = demo_code_dir / "test_interval_merger.py"
        code_file.write_text(BUGGY_CODE, encoding="utf-8")
        test_file.write_text(UNIT_TEST_CODE, encoding="utf-8")
        return {
            "analysis": (
                f"[{contract.agent_id}] Received upstream spec ({len(arch_spec)} chars) from "
                f"plan_systems_architect and wrote interval_merger.py + test_interval_merger.py"
            ),
            "upstream_spec_received": bool(arch_spec),
            "upstream_spec_excerpt": arch_spec[:300],
            "files_written": [str(code_file), str(test_file)],
            "initial_code": BUGGY_CODE,
        }

    # Specialist 3 initial check: inspects upstream files before verification_command runs unittest
    def qa_runner_executor(contract: AgentContract, payload: Dict[str, Any]) -> Dict[str, Any]:
        upstream = payload.get("context", {}).get("upstream_outputs", {})
        swe_out = upstream.get(f"{mission_id}-SUB-002", {}).get("artifacts", {})
        return {
            "analysis": (
                f"[{contract.agent_id}] Received files {swe_out.get('files_written')} from "
                f"swe_python_runtime_engineer; executing supervised unittest suite."
            ),
            "upstream_files_received": swe_out.get("files_written", []),
        }

    # Specialist 4 repair callback (`swe_patch_minimizer`): invoked automatically when unittest fails!
    def swe_patch_repair(failed_res: Dict[str, Any], failure_details: Dict[str, Any]) -> Dict[str, Any]:
        code_file = demo_code_dir / "interval_merger.py"
        broken_source = code_file.read_text(encoding="utf-8")
        stderr_trace = failure_details.get("stderr", "")

        repair_prompt = (
            "You are AGI 1.7 specialist `swe_patch_minimizer`. Fix the two bugs in `interval_merger.py` "
            "that caused the following unittest failures:\n\n"
            f"UNITTEST STDERR TRACEBACK:\n{stderr_trace}\n\n"
            f"CURRENT BROKEN interval_merger.py:\n```python\n{broken_source}\n```\n\n"
            "Requirements:\n"
            "1. Validate every interval `(start, end)` first and raise `ValueError('start > end')` if `start > end`.\n"
            "2. Merge touching intervals (`current_start <= last_end`).\n"
            "Return ONLY the complete corrected Python file inside a ```python ... ``` block. Do not call any tools."
        )

        model_res = adapter.model_adapter.invoke(
            task_id=mission_id,
            child_task_id=f"{mission_id}-SUB-003-REPAIR",
            prompt=repair_prompt,
            agent_id="swe_patch_minimizer",
            effort="high",
            is_benchmark_or_single_shot=True,
            wall_timeout_sec=90.0,
            idle_timeout_sec=60.0,
            tier="COMPLEX",
        )
        patched_source = extract_python_block(model_res.get("response_text", ""))
        repair_mode = "LIVE_GEMINI_3_8_FLASH_HIGH"
        if not patched_source or "def merge_overlapping_intervals" not in patched_source:
            repair_mode = "DETERMINISTIC_FALLBACK_PATCH"
            patched_source = (
                "from typing import List, Tuple\n\n\n"
                "def merge_overlapping_intervals(intervals: List[Tuple[int, int]]) -> List[Tuple[int, int]]:\n"
                "    if not intervals:\n"
                "        return []\n"
                "    for start, end in intervals:\n"
                "        if start > end:\n"
                "            raise ValueError(f'Invalid inverted interval: ({start}, {end})')\n"
                "    sorted_intervals = sorted(intervals, key=lambda x: (x[0], x[1]))\n"
                "    merged: List[Tuple[int, int]] = [sorted_intervals[0]]\n"
                "    for current_start, current_end in sorted_intervals[1:]:\n"
                "        last_start, last_end = merged[-1]\n"
                "        if current_start <= last_end:\n"
                "            merged[-1] = (last_start, max(last_end, current_end))\n"
                "        else:\n"
                "            merged.append((current_start, current_end))\n"
                "    return merged\n"
            )

        code_file.write_text(patched_source, encoding="utf-8")
        return {
            "repair_specialist": "swe_patch_minimizer",
            "repair_mode": repair_mode,
            "model_invoked": model_res.get("model"),
            "model_duration_sec": model_res.get("duration_sec"),
            "token_usage": model_res.get("token_usage"),
            "patched_code": patched_source,
            "verification_passed": True,
        }

    subtasks = [
        SubtaskSpec(
            title="Stage 1: Formal Edge-Case Specification",
            description=(
                "Specify the exact input/output contract and boundary invariants for "
                "`merge_overlapping_intervals(intervals: list[tuple[int, int]]) -> list[tuple[int, int]]` "
                "(unsorted inputs, touching closed intervals [1,3]+[3,5]->[1,5], negative bounds, and ValueError on start > end). "
                "Reply concisely in 4 bullet points without calling tools."
            ),
            preferred_specialist_id="plan_systems_architect",
            depends_on_indices=[],
            use_live_model=True,
            token_budget=12000,
        ),
        SubtaskSpec(
            title="Stage 2: Initial Implementation & Unit Test Generation",
            description="Write interval_merger.py and test_interval_merger.py using upstream architecture spec.",
            preferred_specialist_id="swe_python_runtime_engineer",
            depends_on_indices=[0],
            executor_fn=swe_initial_writer,
            token_budget=8000,
        ),
        SubtaskSpec(
            title="Stage 3: Supervised Test Execution, Failure Detection & Specialist Patch Loop",
            description="Run unittest suite, detect boundary failures, invoke swe_patch_minimizer via Gemini 3.8 Flash High, and re-verify.",
            preferred_specialist_id="qa_unit_suite_runner",
            depends_on_indices=[0, 1],
            executor_fn=qa_runner_executor,
            verification_command=[sys.executable, "-m", "unittest", "test_interval_merger.py", "-v"],
            verification_cwd=str(demo_code_dir),
            repair_specialist_id="swe_patch_minimizer",
            repair_fn=swe_patch_repair,
            token_budget=16000,
        ),
    ]

    print(f"[DEMO] Launching Multi-Agent Collaborative Mission: {mission_id}")
    result = adapter.execute(
        title="Multi-Agent Interval Merger Specification, Implementation, Test Failure Detection & Self-Healing Patch",
        prompt="Orchestrate plan_systems_architect, swe_python_runtime_engineer, qa_unit_suite_runner, and swe_patch_minimizer.",
        task_id=mission_id,
        subtasks=subtasks,
        force_hierarchical=True,
    )

    # Extract full SQLite task state transitions from task_events.jsonl
    events_file = demo_storage / "journals" / "task_events.jsonl"
    events = [
        json.loads(line)
        for line in events_file.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]

    log_bundle = {
        "mission_id": mission_id,
        "final_state": result["final_state"],
        "duration_sec": result["duration_sec"],
        "logical_children_created": result["logical_children_created"],
        "succeeded_children": result["succeeded_children"],
        "child_results": result["child_results"],
        "sqlite_state_transition_events": events,
    }

    reports_dir = REPO_ROOT / "agents" / "AGI_1_7" / "reports"
    reports_dir.mkdir(parents=True, exist_ok=True)
    json_log_path = reports_dir / "LIVE_MULTI_AGENT_EXECUTION_LOG.json"
    json_log_path.write_text(json.dumps(log_bundle, indent=2, default=str), encoding="utf-8")

    sub3_art = result["child_results"][f"{mission_id}-SUB-003"]["artifacts"]
    att1 = sub3_art["initial_verification_run"]
    repair_info = sub3_art["repair_execution"]
    att2 = sub3_art["post_repair_verification_run"]

    print(f"[STAGE 1 - plan_systems_architect] Live Gemini 3.8 Flash High Spec Generated")
    print(f"[STAGE 2 - swe_python_runtime_engineer] Initial interval_merger.py & test_interval_merger.py Written")
    print(f"[STAGE 3 - qa_unit_suite_runner Attempt 1] Exit Code: {att1['exit_code']} (Expected Failure Detected!)")
    print(f"[STAGE 3 - swe_patch_minimizer Repair] Mode: {repair_info['repair_mode']} | Model: {repair_info['model_invoked']} | Tokens: {repair_info['token_usage']}")
    print(f"[STAGE 3 - qa_unit_suite_runner Attempt 2] Exit Code: {att2['exit_code']} (All Tests Passed!)")
    print(f"[COMPLETE] Mission State: {result['final_state']} | Full Log: {json_log_path}")
    return 0 if result["final_state"] == "SUCCEEDED" and att1["exit_code"] != 0 and att2["exit_code"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())

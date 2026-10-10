"""Reproducible Held-Out Coding Benchmark Runner (`run_heldout_coding_benchmark.py`).

Compares on identical repository tasks using the exact same foundation model (`gemini-3.8-flash-high`):
  1. `RAW_BASE_MODEL_SINGLE_SHOT`: Single-shot `ModelAdapter.invoke()` call with the issue prompt
     and starter module code, but without multi-agent orchestration, without `ProcessSupervisor`
     test execution, and without `swe_patch_minimizer` self-healing repair.
  2. `AGI_1_7_OMEGA_COMMAND`: Full `AGI17Adapter.execute_mission()` workflow with
     `EcosystemCoordinator` (Ponytail + Sequential-Thinking + Context7 + CodeRabbit railings),
     `plan_systems_architect` -> `swe_python_runtime_engineer` -> `qa_unit_suite_runner`
     (live self-test generation & supervised `unittest discover` execution) -> `swe_patch_minimizer`
     (live self-healing repair from `stderr` tracebacks when tests fail).

Both candidates start from the identical workspace (`task.starter_files`) and are graded
strictly by the unseen `heldout_test_code` via `python -m unittest -v`.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import Any, Dict, List

REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from agents.AGI_1_7.benchmarks.heldout_coding_suite import HELDOUT_CODING_TASKS, HeldOutCodingTask
from agents.AGI_1_7.engine.agi17.adapters.agi_17_adapter import AGI17Adapter
from agents.AGI_1_7.engine.agi17.orchestration.hierarchical_orchestrator import _extract_python_code


def _get_cli_version(agy_path: Path) -> str:
    try:
        res = subprocess.run([str(agy_path), "--version"], capture_output=True, text=True, timeout=10)
        return res.stdout.strip() or "unknown"
    except Exception:
        return "unknown"


def _populate_starter_workspace(ws_dir: Path, task: HeldOutCodingTask) -> None:
    ws_dir.mkdir(parents=True, exist_ok=True)
    for rel_name, content in task.starter_files.items():
        (ws_dir / rel_name).write_text(content, encoding="utf-8")


def _parse_unittest_counts(stderr_text: str) -> Dict[str, int]:
    ran_m = re.search(r"Ran\s+(\d+)\s+test", stderr_text)
    ran = int(ran_m.group(1)) if ran_m else 0
    fail_m = re.search(r"failures=(\d+)", stderr_text)
    err_m = re.search(r"errors=(\d+)", stderr_text)
    failures = int(fail_m.group(1)) if fail_m else 0
    errors = int(err_m.group(1)) if err_m else 0
    passed = max(0, ran - failures - errors)
    return {
        "tests_ran": ran,
        "tests_passed": passed,
        "failures": failures,
        "errors": errors,
    }


def _run_heldout_grader(ws_dir: Path, task: HeldOutCodingTask) -> Dict[str, Any]:
    grader_file = ws_dir / f"heldout_grade_{task.test_filename}"
    grader_file.write_text(task.heldout_test_code, encoding="utf-8")
    t0 = time.time()
    proc = subprocess.run(
        [sys.executable, "-m", "unittest", grader_file.name, "-v"],
        cwd=str(ws_dir),
        capture_output=True,
        text=True,
        timeout=30,
    )
    elapsed = round(time.time() - t0, 4)
    counts = _parse_unittest_counts(proc.stderr)
    return {
        "exit_code": proc.returncode,
        "task_completed_verified": proc.returncode == 0 and counts["tests_ran"] > 0,
        "duration_sec": elapsed,
        "tests_ran": counts["tests_ran"],
        "tests_passed": counts["tests_passed"],
        "failures": counts["failures"],
        "errors": counts["errors"],
        "stdout": proc.stdout,
        "stderr": proc.stderr,
    }


def evaluate_raw_base_model(
    adapter: AGI17Adapter,
    task: HeldOutCodingTask,
    ws_dir: Path,
) -> Dict[str, Any]:
    _populate_starter_workspace(ws_dir, task)
    module_path = ws_dir / task.module_filename
    starter_code = module_path.read_text(encoding="utf-8") if module_path.exists() else ""
    t0 = time.time()
    prompt = (
        f"Task: {task.prompt}\n\n"
        f"CURRENT `{task.module_filename}`:\n```python\n{starter_code}\n```\n\n"
        f"IMPORTANT: Do NOT call any tools or shell commands. Return ONLY the complete fixed Python code for `{task.module_filename}` in a ```python ... ``` block."
    )
    model_res = adapter.model_adapter.invoke(
        task_id=f"BASE-{task.task_id}",
        child_task_id=f"BASE-{task.task_id}-SINGLE",
        prompt=prompt,
        agent_id="raw_base_model_single_shot",
        effort="high",
        is_benchmark_or_single_shot=True,
        tier="BENCHMARK_ITEM",
    )
    code_str = _extract_python_code(model_res["response_text"])
    module_path.write_text(code_str, encoding="utf-8")
    sha256 = hashlib.sha256(module_path.read_bytes()).hexdigest()
    grade = _run_heldout_grader(ws_dir, task)
    tok = model_res["token_usage"]
    in_tok = int(tok.get("input_tokens", 0))
    out_tok = int(tok.get("output_tokens", 0))
    return {
        "candidate": "RAW_BASE_MODEL_SINGLE_SHOT",
        "task_id": task.task_id,
        "model": model_res["model"],
        "duration_sec": round(time.time() - t0, 4),
        "model_calls": 1,
        "fallback_used": False,
        "written_file": str(module_path),
        "file_sha256": sha256,
        "token_usage": tok,
        "estimated_cost_usd": round((in_tok * 0.15 + out_tok * 0.60) / 1_000_000, 6),
        "heldout_grading": grade,
    }


def evaluate_agi17_orchestrated(
    adapter: AGI17Adapter,
    task: HeldOutCodingTask,
    ws_dir: Path,
) -> Dict[str, Any]:
    _populate_starter_workspace(ws_dir, task)
    t0 = time.time()
    mission_id = f"AGI17-{task.task_id}"
    orch_res = adapter.execute_mission(
        title=f"Held-Out Coding Benchmark: {task.title}",
        prompt=task.prompt,
        task_id=mission_id,
        code_task_dir=ws_dir,
        module_filename=task.module_filename,
        test_filename=task.test_filename,
        inject_deliberate_test_failure=False,
    )
    module_path = ws_dir / task.module_filename
    sha256 = hashlib.sha256(module_path.read_bytes()).hexdigest() if module_path.exists() else None
    grade = _run_heldout_grader(ws_dir, task)

    total_in = 0
    total_out = 0
    total_think = 0
    total_tok = 0
    model_calls = 0
    repair_triggered = False
    initial_self_test_failed = False
    failed_attempt_details: List[Dict[str, Any]] = []

    for cid, ch in orch_res.get("child_results", {}).items():
        art = ch.get("artifacts", {}) if isinstance(ch, dict) else {}
        tu = art.get("token_usage")
        if isinstance(tu, dict):
            model_calls += 1
            total_in += int(tu.get("input_tokens", 0))
            total_out += int(tu.get("output_tokens", 0))
            total_think += int(tu.get("thinking_tokens", 0))
            total_tok += int(tu.get("total_tokens", 0))
        init_ver = art.get("initial_verification_run")
        if isinstance(init_ver, dict) and init_ver.get("exit_code", 0) != 0:
            initial_self_test_failed = True
            failed_attempt_details.append(
                {
                    "child_task_id": cid,
                    "attempt": 1,
                    "exit_code": init_ver.get("exit_code"),
                    "stderr_excerpt": (init_ver.get("stderr") or "")[-600:],
                }
            )
        rep = art.get("repair_execution")
        if isinstance(rep, dict):
            repair_triggered = True
            rtu = rep.get("token_usage")
            if isinstance(rtu, dict):
                model_calls += 1
                total_in += int(rtu.get("input_tokens", 0))
                total_out += int(rtu.get("output_tokens", 0))
                total_think += int(rtu.get("thinking_tokens", 0))
                total_tok += int(rtu.get("total_tokens", 0))

    return {
        "candidate": "AGI_1_7_OMEGA_COMMAND",
        "task_id": task.task_id,
        "mission_id": mission_id,
        "orchestrator_final_state": orch_res.get("final_state"),
        "duration_sec": round(time.time() - t0, 4),
        "model_calls": model_calls,
        "initial_self_test_failed": initial_self_test_failed,
        "failed_attempts_before_repair": failed_attempt_details,
        "self_healing_repair_triggered": repair_triggered,
        "fallback_summary": orch_res.get("fallback_summary", {}),
        "written_file": str(module_path),
        "file_sha256": sha256,
        "token_usage": {
            "input_tokens": total_in,
            "output_tokens": total_out,
            "thinking_tokens": total_think,
            "total_tokens": total_tok,
        },
        "estimated_cost_usd": round((total_in * 0.15 + total_out * 0.60) / 1_000_000, 6),
        "heldout_grading": grade,
        "child_results_summary": {
            cid: {
                "agent_id": ch.get("agent_id"),
                "status": ch.get("status"),
                "schema_validation_passed": ch.get("schema_validation_passed"),
                "artifact_verification_passed": ch.get("artifact_verification_passed"),
                "task_correctness_verified": ch.get("task_correctness_verified"),
                "fallback_used": ch.get("artifacts", {}).get("fallback_used", False),
                "ecosystem_coordination": ch.get("artifacts", {}).get("ecosystem_coordination"),
            }
            for cid, ch in orch_res.get("child_results", {}).items()
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Held-Out Coding Benchmark: AGI 1.7 vs Raw Base Model")
    parser.add_argument("--max-tasks", type=int, default=3, help="Number of held-out coding tasks to run (1..3)")
    args = parser.parse_args()

    bench_root = REPO_ROOT / "agents" / "AGI_1_7" / "heldout_benchmark_workspace"
    if bench_root.exists():
        shutil.rmtree(bench_root, ignore_errors=True)
    bench_root.mkdir(parents=True, exist_ok=True)

    adapter = AGI17Adapter(
        storage_root=bench_root / "runtime_storage",
        eval_root=bench_root / "eval_env",
    )
    cli_version = _get_cli_version(adapter.model_adapter.agy_path)

    selected_tasks = HELDOUT_CODING_TASKS[: max(1, min(args.max_tasks, len(HELDOUT_CODING_TASKS)))]
    results_per_task: List[Dict[str, Any]] = []

    for idx, task in enumerate(selected_tasks):
        print(f"[{idx + 1}/{len(selected_tasks)}] Evaluating {task.task_id} ({task.title})...", flush=True)
        base_ws = bench_root / "candidates" / "raw_base_model" / task.task_id
        agi17_ws = bench_root / "candidates" / "agi17_orchestrated" / task.task_id

        base_res = evaluate_raw_base_model(adapter, task, base_ws)
        agi17_res = evaluate_agi17_orchestrated(adapter, task, agi17_ws)
        results_per_task.append(
            {
                "task_id": task.task_id,
                "title": task.title,
                "raw_base_model": base_res,
                "agi_1_7_omega_command": agi17_res,
            }
        )

    base_tasks_passed = sum(1 for r in results_per_task if r["raw_base_model"]["heldout_grading"]["task_completed_verified"])
    agi17_tasks_passed = sum(1 for r in results_per_task if r["agi_1_7_omega_command"]["heldout_grading"]["task_completed_verified"])

    base_tests_ran = sum(r["raw_base_model"]["heldout_grading"]["tests_ran"] for r in results_per_task)
    base_tests_passed = sum(r["raw_base_model"]["heldout_grading"]["tests_passed"] for r in results_per_task)
    agi17_tests_ran = sum(r["agi_1_7_omega_command"]["heldout_grading"]["tests_ran"] for r in results_per_task)
    agi17_tests_passed = sum(r["agi_1_7_omega_command"]["heldout_grading"]["tests_passed"] for r in results_per_task)

    summary_payload = {
        "benchmark_name": "AGI 1.7 Held-Out Reproducible Coding Benchmark",
        "executed_at_epoch": time.time(),
        "cli_and_model_metadata": {
            "cli_binary": str(adapter.model_adapter.agy_path),
            "cli_version": cli_version,
            "model_identifier": adapter.model_adapter.SOLE_MODEL,
            "effort_level": "high",
        },
        "tasks_evaluated": len(selected_tasks),
        "scoreboard": {
            "raw_base_model_single_shot": {
                "tasks_completed": f"{base_tasks_passed}/{len(selected_tasks)}",
                "task_completion_rate_pct": round(100.0 * base_tasks_passed / len(selected_tasks), 2),
                "heldout_unit_tests_passed": f"{base_tests_passed}/{base_tests_ran}",
                "unit_test_pass_rate_pct": round(100.0 * base_tests_passed / max(1, base_tests_ran), 2),
                "total_tokens": sum(r["raw_base_model"]["token_usage"]["total_tokens"] for r in results_per_task),
                "total_cost_usd": round(sum(r["raw_base_model"]["estimated_cost_usd"] for r in results_per_task), 6),
            },
            "agi_1_7_omega_command": {
                "tasks_completed": f"{agi17_tasks_passed}/{len(selected_tasks)}",
                "task_completion_rate_pct": round(100.0 * agi17_tasks_passed / len(selected_tasks), 2),
                "heldout_unit_tests_passed": f"{agi17_tests_passed}/{agi17_tests_ran}",
                "unit_test_pass_rate_pct": round(100.0 * agi17_tests_passed / max(1, agi17_tests_ran), 2),
                "total_tokens": sum(r["agi_1_7_omega_command"]["token_usage"]["total_tokens"] for r in results_per_task),
                "total_cost_usd": round(sum(r["agi_1_7_omega_command"]["estimated_cost_usd"] for r in results_per_task), 6),
                "any_fallback_used": any(
                    r["agi_1_7_omega_command"]["fallback_summary"].get("any_fallback_used", False)
                    for r in results_per_task
                ),
            },
        },
        "task_level_results": results_per_task,
    }

    raw_out = REPO_ROOT / "agents" / "AGI_1_7" / "reports" / "HELDOUT_CODING_BENCHMARK_RAW_RESULTS.json"
    raw_out.parent.mkdir(parents=True, exist_ok=True)
    raw_out.write_text(json.dumps(summary_payload, indent=2, default=str), encoding="utf-8")
    print(json.dumps(summary_payload["scoreboard"], indent=2), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

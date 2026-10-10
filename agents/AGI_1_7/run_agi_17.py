"""AGI 1.7.0 — OMEGA COMMAND Primary Runtime Entrypoint."""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from agents.AGI_1_7.engine.agi17.adapters.agi_17_adapter import AGI17Adapter


def _resolve_storage_root(preferred: str | None) -> Path:
    candidate = Path(preferred) if preferred else Path(r"D:\AGI_Storage\AGI_1_7")
    try:
        candidate.mkdir(parents=True, exist_ok=True)
        probe = candidate / ".write_probe"
        probe.write_text("ok", encoding="utf-8")
        probe.unlink(missing_ok=True)
        return candidate
    except OSError:
        fallback = REPO_ROOT / "agents" / "AGI_1_7" / "runtime_storage"
        fallback.mkdir(parents=True, exist_ok=True)
        return fallback


def _spawn_detached(args: argparse.Namespace, storage_root: Path, effective_code_dir: str | None) -> int:
    """Spawns run_agi_17.py in an OS-detached process group that survives closing Antigravity IDE."""
    detached_dir = storage_root / "logs" / "detached"
    detached_dir.mkdir(parents=True, exist_ok=True)
    task_id = args.task_id or f"MISSION-DETACHED-{int(time.time())}"
    log_path = detached_dir / f"{task_id}.log"
    pid_path = detached_dir / f"{task_id}.pid.json"

    cmd = [
        sys.executable,
        str(Path(__file__).resolve()),
        "--title",
        args.title,
        "--task-id",
        task_id,
        "--storage-root",
        str(storage_root),
        "--module-filename",
        args.module_filename,
        "--test-filename",
        args.test_filename,
        "--detached-pid-file",
        str(pid_path),
    ]
    if args.prompt:
        cmd.extend(["--prompt", args.prompt])
    if effective_code_dir:
        cmd.extend(["--code-task-dir", str(effective_code_dir)])
    if args.text_only:
        cmd.append("--text-only")
    if args.profile_only:
        cmd.append("--profile-only")
    if args.force_hierarchical:
        cmd.append("--force-hierarchical")
    if args.inject_deliberate_test_failure:
        cmd.append("--inject-deliberate-test-failure")
    if args.save_execution_log:
        cmd.extend(["--save-execution-log", str(args.save_execution_log)])

    creationflags = 0
    if os.name == "nt":
        # MSDN: CREATE_NO_WINDOW + CREATE_NEW_PROCESS_GROUP detaches from parent console
        # while preserving redirected stdout/stderr file handles.
        creationflags = (
            getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0x00000200)
            | getattr(subprocess, "CREATE_NO_WINDOW", 0x08000000)
        )

    log_fh = open(log_path, "w", encoding="utf-8")
    proc = subprocess.Popen(
        cmd,
        cwd=str(REPO_ROOT),
        stdout=log_fh,
        stderr=subprocess.STDOUT,
        stdin=subprocess.DEVNULL,
        creationflags=creationflags,
        start_new_session=(os.name != "nt"),
        close_fds=(os.name != "nt"),
    )
    log_fh.close()

    payload = {
        "status": "DETACHED_RUNNING",
        "survives_antigravity_close": True,
        "started_at_epoch": time.time(),
        "pid": proc.pid,
        "task_id": task_id,
        "title": args.title,
        "code_task_dir": str(effective_code_dir) if effective_code_dir else None,
        "storage_root": str(storage_root),
        "log_path": str(log_path),
        "pid_file": str(pid_path),
        "command_spawned": cmd,
    }
    pid_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2), flush=True)
    return 0


def _update_detached_pid_file(pid_file_path: str | None, status: str, final_state: str, exit_code: int) -> None:
    if not pid_file_path:
        return
    p = Path(pid_file_path)
    if not p.exists():
        return
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
        data["status"] = status
        data["final_state"] = final_state
        data["exit_code"] = exit_code
        data["completed_at_epoch"] = time.time()
        p.write_text(json.dumps(data, indent=2), encoding="utf-8")
    except Exception:
        pass


def main() -> int:
    parser = argparse.ArgumentParser(description="AGI 1.7.0 — OMEGA COMMAND Runtime")
    parser.add_argument("--title", default="AGI 1.7 Mission", help="Mission title")
    parser.add_argument("--prompt", default=None, help="Mission prompt to execute")
    parser.add_argument("--task-id", default=None, help="Optional explicit mission task ID")
    parser.add_argument("--storage-root", default=None, help="Optional storage root path (falls back locally if D:\\ unavailable)")
    parser.add_argument("--profile-only", action="store_true", help="Run capability profiler and startup reconciliation only")
    parser.add_argument("--force-hierarchical", action="store_true", help="Force hierarchical DAG planning")
    parser.add_argument(
        "--code-task-dir",
        default=None,
        help="Directory for live-model Python code & unit-test generation + self-healing verification (defaults to agents/AGI_1_7/live_code_mission_workspace unless --text-only is set)",
    )
    parser.add_argument("--text-only", action="store_true", help="Run text-only mission without writing/testing code files")
    parser.add_argument("--module-filename", default="token_bucket.py", help="Target Python module filename for coding workflow")
    parser.add_argument("--test-filename", default="test_token_bucket.py", help="Target unittest filename for coding workflow")
    parser.add_argument(
        "--inject-deliberate-test-failure",
        action="store_true",
        help="Inject a deliberate defect after Stage 2 code generation so Stage 3 detects a real unittest failure, escalates to swe_patch_minimizer via ModelAdapter.invoke(), and re-runs tests",
    )
    parser.add_argument("--save-execution-log", default=None, help="Optional path to save full JSON execution trace")
    parser.add_argument(
        "--detach",
        action="store_true",
        help="Run in an OS-detached background process that keeps working even after closing Antigravity IDE",
    )
    parser.add_argument("--detached-pid-file", default=None, help=argparse.SUPPRESS)
    args = parser.parse_args()

    storage_root = _resolve_storage_root(args.storage_root)

    # Normal CLI runs the complete coding workflow by default whenever a prompt is given
    # unless --text-only or --profile-only is specified.
    effective_code_dir: str | None = args.code_task_dir
    if effective_code_dir is None and args.prompt and not args.text_only and not args.profile_only:
        effective_code_dir = str(REPO_ROOT / "agents" / "AGI_1_7" / "live_code_mission_workspace")

    if args.detach:
        return _spawn_detached(args, storage_root, effective_code_dir)

    adapter = AGI17Adapter(storage_root=storage_root)

    startup = adapter.run_startup_reconciliation()

    if args.profile_only or not args.prompt:
        profile = adapter.profiler.build_full_profile()
        out_payload = {
            "runtime": "AGI 1.7.0 — OMEGA COMMAND",
            "startup": startup,
            "capability_profile_summary": {
                "logical_cores": profile["cpu_and_compute"]["logical_processors"],
                "avail_phys_mb": profile["memory"]["available_physical_ram_mb"],
                "d_drive_verified": profile["storage_and_persistence"]["d_drive_verified"],
                "d_probe_sha256": profile["storage_and_persistence"]["d_probe_sha256"],
                "agy_available": profile["network_and_model_services"]["agy_cli_available"],
                "docker_available": profile["virtualization_and_runtimes"]["docker_engine_available"],
            },
        }
        _update_detached_pid_file(args.detached_pid_file, "DETACHED_COMPLETED", "PROFILE_ONLY_OK", 0)
        print(json.dumps(out_payload, indent=2), flush=True)
        return 0

    result = adapter.execute(
        title=args.title,
        prompt=args.prompt,
        task_id=args.task_id,
        force_hierarchical=args.force_hierarchical,
        code_task_dir=effective_code_dir,
        module_filename=args.module_filename,
        test_filename=args.test_filename,
        inject_deliberate_test_failure=args.inject_deliberate_test_failure,
    )
    if args.save_execution_log:
        out_p = Path(args.save_execution_log)
        out_p.parent.mkdir(parents=True, exist_ok=True)
        out_p.write_text(json.dumps(result, indent=2, default=str), encoding="utf-8")
    _update_detached_pid_file(
        args.detached_pid_file,
        "DETACHED_COMPLETED",
        str(result.get("final_state", "UNKNOWN")),
        0 if result.get("final_state") == "SUCCEEDED" else 1,
    )
    print(json.dumps(result, indent=2, default=str), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

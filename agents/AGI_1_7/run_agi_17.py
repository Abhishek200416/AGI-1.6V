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


def _spawn_detached(args: argparse.Namespace, storage_root: Path) -> int:
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
    ]
    if args.prompt:
        cmd.extend(["--prompt", args.prompt])
    if args.profile_only:
        cmd.append("--profile-only")
    if args.force_hierarchical:
        cmd.append("--force-hierarchical")

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
        "pid": proc.pid,
        "task_id": task_id,
        "title": args.title,
        "log_path": str(log_path),
        "pid_file": str(pid_path),
    }
    pid_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2), flush=True)
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="AGI 1.7.0 — OMEGA COMMAND Runtime")
    parser.add_argument("--title", default="AGI 1.7 Mission", help="Mission title")
    parser.add_argument("--prompt", default=None, help="Mission prompt to execute")
    parser.add_argument("--task-id", default=None, help="Optional explicit mission task ID")
    parser.add_argument("--storage-root", default=None, help="Optional storage root path (falls back locally if D:\\ unavailable)")
    parser.add_argument("--profile-only", action="store_true", help="Run capability profiler and startup reconciliation only")
    parser.add_argument("--force-hierarchical", action="store_true", help="Force hierarchical DAG planning")
    parser.add_argument("--code-task-dir", default=None, help="Directory for live-model Python code & unit-test generation + self-healing verification")
    parser.add_argument("--module-filename", default="token_bucket.py", help="Target Python module filename when --code-task-dir is set")
    parser.add_argument("--test-filename", default="test_token_bucket.py", help="Target unittest filename when --code-task-dir is set")
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
    args = parser.parse_args()

    storage_root = _resolve_storage_root(args.storage_root)
    if args.detach:
        return _spawn_detached(args, storage_root)

    adapter = AGI17Adapter(storage_root=storage_root)

    startup = adapter.run_startup_reconciliation()

    if args.profile_only or not args.prompt:
        profile = adapter.profiler.build_full_profile()
        print(
            json.dumps(
                {
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
                },
                indent=2,
            ),
            flush=True,
        )
        return 0

    result = adapter.execute(
        title=args.title,
        prompt=args.prompt,
        task_id=args.task_id,
        force_hierarchical=args.force_hierarchical,
        code_task_dir=args.code_task_dir,
        module_filename=args.module_filename,
        test_filename=args.test_filename,
        inject_deliberate_test_failure=args.inject_deliberate_test_failure,
    )
    if args.save_execution_log:
        out_p = Path(args.save_execution_log)
        out_p.parent.mkdir(parents=True, exist_ok=True)
        out_p.write_text(json.dumps(result, indent=2, default=str), encoding="utf-8")
    print(json.dumps(result, indent=2, default=str), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

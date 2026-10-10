"""
agi/terminal/terminal_controller.py
AGI 1.2 — Stateful Terminal Engineering & Execution Control (Part IX)

Implements:
1. Stateful Process Management & Ownership Tracking (Section 9.1)
2. Bounded Output Streaming (Head/Tail truncation to prevent memory overflow) (Section 9.2)
3. Duplicate Execution Prevention & Safe Process Termination (Section 9.3 & 9.4)
4. Telemetry-Linked Action Postcondition Verification
"""

import os
import sys
import time
import subprocess
import threading
import uuid
from typing import Dict, Any, List, Optional, Tuple

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from agi.orchestration.observability import get_telemetry_engine

MAX_OUTPUT_BYTES = 64 * 1024  # 64 KB bounded output buffer


class TerminalProcessRecord:
    def __init__(self, proc_id: str, command: str, cwd: str, popen_obj: subprocess.Popen):
        self.proc_id = proc_id
        self.command = command
        self.cwd = cwd
        self.popen = popen_obj
        self.start_time = time.time()
        self.end_time: Optional[float] = None
        self.status = "RUNNING"  # RUNNING | COMPLETED | FAILED | TERMINATED | TIMED_OUT
        self.exit_code: Optional[int] = None
        self.stdout_buffer: List[str] = []
        self.stderr_buffer: List[str] = []
        self.total_bytes_captured = 0


class TerminalController:
    def __init__(self, run_id: Optional[str] = None):
        self.lock = threading.RLock()
        self.run_id = run_id or f"TERM-{int(time.time())}"
        self.processes: Dict[str, TerminalProcessRecord] = {}
        self.telemetry = get_telemetry_engine(run_id=self.run_id)

    # -------------------------------------------------------------
    # Section 9.1 & 9.2: Synchronous Command Execution with Bounded Buffers
    # -------------------------------------------------------------
    def run_sync(
        self,
        command: str,
        cwd: Optional[str] = None,
        timeout_seconds: float = 30.0,
        task_id: str = "TERMINAL_TASK",
        env: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        start_time = time.time()
        effective_cwd = cwd or os.getcwd()

        clean_env = os.environ.copy()
        if env:
            clean_env.update(env)
        # Prevent proxy socket hangs on Windows
        for p in ["HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy"]:
            clean_env.pop(p, None)

        self.telemetry.record_event(
            task_id=task_id,
            component="TERMINAL",
            event_type="COMMAND_START",
            status="RUNNING",
            sanitized_target=command[:60]
        )

        try:
            proc = subprocess.run(
                command,
                cwd=effective_cwd,
                env=clean_env,
                shell=True,
                capture_output=True,
                text=True,
                timeout=timeout_seconds
            )
            duration_ms = (time.time() - start_time) * 1000
            stdout_bounded = self._bound_output(proc.stdout)
            stderr_bounded = self._bound_output(proc.stderr)
            success = proc.returncode == 0

            status_str = "SUCCESS" if success else "FAILED"
            self.telemetry.record_event(
                task_id=task_id,
                component="TERMINAL",
                event_type="COMMAND_COMPLETE",
                status=status_str,
                duration_ms=duration_ms,
                output_reference=f"Exit {proc.returncode} | Out: {len(stdout_bounded)} chars"
            )

            return {
                "command": command,
                "exit_code": proc.returncode,
                "success": success,
                "stdout": stdout_bounded,
                "stderr": stderr_bounded,
                "duration_ms": round(duration_ms, 2),
                "timed_out": False
            }

        except subprocess.TimeoutExpired:
            duration_ms = (time.time() - start_time) * 1000
            self.telemetry.record_event(
                task_id=task_id,
                component="TERMINAL",
                event_type="COMMAND_TIMEOUT",
                status="FAILED",
                duration_ms=duration_ms,
                error_category="TimeoutExpired"
            )
            return {
                "command": command,
                "exit_code": -1,
                "success": False,
                "stdout": "",
                "stderr": f"Command timed out after {timeout_seconds}s",
                "duration_ms": round(duration_ms, 2),
                "timed_out": True
            }

    # -------------------------------------------------------------
    # Section 9.3 & 9.4: Stateful Async Background Process Management
    # -------------------------------------------------------------
    def spawn_async(
        self,
        command: str,
        cwd: Optional[str] = None,
        prevent_duplicates: bool = True
    ) -> Tuple[str, bool]:
        """Spawns an asynchronous process with duplicate prevention."""
        with self.lock:
            if prevent_duplicates:
                existing_id = self.find_running_command(command)
                if existing_id:
                    return existing_id, False  # Already running!

            proc_id = f"proc-{uuid.uuid4().hex[:8]}"
            effective_cwd = cwd or os.getcwd()
            clean_env = os.environ.copy()
            for p in ["HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy"]:
                clean_env.pop(p, None)

            popen = subprocess.Popen(
                command,
                cwd=effective_cwd,
                env=clean_env,
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )

            record = TerminalProcessRecord(proc_id, command, effective_cwd, popen)
            self.processes[proc_id] = record
            return proc_id, True

    def find_running_command(self, command: str) -> Optional[str]:
        with self.lock:
            self._reconcile_processes()
            for pid, rec in self.processes.items():
                if rec.command == command and rec.status == "RUNNING":
                    return pid
            return None

    def poll_process(self, proc_id: str) -> Optional[Dict[str, Any]]:
        with self.lock:
            self._reconcile_processes()
            if proc_id not in self.processes:
                return None
            rec = self.processes[proc_id]
            return {
                "proc_id": proc_id,
                "command": rec.command,
                "status": rec.status,
                "exit_code": rec.exit_code,
                "elapsed_seconds": round(time.time() - rec.start_time, 2)
            }

    def terminate_process(self, proc_id: str, force: bool = False) -> bool:
        with self.lock:
            if proc_id not in self.processes:
                return False
            rec = self.processes[proc_id]
            if rec.status != "RUNNING":
                return True
            try:
                if force:
                    rec.popen.kill()
                else:
                    rec.popen.terminate()
                rec.status = "TERMINATED"
                rec.end_time = time.time()
                return True
            except Exception:
                return False

    def _reconcile_processes(self):
        """Reconciles process status table against actual OS exit codes."""
        for pid, rec in self.processes.items():
            if rec.status == "RUNNING":
                poll_code = rec.popen.poll()
                if poll_code is not None:
                    rec.exit_code = poll_code
                    rec.end_time = time.time()
                    rec.status = "COMPLETED" if poll_code == 0 else "FAILED"

    def _bound_output(self, text: str) -> str:
        if not text:
            return ""
        if len(text) <= MAX_OUTPUT_BYTES:
            return text
        head = text[:MAX_OUTPUT_BYTES // 2]
        tail = text[-(MAX_OUTPUT_BYTES // 2):]
        return f"{head}\n\n[... TRUNCATED {len(text) - MAX_OUTPUT_BYTES} BYTES ...]\n\n{tail}"

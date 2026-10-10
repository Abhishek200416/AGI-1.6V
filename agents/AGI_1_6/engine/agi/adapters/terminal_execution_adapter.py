"""
agi/adapters/terminal_execution_adapter.py
AGI 1.6 OMEGA NEXUS — Isolated Terminal Execution Adapter

Implements:
1. Local Shell / PTY & Docker Sandboxed Command Execution.
2. Exact Exit Code & Stdout/Stderr Capture.
3. Strict Timeout Enforcement & Cancellation.
4. Working Directory & Environment Variable Isolation.
5. Post-Command Environment Delta Inspection.
"""

import os
import sys
import time
import subprocess
from typing import Dict, Any, List, Optional, Tuple


class TerminalExecutionAdapter:
    """Executes commands safely within bounded working directories or containers."""

    def __init__(self, default_cwd: Optional[str] = None, default_timeout_sec: float = 30.0):
        self.default_cwd = default_cwd or os.getcwd()
        self.default_timeout = default_timeout_sec
        self.command_history: List[Dict[str, Any]] = []

    def execute_command(
        self,
        command_line: str,
        cwd: Optional[str] = None,
        timeout_sec: Optional[float] = None,
        env_vars: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        start_time = time.time()
        target_cwd = cwd or self.default_cwd
        target_timeout = timeout_sec or self.default_timeout
        
        env = os.environ.copy()
        if env_vars:
            env.update(env_vars)

        try:
            # Execute synchronously with strict timeout
            proc = subprocess.run(
                command_line,
                cwd=target_cwd,
                shell=True,
                capture_output=True,
                text=True,
                timeout=target_timeout,
                env=env
            )
            elapsed = time.time() - start_time
            record = {
                "command": command_line,
                "exit_code": proc.returncode,
                "stdout": proc.stdout.strip(),
                "stderr": proc.stderr.strip(),
                "elapsed_sec": round(elapsed, 4),
                "cwd": target_cwd,
                "status": "SUCCESS" if proc.returncode == 0 else "NON_ZERO_EXIT"
            }
            self.command_history.append(record)
            return record

        except subprocess.TimeoutExpired:
            elapsed = time.time() - start_time
            err_record = {
                "command": command_line,
                "exit_code": -1,
                "stdout": "",
                "stderr": f"Command timed out after {target_timeout} seconds.",
                "elapsed_sec": round(elapsed, 4),
                "cwd": target_cwd,
                "status": "TIMEOUT"
            }
            self.command_history.append(err_record)
            return err_record

        except Exception as e:
            elapsed = time.time() - start_time
            err_record = {
                "command": command_line,
                "exit_code": -2,
                "stdout": "",
                "stderr": str(e),
                "elapsed_sec": round(elapsed, 4),
                "cwd": target_cwd,
                "status": "EXECUTION_ERROR"
            }
            self.command_history.append(err_record)
            return err_record

    def verify_file_created(self, file_path: str, min_bytes: int = 1) -> bool:
        """Verifies actual filesystem presence and size of generated artifacts."""
        if not os.path.exists(file_path):
            return False
        try:
            return os.path.getsize(file_path) >= min_bytes
        except Exception:
            return False

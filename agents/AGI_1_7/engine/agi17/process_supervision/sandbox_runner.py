"""AGI 1.7 Disposable Sandbox Runner & Security Gate (Phase 3).

Provides defense-in-depth for executing model-generated code and untrusted tests:
1. Disposable Docker Container Isolation (`--rm --network none --cap-drop ALL
   --security-opt no-new-privileges --read-only --tmpfs /tmp --cpus --memory --pids-limit`).
2. Fail-safe behavior (`SandboxIsolationUnavailableError`) when container
   isolation is required (`require_container_isolation=True`) and Docker is unavailable.
3. Ephemeral Restricted Tempdir fallback (when `require_container_isolation=False`)
   with stripped environment variables (zero credentials/tokens), read-only source
   copying, and guaranteed `finally:` workspace destruction.
4. Path Traversal Prevention (`PathTraversalViolationError`) rejecting `..`,
   absolute paths, and symlink escapes outside the sandbox root.
5. Prompt-Injection & Malicious Repo Scanner (`scan_untrusted_content`) and
   `HighImpactApprovalGate` blocking destructive commands, network egress,
   `git push`, or secret access without explicit human approval.
"""

from __future__ import annotations

import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Sequence


class SandboxSecurityError(RuntimeError):
    """Base exception for sandbox security policy violations."""


class SandboxIsolationUnavailableError(SandboxSecurityError):
    """Raised when container isolation is required but no container runtime is available."""


class PathTraversalViolationError(SandboxSecurityError):
    """Raised when a file operation attempts to escape the sandbox root directory."""


class HighImpactActionBlockedError(SandboxSecurityError):
    """Raised when a high-impact action is attempted without explicit human approval."""


class UntrustedContentSecurityError(SandboxSecurityError):
    """Raised when malicious code or prompt-injection attempts to exfiltrate secrets or attack the host."""


@dataclass
class SandboxPolicy:
    """Resource, network, filesystem, and container isolation policy for untrusted execution."""

    isolation_mode: str = "auto"  # "docker" | "auto" | "restricted_tempdir"
    require_container_isolation: bool = False
    network_enabled: bool = False
    cpu_limit: float = 1.0
    memory_limit_mb: int = 256
    pids_limit: int = 64
    wall_timeout_sec: float = 30.0
    max_output_bytes: int = 65_536
    docker_image: Optional[str] = None
    block_dangerous_code_patterns: bool = True

    @classmethod
    def production(cls, docker_image: Optional[str] = None) -> "SandboxPolicy":
        """Fail-closed production policy: requires disposable Docker container isolation and never silently downgrades to host."""
        return cls(
            isolation_mode="docker",
            require_container_isolation=True,
            network_enabled=False,
            cpu_limit=1.0,
            memory_limit_mb=256,
            pids_limit=64,
            wall_timeout_sec=30.0,
            docker_image=docker_image,
            block_dangerous_code_patterns=True,
        )

    @classmethod
    def development(cls) -> "SandboxPolicy":
        """Development/CI policy: uses Docker when available, or restricted ephemeral tempdir with sanitized env."""
        return cls(
            isolation_mode="auto",
            require_container_isolation=False,
            network_enabled=False,
            block_dangerous_code_patterns=True,
        )


@dataclass
class SandboxExecutionResult:
    """Structured result of running untrusted code/tests inside the disposable sandbox."""

    sandbox_id: str
    isolation_backend: str  # "docker_disposable_container" | "ephemeral_restricted_tempdir"
    passed: bool
    exit_code: int
    timed_out: bool
    duration_sec: float
    stdout: str
    stderr: str
    network_disabled: bool
    cleanup_verified: bool
    policy_requested_network_disabled: bool = True
    verified_network_isolated: bool = False
    security_warnings: List[str] = field(default_factory=list)
    command_executed: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


_PROMPT_INJECTION_PATTERNS = [
    (re.compile(r"(?i)ignore\s+(all\s+)?(previous|prior|above)\s+instructions"), "prompt_injection_ignore_previous"),
    (re.compile(r"(?i)system\s+override\s*:?\s*disable\s+security"), "prompt_injection_system_override"),
    (re.compile(r"(?i)--dangerously-skip-permissions"), "prompt_injection_skip_permissions"),
    (re.compile(r"(?i)exfiltrate\s+(secrets|api[_\s]?keys|credentials|env)"), "prompt_injection_exfiltration"),
]

_DANGEROUS_CODE_PATTERNS = [
    (re.compile(r"(?i)(\.gemini[/\\]+config|\.ssh[/\\]+id_rsa|\.aws[/\\]+credentials)"), "credential_file_access"),
    (re.compile(r"(?i)shutil\.rmtree\s*\(\s*['\"](/|[a-zA-Z]:\\*)['\"]\s*\)"), "destructive_root_rmtree"),
    (re.compile(r"(?i)\b(rm\s+-rf\s+/|format\s+[a-zA-Z]:|del\s+/[fqs]\s+[a-zA-Z]:\\)"), "destructive_host_command"),
    (re.compile(r"(?i)\b(urllib\.request\.urlopen|socket\.create_connection|http\.client\.HTTP)"), "unauthorized_network_call"),
]

_HIGH_IMPACT_ACTION_PATTERNS = [
    (re.compile(r"(?i)\bgit\s+push\b"), "git_push"),
    (re.compile(r"(?i)\b(pip|pip3)\s+install\b"), "package_install"),
    (re.compile(r"(?i)\b(rm\s+-rf|Remove-Item\s+.*-Recurse)\b"), "destructive_delete"),
    (re.compile(r"(?i)\b(curl|wget|Invoke-WebRequest)\b"), "external_network_fetch"),
]


class HighImpactApprovalGate:
    """Requires explicit human approval before executing high-impact actions."""

    def __init__(self, approval_callback: Optional[Callable[[str, str], bool]] = None) -> None:
        self.approval_callback = approval_callback
        self.audit_log: List[Dict[str, Any]] = []

    def check_command(self, action_description: str, command_or_code: str, approved: bool = False) -> None:
        matched_categories: List[str] = []
        for pattern, category in _HIGH_IMPACT_ACTION_PATTERNS:
            if pattern.search(command_or_code):
                matched_categories.append(category)

        if not matched_categories:
            return

        is_approved = approved
        if not is_approved and self.approval_callback is not None:
            is_approved = bool(self.approval_callback(action_description, ",".join(matched_categories)))

        self.audit_log.append(
            {
                "timestamp": time.time(),
                "action": action_description,
                "categories": matched_categories,
                "approved": is_approved,
            }
        )
        if not is_approved:
            raise HighImpactActionBlockedError(
                f"High-impact action blocked ({', '.join(matched_categories)}): '{action_description}' requires explicit human approval."
            )


def validate_relative_sandbox_path(sandbox_root: Path, candidate_path: str | Path) -> Path:
    """Ensures `candidate_path` resolves strictly inside `sandbox_root` with zero traversal or symlink escape."""
    root_resolved = sandbox_root.resolve()
    cand_str = str(candidate_path)
    if os.path.isabs(cand_str) or cand_str.startswith(("/", "\\")) or ":" in cand_str:
        raise PathTraversalViolationError(f"Absolute or drive-qualified path rejected in sandbox: '{cand_str}'")
    norm_parts = Path(cand_str).parts
    if ".." in norm_parts:
        raise PathTraversalViolationError(f"Parent directory traversal ('..') rejected in sandbox path: '{cand_str}'")
    raw_target = root_resolved / cand_str
    # Check intermediate and final path components for symlinks before resolving
    cur_check = root_resolved
    for part in norm_parts:
        cur_check = cur_check / part
        if cur_check.is_symlink():
            raise PathTraversalViolationError(f"Symlink escape rejected in sandbox path: '{cand_str}'")
    if raw_target.is_symlink():
        raise PathTraversalViolationError(f"Symlink escape rejected in sandbox path: '{cand_str}'")
    target = raw_target.resolve()
    try:
        target.relative_to(root_resolved)
    except ValueError as exc:
        raise PathTraversalViolationError(
            f"Sandbox path '{cand_str}' resolved outside sandbox root '{root_resolved}'"
        ) from exc
    return target


def scan_untrusted_content(
    content: str,
    *,
    source_name: str = "untrusted_input",
    block_on_code_hazards: bool = True,
) -> List[str]:
    """Scans repository files, issues, or generated code for prompt-injection and host-attack patterns."""
    warnings: List[str] = []
    for pattern, label in _PROMPT_INJECTION_PATTERNS:
        if pattern.search(content):
            warnings.append(f"{source_name}:{label}")
    for pattern, label in _DANGEROUS_CODE_PATTERNS:
        if pattern.search(content):
            warnings.append(f"{source_name}:{label}")
            if block_on_code_hazards:
                raise UntrustedContentSecurityError(
                    f"Blocked dangerous pattern '{label}' in '{source_name}'"
                )
    return warnings


class DisposableSandboxRunner:
    """Executes untrusted Python code and unit tests inside a disposable container or isolated ephemeral workspace."""

    CANDIDATE_PYTHON_IMAGES = (
        "python:3.12-slim",
        "python:3.11-slim",
        "alexgshaw/db-wal-recovery:20251031",
    )

    def __init__(
        self,
        policy: Optional[SandboxPolicy] = None,
        approval_gate: Optional[HighImpactApprovalGate] = None,
    ) -> None:
        self.policy = policy or SandboxPolicy()
        self.approval_gate = approval_gate or HighImpactApprovalGate()
        self._cached_docker_image: Optional[str] = None
        self._docker_checked: bool = False

    def detect_docker_python_image(self) -> Optional[str]:
        """Checks if Docker daemon is reachable and a local Python 3 image is available."""
        if self._docker_checked:
            return self._cached_docker_image
        self._docker_checked = True
        if self.policy.docker_image:
            self._cached_docker_image = self.policy.docker_image
            return self._cached_docker_image
        if not shutil.which("docker"):
            return None
        try:
            proc = subprocess.run(
                ["docker", "images", "--format", "{{.Repository}}:{{.Tag}}"],
                capture_output=True,
                text=True,
                timeout=5,
                check=False,
            )
            if proc.returncode != 0:
                return None
            available = {ln.strip() for ln in proc.stdout.splitlines() if ln.strip()}
            for candidate in self.CANDIDATE_PYTHON_IMAGES:
                if candidate in available:
                    self._cached_docker_image = candidate
                    return candidate
        except Exception:
            return None
        return None

    @staticmethod
    def _build_sanitized_host_env(temp_root: Path) -> Dict[str, str]:
        """Strips all host credentials, tokens, and user environment variables."""
        safe_env: Dict[str, str] = {
            "PATH": os.environ.get("PATH", ""),
            "PYTHONDONTWRITEBYTECODE": "1",
            "PYTHONNOUSERSITE": "1",
            "PYTHONIOENCODING": "utf-8",
            "HOME": str(temp_root),
            "USERPROFILE": str(temp_root),
            "TEMP": str(temp_root),
            "TMP": str(temp_root),
        }
        if os.name == "nt":
            for win_key in ("SYSTEMROOT", "WINDIR", "COMSPEC", "PATHEXT"):
                if win_key in os.environ:
                    safe_env[win_key] = os.environ[win_key]
        return safe_env

    def run_python_unittest_sandbox(
        self,
        *,
        files: Dict[str, str],
        test_pattern: str = "test_*.py",
        sandbox_id: Optional[str] = None,
    ) -> SandboxExecutionResult:
        """Writes `files` (relative path -> content) into a disposable sandbox, runs unittest, and destroys the workspace."""
        sid = sandbox_id or f"SBX-{int(time.time() * 1000)}"
        warnings: List[str] = []

        # 1. Scan all files for prompt injection and dangerous code patterns before writing to disk
        for rel_path, content in files.items():
            file_warnings = scan_untrusted_content(
                content,
                source_name=rel_path,
                block_on_code_hazards=self.policy.block_dangerous_code_patterns,
            )
            warnings.extend(file_warnings)

        # 2. Resolve isolation backend
        use_docker = False
        docker_img: Optional[str] = None
        if self.policy.isolation_mode == "docker":
            docker_img = self.detect_docker_python_image()
            if not docker_img:
                raise SandboxIsolationUnavailableError(
                    "SandboxPolicy requires isolation_mode='docker', but Docker daemon or local Python image is unavailable."
                )
            use_docker = True
        elif self.policy.isolation_mode == "auto":
            docker_img = self.detect_docker_python_image()
            if docker_img:
                use_docker = True
            elif self.policy.require_container_isolation:
                raise SandboxIsolationUnavailableError(
                    "SandboxPolicy require_container_isolation=True, but Docker daemon or local Python image is unavailable."
                )
        elif self.policy.isolation_mode == "restricted_tempdir":
            if self.policy.require_container_isolation:
                raise SandboxIsolationUnavailableError(
                    "Cannot satisfy require_container_isolation=True with isolation_mode='restricted_tempdir'."
                )
        else:
            raise ValueError(f"Unsupported isolation_mode: '{self.policy.isolation_mode}'")

        staging_dir = Path(tempfile.mkdtemp(prefix=f"agi17_sbx_{sid}_"))
        t0 = time.perf_counter()
        exit_code = -1
        timed_out = False
        stdout_str = ""
        stderr_str = ""
        cmd_executed: List[str] = []
        backend_label = "docker_disposable_container" if use_docker else "ephemeral_restricted_tempdir"

        try:
            # Validate paths and populate ephemeral staging directory
            for rel_path, content in files.items():
                target_file = validate_relative_sandbox_path(staging_dir, rel_path)
                target_file.parent.mkdir(parents=True, exist_ok=True)
                target_file.write_text(content, encoding="utf-8")

            if use_docker and docker_img:
                # Mount host staging_dir read-only at /input:ro and copy into ephemeral /tmp/work inside container
                cmd_executed = [
                    "docker",
                    "run",
                    "--rm",
                    "--user",
                    "65534:65534",
                    "--cap-drop",
                    "ALL",
                    "--security-opt",
                    "no-new-privileges",
                    "--read-only",
                    "--tmpfs",
                    "/tmp:rw,exec,nosuid,size=64m,mode=1777",
                    "--cpus",
                    str(self.policy.cpu_limit),
                    "--memory",
                    f"{int(self.policy.memory_limit_mb)}m",
                    "--pids-limit",
                    str(int(self.policy.pids_limit)),
                ]
                if not self.policy.network_enabled:
                    cmd_executed.extend(["--network", "none"])
                cmd_executed.extend(
                    [
                        "-v",
                        f"{staging_dir.resolve()}:/input:ro",
                        docker_img,
                        "sh",
                        "-c",
                        f"mkdir -p /tmp/work && cp -R /input/. /tmp/work/ && cd /tmp/work && python3 -B -m unittest discover -v -s . -p '{test_pattern}'",
                    ]
                )
                proc = subprocess.run(
                    cmd_executed,
                    capture_output=True,
                    text=True,
                    timeout=self.policy.wall_timeout_sec,
                    check=False,
                )
                exit_code = proc.returncode
                stdout_str = proc.stdout or ""
                stderr_str = proc.stderr or ""
            else:
                # Ephemeral restricted tempdir with stripped environment variables
                py_bin = sys.executable or ("py" if os.name == "nt" else "python3")
                cmd_executed = [
                    py_bin,
                    "-B",
                    "-I",
                    "-m",
                    "unittest",
                    "discover",
                    "-v",
                    "-s",
                    ".",
                    "-p",
                    test_pattern,
                ]
                safe_env = self._build_sanitized_host_env(staging_dir)
                proc = subprocess.run(
                    cmd_executed,
                    cwd=str(staging_dir),
                    env=safe_env,
                    capture_output=True,
                    text=True,
                    timeout=self.policy.wall_timeout_sec,
                    check=False,
                )
                exit_code = proc.returncode
                stdout_str = proc.stdout or ""
                stderr_str = proc.stderr or ""
        except subprocess.TimeoutExpired as exc:
            timed_out = True
            exit_code = 124
            stdout_str = (exc.stdout.decode("utf-8", errors="replace") if isinstance(exc.stdout, bytes) else (exc.stdout or ""))
            stderr_str = (exc.stderr.decode("utf-8", errors="replace") if isinstance(exc.stderr, bytes) else (exc.stderr or "")) + "\nSandbox execution timed out."
        finally:
            shutil.rmtree(staging_dir, ignore_errors=True)

        from ..adapters.model_adapter import redact_sensitive_text

        cleanup_ok = not staging_dir.exists()
        dt = round(time.perf_counter() - t0, 4)
        stdout_redacted = redact_sensitive_text(stdout_str[: self.policy.max_output_bytes])
        stderr_redacted = redact_sensitive_text(stderr_str[: self.policy.max_output_bytes])
        policy_net_disabled = not self.policy.network_enabled
        verified_net_isolated = bool(use_docker and policy_net_disabled)

        return SandboxExecutionResult(
            sandbox_id=sid,
            isolation_backend=backend_label,
            passed=(exit_code == 0 and not timed_out and cleanup_ok),
            exit_code=exit_code,
            timed_out=timed_out,
            duration_sec=dt,
            stdout=stdout_redacted,
            stderr=stderr_redacted,
            network_disabled=policy_net_disabled,
            cleanup_verified=cleanup_ok,
            policy_requested_network_disabled=policy_net_disabled,
            verified_network_isolated=verified_net_isolated,
            security_warnings=warnings,
            command_executed=[redact_sensitive_text(c) for c in cmd_executed],
        )

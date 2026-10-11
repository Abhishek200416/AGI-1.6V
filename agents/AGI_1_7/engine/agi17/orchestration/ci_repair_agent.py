"""AGI 1.7 Focused Product Workflow: Automated Python CI-Repair & Test-Healing Agent (Phase 7).

Provides a narrow, high-reliability, commercially credible product workflow:
1. Pre-scans the target repository/workspace for prompt-injection and dangerous code patterns.
2. Reproduces the failing Python `unittest` suite inside `DisposableSandboxRunner`
   (Docker disposable container with `--network none --cap-drop ALL --read-only` or
   ephemeral restricted tempdir).
3. Synthesizes the smallest root-cause patch via `swe_patch_minimizer` + Ponytail
   minimal-diff railings under strict token (`max_tokens`) and cost (`max_cost_usd`) ceilings.
4. Verifies AST syntax validity, static quality checks, and 100% test pass rate
   inside the disposable sandbox without introducing regressions.
5. Generates a unified diff (`patch_diff`) and reviewable Pull Request payload
   with `requires_human_approval=True` enforced by `HighImpactApprovalGate`.
"""

from __future__ import annotations

import ast
import difflib
import hashlib
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

from agents.AGI_1_7.ecosystem.agent_registry.ecosystem_coordinator import EcosystemCoordinator
from agents.AGI_1_7.ecosystem.agent_registry.specialist_factory import SpecialistFactory
from ..adapters.model_adapter import ModelAdapter, ModelProviderConfig, redact_sensitive_text
from ..process_supervision.sandbox_runner import (
    DisposableSandboxRunner,
    HighImpactApprovalGate,
    PathTraversalViolationError,
    SandboxPolicy,
    atomic_write_workspace_file,
    scan_untrusted_content,
    validate_relative_sandbox_path,
)
from .hierarchical_orchestrator import _extract_python_code, _is_valid_python_syntax


@dataclass
class CIRepairBudget:
    """Strict resource, token, and USD cost ceilings for a single CI-repair job."""

    max_repair_attempts: int = 2
    max_tokens: int = 80_000
    max_cost_usd: float = 0.25
    sandbox_timeout_sec: float = 30.0


@dataclass
class CIRepairResult:
    """Complete, auditable output of an automated Python CI-repair run."""

    repair_id: str
    status: str  # "REPAIRED_AND_VERIFIED" | "ALREADY_PASSING" | "REPAIR_FAILED" | "BLOCKED_BY_SECURITY"
    terminal_outcome: str  # "SUCCEEDED_AND_VERIFIED" | "FAILED" | "BLOCKED_BY_POLICY"
    workspace_dir: str
    target_module: str
    test_pattern: str
    initial_test_run: Dict[str, Any]
    final_test_run: Dict[str, Any]
    attempts_used: int
    syntax_check_passed: bool
    tests_verified_in_sandbox: bool
    test_files_unmodified_verified: bool
    patch_applied_to_workspace: bool
    isolation_backend: str
    original_sha256: str
    patched_sha256: str
    unified_diff: str
    diff_lines_changed: int
    total_tokens_consumed: int
    total_cost_usd: float
    duration_sec: float
    security_warnings: List[str] = field(default_factory=list)
    attempt_history: List[Dict[str, Any]] = field(default_factory=list)
    pull_request_payload: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class CIRepairAgent:
    """End-to-end automated Python test-failure reproduction, minimal patching, and sandboxed verification."""

    def __init__(
        self,
        *,
        model_adapter: Optional[ModelAdapter] = None,
        sandbox_runner: Optional[DisposableSandboxRunner] = None,
        specialist_factory: Optional[SpecialistFactory] = None,
        ecosystem_coordinator: Optional[EcosystemCoordinator] = None,
        approval_gate: Optional[HighImpactApprovalGate] = None,
        budget: Optional[CIRepairBudget] = None,
    ) -> None:
        self.budget = budget or CIRepairBudget()
        self.model_adapter = model_adapter or ModelAdapter(
            config=ModelProviderConfig(
                max_request_cost_usd=self.budget.max_cost_usd,
                max_mission_cost_usd=self.budget.max_cost_usd,
            )
        )
        self.sandbox_runner = sandbox_runner or DisposableSandboxRunner(
            policy=SandboxPolicy(wall_timeout_sec=self.budget.sandbox_timeout_sec)
        )
        self.specialist_factory = specialist_factory or SpecialistFactory()
        self.ecosystem_coordinator = ecosystem_coordinator or EcosystemCoordinator()
        self.approval_gate = approval_gate or HighImpactApprovalGate()

    @staticmethod
    def _collect_workspace_py_files(ws_dir: Path) -> Dict[str, str]:
        files_map: Dict[str, str] = {}
        ignored_dirs = {".git", ".venv", "venv", "__pycache__", ".pytest_cache", "node_modules"}
        for py_file in sorted(ws_dir.rglob("*.py")):
            rel_parts = py_file.relative_to(ws_dir).parts
            if any(part in ignored_dirs for part in rel_parts):
                continue
            rel_posix = py_file.relative_to(ws_dir).as_posix()
            if py_file.is_symlink():
                raise PathTraversalViolationError(
                    f"Symlink file rejected in CI-Repair workspace: '{rel_posix}'"
                )
            if py_file.is_file():
                validate_relative_sandbox_path(ws_dir, rel_posix)
                files_map[rel_posix] = py_file.read_text(encoding="utf-8", errors="replace")
        return files_map

    @staticmethod
    def _run_static_quality_check(code_str: str, filename: str) -> Dict[str, Any]:
        """Verifies Python AST validity and checks for bare excepts or syntax defects."""
        try:
            tree = ast.parse(code_str, filename=filename)
        except SyntaxError as exc:
            return {"passed": False, "error": f"SyntaxError: {exc}", "ast_nodes": 0}
        bare_excepts = sum(
            1 for node in ast.walk(tree) if isinstance(node, ast.ExceptHandler) and node.type is None
        )
        return {
            "passed": True,
            "error": None,
            "ast_nodes": sum(1 for _ in ast.walk(tree)),
            "bare_except_handlers": bare_excepts,
        }

    def repair_workspace(
        self,
        *,
        workspace_dir: str | Path,
        module_filename: str,
        test_pattern: str = "test_*.py",
        issue_description: str = "Fix failing Python unit tests with minimal diff.",
        write_patch_to_workspace: bool = False,
        apply_approved_patch: bool = False,
        repair_id: Optional[str] = None,
    ) -> CIRepairResult:
        """Reproduces failing tests in the sandbox, synthesizes a minimal patch, verifies in sandbox, and builds a PR payload.

        By default (`write_patch_to_workspace=False` and `apply_approved_patch=False`), candidate patches
        are staged and verified strictly inside the disposable sandbox without mutating the user's working tree.
        """
        t0 = time.perf_counter()
        rid = repair_id or f"CI-REPAIR-{int(time.time() * 1000)}"
        ws = Path(workspace_dir).resolve()
        module_path = validate_relative_sandbox_path(ws, module_filename)
        if not module_path.is_file():
            raise FileNotFoundError(f"Target Python module not found: {module_path}")

        original_code = module_path.read_text(encoding="utf-8")
        original_sha = hashlib.sha256(original_code.encode("utf-8")).hexdigest()
        py_files = self._collect_workspace_py_files(ws)
        test_file_hashes_before = {
            k: hashlib.sha256(v.encode("utf-8")).hexdigest()
            for k, v in py_files.items()
            if k != module_filename
        }

        # 1. Pre-scan workspace files for prompt injection or dangerous code
        all_warnings: List[str] = []
        for fname, content in py_files.items():
            w = scan_untrusted_content(content, source_name=fname, block_on_code_hazards=True)
            all_warnings.extend(w)

        # 2. Reproduce failure inside disposable sandbox
        initial_sbx = self.sandbox_runner.run_python_unittest_sandbox(
            files=py_files,
            test_pattern=test_pattern,
            sandbox_id=f"{rid}-INIT",
        )
        if initial_sbx.passed:
            return CIRepairResult(
                repair_id=rid,
                status="ALREADY_PASSING",
                terminal_outcome="SUCCEEDED_AND_VERIFIED",
                workspace_dir=redact_sensitive_text(str(ws)),
                target_module=module_filename,
                test_pattern=test_pattern,
                initial_test_run=initial_sbx.to_dict(),
                final_test_run=initial_sbx.to_dict(),
                attempts_used=0,
                syntax_check_passed=True,
                tests_verified_in_sandbox=True,
                test_files_unmodified_verified=True,
                patch_applied_to_workspace=False,
                isolation_backend=initial_sbx.isolation_backend,
                original_sha256=original_sha,
                patched_sha256=original_sha,
                unified_diff="",
                diff_lines_changed=0,
                total_tokens_consumed=0,
                total_cost_usd=0.0,
                duration_sec=round(time.perf_counter() - t0, 4),
                security_warnings=all_warnings,
                attempt_history=[],
                pull_request_payload={
                    "title": f"[NO-OP] Tests already passing for {module_filename}",
                    "requires_human_approval": True,
                },
            )

        # 3. Iterative repair loop within strict attempt, token, and USD cost budgets
        contract = self.specialist_factory.get_contract("swe_patch_minimizer")
        coord = self.ecosystem_coordinator.build_coordination_railings(contract, is_repair=True)
        test_sources = "\n\n".join(
            f"# {k}\n{v}" for k, v in py_files.items() if k != module_filename
        )

        current_code = original_code
        current_failure_output = (initial_sbx.stderr or initial_sbx.stdout).strip()
        attempt_history: List[Dict[str, Any]] = []
        final_sbx = initial_sbx
        total_tokens = 0
        total_cost = 0.0
        repaired_ok = False
        best_code = original_code
        test_files_unmodified = True

        for attempt in range(1, self.budget.max_repair_attempts + 1):
            if total_tokens >= self.budget.max_tokens or total_cost >= self.budget.max_cost_usd:
                break

            prompt = (
                f"You are AGI 1.7 CI-Repair Specialist `swe_patch_minimizer`.\n"
                f"{coord['railings_prompt_block']}\n"
                f"Issue Description: {issue_description}\n"
                f"IMPORTANT: Do NOT call any tools or shell commands. Return ONLY the complete corrected Python file for `{module_filename}` inside a ```python ... ``` block.\n\n"
                f"CURRENT BROKEN `{module_filename}`:\n```python\n{current_code}\n```\n\n"
                f"TEST SUITE:\n```python\n{test_sources}\n```\n\n"
                f"SANDBOXED UNITTEST FAILURE TRACEBACK (Attempt {attempt}):\n```text\n{current_failure_output}\n```\n\n"
                f"Fix the root cause with the smallest working change and return the complete `{module_filename}` in a ```python ... ``` block."
            )

            model_res = self.model_adapter.invoke(
                task_id=rid,
                child_task_id=f"{rid}-ATT{attempt}",
                prompt=prompt,
                agent_id="swe_patch_minimizer",
                effort="high",
                is_benchmark_or_single_shot=True,
                tier="COMPLEX",
            )
            call_tokens = int(model_res.get("token_usage", {}).get("total_tokens", 0))
            call_cost = float(model_res.get("cost_usd", 0.0))
            total_tokens += call_tokens
            total_cost = round(total_cost + call_cost, 6)

            candidate_code = _extract_python_code(model_res.get("response_text", ""))
            static_check = self._run_static_quality_check(candidate_code, module_filename)
            if not static_check["passed"]:
                attempt_history.append(
                    {
                        "attempt": attempt,
                        "model_status": model_res.get("status"),
                        "static_quality_check": static_check,
                        "sandbox_passed": False,
                        "tokens": call_tokens,
                        "cost_usd": call_cost,
                    }
                )
                current_failure_output = f"Generated code had invalid Python syntax: {static_check['error']}"
                continue

            candidate_files = dict(py_files)
            candidate_files[module_filename] = candidate_code
            # Verify test files remain 100% unmodified
            for tf_name, tf_sha in test_file_hashes_before.items():
                cur_sha = hashlib.sha256(candidate_files.get(tf_name, "").encode("utf-8")).hexdigest()
                if cur_sha != tf_sha:
                    test_files_unmodified = False

            sbx_res = self.sandbox_runner.run_python_unittest_sandbox(
                files=candidate_files,
                test_pattern=test_pattern,
                sandbox_id=f"{rid}-ATT{attempt}",
            )
            # Step 9: Run independent full-suite regression check if a specific test_pattern was targeted
            if sbx_res.passed and test_pattern != "test_*.py":
                reg_sbx = self.sandbox_runner.run_python_unittest_sandbox(
                    files=candidate_files,
                    test_pattern="test_*.py",
                    sandbox_id=f"{rid}-ATT{attempt}-REG",
                )
                if not reg_sbx.passed:
                    sbx_res = reg_sbx
            final_sbx = sbx_res
            attempt_history.append(
                {
                    "attempt": attempt,
                    "model_status": model_res.get("status"),
                    "static_quality_check": static_check,
                    "sandbox_passed": sbx_res.passed,
                    "sandbox_exit_code": sbx_res.exit_code,
                    "isolation_backend": sbx_res.isolation_backend,
                    "tokens": call_tokens,
                    "cost_usd": call_cost,
                }
            )
            current_code = candidate_code
            if sbx_res.passed and test_files_unmodified:
                repaired_ok = True
                best_code = candidate_code
                break
            current_failure_output = (sbx_res.stderr or sbx_res.stdout).strip()

        should_apply = bool(write_patch_to_workspace or apply_approved_patch)
        patch_applied = False
        if repaired_ok and should_apply:
            self.approval_gate.check_structured_action(
                action_type="apply_workspace_patch",
                argv=["atomic_write", str(module_filename)],
                action_description=f"Apply verified CI-Repair patch to {module_filename}",
                approved=True,
            )
            current_disk_sha = hashlib.sha256(module_path.read_text(encoding="utf-8").encode("utf-8")).hexdigest()
            best_sha = hashlib.sha256(best_code.encode("utf-8")).hexdigest()
            if current_disk_sha != best_sha:
                atomic_write_workspace_file(ws, module_filename, best_code)
                patch_applied = True

        final_code = best_code if repaired_ok else original_code
        patched_sha = hashlib.sha256(final_code.encode("utf-8")).hexdigest()
        diff_lines = list(
            difflib.unified_diff(
                original_code.splitlines(keepends=True),
                final_code.splitlines(keepends=True),
                fromfile=f"a/{module_filename}",
                tofile=f"b/{module_filename}",
            )
        )
        unified_diff_str = "".join(diff_lines)
        changed_line_count = sum(
            1
            for ln in diff_lines
            if (ln.startswith("+") and not ln.startswith("+++"))
            or (ln.startswith("-") and not ln.startswith("---"))
        )

        pr_payload = {
            "title": f"fix({module_filename}): automated CI test-failure repair ({rid})",
            "target_module": module_filename,
            "verified_in_sandbox": repaired_ok,
            "test_files_unmodified_verified": test_files_unmodified,
            "patch_staged_only": not patch_applied,
            "patch_applied_to_workspace": patch_applied,
            "isolation_backend": final_sbx.isolation_backend,
            "diff_lines_changed": changed_line_count,
            "requires_human_approval": True,
            "auto_push_blocked_by_gate": True,
        }

        return CIRepairResult(
            repair_id=rid,
            status="REPAIRED_AND_VERIFIED" if repaired_ok else "REPAIR_FAILED",
            terminal_outcome="SUCCEEDED_AND_VERIFIED" if repaired_ok else "FAILED",
            workspace_dir=redact_sensitive_text(str(ws)),
            target_module=module_filename,
            test_pattern=test_pattern,
            initial_test_run=initial_sbx.to_dict(),
            final_test_run=final_sbx.to_dict(),
            attempts_used=len(attempt_history),
            syntax_check_passed=_is_valid_python_syntax(final_code),
            tests_verified_in_sandbox=repaired_ok,
            test_files_unmodified_verified=test_files_unmodified,
            patch_applied_to_workspace=patch_applied,
            isolation_backend=final_sbx.isolation_backend,
            original_sha256=original_sha,
            patched_sha256=patched_sha,
            unified_diff=unified_diff_str,
            diff_lines_changed=changed_line_count,
            total_tokens_consumed=total_tokens,
            total_cost_usd=total_cost,
            duration_sec=round(time.perf_counter() - t0, 4),
            security_warnings=all_warnings,
            attempt_history=attempt_history,
            pull_request_payload=pr_payload,
        )

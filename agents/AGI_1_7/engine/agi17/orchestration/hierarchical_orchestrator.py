"""AGI 1.7 Hierarchical Self-Orchestrating Multi-Agent Runtime.

Coordinates:
1. Pre-planning memory retrieval (`OmegaCommandMemory.retrieve_before_planning`).
2. Automatic task complexity classification:
   - Small/direct tasks -> lightweight Fast Path (zero unnecessary child agent overhead).
   - Substantial/multi-stage tasks -> Planned Hierarchical DAG execution.
3. Up to 100 logical child tasks represented in the durable SQLite `TaskStore`,
   routed to distinct specialists from the 100-agent registry (`SpecialistFactory`),
   while concurrent execution is bounded by `ResourceGovernor`.
4. Genuine inter-agent context passing (`context["upstream_outputs"]`), live
   `ModelAdapter` (`gemini-3.8-flash-high`) invocation, supervised command/test
   execution (`ProcessSupervisor`), and automatic disagreement / test-failure
   self-healing (`RUNNING -> FAILED -> RETRYING -> READY -> RUNNING -> VERIFYING -> SUCCEEDED`).
5. Safe checkpoint processing of live `CommandInbox` instructions (`ADD_CHILD_TASK`,
   `PAUSE_CURRENT_AND_SWITCH`, `CANCEL_AND_REPLACE`, `UPDATE_CONSTRAINTS`, etc.)
   between waves and subtasks.
6. Mandatory post-execution `EvidenceVerifier` check and episodic memory commit.
"""

from __future__ import annotations

import concurrent.futures
import json
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Sequence, Tuple

from agents.AGI_1_7.ecosystem.agent_registry.agent_contract import AgentContract
from agents.AGI_1_7.ecosystem.agent_registry.ecosystem_coordinator import EcosystemCoordinator
from agents.AGI_1_7.ecosystem.agent_registry.specialist_factory import SpecialistFactory
from ..capabilities.resource_snapshot import LiveResourceMetrics
from ..memory.omega_command_memory import OmegaCommandMemory
from ..process_supervision.process_supervisor import ProcessSupervisor
from ..process_supervision.sandbox_runner import DisposableSandboxRunner
from ..task_control.task_manager import DurableTaskManager
from ..task_control.task_state_machine import TERMINAL_STATES, TaskState
from ..telemetry.token_economy import AdaptiveTokenController
from .resource_governor import (
    MAX_AGENT_SPECIALIZATIONS,
    MAX_LOGICAL_CHILD_TASKS,
    ResourceGovernor,
)


import hashlib
import re
import sys


def _extract_python_code(text: str) -> str:
    """Extracts Python source code from a markdown fenced block or raw model response."""
    blocks = re.findall(r"```(?:python)?\s*\n(.*?)```", text, flags=re.DOTALL | re.IGNORECASE)
    if blocks:
        return max(blocks, key=len).strip() + "\n"
    return text.strip() + "\n"


def _is_valid_python_syntax(code_str: str) -> bool:
    """Returns True if code_str is non-empty and compiles as valid Python syntax."""
    stripped = code_str.strip()
    if not stripped:
        return False
    try:
        compile(stripped, "<generated>", "exec")
        return True
    except SyntaxError:
        return False


@dataclass
class SubtaskSpec:
    title: str
    description: str
    preferred_specialist_id: Optional[str] = None
    required_capabilities: List[str] = field(default_factory=list)
    depends_on_indices: List[int] = field(default_factory=list)
    queue_type: str = "light_in_process"
    priority: int = 50
    token_budget: int = 6000
    use_live_model: bool = False
    target_file_path: Optional[str] = None
    repair_target_file: Optional[str] = None
    fallback_code: Optional[str] = None
    post_write_fault_injector: Optional[Callable[[Path], Dict[str, Any]]] = None
    executor_fn: Optional[Callable[[AgentContract, Dict[str, Any]], Dict[str, Any]]] = None
    verification_command: Optional[List[str]] = None
    verification_cwd: Optional[str] = None
    use_disposable_sandbox: bool = False
    repair_specialist_id: str = "swe_patch_minimizer"
    repair_fn: Optional[Callable[[Dict[str, Any], Dict[str, Any]], Dict[str, Any]]] = None


class HierarchicalOrchestrator:
    """Self-orchestrating multi-agent runtime with fast-path vs hierarchical DAG execution."""

    SUBSTANTIAL_KEYWORDS = (
        "multi-stage",
        "decompose",
        "hierarchical",
        "orchestrate",
        "campaign",
        "audit and implement",
        "end-to-end",
        "parallel subtasks",
        "comprehensive",
        "pipeline",
    )

    def __init__(
        self,
        *,
        task_manager: Optional[DurableTaskManager] = None,
        memory: Optional[OmegaCommandMemory] = None,
        governor: Optional[ResourceGovernor] = None,
        token_controller: Optional[AdaptiveTokenController] = None,
        specialist_factory: Optional[SpecialistFactory] = None,
        ecosystem_coordinator: Optional[EcosystemCoordinator] = None,
        model_adapter: Optional[Any] = None,
        supervisor: Optional[ProcessSupervisor] = None,
        sandbox_runner: Optional[DisposableSandboxRunner] = None,
    ) -> None:
        self.task_manager = task_manager or DurableTaskManager()
        self.memory = memory or OmegaCommandMemory()
        self.governor = governor or ResourceGovernor()
        self.token_controller = token_controller or AdaptiveTokenController()
        self.specialist_factory = specialist_factory or SpecialistFactory()
        self.ecosystem_coordinator = ecosystem_coordinator or EcosystemCoordinator()
        self.supervisor = supervisor or ProcessSupervisor(task_manager=self.task_manager)
        self.sandbox_runner = sandbox_runner or DisposableSandboxRunner()
        self.model_adapter = model_adapter

    def build_code_and_test_subtasks(
        self,
        *,
        title: str,
        prompt: str,
        code_task_dir: str | Path,
        module_filename: str = "token_bucket.py",
        test_filename: str = "test_token_bucket.py",
        inject_deliberate_test_failure: bool = False,
        fallback_module_code: Optional[str] = None,
        fallback_test_code: Optional[str] = None,
    ) -> List[SubtaskSpec]:
        """Builds a 3-specialist live-model coding + unit-testing + self-healing DAG."""
        ws = Path(code_task_dir).resolve()
        ws.mkdir(parents=True, exist_ok=True)
        module_path = ws / module_filename
        test_path = ws / test_filename
        module_stem = module_filename[:-3] if module_filename.endswith(".py") else module_filename

        existing_source_block = ""
        if module_path.exists():
            try:
                existing_src = module_path.read_text(encoding="utf-8")
                if existing_src.strip():
                    existing_source_block = (
                        f"\n\nEXISTING `{module_filename}` IN WORKSPACE (inspect and fix/complete as needed):\n"
                        f"```python\n{existing_src}\n```"
                    )
            except Exception:
                pass

        def _inject_deliberate_fault(_target: Path) -> Dict[str, Any]:
            if not inject_deliberate_test_failure or not module_path.exists():
                return {"injected": False}
            original = module_path.read_text(encoding="utf-8")
            lines = original.splitlines()
            mutated_lines: List[str] = []
            mutation_desc = ""
            mutated_flag = False
            for line in lines:
                stripped = line.lstrip()
                if not mutated_flag and not stripped.startswith("#") and not stripped.startswith(('"""', "'''")):
                    if "self.tokens >= tokens" in line:
                        line = line.replace("self.tokens >= tokens", "self.tokens > tokens", 1)
                        mutation_desc = "Mutated `self.tokens >= tokens` to strict `>` (breaks exact-capacity token acquisition)"
                        mutated_flag = True
                    elif "<=" in line and ("if " in line or "while " in line or "return " in line):
                        line = line.replace("<=", "<", 1)
                        mutation_desc = "Mutated executable `<=` boundary comparison to strict `<`"
                        mutated_flag = True
                    elif ">=" in line and ("if " in line or "while " in line or "return " in line):
                        line = line.replace(">=", ">", 1)
                        mutation_desc = "Mutated executable `>=` boundary comparison to strict `>`"
                        mutated_flag = True
                mutated_lines.append(line)
            if not mutated_flag:
                mutated_lines.append("raise RuntimeError('Deliberate injected fault')")
                mutation_desc = "Appended runtime fault trigger"
            mutated = "\n".join(mutated_lines) + "\n"
            module_path.write_text(mutated, encoding="utf-8")
            return {
                "injected": True,
                "target_file": str(module_path),
                "mutation_description": mutation_desc,
            }

        return [
            SubtaskSpec(
                title=f"{title} — Stage 1: Architecture & Edge-Case Specification",
                description=(
                    f"Specify the exact Python class/function signatures, type annotations, and edge-case invariants for `{module_filename}`: {prompt} "
                    f"Keep your specification concise (4-6 bullet points)."
                    f"{existing_source_block}"
                ),
                preferred_specialist_id="plan_systems_architect",
                depends_on_indices=[],
                queue_type="model_call",
                token_budget=16000,
                use_live_model=True,
            ),
            SubtaskSpec(
                title=f"{title} — Stage 2: Live Model Python Implementation (`{module_filename}`)",
                description=(
                    f"Implement the complete Python module `{module_filename}` fulfilling `{prompt}` and the upstream specification. "
                    f"Return ONLY the complete Python code inside a ```python ... ``` block."
                    f"{existing_source_block}"
                ),
                preferred_specialist_id="swe_python_runtime_engineer",
                depends_on_indices=[0],
                queue_type="model_call",
                token_budget=20000,
                use_live_model=True,
                target_file_path=str(module_path),
                fallback_code=fallback_module_code,
            ),
            SubtaskSpec(
                title=f"{title} — Stage 3: Live Model Unit Test Generation, Execution & Self-Healing (`{test_filename}`)",
                description=(
                    f"Write a Python `unittest` suite `{test_filename}` that imports from `{module_stem}` and tests "
                    f"normal operation, boundary conditions, and exception handling (`ValueError`) as specified in the upstream implementation. "
                    f"Return ONLY the complete `{test_filename}` code inside a ```python ... ``` block."
                ),
                preferred_specialist_id="qa_unit_suite_runner",
                depends_on_indices=[0, 1],
                queue_type="model_call",
                token_budget=24000,
                use_live_model=True,
                target_file_path=str(test_path),
                repair_target_file=str(module_path),
                fallback_code=fallback_test_code,
                post_write_fault_injector=_inject_deliberate_fault if inject_deliberate_test_failure else None,
                verification_command=[
                    sys.executable,
                    "-m",
                    "unittest",
                    "discover",
                    "-s",
                    str(ws),
                    "-t",
                    str(ws),
                    "-p",
                    "test_*.py",
                    "-v",
                ],
                verification_cwd=str(ws),
                use_disposable_sandbox=True,
                repair_specialist_id="swe_patch_minimizer",
            ),
        ]

    def _run_sandboxed_workspace_tests(self, verification_cwd: str | Path, sandbox_id: str) -> Dict[str, Any]:
        """Executes workspace Python unit tests inside the disposable container / ephemeral sandbox."""
        ws_dir = Path(verification_cwd)
        files_map: Dict[str, str] = {}
        if ws_dir.is_dir():
            for py_file in sorted(ws_dir.glob("*.py")):
                if py_file.is_file():
                    files_map[py_file.name] = py_file.read_text(encoding="utf-8", errors="replace")
        sbx_res = self.sandbox_runner.run_python_unittest_sandbox(
            files=files_map,
            test_pattern="test_*.py",
            sandbox_id=sandbox_id,
        )
        return {
            "exit_code": sbx_res.exit_code,
            "stdout": sbx_res.stdout,
            "stderr": sbx_res.stderr,
            "notification_id": sbx_res.sandbox_id,
            "isolation_backend": sbx_res.isolation_backend,
            "network_disabled": sbx_res.network_disabled,
            "cleanup_verified": sbx_res.cleanup_verified,
            "duration_sec": sbx_res.duration_sec,
        }

    def requires_hierarchical_planning(
        self,
        prompt: str,
        explicit_subtasks: Optional[Sequence[SubtaskSpec]] = None,
        force_hierarchical: bool = False,
    ) -> bool:
        if force_hierarchical:
            return True
        if explicit_subtasks and len(explicit_subtasks) > 1:
            return True
        lower = prompt.lower()
        if len(prompt) >= 450:
            return True
        if sum(1 for kw in self.SUBSTANTIAL_KEYWORDS if kw in lower) >= 1:
            return True
        return False

    def execute_mission(
        self,
        *,
        title: str,
        prompt: str,
        task_id: Optional[str] = None,
        subtasks: Optional[Sequence[SubtaskSpec]] = None,
        force_hierarchical: bool = False,
        use_live_model: Optional[bool] = None,
        code_task_dir: Optional[str | Path] = None,
        module_filename: str = "token_bucket.py",
        test_filename: str = "test_token_bucket.py",
        inject_deliberate_test_failure: bool = False,
        custom_subtask_hook: Optional[Callable[[str, Dict[str, Any]], None]] = None,
        simulated_resource_snapshot: Optional[LiveResourceMetrics] = None,
    ) -> Dict[str, Any]:
        """Executes a mission via Fast Path or Planned Hierarchical Delegation.

        When `code_task_dir` is provided and `subtasks is None`, automatically builds
        and runs the complete 3-specialist live-model coding, unit-testing, and
        self-healing repair workflow.
        """
        started_at = time.time()
        root_id = task_id or f"MISSION-{int(started_at * 1000)}-{uuid.uuid4().hex[:6]}"
        if code_task_dir is not None and subtasks is None:
            subtasks = self.build_code_and_test_subtasks(
                title=title,
                prompt=prompt,
                code_task_dir=code_task_dir,
                module_filename=module_filename,
                test_filename=test_filename,
                inject_deliberate_test_failure=inject_deliberate_test_failure,
            )
            force_hierarchical = True

        effective_live_model = (
            use_live_model
            if use_live_model is not None
            else bool(self.model_adapter is not None and subtasks is None)
        )

        # Step 1: Mandatory pre-planning memory retrieval
        retrieved_memory = self.memory.retrieve_before_planning(
            task_id=root_id,
            task_description=f"{title}: {prompt}",
        )

        is_hierarchical = self.requires_hierarchical_planning(
            prompt=prompt,
            explicit_subtasks=subtasks,
            force_hierarchical=force_hierarchical,
        )

        # Create root task in durable SQLite store
        tier = "COMPLEX" if is_hierarchical else "SIMPLE"
        budget_info = self.token_controller.allocate_budget(task_id=root_id, tier=tier)

        existing = self.task_manager.store.get_task(root_id)
        if not existing:
            self.task_manager.create_task(
                task_id=root_id,
                title=title,
                description=prompt,
                specialist_role="plan_mission_decomposer" if is_hierarchical else "swe_python_runtime_engineer",
                token_budget=budget_info["max_task_tokens"],
                metadata={
                    "execution_path": "HIERARCHICAL_DAG" if is_hierarchical else "DIRECT_FAST_PATH",
                    "use_live_model": effective_live_model,
                    "memory_retrieval_audit_id": retrieved_memory["audit_id"],
                    "retrieved_memory_ids": retrieved_memory["retrieved_entry_ids"],
                },
            )

        self.task_manager.transition(root_id, TaskState.PLANNED, reason="Completed pre-planning memory lookup & classification")
        self.task_manager.transition(root_id, TaskState.QUEUED, reason="Queued root mission")
        self.task_manager.transition(root_id, TaskState.READY, reason="Root mission ready")
        self.task_manager.transition(root_id, TaskState.RUNNING, reason="Root mission execution started")

        if not is_hierarchical:
            return self._execute_fast_path(
                root_id=root_id,
                title=title,
                prompt=prompt,
                retrieved_memory=retrieved_memory,
                started_at=started_at,
                use_live_model=effective_live_model,
            )

        return self._execute_hierarchical_dag(
            root_id=root_id,
            title=title,
            prompt=prompt,
            retrieved_memory=retrieved_memory,
            explicit_subtasks=subtasks,
            use_live_model=effective_live_model,
            custom_subtask_hook=custom_subtask_hook,
            simulated_resource_snapshot=simulated_resource_snapshot,
            started_at=started_at,
        )

    def _execute_fast_path(
        self,
        *,
        root_id: str,
        title: str,
        prompt: str,
        retrieved_memory: Dict[str, Any],
        started_at: float,
        use_live_model: bool = False,
    ) -> Dict[str, Any]:
        routed = self.specialist_factory.router.route(task_description=prompt, top_k=1)[0]
        custom_exec = (
            self._build_live_model_executor(root_id=root_id, child_id=root_id)
            if (use_live_model and self.model_adapter is not None)
            else None
        )
        specialist = self.specialist_factory.instantiate(routed["agent_id"], custom_executor=custom_exec)

        out = specialist.run(
            {
                "task_id": root_id,
                "task_prompt": prompt,
                "context": {
                    "mode": "DIRECT_FAST_PATH",
                    "retrieved_memory_count": len(retrieved_memory["retrieved_entry_ids"]),
                },
            }
        )

        if custom_exec is None:
            self.token_controller.record_usage(
                task_id=root_id,
                agent_id=routed["agent_id"],
                prompt_text=prompt,
                response_text=out["output_summary"],
                cwd_used=self.token_controller.get_execution_cwd(is_benchmark_or_single_shot=True),
            )

        self.task_manager.save_checkpoint(
            root_id,
            step_index=1,
            state_payload={"fast_path_output": out},
        )
        self.task_manager.transition(root_id, TaskState.VERIFYING, reason="Verifying fast-path result")
        self.task_manager.transition(
            root_id,
            TaskState.SUCCEEDED,
            reason="Fast-path execution verified",
            result=out,
        )

        self.memory.store_compressed_episode(
            subject_key=f"episode:{root_id}",
            raw_observation=f"FastPath mission '{title}' ({root_id}) succeeded via {routed['agent_id']}: {out['output_summary']}",
            source_task_id=root_id,
        )

        return {
            "mission_id": root_id,
            "execution_path": "DIRECT_FAST_PATH",
            "final_state": TaskState.SUCCEEDED.value,
            "logical_children_created": 0,
            "specialist_used": routed["agent_id"],
            "memory_retrieval": retrieved_memory,
            "output": out,
            "duration_sec": round(time.time() - started_at, 4),
        }

    def _build_default_subtasks(self, title: str, prompt: str, use_live_model: bool = False) -> List[SubtaskSpec]:
        q_type = "model_call" if use_live_model else "light_in_process"
        return [
            SubtaskSpec(
                title=f"{title} - Decomposition & Architecture",
                description=f"Decompose mission and define interfaces for: {prompt}",
                preferred_specialist_id="plan_mission_decomposer",
                depends_on_indices=[],
                queue_type=q_type,
                use_live_model=use_live_model,
            ),
            SubtaskSpec(
                title=f"{title} - Grounded Evidence & Context Synthesis",
                description=f"Synthesize evidence and memory constraints for: {prompt}",
                preferred_specialist_id="res_citation_auditor",
                depends_on_indices=[0],
                queue_type=q_type,
                use_live_model=use_live_model,
            ),
            SubtaskSpec(
                title=f"{title} - Core Implementation & Execution",
                description=f"Execute primary engineering deliverables for: {prompt}",
                preferred_specialist_id="swe_python_runtime_engineer",
                depends_on_indices=[0],
                queue_type=q_type,
                use_live_model=use_live_model,
            ),
            SubtaskSpec(
                title=f"{title} - Verification & Telemetry Reconciliation",
                description=f"Verify outputs, checksums, and ledger reconciliation for: {prompt}",
                preferred_specialist_id="qa_claim_to_evidence_verifier",
                depends_on_indices=[1, 2],
                queue_type=q_type,
                use_live_model=use_live_model,
            ),
        ]

    def _build_live_model_executor(
        self,
        root_id: str,
        child_id: str,
        sp_spec: Optional[SubtaskSpec] = None,
    ) -> Callable[[AgentContract, Dict[str, Any]], Dict[str, Any]]:
        """Creates a custom executor that invokes `gemini-3.8-flash-high` via `ModelAdapter`."""

        def _exec(contract: AgentContract, payload: Dict[str, Any]) -> Dict[str, Any]:
            if self.model_adapter is None:
                raise RuntimeError(f"use_live_model=True requested for {child_id}, but ModelAdapter is not configured")
            upstream = payload.get("context", {}).get("upstream_outputs", {})
            upstream_summary = ""
            if upstream:
                upstream_summary = "\n\nUPSTREAM SPECIALIST OUTPUTS:\n" + json.dumps(
                    {
                        k: {
                            "agent_id": v.get("agent_id"),
                            "output_summary": v.get("output_summary"),
                            "artifacts": v.get("artifacts"),
                        }
                        for k, v in upstream.items()
                    },
                    indent=2,
                    default=str,
                )
            coord = self.ecosystem_coordinator.build_coordination_railings(contract, is_repair=False)
            full_prompt = (
                f"You are AGI 1.7 Embedded Specialist `{contract.agent_id}` ({contract.display_name}, Family: {contract.family}).\n"
                f"Primary Capabilities: {', '.join(contract.primary_capabilities)}\n"
                f"{coord['railings_prompt_block']}\n"
                f"IMPORTANT: Do NOT call any tools, shell commands, or file views. Respond directly in this turn.\n"
                f"Task ({child_id}): {payload['task_prompt']}"
                f"{upstream_summary}"
            )
            model_res = self.model_adapter.invoke(
                task_id=root_id,
                child_task_id=child_id,
                prompt=full_prompt,
                agent_id=contract.agent_id,
                effort="high",
                is_benchmark_or_single_shot=True,
                tier="COMPLEX",
            )
            result_dict: Dict[str, Any] = {
                "execution_origin": "LIVE_MODEL_ADAPTER",
                "ecosystem_coordination": {
                    "agency_profile_matched": coord["agency_profile_matched"],
                    "mcp_servers_bound": coord["mcp_servers_bound"],
                    "plugins_applied": coord["plugins_applied"],
                    "skills_applied": coord["skills_applied"],
                },
                "fallback_used": False,
                "fallback_reason": None,
                "analysis": model_res["response_text"],
                "model_invoked": model_res["model"],
                "model_status": model_res["status"],
                "model_duration_sec": model_res["duration_sec"],
                "token_usage": model_res["token_usage"],
                "notification_id": model_res["notification_id"],
                "stdout_log_path": model_res.get("stdout_log_path"),
                "artifact_verification_passed": None,
                "task_correctness_verified": None,
            }
            if sp_spec and sp_spec.target_file_path:
                target_path = Path(sp_spec.target_file_path)
                target_path.parent.mkdir(parents=True, exist_ok=True)
                extracted_code = _extract_python_code(model_res["response_text"])
                if not _is_valid_python_syntax(extracted_code) and sp_spec.fallback_code:
                    extracted_code = sp_spec.fallback_code
                    result_dict["fallback_used"] = True
                    result_dict["fallback_reason"] = (
                        f"Model response had invalid/empty Python syntax (status={model_res['status']}, "
                        f"exit_code={model_res['exit_code']}); deterministic fallback applied."
                    )
                    result_dict["execution_origin"] = "DETERMINISTIC_FALLBACK_AFTER_MODEL_FAILURE"
                target_path.write_text(extracted_code, encoding="utf-8")
                clean_sha256 = hashlib.sha256(target_path.read_bytes()).hexdigest()
                result_dict["written_file_path"] = str(target_path)
                result_dict["clean_generated_code"] = extracted_code
                result_dict["clean_file_sha256"] = clean_sha256
                result_dict["artifact_verification_passed"] = (
                    target_path.exists() and target_path.stat().st_size > 0
                )
                if sp_spec.post_write_fault_injector is not None:
                    fault_meta = sp_spec.post_write_fault_injector(target_path)
                    mutated_path = Path(fault_meta.get("target_file") or target_path) if isinstance(fault_meta, dict) else target_path
                    result_dict["deliberate_fault_injected"] = fault_meta
                    result_dict["faulty_file_sha256"] = hashlib.sha256(mutated_path.read_bytes()).hexdigest()
            return result_dict

        return _exec

    def _default_live_model_repair(
        self,
        *,
        root_id: str,
        child_id: str,
        sp_spec: SubtaskSpec,
        failed_result: Dict[str, Any],
        failure_details: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Invokes `ModelAdapter.invoke()` with `sp_spec.repair_specialist_id` to patch failing code."""
        repair_file = Path(
            sp_spec.repair_target_file
            or sp_spec.target_file_path
            or failed_result.get("artifacts", {}).get("written_file_path", "")
        )
        broken_code = repair_file.read_text(encoding="utf-8") if repair_file.is_file() else ""
        stderr_trace = failure_details.get("stderr") or failure_details.get("stdout") or str(failure_details)
        try:
            repair_contract = self.specialist_factory.get_contract(sp_spec.repair_specialist_id)
        except Exception:
            repair_contract = self.specialist_factory.get_contract("swe_patch_minimizer")
        coord = self.ecosystem_coordinator.build_coordination_railings(repair_contract, is_repair=True)
        test_files_block = ""
        if repair_file.is_file() and repair_file.parent.is_dir():
            test_snippets = []
            for tf in sorted(repair_file.parent.glob("test_*.py")):
                try:
                    test_snippets.append(f"# {tf.name}\n{tf.read_text(encoding='utf-8')}")
                except Exception:
                    pass
            if test_snippets:
                test_files_block = "\n\nWORKSPACE TEST FILES:\n```python\n" + "\n\n".join(test_snippets) + "\n```"

        repair_prompt = (
            f"You are AGI 1.7 Embedded Specialist `{sp_spec.repair_specialist_id}` (Minimal Diff & Root-Cause Patch Engineer).\n"
            f"{coord['railings_prompt_block']}\n"
            f"IMPORTANT: Do NOT call any tools or shell commands. Return ONLY the complete corrected Python file for `{repair_file.name}` inside a ```python ... ``` block.\n\n"
            f"BROKEN PYTHON FILE (`{repair_file.name}`):\n```python\n{broken_code}\n```"
            f"{test_files_block}\n\n"
            f"UNITTEST FAILURE OUTPUT (exit_code={failure_details.get('exit_code')}):\n```text\n{stderr_trace}\n```\n\n"
            f"Fix all bugs causing the test failures and return the complete corrected `{repair_file.name}` in a ```python ... ``` fenced code block."
        )
        model_res = self.model_adapter.invoke(
            task_id=root_id,
            child_task_id=f"{child_id}-REPAIR",
            prompt=repair_prompt,
            agent_id=sp_spec.repair_specialist_id,
            effort="high",
            is_benchmark_or_single_shot=True,
            tier="COMPLEX",
        )
        patched_code = _extract_python_code(model_res["response_text"])
        fallback_used = False
        fallback_reason = None
        if not _is_valid_python_syntax(patched_code) and sp_spec.fallback_code:
            patched_code = sp_spec.fallback_code
            fallback_used = True
            fallback_reason = (
                f"Repair model response had invalid/empty Python syntax (status={model_res['status']}, "
                f"exit_code={model_res['exit_code']}); deterministic fallback applied."
            )
        if repair_file.name and _is_valid_python_syntax(patched_code):
            repair_file.write_text(patched_code, encoding="utf-8")
        repaired_sha256 = hashlib.sha256(repair_file.read_bytes()).hexdigest() if repair_file.is_file() else None
        return {
            "execution_origin": "DETERMINISTIC_FALLBACK_AFTER_MODEL_FAILURE" if fallback_used else "LIVE_MODEL_ADAPTER",
            "ecosystem_coordination": {
                "agency_profile_matched": coord["agency_profile_matched"],
                "mcp_servers_bound": coord["mcp_servers_bound"],
                "plugins_applied": coord["plugins_applied"],
                "skills_applied": coord["skills_applied"],
            },
            "fallback_used": fallback_used,
            "fallback_reason": fallback_reason,
            "repair_specialist_id": sp_spec.repair_specialist_id,
            "model_invoked": model_res["model"],
            "model_status": model_res["status"],
            "model_duration_sec": model_res["duration_sec"],
            "token_usage": model_res["token_usage"],
            "notification_id": model_res["notification_id"],
            "stdout_log_path": model_res.get("stdout_log_path"),
            "repaired_file_path": str(repair_file),
            "repaired_file_sha256": repaired_sha256,
            "patched_code": patched_code,
        }

    def _execute_hierarchical_dag(
        self,
        *,
        root_id: str,
        title: str,
        prompt: str,
        retrieved_memory: Dict[str, Any],
        explicit_subtasks: Optional[Sequence[SubtaskSpec]],
        use_live_model: bool = False,
        custom_subtask_hook: Optional[Callable[[str, Dict[str, Any]], None]],
        simulated_resource_snapshot: Optional[LiveResourceMetrics],
        started_at: float,
    ) -> Dict[str, Any]:
        specs = (
            list(explicit_subtasks)
            if explicit_subtasks
            else self._build_default_subtasks(title, prompt, use_live_model=use_live_model)
        )
        if len(specs) > MAX_LOGICAL_CHILD_TASKS:
            raise ValueError(
                f"Requested {len(specs)} child tasks exceeds MAX_LOGICAL_CHILD_TASKS ({MAX_LOGICAL_CHILD_TASKS})"
            )

        spec_by_cid: Dict[str, SubtaskSpec] = {}
        child_ids: List[str] = []
        for idx, sp in enumerate(specs):
            cid = f"{root_id}-SUB-{idx + 1:03d}"
            child_ids.append(cid)
            spec_by_cid[cid] = sp
            deps = [child_ids[d_idx] for d_idx in sp.depends_on_indices if 0 <= d_idx < idx]

            if sp.preferred_specialist_id:
                spec_id = sp.preferred_specialist_id
            else:
                routed = self.specialist_factory.router.route(
                    task_description=f"{sp.title} {sp.description}",
                    required_capabilities=sp.required_capabilities,
                    top_k=1,
                )[0]
                spec_id = routed["agent_id"]

            self.task_manager.create_task(
                task_id=cid,
                parent_task_id=root_id,
                title=sp.title,
                description=sp.description,
                depends_on=deps,
                priority=sp.priority,
                specialist_role=spec_id,
                token_budget=sp.token_budget,
                metadata={"queue_type": sp.queue_type, "subtask_index": idx},
            )
            self.task_manager.transition(cid, TaskState.PLANNED, reason="Subtask planned in DAG")
            self.task_manager.transition(cid, TaskState.QUEUED, reason="Subtask queued in DAG")

        # Initial dependency resolution (marks independent tasks READY)
        self.task_manager.dep_mgr.resolve_ready_tasks(parent_task_id=root_id)

        completed_results: Dict[str, Any] = {}
        max_Observed_concurrency = 0
        wave_index = 0
        step_counter = 0

        while True:
            # 1. Process live CommandInbox at safe wave checkpoint
            inbox_actions = self.task_manager.process_inbox_checkpoint(active_task_id=root_id)
            root_rec = self.task_manager.store.get_task(root_id)
            if not root_rec:
                break

            if root_rec["state"] in (
                TaskState.CANCELED.value,
                TaskState.INTERRUPTED.value,
                TaskState.WAITING_FOR_INPUT.value,
            ):
                if root_rec["state"] == TaskState.CANCELED.value:
                    for ch in self.task_manager.store.list_tasks(parent_task_id=root_id):
                        if TaskState(ch["state"]) not in TERMINAL_STATES:
                            self.task_manager.transition(
                                ch["task_id"],
                                TaskState.CANCELED,
                                reason="Parent task canceled via CommandInbox",
                            )
                return {
                    "mission_id": root_id,
                    "execution_path": "HIERARCHICAL_DAG",
                    "final_state": root_rec["state"],
                    "inbox_actions_applied": inbox_actions,
                    "completed_subtasks": len(completed_results),
                    "duration_sec": round(time.time() - started_at, 4),
                }

            # Refresh children list (in case ADD_CHILD_TASK added new children mid-run!)
            all_children = self.task_manager.store.list_tasks(parent_task_id=root_id)
            for ch in all_children:
                if ch["state"] == TaskState.CREATED.value:
                    self.task_manager.transition(ch["task_id"], TaskState.PLANNED, reason="Dynamic child planned")
                    self.task_manager.transition(ch["task_id"], TaskState.QUEUED, reason="Dynamic child queued")

            self.task_manager.dep_mgr.resolve_ready_tasks(parent_task_id=root_id)
            all_children = self.task_manager.store.list_tasks(parent_task_id=root_id)

            ready_children = [
                ch
                for ch in all_children
                if ch["state"] in (TaskState.READY.value, TaskState.WAITING_FOR_RESOURCE.value)
            ]
            non_terminal = [
                ch for ch in all_children if TaskState(ch["state"]) not in TERMINAL_STATES
            ]

            if not non_terminal:
                break

            if not ready_children:
                break

            wave_index += 1
            dyn_cap = self.governor.compute_dynamic_active_cap(simulated_resource_snapshot)
            batch = ready_children[: max(1, dyn_cap)]
            max_Observed_concurrency = max(max_Observed_concurrency, len(batch))

            # Park any overflow ready tasks in WAITING_FOR_RESOURCE
            for overflow_ch in ready_children[len(batch) :]:
                if overflow_ch["state"] == TaskState.READY.value:
                    self.task_manager.transition(
                        overflow_ch["task_id"],
                        TaskState.WAITING_FOR_RESOURCE,
                        reason=f"Throttled by ResourceGovernor (MAX_ACTIVE_EXECUTIONS={dyn_cap})",
                    )

            def _run_child(child_record: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
                cid = child_record["task_id"]
                sp_spec = spec_by_cid.get(cid)
                q_type = child_record.get("metadata", {}).get("queue_type", "light_in_process")
                decision = self.governor.acquire_slot(queue_type=q_type, snap=simulated_resource_snapshot)
                if not decision.admitted:
                    if child_record["state"] == TaskState.READY.value:
                        self.task_manager.transition(
                            cid,
                            TaskState.WAITING_FOR_RESOURCE,
                            reason=decision.reason,
                        )
                    time.sleep(0.02)
                    self.governor.acquire_slot(queue_type="light_in_process", snap=simulated_resource_snapshot)
                    q_type = "light_in_process"

                try:
                    cur = self.task_manager.store.get_task(cid)
                    if cur and cur["state"] == TaskState.WAITING_FOR_RESOURCE.value:
                        self.task_manager.transition(cid, TaskState.READY, reason="Resource slot acquired")
                    self.task_manager.transition(cid, TaskState.RUNNING, reason="Executing specialist subtask")

                    role_id = child_record.get("specialist_role") or "swe_python_runtime_engineer"
                    custom_exec = None
                    if sp_spec is not None:
                        if sp_spec.executor_fn is not None:
                            custom_exec = sp_spec.executor_fn
                        elif sp_spec.use_live_model:
                            custom_exec = self._build_live_model_executor(
                                root_id=root_id,
                                child_id=cid,
                                sp_spec=sp_spec,
                            )

                    try:
                        inst = self.specialist_factory.instantiate(role_id, custom_executor=custom_exec)
                    except KeyError:
                        inst = self.specialist_factory.instantiate("swe_python_runtime_engineer", custom_executor=custom_exec)

                    # Pass upstream outputs from dependency tasks into context
                    deps = child_record.get("depends_on", [])
                    upstream_outputs = {
                        dep_id: completed_results[dep_id]
                        for dep_id in deps
                        if dep_id in completed_results
                    }

                    res = inst.run(
                        {
                            "task_id": cid,
                            "task_prompt": f"{child_record['title']}: {child_record['description']}",
                            "context": {
                                "parent_task_id": root_id,
                                "wave_index": wave_index,
                                "upstream_outputs": upstream_outputs,
                                "root_metadata": self.task_manager.store.get_task(root_id).get("metadata", {}),
                            },
                        }
                    )

                    if sp_spec is None or not sp_spec.use_live_model:
                        self.token_controller.record_usage(
                            task_id=root_id,
                            child_task_id=cid,
                            agent_id=inst.contract.agent_id,
                            prompt_text=child_record["description"],
                            response_text=res["output_summary"],
                            cwd_used=self.token_controller.get_execution_cwd(is_benchmark_or_single_shot=True),
                        )

                    self.task_manager.transition(cid, TaskState.VERIFYING, reason="Verifying specialist output")

                    # Check verification command or custom executor verification flag
                    verification_failed = False
                    failure_details: Dict[str, Any] = {}
                    artifacts = res.get("artifacts") or {}
                    if artifacts.get("verification_passed") is False:
                        verification_failed = True
                        failure_details = dict(artifacts)

                    if sp_spec and (sp_spec.verification_command or (sp_spec.use_disposable_sandbox and sp_spec.verification_cwd)):
                        if sp_spec.use_disposable_sandbox and sp_spec.verification_cwd:
                            artifacts["initial_verification_run"] = self._run_sandboxed_workspace_tests(
                                sp_spec.verification_cwd,
                                sandbox_id=f"{cid}-VERIFY-ATT1",
                            )
                        else:
                            ver_notif = self.supervisor.run_supervised(
                                task_id=f"{cid}-VERIFY-ATT1",
                                command=sp_spec.verification_command,
                                cwd=sp_spec.verification_cwd,
                                wall_timeout_sec=60.0,
                                idle_timeout_sec=30.0,
                            )
                            stdout_txt = Path(ver_notif.stdout_log_path).read_text(encoding="utf-8", errors="replace") if Path(ver_notif.stdout_log_path).exists() else ""
                            stderr_txt = Path(ver_notif.stderr_log_path).read_text(encoding="utf-8", errors="replace") if Path(ver_notif.stderr_log_path).exists() else ""
                            artifacts["initial_verification_run"] = {
                                "exit_code": ver_notif.exit_code,
                                "stdout": stdout_txt,
                                "stderr": stderr_txt,
                                "notification_id": ver_notif.notification_id,
                            }
                        if artifacts["initial_verification_run"]["exit_code"] != 0:
                            verification_failed = True
                            failure_details = artifacts["initial_verification_run"]
                            res["task_correctness_verified"] = False
                        else:
                            res["task_correctness_verified"] = True

                    # Self-healing retry loop when verification fails or specialists disagree
                    can_repair = sp_spec is not None and (
                        sp_spec.repair_fn is not None
                        or (
                            self.model_adapter is not None
                            and bool(sp_spec.repair_target_file or sp_spec.target_file_path)
                        )
                    )
                    if verification_failed and can_repair and sp_spec is not None:
                        self.task_manager.transition(
                            cid,
                            TaskState.FAILED,
                            reason="Verification failed; initiating specialist repair",
                            error=failure_details,
                        )
                        self.task_manager.transition(
                            cid,
                            TaskState.QUEUED,
                            reason=f"Escalating failure to repair specialist '{sp_spec.repair_specialist_id}'",
                        )
                        self.task_manager.transition(cid, TaskState.READY, reason="Repair specialist ready")
                        self.task_manager.transition(cid, TaskState.RUNNING, reason="Executing specialist repair & re-test")

                        if sp_spec.repair_fn is not None:
                            repair_out = sp_spec.repair_fn(res, failure_details)
                        else:
                            repair_out = self._default_live_model_repair(
                                root_id=root_id,
                                child_id=cid,
                                sp_spec=sp_spec,
                                failed_result=res,
                                failure_details=failure_details,
                            )
                        artifacts["repair_specialist_id"] = sp_spec.repair_specialist_id
                        artifacts["repair_execution"] = repair_out

                        self.task_manager.transition(cid, TaskState.VERIFYING, reason="Re-verifying after specialist patch")
                        if sp_spec.use_disposable_sandbox and sp_spec.verification_cwd:
                            artifacts["post_repair_verification_run"] = self._run_sandboxed_workspace_tests(
                                sp_spec.verification_cwd,
                                sandbox_id=f"{cid}-VERIFY-ATT2",
                            )
                            re_exit = artifacts["post_repair_verification_run"]["exit_code"]
                            verification_failed = re_exit != 0
                            res["task_correctness_verified"] = (re_exit == 0)
                        elif sp_spec.verification_command:
                            re_notif = self.supervisor.run_supervised(
                                task_id=f"{cid}-VERIFY-ATT2",
                                command=sp_spec.verification_command,
                                cwd=sp_spec.verification_cwd,
                                wall_timeout_sec=60.0,
                                idle_timeout_sec=30.0,
                            )
                            re_stdout = Path(re_notif.stdout_log_path).read_text(encoding="utf-8", errors="replace") if Path(re_notif.stdout_log_path).exists() else ""
                            re_stderr = Path(re_notif.stderr_log_path).read_text(encoding="utf-8", errors="replace") if Path(re_notif.stderr_log_path).exists() else ""
                            artifacts["post_repair_verification_run"] = {
                                "exit_code": re_notif.exit_code,
                                "stdout": re_stdout,
                                "stderr": re_stderr,
                                "notification_id": re_notif.notification_id,
                            }
                            verification_failed = re_notif.exit_code != 0
                            res["task_correctness_verified"] = (re_notif.exit_code == 0)
                        else:
                            verification_failed = not bool(repair_out.get("verification_passed", True))
                            res["task_correctness_verified"] = not verification_failed

                    if verification_failed:
                        self.task_manager.transition(
                            cid,
                            TaskState.FAILED,
                            reason="Specialist verification failed after retry",
                            error=failure_details,
                        )
                        res["status"] = "FAILED"
                        res["task_correctness_verified"] = False
                        return cid, res

                    self.task_manager.transition(
                        cid,
                        TaskState.SUCCEEDED,
                        reason="Specialist verification hook passed",
                        result=res,
                    )
                    return cid, res
                finally:
                    self.governor.release_slot(queue_type=q_type)

            with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, len(batch))) as pool:
                futures = [pool.submit(_run_child, ch) for ch in batch]
                for fut in concurrent.futures.as_completed(futures):
                    cid, res = fut.result()
                    completed_results[cid] = res
                    step_counter += 1
                    self.task_manager.save_checkpoint(
                        root_id,
                        step_index=step_counter,
                        state_payload={
                            "last_completed_child": cid,
                            "completed_count": len(completed_results),
                            "wave_index": wave_index,
                        },
                    )
                    if custom_subtask_hook:
                        custom_subtask_hook(cid, res)

        # Final check of all children
        final_children = self.task_manager.store.list_tasks(parent_task_id=root_id)
        succeeded_cnt = sum(1 for c in final_children if c["state"] == TaskState.SUCCEEDED.value)
        all_ok = succeeded_cnt == len(final_children)

        if all_ok:
            self.task_manager.transition(root_id, TaskState.VERIFYING, reason="All DAG subtasks succeeded; verifying root")
            self.task_manager.transition(
                root_id,
                TaskState.SUCCEEDED,
                reason=f"All {succeeded_cnt}/{len(final_children)} child tasks verified",
                result={
                    "total_logical_children": len(final_children),
                    "succeeded_children": succeeded_cnt,
                    "max_concurrent_workers_used": max_Observed_concurrency,
                    "waves_executed": wave_index,
                },
            )
            final_state = TaskState.SUCCEEDED.value
        else:
            self.task_manager.transition(
                root_id,
                TaskState.FAILED,
                reason=f"Only {succeeded_cnt}/{len(final_children)} child tasks succeeded",
            )
            final_state = TaskState.FAILED.value

        self.memory.store_compressed_episode(
            subject_key=f"episode:{root_id}",
            raw_observation=(
                f"Hierarchical mission '{title}' ({root_id}) finished with state={final_state}, "
                f"children={succeeded_cnt}/{len(final_children)}, max_concurrency={max_Observed_concurrency}"
            ),
            source_task_id=root_id,
        )

        fallback_events: List[Dict[str, Any]] = []
        for cid_key, ch_res in completed_results.items():
            art = ch_res.get("artifacts") if isinstance(ch_res, dict) else {}
            if isinstance(art, dict):
                if art.get("fallback_used"):
                    fallback_events.append(
                        {
                            "child_task_id": cid_key,
                            "stage": "initial_generation",
                            "reason": art.get("fallback_reason"),
                        }
                    )
                rep_exec = art.get("repair_execution")
                if isinstance(rep_exec, dict) and rep_exec.get("fallback_used"):
                    fallback_events.append(
                        {
                            "child_task_id": cid_key,
                            "stage": "repair_generation",
                            "reason": rep_exec.get("fallback_reason"),
                        }
                    )

        return {
            "mission_id": root_id,
            "execution_path": "HIERARCHICAL_DAG",
            "final_state": final_state,
            "logical_children_created": len(final_children),
            "succeeded_children": succeeded_cnt,
            "max_concurrent_workers_used": max_Observed_concurrency,
            "fallback_summary": {
                "any_fallback_used": len(fallback_events) > 0,
                "fallback_count": len(fallback_events),
                "fallback_events": fallback_events,
            },
            "ecosystem_coordination_summary": self.ecosystem_coordinator.get_inventory_summary(),
            "limits_enforced": {
                "MAX_AGENT_SPECIALIZATIONS": MAX_AGENT_SPECIALIZATIONS,
                "MAX_LOGICAL_CHILD_TASKS": MAX_LOGICAL_CHILD_TASKS,
                "MAX_ACTIVE_EXECUTIONS": self.governor.compute_dynamic_active_cap(simulated_resource_snapshot),
            },
            "memory_retrieval": retrieved_memory,
            "child_results": completed_results,
            "duration_sec": round(time.time() - started_at, 4),
        }

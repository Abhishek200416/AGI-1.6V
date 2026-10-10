"""AGI 1.7 Unified Master Platform Adapter (`AGI17Adapter`).

Binds all AGI 1.7 — OMEGA COMMAND subsystems into a single cohesive runtime:
  - CapabilityProfiler & ResourceSnapshot
  - DurableTaskManager, TaskStore, CheckpointManager, DependencyManager, CommandInbox
  - ProcessSupervisor, StreamParser, CompletionNotifier, RecoveryManager
  - 10-Layer OmegaCommandMemory & ACONCompressor
  - 100-Specialist SpecialistFactory, CapabilityRouter, RegistryValidator
  - ResourceGovernor & HierarchicalOrchestrator
  - AdaptiveTokenController & ProgressService
  - EvidenceVerifier & GroundedResearchEngine
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Optional, Sequence

from agents.AGI_1_7.ecosystem.agent_registry.specialist_factory import SpecialistFactory
from ..capabilities.capability_profiler import CapabilityProfiler
from ..capabilities.resource_snapshot import ResourceSnapshot
from ..memory.omega_command_memory import OmegaCommandMemory
from ..orchestration.hierarchical_orchestrator import HierarchicalOrchestrator, SubtaskSpec
from ..orchestration.resource_governor import ResourceGovernor
from ..process_supervision.process_supervisor import ProcessSupervisor
from ..research.grounded_research import GroundedResearchEngine
from ..task_control.task_manager import DurableTaskManager
from ..telemetry.progress_service import ProgressService
from ..telemetry.token_economy import AdaptiveTokenController
from ..verification.evidence_verifier import EvidenceVerifier
from .model_adapter import ModelAdapter


class AGI17Adapter:
    """Master runtime entrypoint for AGI 1.7.0 — OMEGA COMMAND."""

    VERSION = "1.7.0"
    CODENAME = "OMEGA COMMAND"

    def __init__(
        self,
        *,
        storage_root: str | Path = r"D:\AGI_Storage\AGI_1_7",
        eval_root: str | Path = r"D:\AGI_Evaluation\AGI_1_7_OMEGA_COMMAND",
    ) -> None:
        self.storage_root = Path(storage_root)
        self.eval_root = Path(eval_root)

        self.profiler = CapabilityProfiler(
            storage_root=str(self.storage_root),
            eval_root=str(self.eval_root),
        )
        self.task_manager = DurableTaskManager(
            db_path=self.storage_root / "state" / "agi17_tasks.db",
            events_jsonl_path=self.storage_root / "journals" / "task_events.jsonl",
            checkpoints_dir=self.storage_root / "checkpoints",
        )
        self.memory = OmegaCommandMemory(
            primary_dir=self.storage_root / "memory",
        )
        self.governor = ResourceGovernor()
        self.token_controller = AdaptiveTokenController(
            ledger_dir=self.storage_root / "token_ledger",
            isolated_benchmark_cwd=self.eval_root / "isolated_cwd",
        )
        self.specialist_factory = SpecialistFactory()
        self.supervisor = ProcessSupervisor(
            task_manager=self.task_manager,
            logs_dir=self.storage_root / "logs" / "processes",
        )
        self.model_adapter = ModelAdapter(
            token_controller=self.token_controller,
            governor=self.governor,
            supervisor=self.supervisor,
        )
        self.orchestrator = HierarchicalOrchestrator(
            task_manager=self.task_manager,
            memory=self.memory,
            governor=self.governor,
            token_controller=self.token_controller,
            specialist_factory=self.specialist_factory,
            model_adapter=self.model_adapter,
            supervisor=self.supervisor,
        )
        self.progress_service = ProgressService(
            task_store=self.task_manager.store,
            token_controller=self.token_controller,
            output_dir=self.storage_root / "telemetry",
        )
        self.research_engine = GroundedResearchEngine(memory=self.memory)
        self.verifier = EvidenceVerifier()

    def run_startup_reconciliation(self) -> Dict[str, Any]:
        """Reconciles orphan tasks after restart and refreshes hardware capability profile."""
        reconciled = self.task_manager.reconcile_after_restart()
        snap = ResourceSnapshot.capture().to_dict()
        limits = self.governor.get_limits_summary()
        return {
            "version": self.VERSION,
            "codename": self.CODENAME,
            "reconciliation": reconciled,
            "limits": limits,
            "resource_snapshot": snap,
        }

    def build_code_and_test_subtasks(
        self,
        *,
        title: str,
        prompt: str,
        code_task_dir: str | Path,
        module_filename: str = "token_bucket.py",
        test_filename: str = "test_token_bucket.py",
        inject_deliberate_test_failure: bool = False,
    ) -> list[SubtaskSpec]:
        """Builds a 3-specialist live-model coding + unit-testing + self-healing DAG."""
        import sys

        ws = Path(code_task_dir).resolve()
        ws.mkdir(parents=True, exist_ok=True)
        module_path = ws / module_filename
        test_path = ws / test_filename

        def _inject_deliberate_fault(_target: Path) -> Dict[str, Any]:
            if not inject_deliberate_test_failure or not module_path.exists():
                return {"injected": False}
            original = module_path.read_text(encoding="utf-8")
            # Inject a deterministic boundary/logic defect into the generated module
            # so unittest Attempt 1 fails with a real AssertionError/ValueError mismatch
            mutated = original
            mutation_desc = ""
            if "self.tokens >= tokens" in mutated:
                mutated = mutated.replace("self.tokens >= tokens", "self.tokens > tokens", 1)
                mutation_desc = "Mutated `self.tokens >= tokens` to strict `>` (breaks exact-capacity token acquisition)"
            elif ">=" in mutated:
                mutated = mutated.replace(">=", ">", 1)
                mutation_desc = "Mutated first `>=` boundary comparison to strict `>`"
            else:
                mutated = mutated + "\n# Deliberate syntax/runtime assertion fault\nraise RuntimeError('Deliberate injected fault')\n"
                mutation_desc = "Appended runtime fault trigger"
            module_path.write_text(mutated, encoding="utf-8")
            return {
                "injected": True,
                "target_file": str(module_path),
                "mutation_description": mutation_desc,
            }

        return [
            SubtaskSpec(
                title=f"{title} — Stage 1: Architecture & Interface Specification",
                description=(
                    f"Specify the exact Python class/function signatures and edge-case invariants for `{module_filename}`: {prompt} "
                    f"Keep your specification concise (4-6 bullet points)."
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
                ),
                preferred_specialist_id="swe_python_runtime_engineer",
                depends_on_indices=[0],
                queue_type="model_call",
                token_budget=16000,
                use_live_model=True,
                target_file_path=str(module_path),
            ),
            SubtaskSpec(
                title=f"{title} — Stage 3: Live Model Unit Test Generation, Execution & Self-Healing (`{test_filename}`)",
                description=(
                    f"Write a Python `unittest` suite `{test_filename}` that imports from `{module_filename[:-3]}` and tests "
                    f"normal operation, exact boundary acquisition (acquiring 100% of capacity), and `ValueError` on invalid inputs. "
                    f"Return ONLY the complete `{test_filename}` code inside a ```python ... ``` block."
                ),
                preferred_specialist_id="qa_unit_suite_runner",
                depends_on_indices=[0, 1],
                queue_type="model_call",
                token_budget=24000,
                use_live_model=True,
                target_file_path=str(test_path),
                repair_target_file=str(module_path),
                post_write_fault_injector=_inject_deliberate_fault if inject_deliberate_test_failure else None,
                verification_command=[sys.executable, "-m", "unittest", test_filename, "-v"],
                verification_cwd=str(ws),
                repair_specialist_id="swe_patch_minimizer",
            ),
        ]

    def execute(
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
    ) -> Dict[str, Any]:
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

        res = self.orchestrator.execute_mission(
            title=title,
            prompt=prompt,
            task_id=task_id,
            subtasks=subtasks,
            force_hierarchical=force_hierarchical,
            use_live_model=use_live_model,
        )
        self.progress_service.render_html_dashboard()
        return res

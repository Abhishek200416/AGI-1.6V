"""AGI 1.7 Unified Master Platform Adapter (`AGI17Adapter`).

Binds all AGI 1.7 — OMEGA COMMAND subsystems into a single cohesive runtime:
  - CapabilityProfiler & ResourceSnapshot
  - DurableTaskManager, TaskStore, CheckpointManager, DependencyManager, CommandInbox
  - ProcessSupervisor, StreamParser, CompletionNotifier, RecoveryManager
  - 10-Layer OmegaCommandMemory & ACONCompressor
  - 100-Specialist SpecialistFactory, CapabilityRouter, RegistryValidator, EcosystemCoordinator
  - ResourceGovernor & HierarchicalOrchestrator
  - AdaptiveTokenController & ProgressService
  - EvidenceVerifier & GroundedResearchEngine
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Optional, Sequence

from agents.AGI_1_7.ecosystem.agent_registry.ecosystem_coordinator import EcosystemCoordinator
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
        import os as _os
        import sys as _sys
        fallback_base = Path(__file__).resolve().parents[3] / "state_fallback"
        if str(storage_root).upper().startswith("D:") and (_sys.platform != "win32" or not _os.path.exists("D:\\")):
            self.storage_root = fallback_base / "storage"
        else:
            self.storage_root = Path(storage_root)
        if str(eval_root).upper().startswith("D:") and (_sys.platform != "win32" or not _os.path.exists("D:\\")):
            self.eval_root = fallback_base / "eval"
        else:
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
        self.ecosystem_coordinator = EcosystemCoordinator()
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
            ecosystem_coordinator=self.ecosystem_coordinator,
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
            "ecosystem": self.ecosystem_coordinator.get_inventory_summary(),
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
        fallback_module_code: Optional[str] = None,
        fallback_test_code: Optional[str] = None,
    ) -> list[SubtaskSpec]:
        """Delegates to `HierarchicalOrchestrator.build_code_and_test_subtasks`."""
        return self.orchestrator.build_code_and_test_subtasks(
            title=title,
            prompt=prompt,
            code_task_dir=code_task_dir,
            module_filename=module_filename,
            test_filename=test_filename,
            inject_deliberate_test_failure=inject_deliberate_test_failure,
            fallback_module_code=fallback_module_code,
            fallback_test_code=fallback_test_code,
        )

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
        """Executes a mission through `HierarchicalOrchestrator.execute_mission()`."""
        res = self.orchestrator.execute_mission(
            title=title,
            prompt=prompt,
            task_id=task_id,
            subtasks=subtasks,
            force_hierarchical=force_hierarchical,
            use_live_model=use_live_model,
            code_task_dir=code_task_dir,
            module_filename=module_filename,
            test_filename=test_filename,
            inject_deliberate_test_failure=inject_deliberate_test_failure,
        )
        self.progress_service.render_html_dashboard()
        return res

    execute_mission = execute

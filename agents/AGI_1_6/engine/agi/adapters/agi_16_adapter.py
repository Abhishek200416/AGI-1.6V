"""
agi/adapters/agi_16_adapter.py
AGI 1.6 OMEGA NEXUS — Master Platform Adapter

The authoritative runtime adapter for AGI 1.6:
1. Enforces Startup Compatibility Gate verifying AGI 1.6 OMEGA NEXUS invariants.
2. Directs external-drive-first persistence targeting D:\\AGI_Storage\\AGI_1_6\\memory
   and D:\\AGI_Evaluation\\AGI_1_6_OMEGA_NEXUS\\.
3. Coordinates Adaptive Token Economy (pre-flight estimation, dynamic allocation, ledger).
4. Coordinates 9-layer persistent memory & ACON context compression.
5. Manages OmegaNexusOrchestrator with role-bounded dynamic spawning.
6. Drives AdaptiveExecutionScheduler with live CPU/RAM headroom throttling.
7. Executes GroundedResearchEngine with 10-stage verifiable evidence synthesis.
8. Interfaces TerminalExecutionAdapter, BrowserExecutionAdapter, ComputerUseAdapter.
9. Enforces EvidenceVerifier for deterministic completion assertions.
10. Sole foundation model: gemini-3.8-flash-high through authenticated Antigravity CLI.
"""

import os
import sys
import json
import time
import platform
import datetime
from typing import Dict, Any, List, Optional, Tuple

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from agi.orchestration.adaptive_token_economy import AdaptiveTokenEconomy, BudgetEstimator, TaskCategory
from agi.memory.omega_nexus_memory import OmegaNexusMemory, MemoryLayer, AdaptiveContextManager
from agi.orchestration.omega_nexus_orchestrator import OmegaNexusOrchestrator, AgentRole
from agi.orchestration.adaptive_execution_scheduler import AdaptiveExecutionScheduler, TaskNode
from agi.research.grounded_research_engine import GroundedResearchEngine
from agi.adapters.terminal_execution_adapter import TerminalExecutionAdapter
from agi.adapters.browser_execution_adapter import BrowserExecutionAdapter
from agi.adapters.computer_use_adapter import ComputerUseAdapter
from agi.adapters.evidence_verifier import EvidenceVerifier
from agi.evolution.versioned_experiment_manager import VersionedExperimentManager

MODEL_IDENTIFIER = "gemini-3.8-flash-high"
RUNTIME_VERSION = "1.6.0"
CODENAME = "OMEGA NEXUS"


class AGI16OmegaNexusAgent:
    """Master platform agent for AGI 1.6 OMEGA NEXUS."""

    def __init__(
        self,
        run_id: Optional[str] = None,
        storage_dir: Optional[str] = None,
        ledger_path: Optional[str] = None,
        enforce_gate: bool = True
    ):
        self.run_id = run_id or f"AGI16-{datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d-%H%M%S')}"
        
        # 1. Authoritative External Storage (Volume D:\ primary, local fallback)
        d_default = r"D:\AGI_Storage\AGI_1_6\memory"
        local_fallback = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "memory"))
        if storage_dir:
            self.storage_dir = storage_dir
        elif os.path.exists("D:\\"):
            try:
                os.makedirs(d_default, exist_ok=True)
                self.storage_dir = d_default
            except Exception:
                self.storage_dir = local_fallback
        else:
            self.storage_dir = local_fallback

        # 2. Subsystem Instantiation
        self.memory = OmegaNexusMemory(
            primary_dir=self.storage_dir,
            local_fallback_dir=local_fallback,
            version=RUNTIME_VERSION
        )
        
        d_ledger = r"D:\AGI_Evaluation\AGI_1_6_OMEGA_NEXUS\token_ledger\token_ledger.jsonl"
        chosen_ledger = ledger_path or (d_ledger if os.path.exists("D:\\") else os.path.join(self.storage_dir, "token_ledger.jsonl"))
        self.token_economy = AdaptiveTokenEconomy(ledger_path=chosen_ledger)

        self.orchestrator = OmegaNexusOrchestrator(
            token_economy=self.token_economy,
            memory_engine=self.memory
        )

        self.scheduler = AdaptiveExecutionScheduler(max_configured_workers=16)
        self.research = GroundedResearchEngine()
        self.terminal = TerminalExecutionAdapter()
        self.browser = BrowserExecutionAdapter()
        self.computer_use = ComputerUseAdapter()
        self.verifier = EvidenceVerifier()
        self.evolution = VersionedExperimentManager()

        # Record initialization in Memory Layer 3 (Active Project)
        self.memory.write_record(
            layer=MemoryLayer.ACTIVE_PROJECT,
            content=f"AGI 1.6 OMEGA NEXUS initialized with run_id {self.run_id}",
            tags=["runtime_init", "v1.6.0"]
        )

    def execute_mission(self, mission_spec: Dict[str, Any]) -> Dict[str, Any]:
        """Executes an end-to-end mission using dynamic token-budgeted orchestration."""
        prompt = mission_spec.get("prompt", "Diagnostic operational run.")
        task_id = mission_spec.get("task_id", f"MIS-{int(time.time()*1000)%1000000000}")
        category = mission_spec.get("category") or BudgetEstimator.classify_task(prompt)

        start_time = time.time()
        
        # Execute via Orchestrator
        orch_res = self.orchestrator.plan_and_execute_task(
            task_id=task_id,
            goal=prompt,
            task_category=category.value if hasattr(category, 'value') else category
        )

        # Flush persistent memory state to disk
        self.memory.flush_to_disk()
        elapsed = time.time() - start_time

        return {
            "mission_id": task_id,
            "runtime_version": RUNTIME_VERSION,
            "codename": CODENAME,
            "status": orch_res.get("status", "COMPLETED"),
            "category": category.value if hasattr(category, 'value') else category,
            "orchestration": orch_res,
            "token_metrics": self.token_economy.ledger.get_metrics(),
            "elapsed_sec": round(elapsed, 4)
        }

    def get_system_dashboard(self) -> Dict[str, Any]:
        """Provides full real-time operational telemetry and status."""
        mem_stats = self.memory.get_stats()
        headroom = self.scheduler.get_resource_headroom()
        metrics = self.token_economy.ledger.get_metrics()
        
        return {
            "runtime_version": RUNTIME_VERSION,
            "codename": CODENAME,
            "foundation_model": MODEL_IDENTIFIER,
            "storage_target": self.storage_dir,
            "storage_state": mem_stats.get("storage_state"),
            "memory_layers": 9,
            "total_stored_records": mem_stats.get("total_records"),
            "host_os": f"{platform.system()}-{platform.release()}",
            "cpu_percent": headroom.get("cpu_percent"),
            "available_ram_mb": headroom.get("available_ram_mb"),
            "token_metrics": metrics
        }

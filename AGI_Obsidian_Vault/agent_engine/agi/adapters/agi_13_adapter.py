"""
agi/adapters/agi_13_adapter.py
AGI 1.3 OMEGA ULTRA — Unified Master Platform Adapter

The authoritative runtime adapter for AGI 1.3:
1. Executes startup compatibility gate verifying AGI 1.3 OMEGA ULTRA.
2. Coordinates Live Knowledge Engine (5 knowledge classes & freshness preflight).
3. Connects True Persistent Memory (200 logical strata & 8-state disconnection recovery).
4. Integrates Host & Connected Device Discovery (Windows 11 volumes & PnP inventory).
5. Enforces Capability Registry (480 registered capabilities & permission boundaries).
6. Executes DynTaskMAS Wavefront DAG Scheduling (scaling up to 200 concurrent workers).
7. Streams OpenTelemetry GenAI Telemetry (800 validated attributes & secret scrubbing).
8. Governs token and execution budgets via Central Budget Controller (Effort Levels 0-4).
9. Shields against adversarial prompt injection via AgentLAB Multi-Turn Defense.
10. Sole foundation model: gemini-3.8-flash-high through authenticated Antigravity CLI.
"""

import os
import sys
import json
import time
import datetime
import subprocess
from typing import Dict, Any, List, Optional, Tuple

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from agi.runtime.compatibility_gate import get_compatibility_gate, AGI13CompatibilityGate
from agi.research.live_knowledge_engine import LiveKnowledgeEngine, KnowledgeClass
from agi.research.model_registry import LiveModelRegistry
from agi.research.correction_handler import CorrectionHandler
from agi.memory.omega_memory import OmegaMemoryEngine, StorageState
from agi.memory.strata_registry import get_strata_registry, MemoryStrataRegistry
from agi.devices.device_discovery import get_host_inspector, HostDeviceInspector
from agi.capabilities.capability_registry import get_capability_registry, CapabilityRegistry
from agi.orchestration.omega_dag_scheduler import OmegaDAGScheduler
from agi.orchestration.omega_telemetry import get_omega_telemetry, OmegaTelemetryEngine
from agi.orchestration.budget_controller import BudgetController, EffortLevel
from agi.terminal.terminal_controller import TerminalController
from agi.computer.enhanced_browser import EnhancedBrowserResearchEngine
from agi.security.injection_shield import InjectionShield
from agi.affect.affective_regulator import AffectiveRegulator

AGY_PATH = os.path.expandvars(r"%LOCALAPPDATA%\agy\bin\agy.exe")
if not os.path.exists(AGY_PATH):
    AGY_PATH = "agy.exe"

MODEL_IDENTIFIER = "gemini-3.8-flash-high"


class AGI13OmegaUltraAgent:
    def __init__(self, run_id: Optional[str] = None, storage_dir: Optional[str] = None, enforce_gate: bool = True):
        self.run_id = run_id or f"AGI13-{datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d-%H%M%S')}"
        
        # 1. Startup Compatibility Gate
        self.gate: AGI13CompatibilityGate = get_compatibility_gate("1.3.0")
        if enforce_gate:
            self.gate_report = self.gate.run_full_compatibility_gate()
        else:
            self.gate_report = {"gate_verdict": "SKIPPED"}

        # 2. Storage & Memory (200 Strata)
        self.storage_dir = storage_dir or os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "AGI_Data", "memory"))
        self.strata: MemoryStrataRegistry = get_strata_registry("1.3.0")
        self.memory: OmegaMemoryEngine = OmegaMemoryEngine(base_storage_dir=self.storage_dir, strata_reg=self.strata, version="1.3.0")

        # 3. Live Research & Knowledge Engine
        self.research: LiveKnowledgeEngine = LiveKnowledgeEngine(run_id=self.run_id)
        self.models: LiveModelRegistry = LiveModelRegistry()
        self.corrections: CorrectionHandler = CorrectionHandler()

        # 4. Host & Device Inspection
        self.devices: HostDeviceInspector = get_host_inspector()

        # 5. Capabilities (480 Items)
        self.capabilities: CapabilityRegistry = get_capability_registry("1.3.0")

        # 6. Observability & Telemetry (800 Attributes)
        self.telemetry: OmegaTelemetryEngine = get_omega_telemetry(run_id=self.run_id, version="1.3.0")

        # 7. Subsystems
        self.budgets: BudgetController = BudgetController()
        self.terminal: TerminalController = TerminalController(run_id=self.run_id)
        self.browser: EnhancedBrowserResearchEngine = EnhancedBrowserResearchEngine(run_id=self.run_id)
        self.shield: InjectionShield = InjectionShield()
        self.affect: AffectiveRegulator = AffectiveRegulator()

    # -------------------------------------------------------------
    # Foundation Model Invocation (Directive 0)
    # -------------------------------------------------------------
    def call_model(self, prompt: str, timeout_seconds: int = 45) -> Dict[str, Any]:
        """Calls gemini-3.8-flash-high via authenticated Antigravity CLI."""
        can_spend, reason = self.budgets.can_spend_model_call(task_objective="Model Query")
        if not can_spend:
            return {"success": False, "error": f"BUDGET_EXCEEDED: {reason}", "content": ""}

        # Security inspection
        is_injection, inj_reason = self.shield.inspect_untrusted_input(prompt)
        if is_injection:
            self.telemetry.record_event(
                task_id="GLOBAL",
                component="MODEL",
                event_type="INJECTION_ATTEMPT_BLOCKED",
                status="BLOCKED",
                output_ref=inj_reason
            )
            return {"success": False, "error": f"SECURITY_BLOCKED: {inj_reason}", "content": ""}

        cmd = [
            AGY_PATH,
            "--model", MODEL_IDENTIFIER,
            "--dangerously-skip-permissions"
        ]
        formatted_prompt = f"Objective:\n{prompt}\n\nResponse:"
        t0 = time.time()
        try:
            clean_env = os.environ.copy()
            for p in ["HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy"]:
                clean_env.pop(p, None)

            proc = subprocess.run(
                cmd,
                input=formatted_prompt,
                capture_output=True,
                text=True,
                timeout=timeout_seconds,
                env=clean_env,
                shell=True
            )
            dur_ms = (time.time() - t0) * 1000

            if proc.returncode == 0 and proc.stdout.strip():
                out_tokens = max(1, len(proc.stdout) // 4)
                in_tokens = max(1, len(prompt) // 4)
                self.budgets.record_usage(in_tokens, out_tokens, productive=True)
                self.affect.record_outcome(success=True, evidence_quality=0.90)
                self.telemetry.record_event(
                    task_id="GLOBAL",
                    component="MODEL",
                    event_type="CALL_SUCCESS",
                    status="SUCCESS",
                    duration_ms=dur_ms,
                    input_ref=prompt[:80],
                    output_ref=proc.stdout[:80]
                )
                return {"success": True, "content": proc.stdout.strip(), "duration_ms": dur_ms}
            else:
                self.budgets.record_usage(len(prompt) // 4, 0, productive=False)
                self.affect.record_outcome(success=False, evidence_quality=0.0)
                err = proc.stderr.strip() or f"Exit code {proc.returncode}"
                return {"success": False, "error": err, "duration_ms": dur_ms, "content": ""}
        except subprocess.TimeoutExpired:
            self.budgets.record_usage(len(prompt) // 4, 0, productive=False)
            self.affect.record_outcome(success=False, evidence_quality=0.0)
            return {"success": False, "error": f"Model timed out after {timeout_seconds}s", "content": ""}
        except Exception as e:
            return {"success": False, "error": str(e), "content": ""}

    # -------------------------------------------------------------
    # Live Research Pipeline
    # -------------------------------------------------------------
    def live_research_request(self, query: str) -> Dict[str, Any]:
        """Conducts freshness assessment and live research if time-sensitive."""
        assessment = self.research.assess_freshness_requirement(query)
        if assessment["requires_live_research"]:
            results = self.research.search_and_extract(query)
            # Store primary evidence into research stratum 131
            self.memory.store_record(
                stratum_id=131,
                content=results.get("primary_evidence_snippet", ""),
                source=f"live_research:{query[:40]}",
                importance=0.8
            )
            return {
                "freshness_preflight": assessment,
                "research_results": results,
                "mode": "LIVE_RESEARCH_EXECUTED"
            }
        else:
            return {
                "freshness_preflight": assessment,
                "mode": "STABLE_BACKGROUND_SUFFICIENT"
            }

    # -------------------------------------------------------------
    # Wavefront DAG Execution (Up to 200 Workers)
    # -------------------------------------------------------------
    def execute_wavefront_dag(self, tasks: List[Dict[str, Any]], max_workers: int = 20) -> Dict[str, Any]:
        scheduler = OmegaDAGScheduler(run_id=self.run_id, max_workers=max_workers, max_concurrency_ceiling=200)
        for t in tasks:
            scheduler.add_task(
                task_id=t["id"],
                name=t["name"],
                action=t["action"],
                dependencies=t.get("dependencies", []),
                owned_resources=t.get("owned_resources", []),
                inputs=t.get("inputs", {}),
                acceptance_criteria=t.get("acceptance_criteria", "")
            )
        return scheduler.execute_dag()

    # -------------------------------------------------------------
    # Truthful Status & Diagnostic APIs
    # -------------------------------------------------------------
    def get_status_dashboard(self) -> Dict[str, Any]:
        return {
            "version": "1.3.0",
            "codename": "OMEGA ULTRA",
            "build_id": self.gate.profile_data.get("build_id"),
            "foundation_model": MODEL_IDENTIFIER,
            "memory_strata_count": self.strata.count(),
            "capabilities_count": self.capabilities.count(),
            "telemetry_attributes_count": self.telemetry.count_registered_attributes(),
            "storage_status": self.memory.get_storage_status(),
            "host_identity": self.devices.get_user_identity(),
            "gatekeeper_verdict": self.gate_report.get("gate_verdict")
        }

    def render_cli_dashboard(self) -> str:
        dash = self.get_status_dashboard()
        lines = [
            "=" * 78,
            f"  AGI 1.3 OMEGA ULTRA — MASTER OPERATIONAL STATUS DASHBOARD",
            "=" * 78,
            f"  Active Version:         {dash['version']} ({dash['codename']})",
            f"  Build ID:               {dash['build_id']}",
            f"  Sole Foundation Model:  {dash['foundation_model']} via Antigravity CLI",
            f"  Startup Gate Verdict:   {dash['gatekeeper_verdict']}",
            "-" * 78,
            f"  SUBSYSTEM SPECIFICATIONS:",
            f"    - Memory Strata:       {dash['memory_strata_count']} / 200 Documented Strata",
            f"    - Storage Target:      {dash['storage_status']['absolute_storage_path']}",
            f"    - Storage State:       {dash['storage_status']['storage_state']}",
            f"    - Registered Caps:     {dash['capabilities_count']} / 480 Capabilities",
            f"    - Telemetry Fields:    {dash['telemetry_attributes_count']} / 800 Attributes",
            f"    - Authenticated Host:  {dash['host_identity']['authenticated_account']}",
            "=" * 78
        ]
        return "\n".join(lines)


if __name__ == "__main__":
    agent = AGI13OmegaUltraAgent()
    print(agent.render_cli_dashboard())

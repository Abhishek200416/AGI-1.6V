"""
agi/adapters/agi_12_adapter.py
AGI 1.2 — Unified Autonomous, Observable, Self-Improving Agent Platform Adapter Core

Integrates the complete AGI 1.2 architecture:
1. First-Run Forensics & Lock Protocol (Part II)
2. Minimum Visibility Requirement (MVR) & Telemetry Stream (Part III)
3. Unified Cognitive Architecture & Adaptive Planner (Part IV)
4. Long-Horizon Reliability Engineering & Action Contracts (Part V)
5. Dependency-Aware Concurrency & DAG Scheduler (DynTaskMAS, Part VI)
6. Advanced 8-Layer Memory & Anti-Poisoning Quarantine (Part VII)
7. Enhanced Browser & Multi-Hop Citation Grounding (Part VIII)
8. Stateful Terminal & Bounded Execution Control (Part IX)
9. Adaptive Budget & Effort Controller (Levels 0-4, Part X)
10. Simulated Affective Regulation Layer (Part XI)
11. Persistent 24/7 Resilience & Atomic Checkpoints (Part XII)
12. Multi-Turn Security & Injection Shield (AgentLAB Defense, Part XIII)
13. Sole Foundation Model: gemini-3.8-flash-high via authenticated Antigravity CLI (agy.exe)
"""

import os
import sys
import json
import time
import datetime
import subprocess
from typing import Dict, Any, List, Optional, Tuple

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from agi.orchestration.observability import get_telemetry_engine, MVRTelemetryEngine
from agi.orchestration.budget_controller import BudgetController, EffortLevel
from agi.orchestration.dag_scheduler import DAGScheduler, TaskState
from agi.memory.advanced_memory import AdvancedMemorySubsystem, MemoryLayer, CandidateStatus
from agi.computer.enhanced_browser import EnhancedBrowserResearchEngine
from agi.terminal.terminal_controller import TerminalController
from agi.orchestration.persistence_engine import PersistenceEngine
from agi.security.injection_shield import InjectionShield
from agi.affect.affective_regulator import AffectiveRegulator

AGY_PATH = os.path.expandvars(r"%LOCALAPPDATA%\agy\bin\agy.exe")
if not os.path.exists(AGY_PATH):
    AGY_PATH = "agy.exe"

MODEL_IDENTIFIER = "gemini-3.8-flash-high"


class AGI12PlatformAgent:
    def __init__(self, run_id: Optional[str] = None, data_dir: Optional[str] = None):
        self.run_id = run_id or f"AGI12-{datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d-%H%M%S')}"
        self.data_dir = data_dir or os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
        os.makedirs(self.data_dir, exist_ok=True)

        # Core subsystems
        self.telemetry: MVRTelemetryEngine = get_telemetry_engine(run_id=self.run_id)
        self.budgets: BudgetController = BudgetController()
        self.memory: AdvancedMemorySubsystem = AdvancedMemorySubsystem(
            storage_path=os.path.join(self.data_dir, "advanced_memory_store.json")
        )
        self.browser: EnhancedBrowserResearchEngine = EnhancedBrowserResearchEngine(run_id=self.run_id)
        self.terminal: TerminalController = TerminalController(run_id=self.run_id)
        self.persistence: PersistenceEngine = PersistenceEngine(run_id=self.run_id)
        self.shield: InjectionShield = InjectionShield()
        self.affect: AffectiveRegulator = AffectiveRegulator()

        # Closed-World Tool Registry
        self.tools: Dict[str, Any] = {
            "web_search": self.tool_web_search,
            "read_memory": self.tool_read_memory,
            "store_candidate_memory": self.tool_store_candidate_memory,
            "execute_terminal": self.tool_execute_terminal,
            "query_market_data": self.tool_query_market_data,
            "execute_paper_order": self.tool_execute_paper_order
        }

    # -------------------------------------------------------------
    # Sole Foundation Model Invocation via Antigravity CLI
    # -------------------------------------------------------------
    def call_model(self, prompt: str, thinking_effort: str = "HIGH", timeout_seconds: int = 45) -> Dict[str, Any]:
        """Calls gemini-3.8-flash-high through agy.exe with --dangerously-skip-permissions."""
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
                error_category="PromptInjection",
                output_reference=inj_reason
            )
            return {"success": False, "error": f"SECURITY_BLOCKED: {inj_reason}", "content": ""}

        cmd = [
            AGY_PATH,
            "--model", MODEL_IDENTIFIER,
            "--dangerously-skip-permissions"
        ]

        # Natural instruction formatting (no bracketed synthetic transcript tokens)
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
                # Estimate token usage
                out_tokens = max(1, len(proc.stdout) // 4)
                in_tokens = max(1, len(prompt) // 4)
                self.budgets.record_usage(in_tokens, out_tokens, productive=True)
                self.affect.record_outcome(success=True, evidence_quality=0.85)

                self.telemetry.record_event(
                    task_id="GLOBAL",
                    component="MODEL",
                    event_type="CALL_SUCCESS",
                    status="SUCCESS",
                    duration_ms=dur_ms,
                    tokens_used=in_tokens + out_tokens,
                    output_reference=proc.stdout[:80]
                )
                return {"success": True, "content": proc.stdout.strip(), "duration_ms": dur_ms}
            else:
                self.budgets.record_usage(len(prompt) // 4, 0, productive=False)
                self.affect.record_outcome(success=False, evidence_quality=0.0)
                err_msg = proc.stderr.strip() or f"Exit code {proc.returncode}"
                return {"success": False, "error": err_msg, "duration_ms": dur_ms, "content": ""}

        except subprocess.TimeoutExpired:
            self.budgets.record_usage(len(prompt) // 4, 0, productive=False)
            self.affect.record_outcome(success=False, evidence_quality=0.0)
            return {"success": False, "error": f"Model timed out after {timeout_seconds}s", "content": ""}
        except Exception as e:
            return {"success": False, "error": str(e), "content": ""}

    # -------------------------------------------------------------
    # Tool Execution Layer
    # -------------------------------------------------------------
    def tool_web_search(self, query: str, max_hops: int = 1) -> Dict[str, Any]:
        self.budgets.record_tool_call()
        return self.browser.deep_research(query=query, max_hops=max_hops)

    def tool_read_memory(self, query: str, layer: Optional[str] = None) -> List[Dict[str, Any]]:
        self.budgets.record_tool_call()
        return self.memory.recall(query=query, layer=layer)

    def tool_store_candidate_memory(self, layer: str, content: str, source: str, provenance: str) -> str:
        self.budgets.record_tool_call()
        return self.memory.observe_and_store_candidate(
            layer=layer, content=content, source=source, provenance_ref=provenance
        )

    def tool_execute_terminal(self, command: str) -> Dict[str, Any]:
        self.budgets.record_tool_call()
        # Execution boundary check
        allowed, reason = self.shield.validate_terminal_action(command)
        if not allowed:
            return {"success": False, "error": reason, "exit_code": -1}
        return self.terminal.run_sync(command)

    def tool_query_market_data(self, symbol: str) -> Dict[str, Any]:
        self.budgets.record_tool_call()
        # Strictly simulated market data
        return {
            "symbol": symbol.upper(),
            "price": 100.00,
            "mode": "SIMULATED_FEED_TRUTHFULNESS_ASSERTION",
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }

    def tool_execute_paper_order(self, symbol: str, side: str, qty: int) -> Dict[str, Any]:
        self.budgets.record_tool_call()
        # Strictly paper trading - real brokerage execution permanently prohibited
        return {
            "status": "SIMULATED_ORDER_FILLED",
            "order_id": f"paper-{int(time.time())}",
            "symbol": symbol.upper(),
            "side": side.upper(),
            "quantity": qty,
            "execution_price": 100.00,
            "financial_safety_boundary": "NO_REAL_MONEY_TRADING_ASSERTED"
        }

    # -------------------------------------------------------------
    # Full Mission DAG Orchestration
    # -------------------------------------------------------------
    def execute_mission_dag(self, tasks: List[Dict[str, Any]], max_workers: int = 4) -> Dict[str, Any]:
        sched = DAGScheduler(run_id=self.run_id, max_workers=max_workers)
        for t in tasks:
            sched.add_task(
                task_id=t["id"],
                name=t["name"],
                action=t["action"],
                dependencies=t.get("dependencies", []),
                owned_resources=t.get("owned_resources", []),
                inputs=t.get("inputs", {}),
                acceptance_criteria=t.get("acceptance_criteria", "")
            )
        return sched.execute_dag()

    # -------------------------------------------------------------
    # MVR Status Reporting
    # -------------------------------------------------------------
    def get_status_dashboard(self) -> str:
        return self.telemetry.render_cli_dashboard()

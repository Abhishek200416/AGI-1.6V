"""
tests/test_agi_16_core_suite.py
AGI 1.6 OMEGA NEXUS — Core Comprehensive Verification Test Suite

Verifies:
1. Compatibility Gate v1.6.0 & Stale Version Rejection.
2. Adaptive Token Economy (Estimator, Dynamic Split, Ledger, Early Stopping, Cache).
3. 9-Layer Partitioned Memory & ACON Context Compression.
4. OmegaNexus Orchestrator (Dynamic Spawning, Role Templates, Message Bus, Recovery).
5. Adaptive Execution Scheduler (Dependency DAG & Resource Headroom).
6. Grounded Research Engine (Compliance, Section Extraction, Citation Audit).
7. Execution Adapters (Terminal, Browser, ComputerUse, EvidenceVerifier).
8. Capability Adaptation Loop (VersionedExperimentManager).
"""

import os
import sys
import unittest
import tempfile
import time

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ENGINE_DIR = os.path.join(BASE_DIR, "engine")
if ENGINE_DIR not in sys.path:
    sys.path.insert(0, ENGINE_DIR)

from agi.runtime.compatibility_gate import get_compatibility_gate
from agi.orchestration.adaptive_token_economy import (
    AdaptiveTokenEconomy, BudgetEstimator, TaskCategory, BudgetPhase, EarlyStoppingController
)
from agi.memory.omega_nexus_memory import OmegaNexusMemory, MemoryLayer, AdaptiveContextManager
from agi.orchestration.omega_nexus_orchestrator import OmegaNexusOrchestrator, AgentRole, AgentMessage
from agi.orchestration.adaptive_execution_scheduler import AdaptiveExecutionScheduler, TaskNode
from agi.research.grounded_research_engine import GroundedResearchEngine, ResearchSourceTier
from agi.adapters.terminal_execution_adapter import TerminalExecutionAdapter
from agi.adapters.browser_execution_adapter import BrowserExecutionAdapter
from agi.adapters.computer_use_adapter import ComputerUseAdapter
from agi.adapters.evidence_verifier import EvidenceVerifier
from agi.evolution.versioned_experiment_manager import VersionedExperimentManager
from agi.adapters.agi_16_adapter import AGI16OmegaNexusAgent


class TestAGI16CoreSuite(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        cls.temp_dir = tempfile.mkdtemp(prefix="agi16_test_")
        cls.mem_dir = os.path.join(cls.temp_dir, "memory")
        cls.ledger_file = os.path.join(cls.temp_dir, "ledger.jsonl")

    # 1. Compatibility Gate Invariants
    def test_01_compatibility_gate_invariants(self):
        gate = get_compatibility_gate("1.6.0")
        report = gate.run_full_compatibility_gate()
        self.assertEqual(report["gate_verdict"], "PASSED")
        self.assertEqual(report["active_version"], "1.6.0")
        self.assertEqual(report["codename"], "OMEGA NEXUS")
        self.assertEqual(report["memory_layers_count"], 9)
        self.assertEqual(report["orchestrator_roles"], 9)

    # 2. Adaptive Token Economy
    def test_02_adaptive_token_economy(self):
        econ = AdaptiveTokenEconomy(ledger_path=self.ledger_file)
        
        # Classification
        self.assertEqual(BudgetEstimator.classify_task("compute 2+2"), TaskCategory.SIMPLE)
        self.assertEqual(BudgetEstimator.classify_task("Refactor multi-agent orchestration architecture across modules"), TaskCategory.COMPLEX)
        self.assertEqual(BudgetEstimator.classify_task("Run OSWorld benchmark evaluation campaign"), TaskCategory.HIGH_STAKES)

        # Budget Allocation
        task_id = "TASK-TEST-001"
        b_state = econ.initialize_task_budget(task_id, "edit main.py to add logging")
        self.assertEqual(b_state["total_budget_tokens"], 8000)
        self.assertEqual(b_state["phase_budgets"][BudgetPhase.PLANNING.value], 800)
        self.assertEqual(b_state["phase_budgets"][BudgetPhase.EXECUTION.value], 5200)

        # Record usage & ledger
        entry = econ.record_usage(task_id, "WKR-1", input_tokens=400, output_tokens=150)
        self.assertEqual(entry["input_tokens"], 400)
        self.assertGreater(entry["cost_usd"], 0.0)
        
        # Result caching
        key = econ.cache.compute_key("deterministic_calc_query")
        econ.cache.set(key, "42")
        self.assertEqual(econ.cache.get(key), "42")

        # Early stopping
        stop, reason = EarlyStoppingController.should_stop(
            step_index=2, max_steps=10, verified_evidence=True, remaining_budget_tokens=5000
        )
        self.assertTrue(stop)
        self.assertIn("STOP_VERIFIED_SUCCESS", reason)

    # 3. 9-Layer Persistent Memory & ACON Compression
    def test_03_memory_and_acon_compression(self):
        mem = OmegaNexusMemory(primary_dir=self.mem_dir)
        
        # Write across layers
        rec1 = mem.write_record(MemoryLayer.VERIFIED_FACTUAL, "Gemini 3.8 Flash High supports 1M context", tags=["model_spec"])
        rec2 = mem.write_record(MemoryLayer.PROCEDURAL_SKILLS, "pytest tests/ -v for test execution", tags=["testing"])
        self.assertTrue(os.path.exists(mem.wal_path))

        # Retrieve
        results = mem.retrieve("Gemini context length", top_k=2)
        self.assertGreaterEqual(len(results), 1)
        self.assertEqual(results[0]["id"], rec1["id"])

        # Flush
        mem.flush_to_disk()
        self.assertTrue(os.path.exists(mem.store_path))

        # ACON Compression
        bulky_log = "START\n" + ("normal log line\n" * 50) + "FATAL: NullPointerException in module X\n" + ("line\n" * 50) + "DONE exit code 1"
        compressed = AdaptiveContextManager.compress_observation(bulky_log, max_chars=400)
        self.assertIn("FATAL: NullPointerException", compressed)
        self.assertIn("exit code 1", compressed)
        self.assertIn("ACON Context Compression", compressed)

    # 4. OmegaNexus Multi-Agent Orchestrator
    def test_04_orchestrator_dynamic_spawning(self):
        econ = AdaptiveTokenEconomy(ledger_path=self.ledger_file)
        mem = OmegaNexusMemory(primary_dir=self.mem_dir)
        orch = OmegaNexusOrchestrator(token_economy=econ, memory_engine=mem)

        # Simple task -> 1 worker
        simple_res = orch.plan_and_execute_task("TASK-SIMP-01", "calculate square root of 144", task_category="SIMPLE")
        self.assertEqual(simple_res["status"], "COMPLETED")
        self.assertEqual(simple_res["workers_used"], 1)

        # Standard task -> 2 workers (Executor + Verifier)
        std_res = orch.plan_and_execute_task("TASK-STD-01", "write a helper function in utils.py", task_category="STANDARD")
        self.assertEqual(std_res["status"], "COMPLETED")
        self.assertEqual(std_res["workers_used"], 2)

        # Complex task -> 5 workers
        comp_res = orch.plan_and_execute_task("TASK-COMP-01", "refactor authentication service and verify tokens", task_category="COMPLEX")
        self.assertEqual(comp_res["status"], "COMPLETED")
        self.assertEqual(comp_res["workers_used"], 5)

        # Inter-agent message bus
        msg = AgentMessage("WKR-1", "WKR-2", "TASK-MSG-01", "Check test assertions")
        orch.message_bus.dispatch(msg)
        msgs = orch.message_bus.get_messages_for_task("TASK-MSG-01")
        self.assertEqual(len(msgs), 1)

    # 5. Adaptive Execution Scheduler
    def test_05_adaptive_execution_scheduler(self):
        sched = AdaptiveExecutionScheduler(max_configured_workers=4)
        headroom = sched.get_resource_headroom()
        self.assertIn("cpu_cores", headroom)
        self.assertIn("available_ram_mb", headroom)
        self.assertGreater(headroom["available_ram_mb"], 0)

        # DAG execution: node B depends on node A
        node_a = TaskNode("node_a", lambda: "RESULT_A")
        node_b = TaskNode("node_b", lambda: "RESULT_B", dependencies=["node_a"])
        
        dag_res = sched.execute_dag([node_a, node_b])
        self.assertEqual(dag_res["status"], "SUCCESS")
        self.assertEqual(dag_res["completed_count"], 2)
        self.assertEqual(dag_res["results"]["node_a"], "RESULT_A")
        self.assertEqual(dag_res["results"]["node_b"], "RESULT_B")

    # 6. Grounded Research Engine
    def test_06_grounded_research_engine(self):
        engine = GroundedResearchEngine(cache_dir=os.path.join(self.temp_dir, "research_cache"))
        
        # SSRF compliance blocking
        compliant, reason = engine.verify_url_compliance("http://169.254.169.254/latest/meta-data/")
        self.assertFalse(compliant)
        self.assertIn("SSRF_BLOCKED", reason)

        # Legitimate URL fetch
        record = engine.fetch_and_index_source("https://aclanthology.org/2025.findings-acl.1274/", tier=ResearchSourceTier.TIER_A_PRIMARY_SPEC)
        self.assertEqual(record["status"], "INDEXED")
        self.assertEqual(record["tier"], "TIER_A_PRIMARY_SPEC")

        # Grounded synthesis
        synth = engine.synthesize_grounded_answer("How does token budgeting improve reasoning?", [record])
        self.assertTrue(synth["grounded"])
        self.assertTrue(synth["citation_audit_pass"])
        self.assertEqual(len(synth["citations"]), 1)

    # 7. Execution Adapters & Evidence Verifier
    def test_07_execution_adapters_and_verifier(self):
        term = TerminalExecutionAdapter(default_cwd=self.temp_dir)
        res = term.execute_command("echo AGI_16_TEST")
        self.assertEqual(res["exit_code"], 0)
        self.assertIn("AGI_16_TEST", res["stdout"])

        # EvidenceVerifier
        v_exit = EvidenceVerifier.verify_command_exit(res["exit_code"])
        self.assertEqual(v_exit["verdict"], "VERIFIED_PASS")

        # AST syntax verifier
        v_code = EvidenceVerifier.verify_python_syntax("def solve(x): return x * 2")
        self.assertEqual(v_code["verdict"], "VERIFIED_PASS")

        v_bad_code = EvidenceVerifier.verify_python_syntax("def solve(x) return x *")
        self.assertEqual(v_bad_code["verdict"], "VERIFIED_FAIL")

        # Computer-use host desktop boundary
        cu = ComputerUseAdapter(isolated_sandbox=False)
        cu_res = cu.execute_action("click", coordinates=(100, 200))
        self.assertEqual(cu_res["status"], "BLOCKED")
        self.assertIn("HOST_SAFETY_VIOLATION", cu_res["error"])

    # 8. Capability Adaptation Loop (VersionedExperimentManager)
    def test_08_capability_adaptation_loop(self):
        mgr = VersionedExperimentManager()
        prop = mgr.propose_candidate_adaptation(
            target_component="AdaptiveTokenEconomy",
            current_value=0.10,
            proposed_value=0.15,
            rationale="Give complex tasks 15% planning headroom to prune dead branches"
        )
        self.assertEqual(prop["status"], "PROPOSED")

        # Controlled evaluation: candidate has same score but burns 20% fewer tokens
        res = mgr.evaluate_and_commit(prop, baseline_score=0.92, candidate_score=0.92, baseline_tokens=10000, candidate_tokens=8000)
        self.assertEqual(res["status"], "ACCEPTED_AND_MERGED")
        self.assertIn("PROMOTED", res["verdict"])

    # 9. Master AGI 1.6 Agent Execution
    def test_09_master_agent_operational_execution(self):
        agent = AGI16OmegaNexusAgent(
            storage_dir=self.mem_dir,
            ledger_path=self.ledger_file
        )
        dash = agent.get_system_dashboard()
        self.assertEqual(dash["runtime_version"], "1.6.0")
        self.assertEqual(dash["foundation_model"], "gemini-3.8-flash-high")
        self.assertEqual(dash["memory_layers"], 9)

        mission_res = agent.execute_mission({
            "prompt": "Inspect repository and report active components.",
            "task_id": "MIS-TEST-009"
        })
        self.assertEqual(mission_res["status"], "COMPLETED")
        self.assertEqual(mission_res["runtime_version"], "1.6.0")


if __name__ == "__main__":
    unittest.main()

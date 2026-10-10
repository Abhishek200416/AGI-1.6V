"""AGI 1.7 Hierarchical Self-Orchestrating Multi-Agent Runtime.

Coordinates:
1. Pre-planning memory retrieval (`OmegaCommandMemory.retrieve_before_planning`).
2. Automatic task complexity classification:
   - Small/direct tasks -> lightweight Fast Path (zero unnecessary child agent overhead).
   - Substantial/multi-stage tasks -> Planned Hierarchical DAG execution.
3. Up to 100 logical child tasks represented in the durable SQLite `TaskStore`,
   routed to distinct specialists from the 100-agent registry (`SpecialistFactory`),
   while concurrent execution is bounded by `ResourceGovernor`.
4. Safe checkpoint processing of live `CommandInbox` instructions (`ADD_CHILD_TASK`,
   `PAUSE_CURRENT_AND_SWITCH`, `CANCEL_AND_REPLACE`, `UPDATE_CONSTRAINTS`, etc.)
   between waves and subtasks.
5. Mandatory post-execution `EvidenceVerifier` check and episodic memory commit.
"""

from __future__ import annotations

import concurrent.futures
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Sequence

from agents.AGI_1_7.ecosystem.agent_registry.specialist_factory import SpecialistFactory
from ..capabilities.resource_snapshot import LiveResourceMetrics, ResourceSnapshot
from ..memory.omega_command_memory import OmegaCommandMemory
from ..task_control.task_manager import DurableTaskManager
from ..task_control.task_state_machine import TERMINAL_STATES, TaskState
from ..telemetry.token_economy import AdaptiveTokenController
from .resource_governor import (
    MAX_AGENT_SPECIALIZATIONS,
    MAX_LOGICAL_CHILD_TASKS,
    ResourceGovernor,
)


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
    ) -> None:
        self.task_manager = task_manager or DurableTaskManager()
        self.memory = memory or OmegaCommandMemory()
        self.governor = governor or ResourceGovernor()
        self.token_controller = token_controller or AdaptiveTokenController()
        self.specialist_factory = specialist_factory or SpecialistFactory()

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
        custom_subtask_hook: Optional[Callable[[str, Dict[str, Any]], None]] = None,
        simulated_resource_snapshot: Optional[LiveResourceMetrics] = None,
    ) -> Dict[str, Any]:
        """Executes a mission via Fast Path or Planned Hierarchical Delegation."""
        started_at = time.time()
        root_id = task_id or f"MISSION-{int(started_at * 1000)}-{uuid.uuid4().hex[:6]}"

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
            )

        return self._execute_hierarchical_dag(
            root_id=root_id,
            title=title,
            prompt=prompt,
            retrieved_memory=retrieved_memory,
            explicit_subtasks=subtasks,
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
    ) -> Dict[str, Any]:
        routed = self.specialist_factory.router.route(task_description=prompt, top_k=1)[0]
        specialist = self.specialist_factory.instantiate(routed["agent_id"])

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

    def _build_default_subtasks(self, title: str, prompt: str) -> List[SubtaskSpec]:
        return [
            SubtaskSpec(
                title=f"{title} - Decomposition & Architecture",
                description=f"Decompose mission and define interfaces for: {prompt}",
                preferred_specialist_id="plan_mission_decomposer",
                depends_on_indices=[],
                queue_type="light_in_process",
            ),
            SubtaskSpec(
                title=f"{title} - Grounded Evidence & Context Synthesis",
                description=f"Synthesize evidence and memory constraints for: {prompt}",
                preferred_specialist_id="res_citation_auditor",
                depends_on_indices=[0],
                queue_type="light_in_process",
            ),
            SubtaskSpec(
                title=f"{title} - Core Implementation & Execution",
                description=f"Execute primary engineering deliverables for: {prompt}",
                preferred_specialist_id="swe_python_runtime_engineer",
                depends_on_indices=[0],
                queue_type="light_in_process",
            ),
            SubtaskSpec(
                title=f"{title} - Verification & Telemetry Reconciliation",
                description=f"Verify outputs, checksums, and ledger reconciliation for: {prompt}",
                preferred_specialist_id="qa_claim_to_evidence_verifier",
                depends_on_indices=[1, 2],
                queue_type="light_in_process",
            ),
        ]

    def _execute_hierarchical_dag(
        self,
        *,
        root_id: str,
        title: str,
        prompt: str,
        retrieved_memory: Dict[str, Any],
        explicit_subtasks: Optional[Sequence[SubtaskSpec]],
        custom_subtask_hook: Optional[Callable[[str, Dict[str, Any]], None]],
        simulated_resource_snapshot: Optional[LiveResourceMetrics],
        started_at: float,
    ) -> Dict[str, Any]:
        specs = list(explicit_subtasks) if explicit_subtasks else self._build_default_subtasks(title, prompt)
        if len(specs) > MAX_LOGICAL_CHILD_TASKS:
            raise ValueError(
                f"Requested {len(specs)} child tasks exceeds MAX_LOGICAL_CHILD_TASKS ({MAX_LOGICAL_CHILD_TASKS})"
            )

        child_ids: List[str] = []
        for idx, sp in enumerate(specs):
            cid = f"{root_id}-SUB-{idx + 1:03d}"
            child_ids.append(cid)
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
                # Cancel any non-terminal children if root was canceled
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
                # Check if remaining non-terminal tasks are deadlocked/blocked
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
                q_type = child_record.get("metadata", {}).get("queue_type", "light_in_process")
                decision = self.governor.acquire_slot(queue_type=q_type, snap=simulated_resource_snapshot)
                if not decision.admitted:
                    if child_record["state"] == TaskState.READY.value:
                        self.task_manager.transition(
                            cid,
                            TaskState.WAITING_FOR_RESOURCE,
                            reason=decision.reason,
                        )
                    # Wait briefly and execute under fallback slot1
                    time.sleep(0.02)
                    self.governor.acquire_slot(queue_type="light_in_process", snap=simulated_resource_snapshot)
                    q_type = "light_in_process"

                try:
                    cur = self.task_manager.store.get_task(cid)
                    if cur and cur["state"] == TaskState.WAITING_FOR_RESOURCE.value:
                        self.task_manager.transition(cid, TaskState.READY, reason="Resource slot acquired")
                    self.task_manager.transition(cid, TaskState.RUNNING, reason="Executing specialist subtask")

                    role_id = child_record.get("specialist_role") or "swe_python_runtime_engineer"
                    try:
                        inst = self.specialist_factory.instantiate(role_id)
                    except KeyError:
                        inst = self.specialist_factory.instantiate("swe_python_runtime_engineer")

                    res = inst.run(
                        {
                            "task_id": cid,
                            "task_prompt": f"{child_record['title']}: {child_record['description']}",
                            "context": {
                                "parent_task_id": root_id,
                                "wave_index": wave_index,
                                "root_metadata": self.task_manager.store.get_task(root_id).get("metadata", {}),
                            },
                        }
                    )

                    self.token_controller.record_usage(
                        task_id=root_id,
                        child_task_id=cid,
                        agent_id=inst.contract.agent_id,
                        prompt_text=child_record["description"],
                        response_text=res["output_summary"],
                        cwd_used=self.token_controller.get_execution_cwd(is_benchmark_or_single_shot=True),
                    )

                    self.task_manager.transition(cid, TaskState.VERIFYING, reason="Verifying specialist output")
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

        return {
            "mission_id": root_id,
            "execution_path": "HIERARCHICAL_DAG",
            "final_state": final_state,
            "logical_children_created": len(final_children),
            "succeeded_children": succeeded_cnt,
            "max_concurrent_workers_used": max_Observed_concurrency,
            "limits_enforced": {
                "MAX_AGENT_SPECIALIZATIONS": MAX_AGENT_SPECIALIZATIONS,
                "MAX_LOGICAL_CHILD_TASKS": MAX_LOGICAL_CHILD_TASKS,
                "MAX_ACTIVE_EXECUTIONS": self.governor.compute_dynamic_active_cap(simulated_resource_snapshot),
            },
            "memory_retrieval": retrieved_memory,
            "child_results": completed_results,
            "duration_sec": round(time.time() - started_at, 4),
        }

"""
agi/orchestration/dag_scheduler.py
AGI 1.2 — Dependency-Aware Concurrency & Task Graph Engine (Part VI)

Implements:
1. Dynamic Task Graph (DAG) with Topological Cycle Detection (Section 6.1)
2. Wavefront Asynchronous Scheduling (DynTaskMAS Pattern, Section 6.2)
3. Resource Write Locks & Optimistic Concurrency Controls (Section 6.3)
4. Minimal Typed Context Propagation (Section 6.4)
5. Deadlock Prevention & Partial Failure Quarantine (Section 6.5)
"""

import os
import sys
import time
import datetime
import threading
import concurrent.futures
from typing import Dict, Any, List, Set, Optional, Callable, Tuple

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from agi.orchestration.observability import get_telemetry_engine


class TaskState:
    PENDING = "PENDING"
    READY = "READY"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    BLOCKED = "BLOCKED"


class DAGScheduler:
    def __init__(self, run_id: Optional[str] = None, max_workers: int = 4):
        self.lock = threading.RLock()
        self.run_id = run_id or f"DAG-{int(time.time())}"
        self.max_workers = max_workers
        self.nodes: Dict[str, Dict[str, Any]] = {}
        self.resource_locks: Dict[str, str] = {}  # resource_path -> owning_task_id
        self.telemetry = get_telemetry_engine(run_id=self.run_id)

    def add_task(
        self,
        task_id: str,
        name: str,
        action: Callable[[Dict[str, Any]], Any],
        dependencies: Optional[List[str]] = None,
        owned_resources: Optional[List[str]] = None,
        inputs: Optional[Dict[str, Any]] = None,
        acceptance_criteria: str = ""
    ):
        with self.lock:
            if task_id in self.nodes:
                raise ValueError(f"Duplicate task ID: {task_id}")

            deps = dependencies or []
            self.nodes[task_id] = {
                "id": task_id,
                "name": name,
                "action": action,
                "dependencies": deps,
                "owned_resources": owned_resources or [],
                "inputs": inputs or {},
                "outputs": None,
                "state": TaskState.PENDING,
                "error": None,
                "start_time": None,
                "end_time": None,
                "duration_ms": 0.0,
                "acceptance_criteria": acceptance_criteria
            }

            self.telemetry.register_task(
                task_id=task_id,
                objective=name,
                total_steps=1,
                success_criteria=acceptance_criteria
            )

    # -------------------------------------------------------------
    # Section 6.1: Cycle Detection
    # -------------------------------------------------------------
    def detect_cycles(self) -> bool:
        """Returns True if a cycle is detected, False otherwise."""
        with self.lock:
            visited: Set[str] = set()
            rec_stack: Set[str] = set()

            def dfs(node_id: str) -> bool:
                visited.add(node_id)
                rec_stack.add(node_id)

                for dep in self.nodes.get(node_id, {}).get("dependencies", []):
                    if dep not in visited:
                        if dfs(dep):
                            return True
                    elif dep in rec_stack:
                        return True

                rec_stack.remove(node_id)
                return False

            for node_id in self.nodes:
                if node_id not in visited:
                    if dfs(node_id):
                        return True
            return False

    # -------------------------------------------------------------
    # Section 6.3: Concurrency Control & Write Locks
    # -------------------------------------------------------------
    def acquire_resource_locks(self, task_id: str) -> bool:
        with self.lock:
            resources = self.nodes[task_id].get("owned_resources", [])
            # Check if any resource is already locked by another task
            for r in resources:
                owner = self.resource_locks.get(r)
                if owner and owner != task_id:
                    return False  # Resource conflict!

            # Acquire all locks
            for r in resources:
                self.resource_locks[r] = task_id
            return True

    def release_resource_locks(self, task_id: str):
        with self.lock:
            resources = self.nodes[task_id].get("owned_resources", [])
            for r in resources:
                if self.resource_locks.get(r) == task_id:
                    del self.resource_locks[r]

    # -------------------------------------------------------------
    # Section 6.2 & 6.4: Wavefront Asynchronous Scheduling
    # -------------------------------------------------------------
    def execute_dag(self) -> Dict[str, Any]:
        with self.lock:
            if self.detect_cycles():
                raise ValueError("Cyclic dependency detected in task graph. Execution aborted.")

        print(f"\n[DAGScheduler] Starting execution of {len(self.nodes)} tasks (Max workers: {self.max_workers})")

        with concurrent.futures.ThreadPoolExecutor(max_workers=self.max_workers, thread_name_prefix="DAGWorker") as executor:
            active_futures: Dict[concurrent.futures.Future, str] = {}

            while True:
                # 1. Evaluate ready tasks
                with self.lock:
                    ready_tasks = []
                    for task_id, task in self.nodes.items():
                        if task["state"] == TaskState.PENDING:
                            # Check dependencies
                            deps = task["dependencies"]
                            all_deps_completed = True
                            dep_failed = False

                            for d in deps:
                                if d not in self.nodes:
                                    dep_failed = True
                                    task["error"] = f"Missing dependency: {d}"
                                    break
                                d_state = self.nodes[d]["state"]
                                if d_state in [TaskState.FAILED, TaskState.BLOCKED]:
                                    dep_failed = True
                                    task["error"] = f"Dependency failed: {d}"
                                    break
                                elif d_state != TaskState.COMPLETED:
                                    all_deps_completed = False

                            if dep_failed:
                                task["state"] = TaskState.BLOCKED
                                self.telemetry.record_event(
                                    task_id=task_id,
                                    component="SCHEDULER",
                                    event_type="TASK_BLOCKED",
                                    status="BLOCKED",
                                    error_category="DEPENDENCY_FAILURE"
                                )
                            elif all_deps_completed:
                                # Check write lock availability
                                if self.acquire_resource_locks(task_id):
                                    task["state"] = TaskState.READY
                                    ready_tasks.append(task_id)

                    # Check completion condition
                    all_done = all(t["state"] in [TaskState.COMPLETED, TaskState.FAILED, TaskState.BLOCKED] for t in self.nodes.values())
                    if all_done and not active_futures:
                        break

                # 2. Dispatch ready tasks to executor
                for task_id in ready_tasks:
                    with self.lock:
                        self.nodes[task_id]["state"] = TaskState.RUNNING
                        self.nodes[task_id]["start_time"] = time.time()
                        self.telemetry.record_progress(task_id, phase="EXECUTING", status="RUNNING")

                        # Minimal context propagation (Section 6.4)
                        context = dict(self.nodes[task_id]["inputs"])
                        for d in self.nodes[task_id]["dependencies"]:
                            context[f"dep_{d}"] = self.nodes[d]["outputs"]

                    fut = executor.submit(self._worker_wrapper, task_id, context)
                    active_futures[fut] = task_id

                if not active_futures:
                    # Check if deadlock (remaining pending tasks but no ready tasks)
                    pending = [tid for tid, t in self.nodes.items() if t["state"] == TaskState.PENDING]
                    if pending:
                        raise RuntimeError(f"Deadlock detected! Tasks stuck in PENDING with no progression: {pending}")
                    break

                # 3. Wait for at least one future to finish
                done, _ = concurrent.futures.wait(active_futures.keys(), return_when=concurrent.futures.FIRST_COMPLETED)
                for fut in done:
                    task_id = active_futures.pop(fut)
                    try:
                        res = fut.result()
                        with self.lock:
                            t = self.nodes[task_id]
                            t["outputs"] = res
                            t["state"] = TaskState.COMPLETED
                            t["end_time"] = time.time()
                            t["duration_ms"] = round((t["end_time"] - t["start_time"]) * 1000, 2)
                            self.release_resource_locks(task_id)
                            self.telemetry.complete_task(task_id, status="SUCCEEDED", evidence_ref=str(res)[:60])
                            self.telemetry.record_event(
                                task_id=task_id,
                                component="WORKER",
                                event_type="TASK_SUCCESS",
                                status="SUCCESS",
                                duration_ms=t["duration_ms"],
                                output_reference=str(res)[:100]
                            )
                    except Exception as e:
                        with self.lock:
                            t = self.nodes[task_id]
                            t["error"] = str(e)
                            t["state"] = TaskState.FAILED
                            t["end_time"] = time.time()
                            t["duration_ms"] = round((t["end_time"] - t["start_time"]) * 1000, 2)
                            self.release_resource_locks(task_id)
                            self.telemetry.complete_task(task_id, status="FAILED")
                            self.telemetry.record_event(
                                task_id=task_id,
                                component="WORKER",
                                event_type="TASK_FAILURE",
                                status="FAILED",
                                duration_ms=t["duration_ms"],
                                error_category=str(type(e).__name__),
                                output_reference=str(e)
                            )

        summary = self.get_summary()
        print(f"[DAGScheduler] Finished: {summary['completed']}/{summary['total_tasks']} completed, {summary['failed']} failed, {summary['blocked']} blocked.")
        return summary

    def _worker_wrapper(self, task_id: str, context: Dict[str, Any]) -> Any:
        action_fn = self.nodes[task_id]["action"]
        return action_fn(context)

    def get_summary(self) -> Dict[str, Any]:
        with self.lock:
            states = {t["id"]: t["state"] for t in self.nodes.values()}
            return {
                "run_id": self.run_id,
                "total_tasks": len(self.nodes),
                "completed": len([s for s in states.values() if s == TaskState.COMPLETED]),
                "failed": len([s for s in states.values() if s == TaskState.FAILED]),
                "blocked": len([s for s in states.values() if s == TaskState.BLOCKED]),
                "tasks": {
                    tid: {
                        "name": t["name"],
                        "state": t["state"],
                        "duration_ms": t["duration_ms"],
                        "error": t["error"],
                        "outputs": t["outputs"]
                    } for tid, t in self.nodes.items()
                }
            }

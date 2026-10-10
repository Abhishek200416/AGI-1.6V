"""
agi/tests/test_dag_scheduler.py
Unit tests for Dependency-Aware Concurrency & DAG Scheduler.
"""
import unittest
import os
import sys
import time

sys.path.insert(0, os.path.abspath("."))
from agi.orchestration.dag_scheduler import DAGScheduler, TaskState

class TestDAGScheduler(unittest.TestCase):
    def test_wavefront_parallel_and_context_propagation(self):
        sched = DAGScheduler(run_id="TEST-DAG-WAVE", max_workers=3)

        # Independent tasks A and B
        sched.add_task("task_a", "Fetch Dataset A", lambda ctx: {"data_a": [1, 2, 3]})
        sched.add_task("task_b", "Fetch Dataset B", lambda ctx: {"data_b": [4, 5, 6]})

        # Dependent task C depends on both A and B
        def combine(ctx):
            a_out = ctx["dep_task_a"]["data_a"]
            b_out = ctx["dep_task_b"]["data_b"]
            return {"combined": a_out + b_out}

        sched.add_task("task_c", "Merge Datasets", combine, dependencies=["task_a", "task_b"])

        summary = sched.execute_dag()
        self.assertEqual(summary["completed"], 3)
        self.assertEqual(summary["failed"], 0)
        self.assertEqual(summary["blocked"], 0)
        self.assertEqual(summary["tasks"]["task_c"]["outputs"]["combined"], [1, 2, 3, 4, 5, 6])

    def test_cycle_detection(self):
        sched = DAGScheduler(run_id="TEST-DAG-CYCLE")
        sched.add_task("t1", "Step 1", lambda ctx: None, dependencies=["t2"])
        sched.add_task("t2", "Step 2", lambda ctx: None, dependencies=["t1"])

        self.assertTrue(sched.detect_cycles())
        with self.assertRaises(ValueError):
            sched.execute_dag()

    def test_partial_failure_quarantine(self):
        sched = DAGScheduler(run_id="TEST-DAG-FAIL", max_workers=2)

        def will_fail(ctx):
            raise RuntimeError("Database connection timeout")

        sched.add_task("failing_task", "Faulty Extraction", will_fail)
        # Dependent task should be blocked
        sched.add_task("dependent_task", "Downstream Consumer", lambda ctx: "OK", dependencies=["failing_task"])
        # Independent task should succeed
        sched.add_task("independent_task", "Health Check", lambda ctx: "Healthy")

        summary = sched.execute_dag()
        self.assertEqual(summary["failed"], 1)
        self.assertEqual(summary["blocked"], 1)
        self.assertEqual(summary["completed"], 1)
        self.assertEqual(summary["tasks"]["dependent_task"]["state"], TaskState.BLOCKED)
        self.assertEqual(summary["tasks"]["independent_task"]["state"], TaskState.COMPLETED)

    def test_resource_write_lock_coordination(self):
        sched = DAGScheduler(run_id="TEST-DAG-LOCK", max_workers=2)
        exec_order = []

        def write_res(ctx, name):
            exec_order.append(f"{name}_start")
            time.sleep(0.05)
            exec_order.append(f"{name}_end")
            return name

        # Both tasks contend for the same shared resource: config.json
        sched.add_task("writer_1", "Writer 1", lambda ctx: write_res(ctx, "w1"), owned_resources=["config.json"])
        sched.add_task("writer_2", "Writer 2", lambda ctx: write_res(ctx, "w2"), owned_resources=["config.json"])

        summary = sched.execute_dag()
        self.assertEqual(summary["completed"], 2)
        # Ensure that writer 1 and writer 2 do not interleave start/end
        if exec_order[0] == "w1_start":
            self.assertEqual(exec_order[1], "w1_end")
            self.assertEqual(exec_order[2], "w2_start")
            self.assertEqual(exec_order[3], "w2_end")
        else:
            self.assertEqual(exec_order[1], "w2_end")
            self.assertEqual(exec_order[2], "w1_start")
            self.assertEqual(exec_order[3], "w1_end")

if __name__ == "__main__":
    unittest.main()

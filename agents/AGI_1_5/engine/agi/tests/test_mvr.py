"""
agi/tests/test_mvr.py
Verification suite for Minimum Visibility Requirement (MVR).
"""
import unittest
import os
import sys
import time

sys.path.insert(0, os.path.abspath("."))
from agi.orchestration.observability import MVRTelemetryEngine

class TestMVRTelemetry(unittest.TestCase):
    def setUp(self):
        self.engine = MVRTelemetryEngine(run_id="TEST-RUN-MVR")

    def test_task_registration_and_progress(self):
        self.engine.register_task("t1", "Objective 1", total_steps=5, success_criteria="Done")
        snap = self.engine.get_mvr_snapshot()
        self.assertIn("t1", snap["tasks"])
        self.assertEqual(snap["tasks"]["t1"]["status"], "READY")

        # Record progress
        self.engine.record_progress("t1", "WAVE_1", step_increment=2, status="PROGRESSING", evidence_ref="file:///tmp/e1")
        snap = self.engine.get_mvr_snapshot()
        self.assertEqual(snap["tasks"]["t1"]["status"], "PROGRESSING")
        self.assertEqual(snap["tasks"]["t1"]["completed_steps"], 2)
        self.assertEqual(snap["tasks"]["t1"]["evidence_ref"], "file:///tmp/e1")

    def test_heartbeat_vs_progress_decoupling(self):
        self.engine.register_task("t2", "Objective 2", total_steps=2)
        # Advance heartbeat without progress
        self.engine.heartbeat("t2")
        t = self.engine.tasks["t2"]
        self.assertEqual(t["completed_steps"], 0)
        self.assertEqual(t["status"], "READY")

        # Test stagnation detection
        # artificially backdate last_progress
        t["last_progress"] = time.time() - 35.0
        stalled = self.engine.check_stagnation("t2", stall_threshold_seconds=30.0)
        self.assertTrue(stalled)
        self.assertEqual(t["status"], "STALLED")
        self.assertEqual(self.engine.runtime_state["health"], "DEGRADED")

    def test_emergency_stop_lifecycle(self):
        self.engine.register_task("t3", "Objective 3", total_steps=3)
        self.assertFalse(self.engine.is_emergency_stopped())
        self.engine.trigger_emergency_stop("Safety boundary breached")
        self.assertTrue(self.engine.is_emergency_stopped())
        snap = self.engine.get_mvr_snapshot()
        self.assertEqual(snap["runtime_state"]["lifecycle"], "STOPPED")
        self.assertEqual(snap["runtime_state"]["health"], "CRITICAL")
        self.assertEqual(snap["tasks"]["t3"]["status"], "CANCELLED")

    def test_secret_scrubbing(self):
        evt = self.engine.record_event(
            task_id="t4",
            component="TEST",
            event_type="CALL",
            status="SUCCESS",
            input_reference="api_key: sk-1234567890abcdef1234567890",
            output_reference="Authorization: Bearer mysecrettoken12345"
        )
        self.assertNotIn("sk-1234567890abcdef1234567890", evt["input_reference"])
        self.assertIn("[REDACTED_SECRET]", evt["input_reference"])
        self.assertNotIn("mysecrettoken12345", evt["output_reference"])
        self.assertIn("[REDACTED_SECRET]", evt["output_reference"])

if __name__ == "__main__":
    unittest.main()

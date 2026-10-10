"""
agi/tests/test_persistence.py
Unit tests for Persistence Engine & Checkpoint Management.
"""
import unittest
import os
import sys
import tempfile

sys.path.insert(0, os.path.abspath("."))
from agi.orchestration.persistence_engine import PersistenceEngine

class TestPersistenceEngine(unittest.TestCase):
    def setUp(self):
        self.tmp_dir = tempfile.mkdtemp()
        self.engine = PersistenceEngine(checkpoint_dir=self.tmp_dir, run_id="TEST-PERSIST")

    def test_lifecycle_transitions(self):
        self.assertEqual(self.engine.get_status(), "RUNNING")
        self.assertEqual(self.engine.pause(), "PAUSED")
        self.assertEqual(self.engine.get_status(), "PAUSED")
        self.assertEqual(self.engine.resume(), "RUNNING")
        self.assertEqual(self.engine.stop(), "STOPPED")

    def test_atomic_checkpoint_save_and_restore(self):
        state = {"step": 4, "artifacts": ["file_a.txt", "file_b.txt"], "memory_refs": ["mem-123"]}
        chk_file = self.engine.save_checkpoint("task_42", state)
        self.assertTrue(os.path.exists(chk_file))

        restored = self.engine.restore_checkpoint(chk_file)
        self.assertIsNotNone(restored)
        self.assertEqual(restored["task_id"], "task_42")
        self.assertEqual(restored["payload"]["step"], 4)
        self.assertEqual(restored["payload"]["artifacts"], ["file_a.txt", "file_b.txt"])

    def test_event_queue(self):
        self.engine.push_event("TIMER_EXPIRED", {"timer_id": 99})
        evt = self.engine.pop_event()
        self.assertIsNotNone(evt)
        self.assertEqual(evt["type"], "TIMER_EXPIRED")
        self.assertEqual(evt["payload"]["timer_id"], 99)
        self.assertIsNone(self.engine.pop_event())

    def test_deduplicated_alerts(self):
        # First alert emits
        first = self.engine.emit_alert("WARNING", "Disk space threshold approached")
        self.assertTrue(first)

        # Duplicate alert within window is suppressed
        second = self.engine.emit_alert("WARNING", "Disk space threshold approached")
        self.assertFalse(second)

        # Distinct alert emits
        distinct = self.engine.emit_alert("CRITICAL", "Database host unreachable")
        self.assertTrue(distinct)

if __name__ == "__main__":
    unittest.main()

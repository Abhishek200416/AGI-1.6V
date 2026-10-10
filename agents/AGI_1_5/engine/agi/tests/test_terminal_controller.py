"""
agi/tests/test_terminal_controller.py
Unit tests for Terminal Controller.
"""
import unittest
import os
import sys
import time

sys.path.insert(0, os.path.abspath("."))
from agi.terminal.terminal_controller import TerminalController

class TestTerminalController(unittest.TestCase):
    def setUp(self):
        self.tc = TerminalController(run_id="TEST-TERM")

    def test_sync_command_execution(self):
        res = self.tc.run_sync(f'"{sys.executable}" -c "print(\'terminal_ok\')"', timeout_seconds=5)
        self.assertTrue(res["success"])
        self.assertEqual(res["exit_code"], 0)
        self.assertIn("terminal_ok", res["stdout"])

    def test_sync_timeout(self):
        res = self.tc.run_sync(f'"{sys.executable}" -c "import time; time.sleep(2)"', timeout_seconds=0.2)
        self.assertFalse(res["success"])
        self.assertTrue(res["timed_out"])
        self.assertEqual(res["exit_code"], -1)

    def test_async_spawn_poll_and_terminate(self):
        # Spawn python sleep script
        cmd = f'"{sys.executable}" -c "import time; time.sleep(10)"'
        proc_id, is_new = self.tc.spawn_async(cmd, prevent_duplicates=True)
        self.assertTrue(is_new)

        # Polling should show RUNNING
        poll_info = self.tc.poll_process(proc_id)
        self.assertIsNotNone(poll_info)
        self.assertEqual(poll_info["status"], "RUNNING")

        # Duplicate spawn should return existing proc_id
        proc_id2, is_new2 = self.tc.spawn_async(cmd, prevent_duplicates=True)
        self.assertFalse(is_new2)
        self.assertEqual(proc_id, proc_id2)

        # Terminate
        terminated = self.tc.terminate_process(proc_id, force=True)
        self.assertTrue(terminated)
        time.sleep(0.1)
        poll_info2 = self.tc.poll_process(proc_id)
        self.assertEqual(poll_info2["status"], "TERMINATED")

    def test_bounded_output_truncation(self):
        large_text = "A" * 100000
        bounded = self.tc._bound_output(large_text)
        self.assertLess(len(bounded), 70000)
        self.assertIn("TRUNCATED", bounded)

if __name__ == "__main__":
    unittest.main()

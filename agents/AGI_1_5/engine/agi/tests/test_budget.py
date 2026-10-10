"""
agi/tests/test_budget.py
Unit tests for Central Budget Controller.
"""
import unittest
import os
import sys

sys.path.insert(0, os.path.abspath("."))
from agi.orchestration.budget_controller import BudgetController, EffortLevel

class TestBudgetController(unittest.TestCase):
    def setUp(self):
        self.bc = BudgetController(total_token_budget=10000, stagnation_call_limit=3)

    def test_effort_level_configuration(self):
        self.bc.set_effort_level(EffortLevel.LEVEL_1)
        params = self.bc.get_effort_parameters()
        self.assertEqual(params["max_calls"], 1)
        self.assertEqual(params["thinking"], "LOW")
        self.assertFalse(params["allow_parallelism"])

        self.bc.set_effort_level(EffortLevel.LEVEL_3)
        params3 = self.bc.get_effort_parameters()
        self.assertTrue(params3["allow_parallelism"])

    def test_deterministic_spend_blocking(self):
        self.bc.set_effort_level(EffortLevel.LEVEL_2)
        can_spend, reason = self.bc.can_spend_model_call("Format date", deterministic_tool_available=True)
        self.assertFalse(can_spend)
        self.assertIn("SPEND_BLOCKED", reason)

    def test_verified_spend_blocking(self):
        self.bc.set_effort_level(EffortLevel.LEVEL_2)
        can_spend, reason = self.bc.can_spend_model_call("Verify file", task_already_verified=True)
        self.assertFalse(can_spend)
        self.assertIn("SPEND_BLOCKED", reason)

    def test_stagnation_circuit_breaker(self):
        self.bc.set_effort_level(EffortLevel.LEVEL_3)
        self.bc.record_usage(100, 100, productive=False)
        self.bc.record_usage(100, 100, productive=False)
        self.assertFalse(self.bc.circuit_breaker_tripped)

        # 3rd unproductive call trips the breaker
        self.bc.record_usage(100, 100, productive=False)
        self.assertTrue(self.bc.circuit_breaker_tripped)

        can_spend, reason = self.bc.can_spend_model_call("Try again")
        self.assertFalse(can_spend)
        self.assertIn("CIRCUIT_BREAKER_TRIPPED", reason)

    def test_token_exhaustion(self):
        bc_small = BudgetController(total_token_budget=500)
        bc_small.record_usage(300, 300, productive=True)
        self.assertEqual(bc_small.get_tokens_remaining(), 0)
        can_spend, reason = bc_small.can_spend_model_call("Query")
        self.assertFalse(can_spend)
        self.assertEqual(reason, "TOKEN_BUDGET_EXHAUSTED")

if __name__ == "__main__":
    unittest.main()

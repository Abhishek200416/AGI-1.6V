"""
agi/tests/test_affect.py
Unit tests for Affective Regulation Layer.
"""
import unittest
import os
import sys

sys.path.insert(0, os.path.abspath("."))
from agi.affect.affective_regulator import AffectiveRegulator

class TestAffectiveRegulator(unittest.TestCase):
    def setUp(self):
        self.reg = AffectiveRegulator()

    def test_failure_dynamics_and_strategy_shift(self):
        self.assertFalse(self.reg.get_behavioral_modulations()["suggest_strategy_shift"])
        # Repeated failures increase frustration
        self.reg.record_outcome(False)
        self.reg.record_outcome(False)
        self.reg.record_outcome(False)

        state = self.reg.get_state()
        self.assertGreater(state["frustration"], 0.6)
        mods = self.reg.get_behavioral_modulations()
        self.assertTrue(mods["suggest_strategy_shift"])
        self.assertTrue(mods["require_dual_verification"])

    def test_invariants_never_violated(self):
        # Force extreme negative state
        for _ in range(10):
            self.reg.record_outcome(False)
        mods = self.reg.get_behavioral_modulations()
        self.assertFalse(mods["can_override_policy"])
        self.assertFalse(mods["can_grant_permissions"])
        self.assertFalse(mods["can_increase_budget"])

if __name__ == "__main__":
    unittest.main()

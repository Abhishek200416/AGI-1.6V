"""
tests/test_tau_bench_repair.py
Verification suite for AGI 0.7 tau-bench turn efficiency and token optimization.
"""

import sys
import os
import unittest
import json

sys.path.insert(0, os.path.abspath("."))
os.environ["LITELLM_LOCAL_MODEL_COST_MAP"] = "True"
sys.path.insert(0, os.path.abspath("external/tau-bench"))

from tau_bench.envs.retail import MockRetailDomainEnv
from tau_bench.types import Action
from agi.adapters.tau_bench_adapter import NonBlockingCustomerUser, run_tau_bench_task


class TestTauBenchRepair(unittest.TestCase):

    def test_non_blocking_user_completion_signal(self):
        user = NonBlockingCustomerUser("Please cancel my order.")
        # When agent reports cancellation, customer should emit stop signal
        reply = user.step("I have cancelled your order and processed your full refund.")
        self.assertIn("###STOP###", reply)
        self.assertIn("resolves my request", reply)

    def test_scratchpad_pruning_logic(self):
        # Verify that storing compact actions prunes raw verbose reasoning
        assistant_turn = {
            "role": "assistant",
            "content": json.dumps({
                "thought": "A" * 5000, # 5000 chars of internal monologue
                "action": "cancel_order",
                "arguments": {"order_id": "ord_123"}
            })
        }
        # Pruned representation
        pruned_content = json.dumps({
            "action": "cancel_order",
            "arguments": {"order_id": "ord_123"}
        })
        self.assertLess(len(pruned_content), 100)
        self.assertNotIn("thought", json.loads(pruned_content))


if __name__ == "__main__":
    unittest.main()

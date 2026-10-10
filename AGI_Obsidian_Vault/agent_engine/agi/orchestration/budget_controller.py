"""
agi/orchestration/budget_controller.py
AGI 1.2 — Central Budget & Executive Controller (Part X)

Implements:
1. Unified compute, token, latency, and cost budget accounting (Section 10.1)
2. Calibrated Effort Levels 0-4 (Section 10.2)
3. Dynamic Spending Policy & Circuit Breakers (Section 10.3 & 10.4)
4. Parallelism Economics & Worker Scaling (Section 10.5)
"""

import os
import sys
import time
import threading
from typing import Dict, Any, Optional, Tuple

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


class EffortLevel:
    LEVEL_0 = 0  # Deterministic / Cached (0 model calls)
    LEVEL_1 = 1  # Quick low-cost completion (1 call, 2k tokens)
    LEVEL_2 = 2  # Ordinary planning & verification (3 calls, 10k tokens)
    LEVEL_3 = 3  # Deep research & testing (10 calls, 50k tokens)
    LEVEL_4 = 4  # Critical work with dual verification & approvals (150k tokens)


EFFORT_CONFIG = {
    EffortLevel.LEVEL_0: {"max_calls": 0, "token_ceiling": 0, "thinking": "OFF", "allow_parallelism": False},
    EffortLevel.LEVEL_1: {"max_calls": 1, "token_ceiling": 2000, "thinking": "LOW", "allow_parallelism": False},
    EffortLevel.LEVEL_2: {"max_calls": 3, "token_ceiling": 10000, "thinking": "MEDIUM", "allow_parallelism": False},
    EffortLevel.LEVEL_3: {"max_calls": 10, "token_ceiling": 50000, "thinking": "HIGH", "allow_parallelism": True},
    EffortLevel.LEVEL_4: {"max_calls": 25, "token_ceiling": 150000, "thinking": "HIGH", "allow_parallelism": True}
}

TOKEN_COST_PER_UNIT = 0.0000005  # $0.50 per 1M tokens proxy estimate


class BudgetController:
    def __init__(
        self,
        total_token_budget: int = 500000,
        max_duration_seconds: float = 600.0,
        stagnation_call_limit: int = 3
    ):
        self.lock = threading.RLock()
        self.total_token_budget = total_token_budget
        self.tokens_used_input = 0
        self.tokens_used_output = 0
        self.model_calls = 0
        self.tool_calls = 0
        self.start_time = time.time()
        self.max_duration_seconds = max_duration_seconds
        self.stagnation_call_limit = stagnation_call_limit

        # Track consecutive unproductive calls (circuit breaker)
        self.consecutive_unproductive_calls = 0
        self.circuit_breaker_tripped = False
        self.circuit_breaker_reason = None

        # Per-effort allocations
        self.current_effort_level = EffortLevel.LEVEL_2

    # -------------------------------------------------------------
    # Section 10.2: Effort Level Routing
    # -------------------------------------------------------------
    def set_effort_level(self, level: int):
        with self.lock:
            if level not in EFFORT_CONFIG:
                raise ValueError(f"Invalid effort level: {level}")
            self.current_effort_level = level

    def get_effort_parameters(self) -> Dict[str, Any]:
        with self.lock:
            return dict(EFFORT_CONFIG[self.current_effort_level])

    # -------------------------------------------------------------
    # Section 10.3 & 10.4: Spending Policy & Circuit Breakers
    # -------------------------------------------------------------
    def can_spend_model_call(
        self,
        task_objective: str,
        deterministic_tool_available: bool = False,
        task_already_verified: bool = False,
        state_unchanged: bool = False
    ) -> Tuple[bool, str]:
        """Evaluates Section 10.3 spending rules."""
        with self.lock:
            # 1. Hard limits
            if self.circuit_breaker_tripped:
                return False, f"CIRCUIT_BREAKER_TRIPPED: {self.circuit_breaker_reason}"

            tokens_remaining = self.get_tokens_remaining()
            if tokens_remaining <= 0:
                return False, "TOKEN_BUDGET_EXHAUSTED"

            if (time.time() - self.start_time) > self.max_duration_seconds:
                return False, "MAX_DURATION_EXCEEDED"

            # 2. Effort ceiling
            cfg = EFFORT_CONFIG[self.current_effort_level]
            if self.model_calls >= cfg["max_calls"] and self.current_effort_level != EffortLevel.LEVEL_4:
                return False, f"EFFORT_LEVEL_{self.current_effort_level}_CALL_LIMIT_REACHED"

            # 3. Rules when NOT to spend
            if deterministic_tool_available:
                return False, "SPEND_BLOCKED: A deterministic tool or cache suffices (Ponytail Principle)."

            if task_already_verified:
                return False, "SPEND_BLOCKED: Task postconditions already verified."

            if state_unchanged and self.consecutive_unproductive_calls >= self.stagnation_call_limit:
                self.trip_circuit_breaker("Consecutive calls without state transition exceeded limit.")
                return False, "SPEND_BLOCKED: Stagnation circuit breaker tripped."

            return True, "AUTHORIZED"

    def record_usage(self, tokens_in: int, tokens_out: int, productive: bool = True):
        with self.lock:
            self.tokens_used_input += tokens_in
            self.tokens_used_output += tokens_out
            self.model_calls += 1

            if productive:
                self.consecutive_unproductive_calls = 0
            else:
                self.consecutive_unproductive_calls += 1
                if self.consecutive_unproductive_calls >= self.stagnation_call_limit:
                    self.trip_circuit_breaker(f"{self.consecutive_unproductive_calls} consecutive unproductive calls.")

    def record_tool_call(self):
        with self.lock:
            self.tool_calls += 1

    def trip_circuit_breaker(self, reason: str):
        with self.lock:
            self.circuit_breaker_tripped = True
            self.circuit_breaker_reason = reason

    def reset_circuit_breaker(self):
        with self.lock:
            self.circuit_breaker_tripped = False
            self.circuit_breaker_reason = None
            self.consecutive_unproductive_calls = 0

    def get_tokens_remaining(self) -> int:
        with self.lock:
            used = self.tokens_used_input + self.tokens_used_output
            return max(0, self.total_token_budget - used)

    def get_cost_estimate(self) -> float:
        with self.lock:
            used = self.tokens_used_input + self.tokens_used_output
            return round(used * TOKEN_COST_PER_UNIT, 6)

    # -------------------------------------------------------------
    # Section 10.5: Parallelism Economics
    # -------------------------------------------------------------
    def should_parallelize(self, num_subtasks: int, estimated_token_overhead: int = 1500) -> bool:
        """Determines if the value of concurrency exceeds coordination overhead."""
        with self.lock:
            if num_subtasks <= 1:
                return False

            cfg = EFFORT_CONFIG[self.current_effort_level]
            if not cfg["allow_parallelism"]:
                return False

            remaining = self.get_tokens_remaining()
            if remaining < (estimated_token_overhead * num_subtasks):
                return False

            return True

    def get_budget_summary(self) -> Dict[str, Any]:
        with self.lock:
            return {
                "effort_level": self.current_effort_level,
                "tokens_input": self.tokens_used_input,
                "tokens_output": self.tokens_used_output,
                "tokens_total": self.tokens_used_input + self.tokens_used_output,
                "tokens_remaining": self.get_tokens_remaining(),
                "model_calls": self.model_calls,
                "tool_calls": self.tool_calls,
                "cost_usd": self.get_cost_estimate(),
                "circuit_breaker": {
                    "tripped": self.circuit_breaker_tripped,
                    "reason": self.circuit_breaker_reason,
                    "unproductive_streak": self.consecutive_unproductive_calls
                },
                "elapsed_seconds": round(time.time() - self.start_time, 2)
            }

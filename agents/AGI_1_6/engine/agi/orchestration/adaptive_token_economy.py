"""
agi/orchestration/adaptive_token_economy.py
AGI 1.6 OMEGA NEXUS — Adaptive Token Economy Subsystem

Implements:
1. BudgetEstimator: Task complexity classification and pre-flight budget estimation.
2. AdaptiveTokenEconomy: Dynamic phase allocation (10% plan, 60% execute, 20% verify, 10% reserve).
3. TokenUsageLedger: Append-only persistent usage & cost ledger with real-time metrics.
4. EarlyStoppingController: Evidence-grounded early stopping logic.
5. ResultCache: Content-addressed deterministic cache preventing redundant LLM calls.
"""

import os
import json
import time
import hashlib
import threading
from enum import Enum
from typing import Dict, Any, List, Optional, Tuple


class TaskCategory(str, Enum):
    SIMPLE = "SIMPLE"                  # Calculations, quick lookups, format conversions
    STANDARD = "STANDARD"              # Single-file edits, straightforward command runs
    COMPLEX = "COMPLEX"                # Multi-step refactors, deep synthesis, troubleshooting
    HIGH_STAKES = "HIGH_STAKES"        # Multi-stage migrations, full benchmark campaigns


class BudgetPhase(str, Enum):
    PLANNING = "PLANNING"
    EXECUTION = "EXECUTION"
    VERIFICATION = "VERIFICATION"
    RECOVERY = "RECOVERY"


class BudgetEstimator:
    """Pre-flight estimator for token budgets, duration, and worker composition."""
    
    BASE_POLICIES = {
        TaskCategory.SIMPLE: {
            "token_budget": 2000,
            "max_model_calls": 2,
            "max_elapsed_sec": 15,
            "subagents_recommended": False,
            "requires_external_research": False,
            "requires_formal_verification": False,
            "default_phase_split": {
                BudgetPhase.PLANNING: 0.05,
                BudgetPhase.EXECUTION: 0.85,
                BudgetPhase.VERIFICATION: 0.05,
                BudgetPhase.RECOVERY: 0.05
            }
        },
        TaskCategory.STANDARD: {
            "token_budget": 8000,
            "max_model_calls": 5,
            "max_elapsed_sec": 60,
            "subagents_recommended": False,
            "requires_external_research": True,
            "requires_formal_verification": True,
            "default_phase_split": {
                BudgetPhase.PLANNING: 0.10,
                BudgetPhase.EXECUTION: 0.65,
                BudgetPhase.VERIFICATION: 0.15,
                BudgetPhase.RECOVERY: 0.10
            }
        },
        TaskCategory.COMPLEX: {
            "token_budget": 25000,
            "max_model_calls": 12,
            "max_elapsed_sec": 240,
            "subagents_recommended": True,
            "requires_external_research": True,
            "requires_formal_verification": True,
            "default_phase_split": {
                BudgetPhase.PLANNING: 0.15,
                BudgetPhase.EXECUTION: 0.55,
                BudgetPhase.VERIFICATION: 0.20,
                BudgetPhase.RECOVERY: 0.10
            }
        },
        TaskCategory.HIGH_STAKES: {
            "token_budget": 80000,
            "max_model_calls": 35,
            "max_elapsed_sec": 900,
            "subagents_recommended": True,
            "requires_external_research": True,
            "requires_formal_verification": True,
            "default_phase_split": {
                BudgetPhase.PLANNING: 0.10,
                BudgetPhase.EXECUTION: 0.60,
                BudgetPhase.VERIFICATION: 0.20,
                BudgetPhase.RECOVERY: 0.10
            }
        }
    }

    @staticmethod
    def classify_task(prompt: str, context: Optional[Dict[str, Any]] = None) -> TaskCategory:
        prompt_lower = prompt.lower()
        length = len(prompt)
        
        # High-stakes indicators
        if any(k in prompt_lower for k in ["benchmark", "osworld", "terminal-bench", "gpqa", "campaign", "migration"]):
            return TaskCategory.HIGH_STAKES
        
        # Complex indicators
        if length > 300 or any(k in prompt_lower for k in ["refactor", "investigate", "architecture", "multi-agent", "comprehensive", "deep research"]):
            return TaskCategory.COMPLEX
        
        # Simple indicators
        if length < 80 and not any(k in prompt_lower for k in ["code", "test", "write", "build", "search", "edit", "modify", "patch", "fix", "update", "run", "execute"]):
            return TaskCategory.SIMPLE
        
        return TaskCategory.STANDARD

    @classmethod
    def estimate_budget(cls, category: TaskCategory, custom_overrides: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        policy = dict(cls.BASE_POLICIES.get(category, cls.BASE_POLICIES[TaskCategory.STANDARD]))
        if custom_overrides:
            policy.update(custom_overrides)
        return policy


class TokenUsageLedger:
    """Append-only thread-safe persistent token and cost usage ledger."""

    # gemini-3.8-flash-high approximate rates per 1k tokens
    INPUT_COST_PER_1K = 0.000125
    OUTPUT_COST_PER_1K = 0.000375

    def __init__(self, ledger_file: Optional[str] = None):
        self.ledger_file = ledger_file
        self.lock = threading.Lock()
        self.records: List[Dict[str, Any]] = []
        self.total_input_tokens = 0
        self.total_output_tokens = 0
        self.total_cached_tokens = 0
        self.total_calls = 0
        self.successful_tasks = 0
        self.failed_tasks = 0
        self.total_cost_usd = 0.0

        if self.ledger_file and os.path.exists(self.ledger_file):
            self._load_existing()

    def _load_existing(self):
        try:
            with open(self.ledger_file, "r", encoding="utf-8") as f:
                for line in f:
                    if line.strip():
                        rec = json.loads(line)
                        self.records.append(rec)
                        self.total_input_tokens += rec.get("input_tokens", 0)
                        self.total_output_tokens += rec.get("output_tokens", 0)
                        self.total_cached_tokens += rec.get("cached_tokens", 0)
                        self.total_cost_usd += rec.get("cost_usd", 0.0)
                        self.total_calls += 1
        except Exception:
            pass

    def record_call(
        self,
        task_id: str,
        agent_id: str,
        input_tokens: int,
        output_tokens: int,
        cached_tokens: int = 0,
        latency_ms: float = 0.0,
        tool_calls: int = 0,
        model_identifier: str = "gemini-3.8-flash-high",
        status: str = "SUCCESS"
    ) -> Dict[str, Any]:
        with self.lock:
            cost = (
                (input_tokens / 1000.0) * self.INPUT_COST_PER_1K +
                (output_tokens / 1000.0) * self.OUTPUT_COST_PER_1K
            )
            entry = {
                "timestamp": time.time(),
                "task_id": task_id,
                "agent_id": agent_id,
                "model": model_identifier,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "cached_tokens": cached_tokens,
                "cost_usd": round(cost, 6),
                "latency_ms": round(latency_ms, 2),
                "tool_calls": tool_calls,
                "status": status
            }
            self.records.append(entry)
            self.total_input_tokens += input_tokens
            self.total_output_tokens += output_tokens
            self.total_cached_tokens += cached_tokens
            self.total_cost_usd += cost
            self.total_calls += 1

            if self.ledger_file:
                try:
                    os.makedirs(os.path.dirname(self.ledger_file), exist_ok=True)
                    with open(self.ledger_file, "a", encoding="utf-8") as f:
                        f.write(json.dumps(entry) + "\n")
                except Exception:
                    pass

            return entry

    def record_task_outcome(self, task_id: str, success: bool):
        with self.lock:
            if success:
                self.successful_tasks += 1
            else:
                self.failed_tasks += 1

    def get_metrics(self) -> Dict[str, Any]:
        with self.lock:
            total_tokens = self.total_input_tokens + self.total_output_tokens
            tokens_per_task = (
                total_tokens / self.successful_tasks
                if self.successful_tasks > 0 else total_tokens
            )
            cost_per_task = (
                self.total_cost_usd / self.successful_tasks
                if self.successful_tasks > 0 else self.total_cost_usd
            )
            return {
                "total_calls": self.total_calls,
                "total_input_tokens": self.total_input_tokens,
                "total_output_tokens": self.total_output_tokens,
                "total_cached_tokens": self.total_cached_tokens,
                "total_tokens": total_tokens,
                "total_cost_usd": round(self.total_cost_usd, 6),
                "successful_tasks": self.successful_tasks,
                "failed_tasks": self.failed_tasks,
                "tokens_per_successful_task": round(tokens_per_task, 2),
                "cost_per_successful_task_usd": round(cost_per_task, 6)
            }


class ResultCache:
    """Content-addressed deterministic cache preventing redundant model invocations."""
    
    def __init__(self, max_entries: int = 1000, default_ttl_sec: float = 3600.0):
        self.max_entries = max_entries
        self.default_ttl = default_ttl_sec
        self.lock = threading.Lock()
        self.cache: Dict[str, Dict[str, Any]] = {}

    @staticmethod
    def compute_key(prompt: str, context_hash: str = "") -> str:
        payload = f"{prompt.strip()}|{context_hash}"
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()

    def get(self, key: str) -> Optional[Any]:
        with self.lock:
            entry = self.cache.get(key)
            if not entry:
                return None
            if time.time() > entry["expires_at"]:
                del self.cache[key]
                return None
            entry["last_accessed"] = time.time()
            return entry["result"]

    def set(self, key: str, result: Any, ttl_sec: Optional[float] = None):
        with self.lock:
            if len(self.cache) >= self.max_entries:
                # Evict oldest
                oldest_key = min(self.cache, key=lambda k: self.cache[k]["last_accessed"])
                del self.cache[oldest_key]
            
            ttl = ttl_sec if ttl_sec is not None else self.default_ttl
            self.cache[key] = {
                "result": result,
                "created_at": time.time(),
                "last_accessed": time.time(),
                "expires_at": time.time() + ttl
            }


class EarlyStoppingController:
    """Evidence-grounded early stopping logic preventing run-away token burn."""

    @staticmethod
    def should_stop(
        step_index: int,
        max_steps: int,
        verified_evidence: bool,
        remaining_budget_tokens: int,
        consecutive_tool_failures: int = 0
    ) -> Tuple[bool, str]:
        if verified_evidence:
            return True, "STOP_VERIFIED_SUCCESS: Outcome verified with conclusive evidence."
        if remaining_budget_tokens <= 0:
            return True, "STOP_BUDGET_EXHAUSTED: Remaining token budget has reached zero."
        if step_index >= max_steps:
            return True, "STOP_STEP_LIMIT: Maximum configured step limit reached."
        if consecutive_tool_failures >= 3:
            return True, "STOP_CONSECUTIVE_FAILURES: Execution halted after 3 repeated unrecoverable failures."
        return False, "CONTINUE"


class AdaptiveTokenEconomy:
    """
    Central Token Economy Controller coordinating budgeting, phase allocation,
    ledger accounting, caching, and early stopping.
    """

    def __init__(
        self,
        ledger_path: Optional[str] = None,
        default_budget: int = 25000,
        strict_mode: bool = True
    ):
        self.default_budget = default_budget
        self.strict_mode = strict_mode
        self.ledger = TokenUsageLedger(ledger_path)
        self.cache = ResultCache()
        self.active_budgets: Dict[str, Dict[str, Any]] = {}
        self.lock = threading.Lock()

    def initialize_task_budget(
        self,
        task_id: str,
        prompt: str,
        category_override: Optional[TaskCategory] = None,
        budget_override: Optional[int] = None
    ) -> Dict[str, Any]:
        with self.lock:
            category = category_override or BudgetEstimator.classify_task(prompt)
            policy = BudgetEstimator.estimate_budget(category)
            total_tokens = budget_override or policy["token_budget"]
            
            splits = policy["default_phase_split"]
            phase_budgets = {
                phase.value: int(total_tokens * weight)
                for phase, weight in splits.items()
            }

            state = {
                "task_id": task_id,
                "category": category.value,
                "total_budget_tokens": total_tokens,
                "consumed_tokens": 0,
                "remaining_tokens": total_tokens,
                "phase_budgets": phase_budgets,
                "phase_consumed": {p.value: 0 for p in BudgetPhase},
                "current_phase": BudgetPhase.PLANNING.value,
                "model_calls": 0,
                "max_model_calls": policy["max_model_calls"],
                "start_time": time.time(),
                "max_elapsed_sec": policy["max_elapsed_sec"],
                "hard_limit_exceeded": False
            }
            self.active_budgets[task_id] = state
            return state

    def get_remaining_budget(self, task_id: str) -> int:
        with self.lock:
            state = self.active_budgets.get(task_id)
            if not state:
                return self.default_budget
            return state["remaining_tokens"]

    def can_execute_call(self, task_id: str, estimated_call_tokens: int = 1000) -> Tuple[bool, str]:
        with self.lock:
            state = self.active_budgets.get(task_id)
            if not state:
                return True, "UNTRACKED_TASK"
            
            if state["remaining_tokens"] < estimated_call_tokens:
                if self.strict_mode:
                    state["hard_limit_exceeded"] = True
                    return False, f"INSUFFICIENT_BUDGET: Remaining {state['remaining_tokens']} < Estimated {estimated_call_tokens}"
            
            if state["model_calls"] >= state["max_model_calls"]:
                if self.strict_mode:
                    return False, f"CALL_LIMIT_EXCEEDED: Reached max {state['max_model_calls']} calls"
                    
            return True, "APPROVED"

    def record_usage(
        self,
        task_id: str,
        agent_id: str,
        input_tokens: int,
        output_tokens: int,
        cached_tokens: int = 0,
        latency_ms: float = 0.0,
        phase: Optional[str] = None
    ) -> Dict[str, Any]:
        with self.lock:
            call_tokens = input_tokens + output_tokens
            state = self.active_budgets.get(task_id)
            
            if state:
                state["consumed_tokens"] += call_tokens
                state["remaining_tokens"] = max(0, state["total_budget_tokens"] - state["consumed_tokens"])
                state["model_calls"] += 1
                curr_phase = phase or state["current_phase"]
                if curr_phase in state["phase_consumed"]:
                    state["phase_consumed"][curr_phase] += call_tokens

            # Ledger recording
            return self.ledger.record_call(
                task_id=task_id,
                agent_id=agent_id,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                cached_tokens=cached_tokens,
                latency_ms=latency_ms
            )

    def transition_phase(self, task_id: str, next_phase: BudgetPhase):
        with self.lock:
            state = self.active_budgets.get(task_id)
            if state:
                state["current_phase"] = next_phase.value

    def get_task_budget_report(self, task_id: str) -> Optional[Dict[str, Any]]:
        with self.lock:
            state = self.active_budgets.get(task_id)
            if not state:
                return None
            return dict(state)

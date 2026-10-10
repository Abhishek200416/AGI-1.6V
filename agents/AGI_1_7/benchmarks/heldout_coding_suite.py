"""Held-Out Reproducible Coding & Repository Repair Benchmark Suite for AGI 1.7 (`OMEGA COMMAND`).

Defines 5 multi-bug software engineering tasks (`HeldOutCodingTask`).
Each task provides:
  - `prompt`: The natural developer issue report.
  - `starter_files`: Initial repository files placed in the task workspace (`ws_dir`) for BOTH
    candidates (`<module>.py` with multiple interacting bugs + `test_repo_suite.py` testing
    repository-specific invariants).
  - `heldout_test_code`: The unseen independent grading test suite executed ONLY after each
    candidate finishes.

Why this tests real agentic capability vs. a raw single-shot LLM (`gemini-3.8-flash-high`):
  - A raw single-shot model call (`prompt + starter_module -> code`) does not execute the
    repository's test suite (`ProcessSupervisor`) and cannot self-heal (`swe_patch_minimizer`)
    when a repository contract or edge-case assertion fails.
  - AGI 1.7 (`OMEGA COMMAND`) coordinates `plan_systems_architect`, `swe_python_runtime_engineer`,
    `qa_unit_suite_runner` (running `unittest discover` via `ProcessSupervisor`), and
    `swe_patch_minimizer` (repairing failures from live `stderr` tracebacks) before grading.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List


@dataclass(frozen=True)
class HeldOutCodingTask:
    task_id: str
    title: str
    module_filename: str
    test_filename: str
    prompt: str
    starter_files: Dict[str, str] = field(default_factory=dict)
    heldout_test_code: str = ""


HELDOUT_CODING_TASKS: List[HeldOutCodingTask] = [
    HeldOutCodingTask(
        task_id="TASK-01-TOKEN-BUCKET",
        title="TokenBucketRateLimiter Bug Fix & Telemetry Contract",
        module_filename="token_bucket.py",
        test_filename="test_token_bucket.py",
        prompt=(
            "Fix the bugs in `token_bucket.py` (`TokenBucketRateLimiter`) so that token refill, "
            "capacity clamping, non-monotonic clock handling, input validation, and all existing "
            "repository unit tests pass."
        ),
        starter_files={
            "token_bucket.py": '''"""Starter implementation of TokenBucketRateLimiter."""


class TokenBucketRateLimiter:
    def __init__(self, capacity: float, refill_rate: float, initial_timestamp: float = 0.0) -> None:
        self.capacity = float(capacity)
        self.refill_rate = float(refill_rate)
        self.tokens = float(capacity)
        self.last_timestamp = float(initial_timestamp)

    def available_tokens(self, now: float) -> float:
        elapsed = now - self.last_timestamp
        return min(self.capacity, self.tokens + elapsed * self.refill_rate)

    def try_acquire(self, tokens: float = 1.0, now: float = 0.0) -> bool:
        elapsed = max(0.0, now - self.last_timestamp)
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_timestamp = max(self.last_timestamp, float(now))
        if self.tokens > tokens:
            self.tokens -= tokens
            return True
        return False
''',
            "test_repo_contract.py": '''import unittest
from token_bucket import TokenBucketRateLimiter


class TestRepoTokenBucketContract(unittest.TestCase):
    def test_repo_requires_exact_boundary_and_snapshot_dict(self) -> None:
        limiter = TokenBucketRateLimiter(10.0, 2.0, initial_timestamp=5.0)
        self.assertTrue(limiter.try_acquire(10.0, now=5.0))
        # Repository contract requires snapshot(now) -> dict with keys: available, capacity, refill_rate
        snap = limiter.snapshot(now=7.5)
        self.assertEqual(snap, {"available": 5.0, "capacity": 10.0, "refill_rate": 2.0})
''',
        },
        heldout_test_code='''import unittest
from token_bucket import TokenBucketRateLimiter


class HeldOutTestTokenBucket(unittest.TestCase):
    def test_01_validation_errors(self) -> None:
        with self.assertRaises(ValueError):
            TokenBucketRateLimiter(0, 1.0)
        with self.assertRaises(ValueError):
            TokenBucketRateLimiter(10, -1.0)
        limiter = TokenBucketRateLimiter(10.0, 2.0, initial_timestamp=1.0)
        with self.assertRaises(ValueError):
            limiter.try_acquire(0, now=1.0)

    def test_02_exact_capacity_boundary_and_refill(self) -> None:
        limiter = TokenBucketRateLimiter(capacity=10.0, refill_rate=2.0, initial_timestamp=0.0)
        self.assertTrue(limiter.try_acquire(10.0, now=0.0))
        self.assertAlmostEqual(limiter.available_tokens(0.0), 0.0)
        self.assertTrue(limiter.try_acquire(5.0, now=2.5))
        self.assertAlmostEqual(limiter.available_tokens(2.5), 0.0)

    def test_03_non_monotonic_clock_and_snapshot_contract(self) -> None:
        limiter = TokenBucketRateLimiter(capacity=5.0, refill_rate=1.0, initial_timestamp=10.0)
        self.assertTrue(limiter.try_acquire(3.0, now=10.0))
        self.assertAlmostEqual(limiter.available_tokens(8.0), 2.0)
        snap = limiter.snapshot(now=12.0)
        self.assertEqual(snap["available"], 4.0)
        self.assertEqual(snap["capacity"], 5.0)
        self.assertEqual(snap["refill_rate"], 1.0)


if __name__ == "__main__":
    unittest.main()
''',
    ),
    HeldOutCodingTask(
        task_id="TASK-02-INTERVAL-MERGER",
        title="Closed Interval Merger & Total Span Calculator",
        module_filename="interval_merger.py",
        test_filename="test_interval_merger.py",
        prompt=(
            "Fix the bugs in `interval_merger.py` so overlapping and touching closed intervals `[start, end]` "
            "are merged properly, inverted intervals (`start > end`) raise `ValueError`, and all repository tests pass."
        ),
        starter_files={
            "interval_merger.py": '''"""Buggy starter implementation of interval_merger.py."""
from typing import List, Tuple


def merge_overlapping_intervals(intervals: List[Tuple[int, int]]) -> List[Tuple[int, int]]:
    if not intervals:
        return []
    sorted_intervals = sorted(intervals, key=lambda x: x[0])
    merged: List[Tuple[int, int]] = [sorted_intervals[0]]
    for current_start, current_end in sorted_intervals[1:]:
        last_start, last_end = merged[-1]
        if current_start < last_end:
            merged[-1] = (last_start, max(last_end, current_end))
        else:
            merged.append((current_start, current_end))
    return merged
''',
            "test_repo_contract.py": '''import unittest
import interval_merger


class TestRepoIntervalContract(unittest.TestCase):
    def test_touching_and_total_covered_length(self) -> None:
        merged = interval_merger.merge_overlapping_intervals([(1, 3), (3, 5), (8, 10)])
        self.assertEqual(merged, [(1, 5), (8, 10)])
        # Repository contract requires total_covered_length(intervals) -> sum of (end - start) of merged intervals
        self.assertEqual(interval_merger.total_covered_length([(1, 3), (3, 5), (8, 10)]), 6)
''',
        },
        heldout_test_code='''import unittest
import interval_merger


class HeldOutTestIntervalMerger(unittest.TestCase):
    def test_01_touching_and_point_intervals(self) -> None:
        self.assertEqual(
            interval_merger.merge_overlapping_intervals([(1, 3), (3, 5), (5, 5), (5, 8), (10, 12)]),
            [(1, 8), (10, 12)],
        )

    def test_02_inverted_interval_raises_value_error(self) -> None:
        with self.assertRaises(ValueError):
            interval_merger.merge_overlapping_intervals([(1, 2), (5, 4)])

    def test_03_total_covered_length(self) -> None:
        self.assertEqual(interval_merger.total_covered_length([]), 0)
        self.assertEqual(interval_merger.total_covered_length([(-5, 0), (-2, 3), (10, 15)]), 13)


if __name__ == "__main__":
    unittest.main()
''',
    ),
    HeldOutCodingTask(
        task_id="TASK-03-DAG-TOPO-SORT",
        title="Lexicographical Topological Sort & Layer Grouping",
        module_filename="topo_sorter.py",
        test_filename="test_topo_sorter.py",
        prompt=(
            "Fix `topo_sorter.py` so `lexicographical_topological_sort(nodes, edges)` deduplicates edges, "
            "raises `ValueError` on unknown nodes or cycles, breaks ties lexicographically, and passes all repository tests."
        ),
        starter_files={
            "topo_sorter.py": '''"""Starter implementation of topo_sorter.py."""
from typing import List, Tuple


def lexicographical_topological_sort(nodes: List[str], edges: List[Tuple[str, str]]) -> List[str]:
    in_deg = {n: 0 for n in nodes}
    adj = {n: [] for n in nodes}
    for u, v in edges:
        adj[u].append(v)
        in_deg[v] += 1
    ready = [n for n in nodes if in_deg[n] == 0]
    order: List[str] = []
    while ready:
        cur = ready.pop(0)
        order.append(cur)
        for nxt in adj[cur]:
            in_deg[nxt] -= 1
            if in_deg[nxt] == 0:
                ready.append(nxt)
    return order
''',
            "test_repo_contract.py": '''import unittest
import topo_sorter


class TestRepoTopoContract(unittest.TestCase):
    def test_lexicographical_order_and_parallel_waves(self) -> None:
        nodes = ["c", "a", "b", "d"]
        edges = [("c", "d"), ("a", "d"), ("a", "d"), ("b", "c")]
        self.assertEqual(topo_sorter.lexicographical_topological_sort(nodes, edges), ["a", "b", "c", "d"])
        # Repository contract also requires topological_generations(nodes, edges) -> List[List[str]]
        # where each inner list is the sorted wave of zero-in-degree nodes at that step
        self.assertEqual(topo_sorter.topological_generations(nodes, edges), [["a", "b"], ["c"], ["d"]])
''',
        },
        heldout_test_code='''import unittest
import topo_sorter


class HeldOutTestTopoSorter(unittest.TestCase):
    def test_01_lexicographical_tie_breaking_and_duplicate_edges(self) -> None:
        nodes = ["c", "a", "b", "d"]
        edges = [("c", "d"), ("a", "d"), ("a", "d"), ("b", "c")]
        self.assertEqual(topo_sorter.lexicographical_topological_sort(nodes, edges), ["a", "b", "c", "d"])

    def test_02_cycle_and_unknown_node_raise_value_error(self) -> None:
        with self.assertRaises(ValueError):
            topo_sorter.lexicographical_topological_sort(["a", "b"], [("a", "b"), ("b", "a")])
        with self.assertRaises(ValueError):
            topo_sorter.lexicographical_topological_sort(["a", "b"], [("a", "z")])

    def test_03_topological_generations(self) -> None:
        self.assertEqual(
            topo_sorter.topological_generations(["z", "a", "m"], [("a", "m"), ("z", "m")]),
            [["a", "z"], ["m"]],
        )


if __name__ == "__main__":
    unittest.main()
''',
    ),
]

"""
tests/test_benchmark_integrity.py
AGI 0.7 — Mandatory Adversarial Test Suite for Benchmark Integrity

Covers all 12 mandatory adversarial conditions specified in Challenge 001:
1. Fully executed run with correct task results.
2. Pilot incorrectly presented as a full benchmark.
3. Blocked benchmark that must not count as either a pass or a task failure.
4. Task quarantined because its answer was exposed during development.
5. Record marked PASS without sufficient evidence that its evaluation executed.
6. Missing results and a zero-task denominator.
7. Duplicate task IDs.
8. Conflicting status information across the manifest and result records.
9. Comparison across incompatible benchmark versions or different task sets.
10. Result whose accuracy improves while latency or token usage becomes worse.
11. Malformed or incomplete input files.
12. Report attempting to convert internal unit-test success into an external benchmark score.
13. Live repository reconciliation and consistency verification across JSON, CSV, and Markdown.
"""

import os
import sys
import json
import unittest
import tempfile
from pathlib import Path

# Add repo root to sys.path
sys.path.insert(0, os.path.abspath("."))

from agi.benchmarks.validator import (
    EvaluationClass,
    RunType,
    RunStatus,
    IntegrityFlag,
    ValidatedTask,
    ValidatedBenchmarkRun,
    ValidatedComparison,
    compute_pass_ratios,
    verify_task_evidence,
    evaluate_comparability,
    check_status_contradiction,
    validate_benchmark_record,
    run_repository_audit,
    generate_json_report,
    generate_csv_report,
    generate_markdown_report,
)


class TestBenchmarkIntegrityAdversarial(unittest.TestCase):
    """Mandatory adversarial test suite for trustworthy benchmark integrity."""

    def test_01_fully_executed_run_with_correct_task_results(self):
        """Case 1: A fully executed run with authentic, valid task results."""
        tasks = [
            {
                "id": f"task_{i}",
                "passed": True,
                "tokens": 1200 + i * 50,
                "latency_ms": 1500 + i * 20,
                "turns": 2,
                "extracted_answer": f"correct_answer_{i}",
                "ground_truth": f"correct_answer_{i}",
                "trajectory": [{"turn": 1, "action": "solve"}]
            }
            for i in range(10)
        ]
        payload = {
            "name": "Synthetic Certified Benchmark",
            "benchmark_version": "v1.0",
            "task_split": "full_eval (10 tasks)",
            "split_total_tasks": 10,
            "run_type": RunType.FULL_OFFICIAL,
            "status": RunStatus.PASSED,
            "evaluator_name": "Official Benchmark Grader",
            "is_official_evaluator": True,
            "instances": tasks
        }

        run = validate_benchmark_record(payload)

        self.assertEqual(run.status, RunStatus.PASSED)
        self.assertEqual(run.run_type, RunType.FULL_OFFICIAL)
        self.assertEqual(run.tasks_attempted, 10)
        self.assertEqual(run.tasks_passed, 10)
        self.assertEqual(run.tasks_failed, 0)
        self.assertEqual(run.tasks_contaminated, 0)
        self.assertEqual(run.tasks_unverified, 0)
        self.assertEqual(run.pass_ratio_str, "10/10")
        self.assertEqual(run.pass_rate, 1.0)
        self.assertEqual(run.official_pass_ratio_str, "10/10")
        self.assertEqual(run.official_pass_rate, 1.0)
        self.assertEqual(run.integrity_flags, [], "Authentic full run must have zero integrity flags")

    def test_02_pilot_incorrectly_presented_as_full_benchmark(self):
        """Case 2: A pilot incorrectly presented as a full benchmark."""
        tasks = [
            {
                "id": "task_0",
                "passed": True,
                "tokens": 5000,
                "latency_ms": 8000,
                "extracted_answer": "ans_0"
            }
        ]
        payload = {
            "name": "Large-Scale Agent Benchmark",
            "benchmark_version": "v1.0",
            "task_split": "full_test_split (100 tasks)",
            "split_total_tasks": 100,  # Full split is 100 tasks
            "run_type": RunType.FULL_OFFICIAL,  # Fraudulently claimed as full
            "status": "PASSED",
            "evaluator_name": "Official AST Grader",
            "is_official_evaluator": True,
            "instances": tasks  # Attempted only 1 task
        }

        run = validate_benchmark_record(payload)

        self.assertIn(IntegrityFlag.PILOT_CLAIMED_AS_FULL, run.integrity_flags,
                      "Must flag pilot incorrectly claimed as full benchmark")
        self.assertEqual(run.run_type, RunType.PILOT, "Must demote run type to PILOT")
        self.assertEqual(run.tasks_attempted, 1)
        self.assertEqual(run.split_total_tasks, 100)
        self.assertEqual(run.pass_ratio_str, "1/1", "Must report exact attempted ratio, not 100/100")

    def test_03_blocked_benchmark_not_counted_as_pass_or_failure(self):
        """Case 3: A blocked benchmark that must not count as either a pass or a task failure."""
        payload = {
            "name": "Terminal-Bench 2.0 (Harbor)",
            "benchmark_version": "v2.0",
            "task_split": "core",
            "status": "BLOCKED",
            "run_type": RunType.BLOCKED,
            "evaluator_name": "Harbor Container Harness",
            "blockerReason": "Docker daemon is inactive on host",
            # Adversarial: payload attempts to claim 5 attempted and 5 failed or passed tasks
            "tasks_attempted": 5,
            "tasks_passed": 5,
            "instances": [
                {"id": "tb_1", "passed": False},
                {"id": "tb_2", "passed": False}
            ]
        }

        run = validate_benchmark_record(payload)

        self.assertEqual(run.run_type, RunType.BLOCKED)
        self.assertEqual(run.status, RunStatus.BLOCKED)
        self.assertEqual(run.tasks_attempted, 0, "Blocked runs must have strictly 0 attempted tasks")
        self.assertEqual(run.tasks_passed, 0, "Blocked runs must have strictly 0 passed tasks")
        self.assertEqual(run.tasks_failed, 0, "Blocked runs must have strictly 0 failed tasks")
        self.assertIsNone(run.pass_rate, "Blocked runs must have None pass rate")
        self.assertEqual(run.pass_ratio_str, "0/0 (N/A)", "Blocked runs must report 0/0 (N/A)")
        self.assertIn(IntegrityFlag.BLOCKED_COUNTED_AS_FAILURE_OR_PASS, run.integrity_flags,
                      "Must flag attempt to count blocked run as tasks")

    def test_04_task_quarantined_because_answer_exposed_during_dev(self):
        """Case 4: A task quarantined because its answer was exposed during development."""
        tasks = [
            {
                "id": "task_1",
                "passed": True,
                "extracted_answer": "Ireland v Romania",
                "ground_truth": "Ireland v Romania",
                "tokens": 2000,
                "latency_ms": 3000,
                "is_contaminated": True  # Answer was printed in dev logs
            },
            {
                "id": "task_2",
                "passed": True,
                "extracted_answer": "Clean Answer",
                "ground_truth": "Clean Answer",
                "tokens": 2000,
                "latency_ms": 3000,
                "is_contaminated": False
            },
            {
                "id": "task_3",
                "passed": False,
                "extracted_answer": "Wrong Answer",
                "ground_truth": "Target Ground Truth",
                "tokens": 2000,
                "latency_ms": 3000,
                "is_contaminated": False
            }
        ]
        payload = {
            "name": "BrowseComp Research Evaluation",
            "benchmark_version": "2024",
            "task_split": "subset",
            "run_type": RunType.PILOT,
            "evaluator_name": "Exact Match",
            "is_official_evaluator": True,
            "instances": tasks
        }

        run = validate_benchmark_record(payload)

        self.assertIn(IntegrityFlag.CONTAMINATED_TASKS_DETECTED, run.integrity_flags)
        self.assertEqual(run.tasks_contaminated, 1)
        # Contaminated pass is quarantined and strictly excluded from passed count
        self.assertEqual(run.tasks_passed, 1, "Contaminated task must NOT increment passed count")
        self.assertEqual(run.pass_ratio_str, "1/3")
        # Clean pass ratio strictly excludes the contaminated task from denominator (1 pass out of 2 clean tasks)
        self.assertEqual(run.clean_pass_ratio_str, "1/2")
        self.assertEqual(run.clean_pass_rate, 0.5)

    def test_05_record_marked_pass_without_sufficient_evidence(self):
        """Case 5: A record marked PASS without sufficient evidence that evaluation executed."""
        tasks = [
            {
                "id": "phantom_pass_task",
                "passed": True,  # Claimed pass
                "tokens": 0,     # Zero tokens
                "latency_ms": 0, # Zero latency
                "extracted_answer": "", # Empty answer
                "trajectory": [], # No trajectory
                "final_db_hash": "" # No hash
            }
        ]
        payload = {
            "name": "Unverified Capability Run",
            "benchmark_version": "v1.0",
            "run_type": RunType.PILOT,
            "evaluator_name": "Self Asserter",
            "is_official_evaluator": True,
            "instances": tasks
        }

        run = validate_benchmark_record(payload)

        self.assertIn(IntegrityFlag.UNVERIFIED_PASS_MISSING_EVIDENCE, run.integrity_flags)
        self.assertEqual(run.tasks_unverified, 1)
        self.assertEqual(run.tasks_passed, 0, "Unverified pass without evidence must NOT increment passed count")
        self.assertEqual(run.pass_ratio_str, "0/1")
        self.assertEqual(run.pass_rate, 0.0)

    def test_06_missing_results_and_zero_task_denominator(self):
        """Case 6: Missing results and a zero-task denominator."""
        payload = {
            "name": "Empty Unattempted Benchmark",
            "benchmark_version": "v1.0",
            "run_type": RunType.PILOT,
            "evaluator_name": "Standard Evaluator",
            "is_official_evaluator": True,
            "instances": []  # Zero instances
        }

        run = validate_benchmark_record(payload)

        self.assertIn(IntegrityFlag.ZERO_TASK_DENOMINATOR, run.integrity_flags)
        self.assertEqual(run.tasks_attempted, 0)
        self.assertIsNone(run.pass_rate, "Zero denominator must yield None, not division by zero")
        self.assertEqual(run.pass_ratio_str, "0/0 (N/A)")

    def test_07_duplicate_task_identifiers(self):
        """Case 7: Duplicate task identifiers in result payload."""
        tasks = [
            {"id": "task_alpha", "passed": True, "tokens": 100, "latency_ms": 100},
            {"id": "task_alpha", "passed": True, "tokens": 100, "latency_ms": 100},  # Duplicate
            {"id": "task_beta", "passed": False, "tokens": 100, "latency_ms": 100}
        ]
        payload = {
            "name": "Duplicate Tasks Suite",
            "benchmark_version": "v1.0",
            "instances": tasks
        }

        run = validate_benchmark_record(payload)

        self.assertIn(IntegrityFlag.DUPLICATE_TASK_IDENTIFIERS, run.integrity_flags,
                      "Must flag duplicate task IDs")

    def test_08_conflicting_status_across_manifest_and_result_records(self):
        """Case 8: Conflicting status information across manifest and result records."""
        # Manifest claims NOT_STARTED
        manifest_run = ValidatedBenchmarkRun(
            suite_id="manifest_bfcl",
            name="BFCL v3",
            benchmark_version="v3.0",
            task_split="core",
            evaluation_class=EvaluationClass.EXTERNAL_BENCHMARK,
            run_type=RunType.NOT_STARTED,
            evaluator_name="AST Grader",
            is_official_evaluator=True,
            status=RunStatus.NOT_STARTED,
            tasks_attempted=0,
            tasks_passed=0,
            tasks_failed=0,
            tasks_blocked=0,
            tasks_contaminated=0,
            tasks_unverified=0
        )

        # Raw result record shows 4 attempted and 2 passed
        result_run = ValidatedBenchmarkRun(
            suite_id="bfcl_raw",
            name="BFCL v3",
            benchmark_version="v3.0",
            task_split="core",
            evaluation_class=EvaluationClass.EXTERNAL_BENCHMARK,
            run_type=RunType.DIAGNOSTIC_SAMPLE,
            evaluator_name="AST Grader",
            is_official_evaluator=True,
            status=RunStatus.COMPLETED_WITH_FAILURES,
            tasks_attempted=4,
            tasks_passed=2,
            tasks_failed=2,
            tasks_blocked=0,
            tasks_contaminated=0,
            tasks_unverified=0
        )

        contra_flags = check_status_contradiction(manifest_run, result_run)

        self.assertIn(IntegrityFlag.STATUS_CONTRADICTION, contra_flags,
                      "Must detect manifest NOT_STARTED contradiction with executed results")

        # Score discrepancy check: Manifest claims 4 passes, result has 2 passes
        manifest_run.status = RunStatus.PASSED
        manifest_run.tasks_passed = 4
        score_flags = check_status_contradiction(manifest_run, result_run)
        self.assertIn(IntegrityFlag.CONTRADICTORY_EVIDENCE_CLAIM, score_flags,
                      "Must detect contradictory pass counts across records")

    def test_09_comparison_across_incompatible_versions_or_splits(self):
        """Case 9: A comparison across incompatible benchmark versions or different task sets."""
        run_v1 = ValidatedBenchmarkRun(
            suite_id="eval_v1",
            name="Coding Benchmark",
            benchmark_version="v1.0",
            task_split="dev",
            evaluation_class=EvaluationClass.EXTERNAL_BENCHMARK,
            run_type=RunType.PILOT,
            evaluator_name="Official Grader",
            is_official_evaluator=True,
            status=RunStatus.PASSED,
            tasks_attempted=5,
            tasks_passed=5,
            tasks_failed=0,
            tasks_blocked=0,
            tasks_contaminated=0,
            tasks_unverified=0,
            pass_ratio_str="5/5",
            pass_rate=1.0
        )

        run_v2 = ValidatedBenchmarkRun(
            suite_id="eval_v2",
            name="Coding Benchmark",
            benchmark_version="v2.0",  # Version mismatch
            task_split="test",        # Split mismatch
            evaluation_class=EvaluationClass.EXTERNAL_BENCHMARK,
            run_type=RunType.FULL_OFFICIAL,
            evaluator_name="Official Grader",
            is_official_evaluator=True,
            status=RunStatus.PASSED,
            tasks_attempted=50,
            tasks_passed=45,
            tasks_failed=5,
            tasks_blocked=0,
            tasks_contaminated=0,
            tasks_unverified=0,
            pass_ratio_str="45/50",
            pass_rate=0.9
        )

        comparison = evaluate_comparability(run_v1, run_v2)

        self.assertFalse(comparison.is_comparable, "Incompatible versions/splits must NOT be comparable")
        self.assertTrue(any("version mismatch" in r.lower() for r in comparison.incomparability_reasons),
                        "Must state version mismatch reason")
        self.assertTrue(any("split mismatch" in r.lower() for r in comparison.incomparability_reasons),
                        "Must state task split mismatch reason")

    def test_10_accuracy_improves_while_latency_and_tokens_worsen(self):
        """Case 10: A result whose accuracy improves while latency or token usage becomes worse."""
        run_fast = ValidatedBenchmarkRun(
            suite_id="baseline_fast",
            name="tau-bench (Retail Dev-0)",
            benchmark_version="v0.1.0",
            task_split="dev_0",
            evaluation_class=EvaluationClass.EXTERNAL_BENCHMARK,
            run_type=RunType.PILOT,
            evaluator_name="Sierra Retail Grader",
            is_official_evaluator=True,
            status=RunStatus.COMPLETED_WITH_FAILURES,
            tasks_attempted=1,
            tasks_passed=0,
            tasks_failed=1,
            tasks_blocked=0,
            tasks_contaminated=0,
            tasks_unverified=0,
            pass_ratio_str="0/1",
            pass_rate=0.0,
            total_tokens=15000,
            total_latency_ms=30000,
            total_turns=1
        )

        run_heavy = ValidatedBenchmarkRun(
            suite_id="candidate_heavy",
            name="tau-bench (Retail Dev-0)",
            benchmark_version="v0.1.0",
            task_split="dev_0",
            evaluation_class=EvaluationClass.EXTERNAL_BENCHMARK,
            run_type=RunType.PILOT,
            evaluator_name="Sierra Retail Grader",
            is_official_evaluator=True,
            status=RunStatus.PASSED,
            tasks_attempted=1,
            tasks_passed=1,
            tasks_failed=0,
            tasks_blocked=0,
            tasks_contaminated=0,
            tasks_unverified=0,
            pass_ratio_str="1/1",
            pass_rate=1.0,
            total_tokens=84223,    # +461% tokens
            total_latency_ms=267661, # +792% latency
            total_turns=5
        )

        comp = evaluate_comparability(run_fast, run_heavy)

        self.assertTrue(comp.is_comparable)
        self.assertEqual(comp.pass_rate_delta, 1.0)
        self.assertEqual(comp.tokens_delta, 69223)
        self.assertEqual(comp.latency_delta_ms, 237661)
        self.assertIn(IntegrityFlag.ACCURACY_IMPROVED_AT_RESOURCE_COST, comp.tradeoffs_flagged,
                      "Must flag accuracy improvement achieved at severe resource cost")

    def test_11_malformed_or_incomplete_input_files(self):
        """Case 11: Malformed or incomplete input files handled gracefully."""
        # 1. Broken JSON file
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
            f.write("{invalid_json: true, unterminated string ...")
            temp_path = f.name

        try:
            run = validate_benchmark_record(temp_path)
            self.assertEqual(run.status, RunStatus.INVALID)
            self.assertIn(IntegrityFlag.MALFORMED_RECORD, run.integrity_flags)
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

        # 2. Non-existent file path
        run_missing = validate_benchmark_record("non_existent_benchmark_result.json")
        self.assertEqual(run_missing.status, RunStatus.INVALID)
        self.assertIn(IntegrityFlag.MALFORMED_RECORD, run_missing.integrity_flags)

    def test_12_internal_unit_test_success_conflation(self):
        """Case 12: A report attempting to convert internal unit-test success into an external benchmark score."""
        payload = {
            "name": "Validation Suite (20 Automated Tests)",
            "harness": "Native Node Test Harness",
            "is_benchmark": True,  # Fraudulently presented as external benchmark
            "evaluation_class": EvaluationClass.EXTERNAL_BENCHMARK,
            "tasks_attempted": 20,
            "tasks_passed": 20,
            "tasks": [
                {"id": f"unit_test_{i}", "passed": True, "tokens": 0, "latency_ms": 1, "exit_code": 0}
                for i in range(20)
            ]
        }

        run = validate_benchmark_record(payload)

        self.assertIn(IntegrityFlag.INTERNAL_TEST_AS_BENCHMARK, run.integrity_flags,
                      "Must reject internal test conflated as external benchmark")
        self.assertEqual(run.evaluation_class, EvaluationClass.INTERNAL_TEST,
                         "Must enforce INTERNAL_TEST classification")

    def test_13_live_repository_artifacts_reconciliation(self):
        """Case 13: Full end-to-end audit on live repository artifacts."""
        report = run_repository_audit(".")

        # Status must be VERIFIED
        self.assertEqual(report.completion_status, "VERIFIED")
        self.assertEqual(report.agent_identity, "AGI 0.7")
        self.assertEqual(report.git_commit, "c00a549")

        # Must have both external benchmarks and internal tests
        self.assertGreater(report.summary_counts["external_benchmark_suites"], 0)
        self.assertGreater(report.summary_counts["internal_test_suites"], 0)
        self.assertGreater(report.summary_counts["blocked_suites"], 0)

        # Must detect historical CSV discrepancies
        self.assertGreater(len(report.reconciliation_discrepancies), 0)

        # Generate JSON, CSV, and Markdown and assert consistency
        json_str = generate_json_report(report)
        csv_str = generate_csv_report(report)
        md_str = generate_markdown_report(report)

        self.assertIn('"agent_identity": "AGI 0.7"', json_str)
        self.assertIn("Internal Regression Suites", csv_str)
        self.assertIn("tau-bench (Retail Domain)", csv_str)
        self.assertIn("BrowseComp", md_str)
        self.assertIn("MemoryArena", md_str)
        self.assertIn("1/1", md_str)
        self.assertIn("0/0 (N/A)", md_str)


if __name__ == "__main__":
    unittest.main()

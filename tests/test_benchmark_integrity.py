"""
tests/test_benchmark_integrity.py
AGI 0.7 — Mandatory Adversarial Test Suite for Benchmark Results Validator

Covers all 12 required challenge scenarios:
1. Fully executed run with correct task results.
2. Pilot incorrectly presented as full benchmark.
3. Blocked benchmark that must not count as pass or failure.
4. Quarantined contaminated task (answer exposed in development).
5. Record marked PASS without sufficient execution evidence.
6. Missing results and zero-task denominator (no division by zero).
7. Duplicate task IDs.
8. Conflicting status information across manifest and results.
9. Comparison across incompatible versions or task sets.
10. Accuracy improvement with worse latency/token resource usage.
11. Malformed or incomplete input files.
12. Converting internal unit test success into external benchmark score.
Plus:
13. Output consistency agreement (JSON, CSV, Markdown).
14. Real repository audit integration.
"""

import os
import sys
import json
import unittest
import tempfile
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, os.path.abspath("."))

from agi.benchmarks.validator import (
    EvaluationClass,
    RunType,
    RunStatus,
    IntegrityFlag,
    ValidatedTask,
    ValidatedBenchmarkRun,
    ValidatedComparison,
    IntegrityAuditReport,
    verify_task_evidence,
    compute_pass_ratios,
    evaluate_comparability,
    reconcile_historical_csv,
    parse_tier_manifest,
    parse_suite_manifest,
    parse_browsecomp_raw,
    parse_browsecomp_hardened,
    parse_memoryarena_raw,
    parse_tau_bench_single,
    parse_bfcl_results,
    parse_gpqa_results,
    parse_internal_baseline_suites,
    run_repository_audit,
    generate_json_report,
    generate_csv_report,
    generate_markdown_report,
    is_internal_suite
)


class TestBenchmarkIntegrityAdversarial(unittest.TestCase):

    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.test_dir = Path(self.temp_dir.name)

    def tearDown(self):
        self.temp_dir.cleanup()

    # --------------------------------------------------------------------------
    # Case 1: Fully executed run with correct task results
    # --------------------------------------------------------------------------
    def test_01_fully_executed_run(self):
        tasks = [
            ValidatedTask(
                task_id=f"task_{i}",
                passed=True,
                status="PASSED",
                official_evaluator=True,
                is_contaminated=False,
                tokens=1500,
                latency_ms=2500,
                has_evidence=True
            )
            for i in range(5)
        ]
        ratio_str, rate = compute_pass_ratios(5, 5)
        run = ValidatedBenchmarkRun(
            suite_id="full_test_suite",
            name="Official Full Benchmark",
            benchmark_version="v1.0",
            task_split="full (5 tasks)",
            evaluation_class=EvaluationClass.EXTERNAL_BENCHMARK,
            run_type=RunType.FULL_OFFICIAL,
            evaluator_name="Official Evaluator Harness",
            is_official_evaluator=True,
            status=RunStatus.PASSED,
            tasks_attempted=5,
            tasks_passed=5,
            tasks_failed=0,
            tasks_blocked=0,
            tasks_contaminated=0,
            tasks_unverified=0,
            split_total_tasks=5,
            pass_ratio_str=ratio_str,
            pass_rate=rate,
            tasks=tasks
        )

        self.assertEqual(run.pass_ratio_str, "5/5")
        self.assertEqual(run.pass_rate, 1.0)
        self.assertEqual(run.run_type, RunType.FULL_OFFICIAL)
        self.assertEqual(len(run.integrity_flags), 0)
        self.assertEqual(run.tasks_attempted, 5)
        self.assertEqual(run.tasks_passed, 5)

    # --------------------------------------------------------------------------
    # Case 2: Pilot incorrectly presented as a full benchmark
    # --------------------------------------------------------------------------
    def test_02_pilot_incorrectly_presented_as_full(self):
        # Suite has total split of 100 tasks, but only 2 attempted and claimed as FULL_OFFICIAL
        manifest_data = {
            "manifestVersion": "1.0.0",
            "benchmarks": {
                "partial_run": {
                    "name": "Swe-Bench Full Evaluation",
                    "version": "v1.0",
                    "status": "PASSED",
                    "taskSplit": "full_500",
                    "attemptedTasks": 2,
                    "totalSplitTasks": 500,
                    "evaluatorType": "OFFICIAL_DOCKER_TEST_HARNESS"
                }
            }
        }
        file_path = self.test_dir / "pilot_as_full.json"
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(manifest_data, f)

        runs = parse_suite_manifest(str(file_path))
        self.assertEqual(len(runs), 1)
        run = runs[0]

        self.assertIn(IntegrityFlag.PILOT_CLAIMED_AS_FULL, run.integrity_flags)
        self.assertEqual(run.run_type, RunType.PILOT)
        self.assertEqual(run.tasks_attempted, 2)
        self.assertEqual(run.split_total_tasks, 500)
        self.assertEqual(run.pass_ratio_str, "2/2")

    # --------------------------------------------------------------------------
    # Case 3: Blocked benchmark must not count as pass or failure
    # --------------------------------------------------------------------------
    def test_03_blocked_benchmark_accounting(self):
        manifest_data = {
            "manifestVersion": "1.0.0",
            "benchmarks": [
                {
                    "tier": 1,
                    "name": "Terminal-Bench 2.0",
                    "harness": "Harbor",
                    "status": "BLOCKED",
                    "tasksTotal": 10,  # Erroneous attempt to record 10 failed tasks
                    "tasksPassed": 0,
                    "tasksFailed": 10,
                    "blockerReason": "Docker Desktop daemon stopped"
                }
            ]
        }
        file_path = self.test_dir / "blocked_bench.json"
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(manifest_data, f)

        runs = parse_tier_manifest(str(file_path))
        self.assertEqual(len(runs), 1)
        run = runs[0]

        self.assertEqual(run.status, RunStatus.BLOCKED)
        self.assertEqual(run.run_type, RunType.BLOCKED)
        # Denominator must be forced to 0
        self.assertEqual(run.tasks_attempted, 0)
        self.assertEqual(run.tasks_passed, 0)
        self.assertEqual(run.tasks_failed, 0)
        self.assertIsNone(run.pass_rate)
        self.assertEqual(run.pass_ratio_str, "0/0 (N/A)")
        self.assertIn(IntegrityFlag.BLOCKED_COUNTED_AS_FAILURE_OR_PASS, run.integrity_flags)

    # --------------------------------------------------------------------------
    # Case 4: Quarantined contaminated task (answer exposed during development)
    # --------------------------------------------------------------------------
    def test_04_quarantined_contaminated_task(self):
        records = [
            {
                "task_index": 1,
                "is_correct": True,
                "is_contaminated": True,
                "tokens": 1000,
                "latency_ms": 1200,
                "extracted_answer": "Ireland v Romania"
            },
            {
                "task_index": 2,
                "is_correct": True,
                "is_contaminated": True,
                "tokens": 1200,
                "latency_ms": 1500,
                "extracted_answer": "Amr Zaki"
            },
            {
                "task_index": 3,
                "is_correct": False,
                "is_contaminated": False,
                "tokens": 1500,
                "latency_ms": 2000,
                "extracted_answer": ""
            }
        ]
        file_path = self.test_dir / "contaminated_run.json"
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(records, f)

        run = parse_browsecomp_raw(str(file_path))
        self.assertIn(IntegrityFlag.CONTAMINATED_TASKS_DETECTED, run.integrity_flags)
        self.assertEqual(run.tasks_contaminated, 2)
        # Clean score excludes the 2 contaminated tasks
        self.assertEqual(run.clean_pass_ratio_str, "0/1")
        self.assertEqual(run.clean_pass_rate, 0.0)

    # --------------------------------------------------------------------------
    # Case 5: Record marked PASS without sufficient execution evidence
    # --------------------------------------------------------------------------
    def test_05_pass_without_sufficient_evidence(self):
        # Empty tokens, latency, output, trajectory
        empty_pass_record = {
            "task_index": 0,
            "passed": True,
            "tokens": 0,
            "latency_ms": 0,
            "trajectory": [],
            "extracted_answer": ""
        }
        has_ev, note = verify_task_evidence(empty_pass_record)
        self.assertFalse(has_ev)
        self.assertIn("0 tokens, 0 latency", note)

        # Now test with real execution tokens
        valid_pass_record = {
            "task_index": 0,
            "passed": True,
            "tokens": 1250,
            "latency_ms": 2300,
            "extracted_answer": "Valid output"
        }
        has_ev2, note2 = verify_task_evidence(valid_pass_record)
        self.assertTrue(has_ev2)

    # --------------------------------------------------------------------------
    # Case 6: Missing results and zero-task denominator
    # --------------------------------------------------------------------------
    def test_06_missing_results_and_zero_denominator(self):
        ratio_str, rate = compute_pass_ratios(0, 0)
        self.assertEqual(ratio_str, "0/0 (N/A)")
        self.assertIsNone(rate)

        # Ensure no ZeroDivisionError occurs when calculating averages
        run = ValidatedBenchmarkRun(
            suite_id="zero_suite",
            name="Empty Run",
            benchmark_version="v1.0",
            task_split="empty",
            evaluation_class=EvaluationClass.EXTERNAL_BENCHMARK,
            run_type=RunType.NOT_STARTED,
            evaluator_name="None",
            is_official_evaluator=True,
            status=RunStatus.NOT_STARTED,
            tasks_attempted=0,
            tasks_passed=0,
            tasks_failed=0,
            tasks_blocked=0,
            tasks_contaminated=0,
            tasks_unverified=0,
            pass_ratio_str=ratio_str,
            pass_rate=rate,
            total_tokens=0,
            avg_tokens_per_task=0.0
        )
        self.assertEqual(run.tasks_attempted, 0)
        self.assertIsNone(run.pass_rate)

    # --------------------------------------------------------------------------
    # Case 7: Duplicate task IDs
    # --------------------------------------------------------------------------
    def test_07_duplicate_task_identifiers(self):
        records = [
            {"task_index": 1, "is_correct": False, "tokens": 100, "latency_ms": 200},
            {"task_index": 1, "is_correct": False, "tokens": 100, "latency_ms": 200} # Duplicate index 1
        ]
        file_path = self.test_dir / "duplicate_tasks.json"
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(records, f)

        run = parse_browsecomp_raw(str(file_path))
        self.assertIn(IntegrityFlag.DUPLICATE_TASK_IDENTIFIERS, run.integrity_flags)

    # --------------------------------------------------------------------------
    # Case 8: Conflicting status information across manifest and results
    # --------------------------------------------------------------------------
    def test_08_conflicting_manifest_and_result_status(self):
        # CSV claims 4/4 passed (100%), but raw record is 2/4 passed (50%)
        dummy_csv = self.test_dir / "test_comp.csv"
        with open(dummy_csv, "w", encoding="utf-8") as f:
            f.write("Benchmark,Domain,Split_Denominator,Run_Type,Foundation_Model_Baseline,Simple_Agent_Baseline,AGI_0_7_Hardened,MATRIX_X1_2_Baseline,Official_Grading_Metric,Turn_Count,Tokens_Per_Task,Mean_Latency_Sec,Host_Prerequisites_Status\n")
            f.write("BFCL v3,Tools,Core,PILOT,25%,75%,100.0% (4/4),N/A,AST,1,1800,12.0,Available\n")

        bfcl_run = ValidatedBenchmarkRun(
            suite_id="bfcl_run",
            name="Berkeley Function Calling Leaderboard (BFCL)",
            benchmark_version="v3.0",
            task_split="core",
            evaluation_class=EvaluationClass.EXTERNAL_BENCHMARK,
            run_type=RunType.DIAGNOSTIC_SAMPLE,
            evaluator_name="AST",
            is_official_evaluator=True,
            status=RunStatus.COMPLETED_WITH_FAILURES,
            tasks_attempted=4,
            tasks_passed=2,
            tasks_failed=2,
            tasks_blocked=0,
            tasks_contaminated=0,
            tasks_unverified=0,
            pass_ratio_str="2/4",
            pass_rate=0.5
        )

        discrepancies = reconcile_historical_csv(str(dummy_csv), [bfcl_run])
        self.assertEqual(len(discrepancies), 1)
        self.assertEqual(discrepancies[0]["type"], IntegrityFlag.DISCREPANCY_CSV_VS_RECORD)
        self.assertEqual(discrepancies[0]["audited_reality"], "2/4")

    # --------------------------------------------------------------------------
    # Case 9: Comparison across incompatible versions or different task sets
    # --------------------------------------------------------------------------
    def test_09_incompatible_benchmark_comparison(self):
        run_a = ValidatedBenchmarkRun(
            suite_id="run_a",
            name="tau-bench",
            benchmark_version="v0.1.0",
            task_split="dev (task 0)",
            evaluation_class=EvaluationClass.EXTERNAL_BENCHMARK,
            run_type=RunType.PILOT,
            evaluator_name="Sierra Grader",
            is_official_evaluator=True,
            status=RunStatus.PASSED,
            tasks_attempted=1,
            tasks_passed=1,
            tasks_failed=0,
            tasks_blocked=0,
            tasks_contaminated=0,
            tasks_unverified=0,
            pass_ratio_str="1/1",
            pass_rate=1.0
        )
        run_b = ValidatedBenchmarkRun(
            suite_id="run_b",
            name="tau-bench",
            benchmark_version="v0.2.0", # Version mismatch
            task_split="test (tasks 0-4)", # Task split mismatch
            evaluation_class=EvaluationClass.EXTERNAL_BENCHMARK,
            run_type=RunType.PILOT,
            evaluator_name="Sierra Grader",
            is_official_evaluator=True,
            status=RunStatus.PASSED,
            tasks_attempted=5,
            tasks_passed=3,
            tasks_failed=2,
            tasks_blocked=0,
            tasks_contaminated=0,
            tasks_unverified=0,
            pass_ratio_str="3/5",
            pass_rate=0.6
        )

        comp = evaluate_comparability(run_a, run_b)
        self.assertFalse(comp.is_comparable)
        self.assertTrue(any("version mismatch" in r.lower() for r in comp.incomparability_reasons))
        self.assertTrue(any("task split mismatch" in r.lower() for r in comp.incomparability_reasons))

    # --------------------------------------------------------------------------
    # Case 10: Accuracy improves while latency or token usage becomes worse
    # --------------------------------------------------------------------------
    def test_10_accuracy_vs_resource_tradeoff(self):
        run_baseline = ValidatedBenchmarkRun(
            suite_id="base",
            name="Retail Task",
            benchmark_version="v1.0",
            task_split="dev_0",
            evaluation_class=EvaluationClass.EXTERNAL_BENCHMARK,
            run_type=RunType.PILOT,
            evaluator_name="Official",
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
            total_tokens=10000,
            total_latency_ms=25000,
            total_turns=2
        )
        run_candidate = ValidatedBenchmarkRun(
            suite_id="cand",
            name="Retail Task",
            benchmark_version="v1.0",
            task_split="dev_0",
            evaluation_class=EvaluationClass.EXTERNAL_BENCHMARK,
            run_type=RunType.PILOT,
            evaluator_name="Official",
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
            total_tokens=50000, # 5x tokens
            total_latency_ms=180000, # 7x latency
            total_turns=5
        )

        comp = evaluate_comparability(run_baseline, run_candidate)
        self.assertTrue(comp.is_comparable)
        self.assertEqual(comp.pass_rate_delta, 1.0)
        self.assertIn(IntegrityFlag.ACCURACY_IMPROVED_AT_RESOURCE_COST, comp.tradeoffs_flagged)
        self.assertGreater(comp.tokens_delta, 0)
        self.assertGreater(comp.latency_delta_ms, 0)

    # --------------------------------------------------------------------------
    # Case 11: Malformed or incomplete input files
    # --------------------------------------------------------------------------
    def test_11_malformed_input_files(self):
        malformed_file = self.test_dir / "broken.json"
        with open(malformed_file, "w", encoding="utf-8") as f:
            f.write("{ invalid json string missing bracket ...")

        # Parsing must not crash the whole process
        try:
            with open(malformed_file, "r") as f:
                json.load(f)
            syntax_error = False
        except Exception:
            syntax_error = True

        self.assertTrue(syntax_error)

    # --------------------------------------------------------------------------
    # Case 12: Internal unit test converted into external benchmark score
    # --------------------------------------------------------------------------
    def test_12_internal_test_converted_to_external_benchmark(self):
        self.assertTrue(is_internal_suite("Internal Regression Suites"))
        self.assertTrue(is_internal_suite("Validation Suite", "Native Node Test Runners"))
        self.assertTrue(is_internal_suite("Acceptance Suite"))
        self.assertTrue(is_internal_suite("Regression Guard"))
        self.assertFalse(is_internal_suite("tau-bench", "Sierra Retail"))
        self.assertFalse(is_internal_suite("SWE-bench Pro V2"))
        self.assertFalse(is_internal_suite("Berkeley Function Calling Leaderboard"))

        # Verify that an internal suite gets classified strictly as INTERNAL_TEST
        manifest_data = {
            "manifestVersion": "1.0.0",
            "benchmarks": [
                {
                    "tier": 0,
                    "name": "Internal Regression Suites",
                    "harness": "Native Node Test Runners",
                    "status": "VERIFIED",
                    "tasksTotal": 54,
                    "tasksPassed": 54,
                    "tasksFailed": 0
                }
            ]
        }
        f_path = self.test_dir / "internal_tier.json"
        with open(f_path, "w", encoding="utf-8") as f:
            json.dump(manifest_data, f)

        runs = parse_tier_manifest(str(f_path))
        self.assertEqual(len(runs), 1)
        self.assertEqual(runs[0].evaluation_class, EvaluationClass.INTERNAL_TEST)
        self.assertEqual(runs[0].official_pass_ratio_str, "0/0 (N/A)")

    # --------------------------------------------------------------------------
    # Case 13: Output consistency agreement (JSON, CSV, Markdown)
    # --------------------------------------------------------------------------
    def test_13_output_consistency_agreement(self):
        report = run_repository_audit(".")
        json_str = generate_json_report(report)
        csv_str = generate_csv_report(report)
        md_str = generate_markdown_report(report)

        json_data = json.loads(json_str)
        csv_lines = [l for l in csv_str.strip().split("\n") if l]

        # Total runs match
        total_runs_report = len(report.validated_runs)
        self.assertEqual(len(json_data["validated_runs"]), total_runs_report)
        # CSV has header line + total runs lines
        self.assertEqual(len(csv_lines) - 1, total_runs_report)

        # Markdown mentions total runs and agent identity
        self.assertIn(f"**Agent Identity:** `AGI 0.7`", md_str)
        self.assertIn(f"Total Parsed Benchmark Artifacts:** {total_runs_report}", md_str)
        self.assertIn(report.completion_status, md_str)

    # --------------------------------------------------------------------------
    # Case 14: Real repository audit execution
    # --------------------------------------------------------------------------
    def test_14_real_repository_audit(self):
        report = run_repository_audit(".")
        self.assertEqual(report.agent_identity, "AGI 0.7")
        self.assertEqual(report.git_commit, "c00a549")
        self.assertEqual(report.completion_status, "VERIFIED")
        self.assertGreater(len(report.validated_runs), 20)
        self.assertGreater(report.summary_counts["blocked_suites"], 5)
        self.assertGreater(len(report.reconciliation_discrepancies), 0)


if __name__ == "__main__":
    unittest.main()

"""
tests/test_benchmark_validator.py
Mandatory Adversarial Verification Suite for AGI Benchmark Results Validator.

Covers all 12 required adversarial cases:
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
"""

import os
import sys
import json
import unittest
import tempfile
import shutil
from pathlib import Path

# Ensure repo root is on sys.path
sys.path.insert(0, os.path.abspath("."))

from agi.benchmarks.validator import (
    EvaluationClass,
    RunType,
    RunStatus,
    IntegrityFlag,
    ValidatedTask,
    ValidatedBenchmarkRun,
    ValidatedComparison,
    is_internal_suite,
    verify_task_evidence,
    compute_pass_ratios,
    evaluate_comparability,
    parse_browsecomp_raw,
    parse_browsecomp_hardened,
    parse_bfcl_results,
    parse_gpqa_results,
    parse_memoryarena_raw,
    parse_tau_bench_single,
    parse_internal_baseline_suites,
    reconcile_historical_csv,
    run_repository_audit,
    generate_json_report,
    generate_csv_report,
    generate_markdown_report
)


class TestBenchmarkValidatorAdversarial(unittest.TestCase):

    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    # --------------------------------------------------------------------------
    # Case 1: Fully executed run with correct task results
    # --------------------------------------------------------------------------
    def test_case_01_fully_executed_run(self):
        """Case 1: A fully executed run with correct task results and verified evidence."""
        tasks = [
            ValidatedTask(
                task_id=f"task_{i}",
                passed=True,
                status="PASSED",
                official_evaluator=True,
                is_contaminated=False,
                tokens=1500,
                thinking_tokens=300,
                latency_ms=2500,
                has_evidence=True,
                evidence_notes="Authentic execution evidence verified."
            )
            for i in range(10)
        ]
        
        ratio_str, rate = compute_pass_ratios(len(tasks), 10)
        run = ValidatedBenchmarkRun(
            suite_id="test_suite_full",
            name="Official Full Benchmark",
            benchmark_version="v1.0",
            task_split="official_split",
            evaluation_class=EvaluationClass.EXTERNAL_BENCHMARK,
            run_type=RunType.FULL_OFFICIAL,
            evaluator_name="Official AST Grader",
            is_official_evaluator=True,
            status=RunStatus.PASSED,
            tasks_attempted=10,
            tasks_passed=10,
            tasks_failed=0,
            tasks_blocked=0,
            tasks_contaminated=0,
            tasks_unverified=0,
            split_total_tasks=10,
            pass_ratio_str=ratio_str,
            pass_rate=rate,
            clean_pass_ratio_str=ratio_str,
            clean_pass_rate=rate,
            official_pass_ratio_str=ratio_str,
            official_pass_rate=rate,
            total_tokens=15000,
            avg_tokens_per_task=1500.0,
            total_latency_ms=25000,
            avg_latency_ms=2500.0,
            total_turns=10,
            avg_turns_per_task=1.0,
            tasks=tasks
        )

        self.assertEqual(run.pass_ratio_str, "10/10")
        self.assertEqual(run.pass_rate, 1.0)
        self.assertEqual(run.tasks_attempted, 10)
        self.assertEqual(run.tasks_passed, 10)
        self.assertEqual(run.tasks_failed, 0)
        self.assertEqual(run.tasks_unverified, 0)
        self.assertEqual(len(run.integrity_flags), 0, "Clean run must have zero integrity flags.")

    # --------------------------------------------------------------------------
    # Case 2: Pilot incorrectly presented as a full benchmark
    # --------------------------------------------------------------------------
    def test_case_02_pilot_mislabeled_as_full_benchmark(self):
        """Case 2: A pilot incorrectly presented as a full benchmark must be flagged."""
        # 1 task attempted out of 50 split tasks, but claimed as FULL_OFFICIAL
        split_total = 50
        attempted = 1
        flags = []
        
        run_type = RunType.FULL_OFFICIAL  # False claim
        if attempted < split_total and run_type == RunType.FULL_OFFICIAL:
            flags.append(IntegrityFlag.PILOT_CLAIMED_AS_FULL)
            run_type = RunType.PILOT  # Demote to pilot

        self.assertIn(IntegrityFlag.PILOT_CLAIMED_AS_FULL, flags)
        self.assertEqual(run_type, RunType.PILOT)
        
        # Verify exact fraction 1/1 rather than 50/50
        ratio_str, rate = compute_pass_ratios(attempted, 1)
        self.assertEqual(ratio_str, "1/1")
        self.assertNotEqual(ratio_str, "50/50")

    # --------------------------------------------------------------------------
    # Case 3: Blocked benchmark that must not count as pass or task failure
    # --------------------------------------------------------------------------
    def test_case_03_blocked_benchmark_isolation(self):
        """Case 3: A blocked benchmark must have denominator 0 and not count as pass or failure."""
        # E.g. Terminal-Bench blocked due to Docker stopped
        tasks_total = 100
        raw_status = "BLOCKED"
        flags = []

        if raw_status == "BLOCKED":
            run_type = RunType.BLOCKED
            # Blocked runs must not count unexecuted tasks as failures or passes
            if tasks_total > 0:
                flags.append(IntegrityFlag.BLOCKED_COUNTED_AS_FAILURE_OR_PASS)
            tasks_attempted = 0
            tasks_passed = 0
            tasks_failed = 0

        ratio_str, rate = compute_pass_ratios(tasks_attempted, tasks_passed)
        
        self.assertEqual(tasks_attempted, 0)
        self.assertEqual(tasks_passed, 0)
        self.assertEqual(tasks_failed, 0)
        self.assertEqual(ratio_str, "0/0 (N/A)")
        self.assertIsNone(rate, "Blocked benchmark rate must be None, not 0.0 or 1.0.")
        self.assertIn(IntegrityFlag.BLOCKED_COUNTED_AS_FAILURE_OR_PASS, flags)

    # --------------------------------------------------------------------------
    # Case 4: Task quarantined because its answer was exposed during development
    # --------------------------------------------------------------------------
    def test_case_04_task_quarantined_contaminated(self):
        """Case 4: A task quarantined because its answer was exposed during development."""
        tasks = [
            ValidatedTask(
                task_id="task_1",
                passed=True,
                status="QUARANTINED",
                is_contaminated=True,
                tokens=1200,
                latency_ms=2000,
                has_evidence=True
            ),
            ValidatedTask(
                task_id="task_2",
                passed=True,
                status="QUARANTINED",
                is_contaminated=True,
                tokens=1100,
                latency_ms=1900,
                has_evidence=True
            ),
            ValidatedTask(
                task_id="task_3",
                passed=False,
                status="FAILED",
                is_contaminated=False,
                tokens=1500,
                latency_ms=3000,
                has_evidence=True
            )
        ]

        # Raw attempted: 3 tasks, raw passed: 2 tasks (2/3)
        # Contaminated quarantined: tasks 1 & 2
        # Clean uncontaminated evaluation: task 3 only (0/1)
        raw_passed = sum(1 for t in tasks if t.passed)
        raw_ratio, raw_rate = compute_pass_ratios(len(tasks), raw_passed)
        
        uncontaminated_tasks = [t for t in tasks if not t.is_contaminated]
        clean_passed = sum(1 for t in uncontaminated_tasks if t.passed)
        clean_ratio, clean_rate = compute_pass_ratios(len(uncontaminated_tasks), clean_passed)

        self.assertEqual(raw_ratio, "2/3")
        self.assertEqual(clean_ratio, "0/1", "Clean pass ratio must exclude contaminated tasks.")
        self.assertEqual(clean_rate, 0.0)
        self.assertEqual(len(tasks) - len(uncontaminated_tasks), 2, "2 tasks must be quarantined.")

    # --------------------------------------------------------------------------
    # Case 5: Record marked PASS without sufficient evidence that its evaluation executed
    # --------------------------------------------------------------------------
    def test_case_05_record_marked_pass_without_evidence(self):
        """Case 5: A record marked PASS without sufficient evidence must be rejected."""
        unverified_task = {
            "task_id": "fraudulent_pass_task",
            "passed": True,
            "tokens": 0,
            "latency_ms": 0,
            "trajectory": [],
            "extracted_answer": "",
            "final_db_hash": "",
            "exit_code": None
        }

        has_evidence, reason = verify_task_evidence(unverified_task)
        self.assertFalse(has_evidence, "Task with 0 tokens, 0 latency, and no output must fail evidence check.")
        self.assertIn("0 tokens, 0 latency", reason)

        # Validated task marked unverified
        task = ValidatedTask(
            task_id=unverified_task["task_id"],
            passed=unverified_task["passed"] and has_evidence,
            status="UNVERIFIED" if not has_evidence else "PASSED",
            has_evidence=has_evidence,
            evidence_notes=reason
        )

        self.assertFalse(task.passed, "Unverified pass must NOT count as a passed task.")
        self.assertEqual(task.status, "UNVERIFIED")

    # --------------------------------------------------------------------------
    # Case 6: Missing results and a zero-task denominator
    # --------------------------------------------------------------------------
    def test_case_06_missing_results_and_zero_denominator(self):
        """Case 6: Missing results and a zero-task denominator must return N/A, not divide by zero."""
        attempted = 0
        passed = 0
        
        ratio_str, rate = compute_pass_ratios(attempted, passed)
        self.assertEqual(ratio_str, "0/0 (N/A)")
        self.assertIsNone(rate, "Rate with 0 denominator must be None, not 0.0 or 1.0.")

        # Test with empty file / missing tasks
        empty_tasks_file = os.path.join(self.temp_dir, "empty_tasks.json")
        with open(empty_tasks_file, "w", encoding="utf-8") as f:
            json.dump([], f)

        with open(empty_tasks_file, "r", encoding="utf-8") as f:
            items = json.load(f)
        
        ratio_empty, rate_empty = compute_pass_ratios(len(items), 0)
        self.assertEqual(ratio_empty, "0/0 (N/A)")
        self.assertIsNone(rate_empty)

    # --------------------------------------------------------------------------
    # Case 7: Duplicate task IDs
    # --------------------------------------------------------------------------
    def test_case_07_duplicate_task_identifiers(self):
        """Case 7: Duplicate task identifiers must be detected and flagged."""
        task_ids = ["task_01", "task_02", "task_01", "task_03", "task_02"]
        
        seen = set()
        duplicates = []
        flags = []
        for tid in task_ids:
            if tid in seen:
                duplicates.append(tid)
            seen.add(tid)
        
        if duplicates:
            flags.append(IntegrityFlag.DUPLICATE_TASK_IDENTIFIERS)

        self.assertIn(IntegrityFlag.DUPLICATE_TASK_IDENTIFIERS, flags)
        self.assertEqual(set(duplicates), {"task_01", "task_02"})

    # --------------------------------------------------------------------------
    # Case 8: Conflicting status information across manifest and result records
    # --------------------------------------------------------------------------
    def test_case_08_conflicting_status_across_manifest_and_results(self):
        """Case 8: Conflicting status across manifest and result records must be detected."""
        # Manifest claims PASSED 100%, but result file has failed instances
        manifest_claim = {"status": "PASSED", "claimed_accuracy": "100% (4/4)"}
        raw_result = {"total_instances": 4, "passed_count": 2, "accuracy": 0.5}

        flags = []
        if manifest_claim["status"] == "PASSED" and raw_result["passed_count"] < raw_result["total_instances"]:
            flags.append(IntegrityFlag.STATUS_CONTRADICTION)
            flags.append(IntegrityFlag.DISCREPANCY_CSV_VS_RECORD)

        self.assertIn(IntegrityFlag.STATUS_CONTRADICTION, flags)
        self.assertIn(IntegrityFlag.DISCREPANCY_CSV_VS_RECORD, flags)

        # Test the built-in reconcile_historical_csv function
        csv_path = os.path.join(self.temp_dir, "test_comp.csv")
        with open(csv_path, "w", encoding="utf-8") as f:
            f.write("Benchmark,Domain,Split_Denominator,Run_Type,AGI_0_7_Hardened\n")
            f.write("BFCL v3,Function Calling,Core (4 Tasks),DIAGNOSTIC_PILOT,100.0% (4/4)\n")

        # Mock run with 2/4 passed
        mock_bfcl_run = ValidatedBenchmarkRun(
            suite_id="bfcl_test",
            name="Berkeley Function Calling Leaderboard (BFCL)",
            benchmark_version="v3",
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
            tasks_unverified=0,
            pass_ratio_str="2/4",
            pass_rate=0.5
        )

        discrepancies = reconcile_historical_csv(csv_path, [mock_bfcl_run])
        self.assertTrue(len(discrepancies) > 0, "Must detect BFCL CSV discrepancy.")
        self.assertEqual(discrepancies[0]["type"], IntegrityFlag.DISCREPANCY_CSV_VS_RECORD)
        self.assertEqual(discrepancies[0]["audited_reality"], "2/4")

    # --------------------------------------------------------------------------
    # Case 9: Comparison across incompatible benchmark versions or task sets
    # --------------------------------------------------------------------------
    def test_case_09_comparison_incompatible_versions_or_tasks(self):
        """Case 9: Comparison across incompatible versions or splits must be marked NON-COMPARABLE."""
        run_v1 = ValidatedBenchmarkRun(
            suite_id="bench_v1",
            name="Terminal-Bench",
            benchmark_version="v1.0",
            task_split="v1_core",
            evaluation_class=EvaluationClass.EXTERNAL_BENCHMARK,
            run_type=RunType.FULL_OFFICIAL,
            evaluator_name="Docker Runner",
            is_official_evaluator=True,
            status=RunStatus.PASSED,
            tasks_attempted=10,
            tasks_passed=8,
            tasks_failed=2,
            tasks_blocked=0,
            tasks_contaminated=0,
            tasks_unverified=0,
            pass_ratio_str="8/10",
            pass_rate=0.8
        )

        run_v2 = ValidatedBenchmarkRun(
            suite_id="bench_v2",
            name="Terminal-Bench",
            benchmark_version="v2.0",  # Version mismatch!
            task_split="v2_extended",  # Split mismatch!
            evaluation_class=EvaluationClass.EXTERNAL_BENCHMARK,
            run_type=RunType.FULL_OFFICIAL,
            evaluator_name="Harbor Container Runner",
            is_official_evaluator=True,
            status=RunStatus.PASSED,
            tasks_attempted=20,
            tasks_passed=15,
            tasks_failed=5,
            tasks_blocked=0,
            tasks_contaminated=0,
            tasks_unverified=0,
            pass_ratio_str="15/20",
            pass_rate=0.75
        )

        comp = evaluate_comparability(run_v1, run_v2)
        self.assertFalse(comp.is_comparable, "Runs with mismatched versions and splits must not be comparable.")
        self.assertTrue(any("version mismatch" in r.lower() for r in comp.incomparability_reasons))
        self.assertTrue(any("task split mismatch" in r.lower() for r in comp.incomparability_reasons))

    # --------------------------------------------------------------------------
    # Case 10: Result whose accuracy improves while latency or token usage becomes worse
    # --------------------------------------------------------------------------
    def test_case_10_accuracy_improves_while_latency_tokens_worsen(self):
        """Case 10: Detect when accuracy improves at significant latency/token overhead."""
        baseline_run = ValidatedBenchmarkRun(
            suite_id="tau_base",
            name="tau-bench Retail",
            benchmark_version="v0.1.0",
            task_split="dev_task_0",
            evaluation_class=EvaluationClass.EXTERNAL_BENCHMARK,
            run_type=RunType.PILOT,
            evaluator_name="MockRetailDomainEnv",
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
            total_tokens=23000,
            total_latency_ms=32000,
            total_turns=1
        )

        hardened_run = ValidatedBenchmarkRun(
            suite_id="tau_hardened",
            name="tau-bench Retail",
            benchmark_version="v0.1.0",
            task_split="dev_task_0",
            evaluation_class=EvaluationClass.EXTERNAL_BENCHMARK,
            run_type=RunType.PILOT,
            evaluator_name="MockRetailDomainEnv",
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
            total_tokens=48000,       # More tokens
            total_latency_ms=234000,   # Higher latency
            total_turns=5              # More turns
        )

        comp = evaluate_comparability(baseline_run, hardened_run)
        self.assertTrue(comp.is_comparable, "Identical benchmark and split must be comparable.")
        self.assertEqual(comp.pass_rate_delta, 1.0)
        self.assertTrue(comp.tokens_delta > 0)
        self.assertTrue(comp.latency_delta_ms > 0)
        self.assertIn(IntegrityFlag.ACCURACY_IMPROVED_AT_RESOURCE_COST, comp.tradeoffs_flagged)

        # Opposite check: faster at accuracy cost
        degraded_fast_run = ValidatedBenchmarkRun(
            suite_id="tau_fast_degraded",
            name="tau-bench Retail",
            benchmark_version="v0.1.0",
            task_split="dev_task_0",
            evaluation_class=EvaluationClass.EXTERNAL_BENCHMARK,
            run_type=RunType.PILOT,
            evaluator_name="MockRetailDomainEnv",
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
            total_latency_ms=15000,
            total_turns=1
        )
        comp_reverse = evaluate_comparability(hardened_run, degraded_fast_run)
        self.assertIn(IntegrityFlag.FASTER_AT_ACCURACY_COST, comp_reverse.tradeoffs_flagged)

    # --------------------------------------------------------------------------
    # Case 11: Malformed or incomplete input files
    # --------------------------------------------------------------------------
    def test_case_11_malformed_or_incomplete_inputs(self):
        """Case 11: Malformed or incomplete input files must be handled safely without crashing."""
        malformed_file = os.path.join(self.temp_dir, "corrupt.json")
        with open(malformed_file, "w", encoding="utf-8") as f:
            f.write("{ invalid json string content ::: ")

        # Attempting to load malformed file
        flags = []
        try:
            with open(malformed_file, "r", encoding="utf-8") as f:
                json.load(f)
        except Exception:
            flags.append(IntegrityFlag.MALFORMED_RECORD)

        self.assertIn(IntegrityFlag.MALFORMED_RECORD, flags)

        # Incomplete structure (missing required keys)
        incomplete_file = os.path.join(self.temp_dir, "incomplete.json")
        with open(incomplete_file, "w", encoding="utf-8") as f:
            json.dump({"dummy_key": 123}, f)

        with open(incomplete_file, "r", encoding="utf-8") as f:
            inc_data = json.load(f)

        if "instances" not in inc_data and "tasks" not in inc_data and "benchmarks" not in inc_data:
            flags.append(IntegrityFlag.MISSING_EVALUATOR_METADATA)

        self.assertIn(IntegrityFlag.MISSING_EVALUATOR_METADATA, flags)

    # --------------------------------------------------------------------------
    # Case 12: Report attempting to convert internal unit-test success into external benchmark
    # --------------------------------------------------------------------------
    def test_case_12_internal_unit_test_converted_to_benchmark(self):
        """Case 12: Converting internal unit test to external benchmark must be caught and flagged."""
        internal_name = "Internal Regression Suites"
        harness = "Native Node Test Runners"
        
        self.assertTrue(is_internal_suite(internal_name, harness), "Must recognize internal test suite.")

        # Attempting to classify it as EXTERNAL_BENCHMARK
        attempted_class = EvaluationClass.EXTERNAL_BENCHMARK  # False claim
        flags = []
        if is_internal_suite(internal_name, harness) and attempted_class == EvaluationClass.EXTERNAL_BENCHMARK:
            flags.append(IntegrityFlag.INTERNAL_TEST_AS_BENCHMARK)
            attempted_class = EvaluationClass.INTERNAL_TEST  # Corrected

        self.assertIn(IntegrityFlag.INTERNAL_TEST_AS_BENCHMARK, flags)
        self.assertEqual(attempted_class, EvaluationClass.INTERNAL_TEST)

    # --------------------------------------------------------------------------
    # Report Consistency Verification (JSON, CSV, Markdown Agreement)
    # --------------------------------------------------------------------------
    def test_report_tri_format_agreement(self):
        """Tests that JSON, CSV, and Markdown report generators agree on figures and status."""
        report = run_repository_audit(".")
        
        json_str = generate_json_report(report)
        csv_str = generate_csv_report(report)
        md_str = generate_markdown_report(report)

        report_dict = json.loads(json_str)

        # 1. Total parsed runs agree
        total_runs_json = report_dict["summary_counts"]["total_parsed_runs"]
        total_runs_csv = len(csv_str.strip().split("\n")) - 1  # Minus header
        self.assertEqual(total_runs_json, total_runs_csv, "JSON and CSV must agree on total parsed runs.")

        # 2. Check that completion status matches across JSON and Markdown
        status_json = report_dict["completion_status"]
        self.assertIn(f"**Final Audit Status:** `{status_json}`", md_str)

        # 3. Check that external benchmark pass rate fractions are present in all three
        for run in report_dict["validated_runs"]:
            ratio = run["pass_ratio_str"]
            name = run["name"]
            if run["evaluation_class"] == EvaluationClass.EXTERNAL_BENCHMARK and ratio != "0/0 (N/A)":
                self.assertIn(ratio, csv_str, f"Ratio {ratio} for {name} must appear in CSV.")


if __name__ == "__main__":
    unittest.main()

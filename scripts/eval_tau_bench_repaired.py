"""
scripts/eval_tau_bench_repaired.py
Evaluates hardened AGI 0.7 on tau-bench retail task and compares against MATRIX X1.2 baseline.
"""

import sys
import os
import json

sys.path.insert(0, os.path.abspath("."))
os.environ["LITELLM_LOCAL_MODEL_COST_MAP"] = "True"
sys.path.insert(0, os.path.abspath("external/tau-bench"))

from agi.adapters.tau_bench_adapter import run_tau_bench_task

def main():
    print("=" * 80)
    print("AGI 0.7 TAU-BENCH RETAIL EFFICIENCY EVALUATION")
    print("=" * 80)

    # Run retail dev task 0
    res = run_tau_bench_task(task_index=0, agent_type="agi_0_7", max_turns=5)

    baseline_matrix = {
        "agent": "matrix_x1_2",
        "turns": 4,
        "total_tokens": 41050,
        "total_latency_ms": 158200,
        "passed": True,
        "actions_match": True,
        "reward": 1.0
    }

    initial_agi07 = {
        "agent": "agi_0_7_initial",
        "turns": 5,
        "total_tokens": 84200,
        "total_latency_ms": 267400,
        "passed": True,
        "actions_match": True,
        "reward": 1.0
    }

    comparison = {
        "task": "tau_bench_retail_dev_0",
        "matrix_x1_2_baseline": baseline_matrix,
        "agi_0_7_initial_reported": initial_agi07,
        "agi_0_7_hardened": res,
        "delta_vs_initial": {
            "turn_reduction": initial_agi07["turns"] - res["turns"],
            "token_reduction": initial_agi07["total_tokens"] - res["total_tokens"],
            "token_pct_saved": f"{((initial_agi07['total_tokens'] - res['total_tokens']) / initial_agi07['total_tokens']) * 100:.1f}%",
            "latency_reduction_ms": initial_agi07["total_latency_ms"] - res["total_latency_ms"]
        }
    }

    out_file = "agi/data/tau_bench_hardened_evaluation_results.json"
    os.makedirs(os.path.dirname(out_file), exist_ok=True)
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(comparison, f, indent=2)

    print("\n" + "=" * 80)
    print("TAU-BENCH EFFICIENCY COMPARISON TABLE")
    print("=" * 80)
    print(f"{'Metric':<25} | {'MATRIX X1.2':<15} | {'AGI 0.7 (Initial)':<18} | {'AGI 0.7 (Hardened)':<18}")
    print("-" * 80)
    print(f"{'Task Pass':<25} | {'PASS':<15} | {'PASS':<18} | {'PASS' if res['passed'] else 'FAIL':<18}")
    print(f"{'Turn Count':<25} | {baseline_matrix['turns']:<15} | {initial_agi07['turns']:<18} | {res['turns']:<18}")
    print(f"{'Total Tokens':<25} | {baseline_matrix['total_tokens']:<15} | {initial_agi07['total_tokens']:<18} | {res['total_tokens']:<18}")
    print(f"{'Total Latency (s)':<25} | {baseline_matrix['total_latency_ms']/1000:<15.1f} | {initial_agi07['total_latency_ms']/1000:<18.1f} | {res['total_latency_ms']/1000:<18.1f}")
    print(f"{'Token Savings vs Init':<25} | {'N/A':<15} | {'Baseline':<18} | {comparison['delta_vs_initial']['token_pct_saved']:<18}")
    print("=" * 80)
    print(f"Results recorded in: {out_file}")

if __name__ == "__main__":
    main()

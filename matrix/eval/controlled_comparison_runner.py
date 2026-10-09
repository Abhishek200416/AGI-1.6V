"""
matrix/eval/controlled_comparison_runner.py
MATRIX X1.2 — Empirical Paired Controlled Comparison Runner
Sole Foundation Model: gemini-3.8-flash-high via Antigravity CLI (agy.exe)

Runs matched controlled comparison across 3 configurations:
- Config A: Minimal Baseline Loop (Raw prompt, no FSM, zero error-recovery)
- Config B: MATRIX X1.1 Baseline (Linear ReAct loop, no pre-flight AST verification, uncompacted context)
- Config C: MATRIX X1.2 Full Runtime (Mission DAG, Adaptive FSM, Closed-Loop Verifier, Compactor)

Evaluates on authentic Sierra Research tau-bench retail task with official calculate_reward() state hash grader.
"""

import os
import sys
import json
import time
from typing import Dict, Any, List

os.environ["LITELLM_LOCAL_MODEL_COST_MAP"] = "True"
sys.path.insert(0, os.path.abspath("."))
sys.path.insert(0, os.path.abspath("external/tau-bench"))

from matrix.eval.tau_bench_pilot import TauRetailAgentRunner
from matrix.eval.gemini_high_provider import MODEL_IDENTIFIER


def run_controlled_comparison():
    print("================================================================================")
    print(" MATRIX X1.2 — MATCHED CONTROLLED BASELINE COMPARISON CAMPAIGN")
    print(f" Sole Foundation Model: {MODEL_IDENTIFIER}")
    print(" Task: Official tau-bench Retail Dev-0 (Olivia Ito #W5442520 Cancellation)")
    print(" Grader: Official calculate_reward() Database SHA-256 State Hash")
    print("================================================================================\n")

    configs = [
        ("config_a_minimal", "Config A: Minimal Model Loop (Direct prompt, no FSM, no verifier)"),
        ("config_b_x11",     "Config B: MATRIX X1.1 Baseline (ReAct loop, no AST check, no compactor)"),
        ("config_c_x12",     "Config C: MATRIX X1.2 Runtime (DAG Compiler + FSM + ClosedLoopVerifier + Compactor)")
    ]

    results = []

    for cfg_mode, cfg_desc in configs:
        print(f"\n>>>>>>>> STARTING: {cfg_desc} <<<<<<<<")
        runner = TauRetailAgentRunner(config_mode=cfg_mode)
        # Run on Task 0 with max_turns=4 to permit full multi-turn policy compliance
        res = runner.run_task(task_index=0, max_turns=4)
        res["description"] = cfg_desc
        results.append(res)
        print(f">>>>>>>> COMPLETED: {cfg_desc} -> Reward: {res['reward']} | Actions Match: {res['actions_match']} <<<<<<<<\n")

    out_file = "matrix/eval/controlled_comparison_results.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    print("\n================================================================================")
    print(" CONTROLLED COMPARISON SCOREBOARD SUMMARY")
    print("================================================================================")
    for r in results:
        status_icon = "[PASS]" if r["passed"] else "[FAIL]"
        print(f"| {r['config_mode']:<16} | Reward: {r['reward']} | Status: {status_icon} | DB Matches: {r['actions_match']} | Latency: {r['total_latency_ms']}ms | Tokens: {r['total_tokens']} |")
    print("================================================================================\n")
    print(f"Comparison report saved to {out_file}")
    return results


if __name__ == "__main__":
    run_controlled_comparison()

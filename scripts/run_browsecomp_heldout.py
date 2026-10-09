"""
scripts/run_browsecomp_heldout.py
AGI 0.7 — Clean Held-Out BrowseComp Evaluation Runner

Evaluates strictly uncontaminated tasks (Tasks 4, 5, 6) from the official
OpenAI simple-evals browse_comp_test_set (1,266 tasks) to establish genuine held-out metrics.
Decouples:
1. Official Strict Simple-Evals Exact Match
2. Research-Backed Certified Canonicalized Match
"""

import sys
import os
import json
import time

sys.path.insert(0, os.path.abspath("."))
from agi.adapters.browsecomp_adapter import (
    load_browsecomp_dataset,
    run_browsecomp_task,
    CONTAMINATED_TASK_INDICES
)

def main():
    print("=" * 80)
    print("AGI 0.7 CLEAN HELD-OUT BROWSECOMP BENCHMARK RUN")
    print("=" * 80)

    ds = load_browsecomp_dataset()
    print(f"Total dataset size: {len(ds)} tasks")

    # Select clean uncontaminated held-out tasks: Tasks 4, 5, 6 (1-indexed)
    heldout_indices = [4, 5, 6]
    for idx in heldout_indices:
        assert idx not in CONTAMINATED_TASK_INDICES, f"Task {idx} is quarantined as contaminated!"

    results = []
    official_pass_count = 0
    canonical_pass_count = 0

    for t_idx in heldout_indices:
        row = ds[t_idx - 1]
        print(f"\nEvaluating Held-Out Task #{t_idx} (Topic: {row['topic']})...", flush=True)
        res = run_browsecomp_task(task_index=t_idx, row=row, agent_type="agi_0_7")
        results.append(res)
        if res["official_raw_match"]:
            official_pass_count += 1
        if res["canonicalized_match"]:
            canonical_pass_count += 1

    summary = {
        "benchmark": "browsecomp_simple_evals_heldout",
        "agent": "agi_0_7",
        "total_heldout_evaluated": len(heldout_indices),
        "official_raw_exact_match": {
            "passed": official_pass_count,
            "accuracy": official_pass_count / len(heldout_indices)
        },
        "canonical_exact_match": {
            "passed": canonical_pass_count,
            "accuracy": canonical_pass_count / len(heldout_indices)
        },
        "quarantined_indices_excluded": list(CONTAMINATED_TASK_INDICES),
        "tasks": results
    }

    out_file = "agi/benchmarks/results/browsecomp_heldout_results.json"
    os.makedirs(os.path.dirname(out_file), exist_ok=True)
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print("\n" + "=" * 90)
    print("HELD-OUT BROWSECOMP SCOREBOARD")
    print("=" * 90)
    print(f"Total Held-Out Tasks:        {len(heldout_indices)}")
    print(f"Official Raw Exact Match:    {official_pass_count}/{len(heldout_indices)} ({official_pass_count/len(heldout_indices)*100:.1f}%)")
    print(f"Canonical Exact Match:       {canonical_pass_count}/{len(heldout_indices)} ({canonical_pass_count/len(heldout_indices)*100:.1f}%)")
    print("=" * 90)
    print(f"Artifact saved: {out_file}")

if __name__ == "__main__":
    main()

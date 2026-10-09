import sys
import os
import json

sys.path.insert(0, os.path.abspath("."))
from agi.adapters.browsecomp_adapter import (
    load_browsecomp_dataset,
    run_browsecomp_task,
    canonicalize_answer,
    is_semantically_equivalent,
    CONTAMINATED_TASK_INDICES
)

def main():
    ds = load_browsecomp_dataset()
    print("=" * 80)
    print("AGI 0.7 BROWSECOMP HARDENED EVALUATION RUN")
    print(f"Total available rows: {len(ds)}")
    print("=" * 80)

    # We evaluate Tasks 1 & 2 (isolated as contaminated dev fixtures)
    # and Task 3 (fresh uncontaminated held-out validation task)
    tasks_to_run = [1, 2, 3]
    results = []

    for t_idx in tasks_to_run:
        row = ds[t_idx - 1]
        res = run_browsecomp_task(task_index=t_idx, row=row, agent_type="agi_0_7")
        results.append(res)

    print("\n" + "=" * 100)
    print("SUMMARY COMPARISON TABLE: RAW vs CANONICALIZED vs GROUND TRUTH")
    print("=" * 100)
    print(f"{'Task':<6} | {'Status':<15} | {'Raw Extracted':<25} | {'Canon Extracted':<25} | {'Ground Truth':<25} | {'Official':<8} | {'Canon':<8}")
    print("-" * 120)

    for r in results:
        status = "QUARANTINED" if r["is_contaminated"] else "HELD-OUT"
        raw_ext = (r["extracted_answer"][:22] + "...") if len(r["extracted_answer"]) > 25 else r["extracted_answer"]
        canon_ext = (r["canon_predicted"][:22] + "...") if len(r["canon_predicted"]) > 25 else r["canon_predicted"]
        gt = (r["ground_truth"][:22] + "...") if len(r["ground_truth"]) > 25 else r["ground_truth"]
        off_str = "PASS" if r["official_raw_match"] else "FAIL"
        can_str = "PASS" if r["canonicalized_match"] else "FAIL"
        print(f"#{r['task_index']:<5} | {status:<15} | {raw_ext:<25} | {canon_ext:<25} | {gt:<25} | {off_str:<8} | {can_str:<8}")

    out_path = "agi/data/browsecomp_hardened_evaluation_results.json"
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"\nSaved evaluation artifacts to: {out_path}")

if __name__ == "__main__":
    main()
